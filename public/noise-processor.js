/**
 * AudioWorklet processor for RNNoise-based noise cancellation.
 * Runs in AudioWorkletGlobalScope — no imports, no ES modules.
 *
 * Receives a compiled WebAssembly.Module from the main thread via port,
 * instantiates it with minimal Emscripten glue, and processes 480-sample
 * frames (10 ms at 48 kHz) through the RNNoise denoiser.
 */

const FRAME_SIZE = 480;

// Named map for WASM exports — derived from @jitsi/rnnoise-wasm/dist/rnnoise.js
// Update these letters if the WASM build changes its export table.
const WASM = {
  memory:                'c',
  ctors:                 'd',
  rnnoise_init:          'e',
  rnnoise_create:        'f',
  malloc:                'g',
  rnnoise_destroy:       'h',
  free:                  'i',
  rnnoise_process_frame: 'j',
};

class NoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this._destroyed = false;
    this._ready = false;

    // Ring buffers for accumulating 128-sample render quanta into 480-sample frames
    this._inBuf = new Float32Array(FRAME_SIZE);
    this._inIdx = 0;
    this._outBuf = new Float32Array(FRAME_SIZE);
    this._outIdx = 0;

    // WASM runtime state (populated after init)
    this._exports = null;
    this._heapF32 = null;
    this._heapU8 = null;
    this._state = 0;
    this._inputPtr = 0;
    this._outputPtr = 0;

    // VAD-based noise gate state
    this._lastVad = 0;
    this._gateGain = 0; // current gate envelope (0 = closed, 1 = open)

    this.port.onmessage = (e) => {
      if (e.data.type === 'init') {
        this._initWasm(e.data.wasmModule);
      } else if (e.data.type === 'destroy') {
        this._cleanup();
        this._destroyed = true;
      }
    };
  }

  _initWasm(wasmModule) {
    try {
      let memory;
      let heapU8;

      const updateViews = () => {
        heapU8 = new Uint8Array(memory.buffer);
        this._heapU8 = heapU8;
        this._heapF32 = new Float32Array(memory.buffer);
      };

      // Instantiate with minimal Emscripten-compatible imports
      // Import namespace "a" matches the compiled module's expectation
      const instance = new WebAssembly.Instance(wasmModule, {
        a: {
          // "a" = _emscripten_resize_heap
          a: (requestedSize) => {
            const oldSize = heapU8.length;
            requestedSize = requestedSize >>> 0;
            const maxSize = 2147483648;
            if (requestedSize > maxSize) return false;
            const alignUp = (x, m) => x + (m - x % m) % m;
            for (let cutDown = 1; cutDown <= 4; cutDown *= 2) {
              let overGrown = oldSize * (1 + 0.2 / cutDown);
              overGrown = Math.min(overGrown, requestedSize + 100663296);
              const newSize = Math.min(
                maxSize,
                alignUp(Math.max(requestedSize, overGrown), 65536),
              );
              try {
                memory.grow(
                  (newSize - memory.buffer.byteLength + 65535) >>> 16,
                );
                updateViews();
                return true;
              } catch (_) {
                /* try next cutDown */
              }
            }
            return false;
          },
          // "b" = _emscripten_memcpy_big
          b: (dest, src, num) => {
            heapU8.copyWithin(dest, src, src + num);
          },
        },
      });

      this._exports = instance.exports;
      memory = instance.exports[WASM.memory]; // wasmMemory
      updateViews();

      // Run Emscripten constructors
      instance.exports[WASM.ctors](); // ___wasm_call_ctors

      // Initialize RNNoise
      instance.exports[WASM.rnnoise_init]();
      this._state = instance.exports[WASM.rnnoise_create]();

      // Allocate input/output frame buffers on the WASM heap (480 floats = 1920 bytes)
      this._inputPtr = instance.exports[WASM.malloc](FRAME_SIZE * 4);
      this._outputPtr = instance.exports[WASM.malloc](FRAME_SIZE * 4);

      this._ready = true;
      this.port.postMessage({ type: 'ready' });
    } catch (err) {
      this.port.postMessage({ type: 'error', message: String(err) });
    }
  }

  _processFrame() {
    const heapF32 = new Float32Array(this._exports[WASM.memory].buffer);
    const inOffset = this._inputPtr >> 2;

    // Copy input to WASM heap, scaling float [-1,1] → [-32768,32767]
    // RNNoise expects float samples in int16 amplitude range
    for (let i = 0; i < FRAME_SIZE; i++) {
      heapF32[inOffset + i] = this._inBuf[i] * 32768.0;
    }

    // rnnoise_process_frame(state, output, input) — returns VAD probability (0-1)
    this._lastVad = this._exports[WASM.rnnoise_process_frame](
      this._state, this._outputPtr, this._inputPtr,
    );

    // Re-read heap in case memory grew during processing
    const outHeapF32 = new Float32Array(this._exports[WASM.memory].buffer);
    const outOffset = this._outputPtr >> 2;

    // Copy output back, scaling [-32768,32767] → [-1,1]
    for (let i = 0; i < FRAME_SIZE; i++) {
      this._outBuf[i] = outHeapF32[outOffset + i] / 32768.0;
    }
  }

  _cleanup() {
    if (this._exports && this._state) {
      this._exports[WASM.rnnoise_destroy](this._state);
      if (this._inputPtr) this._exports[WASM.free](this._inputPtr);
      if (this._outputPtr) this._exports[WASM.free](this._outputPtr);
      this._state = 0;
      this._inputPtr = 0;
      this._outputPtr = 0;
    }
    this._ready = false;
  }

  process(inputs, outputs) {
    if (this._destroyed) return false;

    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) return true;

    // Passthrough until WASM is ready
    if (!this._ready) {
      output.set(input);
      return true;
    }

    // Interleave accumulation and output:
    //   - Write each input sample to the accumulation buffer
    //   - Read the corresponding output sample from the processed buffer
    //   - When 480 samples accumulated, process the frame and reset pointers
    // This produces a fixed 10 ms latency (one frame behind).
    for (let i = 0; i < input.length; i++) {
      this._inBuf[this._inIdx] = input[i];
      output[i] = this._outBuf[this._outIdx];

      this._inIdx++;
      this._outIdx++;

      if (this._inIdx >= FRAME_SIZE) {
        this._processFrame();
        this._inIdx = 0;
        this._outIdx = 0;
      }
    }

    // VAD-based soft noise gate — suppresses residual noise between speech.
    // Community consensus (werman/noise-suppression-for-voice, Jitsi) is
    // 0.85–0.95 for gating. We use a soft envelope so we can afford the
    // higher thresholds without hard-clipping speech onsets.
    //   open  at VAD >= 0.85 (high confidence speech to open gate)
    //   close at VAD <  0.65 (close promptly when speech fades)
    // Fast attack (0.08) preserves speech onset; fast release (0.02) shuts
    // the gate quickly to suppress fan/hiss between words.
    const vad = this._lastVad;
    const gateOpen = vad >= 0.85 ? 1 : vad < 0.65 ? 0 : this._gateGain > 0 ? 1 : 0;
    const attackRate = 0.08;
    const releaseRate = 0.02;

    for (let i = 0; i < output.length; i++) {
      if (gateOpen) {
        this._gateGain = Math.min(1, this._gateGain + attackRate);
      } else {
        this._gateGain = Math.max(0, this._gateGain - releaseRate);
      }
      output[i] *= this._gateGain;
    }

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
