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
    console.log('[noise-processor] constructor START');

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

    this._lastVad = 0;

    // Energy-based transient gate — filters short impulses (typing, clicks)
    // that RNNoise passes through, while letting sustained speech pass.
    this._gateGain = 0;
    this._energyHoldCount = 0;
    this._smoothedRms = 0;

    this.port.onmessage = async (e) => {
      console.log('[noise-processor] onmessage:', e.data?.type);
      if (e.data.type === 'init') {
        console.log('[noise-processor] received init, wasmBytes byteLength:', e.data.wasmBytes?.byteLength);
        await this._initWasm(e.data.wasmBytes);
      } else if (e.data.type === 'destroy') {
        this._cleanup();
        this._destroyed = true;
      }
    };

    // Signal the main thread that the constructor is done and port.onmessage
    // is wired — the main thread waits for this before sending the WASM module.
    console.log('[noise-processor] constructor END — sending ready-for-init');
    this.port.postMessage({ type: 'ready-for-init' });
  }

  async _initWasm(wasmBytes) {
    console.log('[noise-processor] _initWasm START');
    try {
      let memory;
      let heapU8;

      const updateViews = () => {
        heapU8 = new Uint8Array(memory.buffer);
        this._heapU8 = heapU8;
        this._heapF32 = new Float32Array(memory.buffer);
      };

      const imports = {
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
      };

      // Compile + instantiate from raw bytes — WebAssembly.Module can't be
      // structured-cloned through AudioWorklet MessagePort in Chrome.
      console.log('[noise-processor] calling WebAssembly.instantiate with raw bytes...');
      const result = await WebAssembly.instantiate(wasmBytes, imports);
      const instance = result.instance;
      console.log('[noise-processor] WebAssembly.instantiate complete, exports:', Object.keys(instance.exports));

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
      console.log('[noise-processor] init COMPLETE — sending ready');
      this.port.postMessage({ type: 'ready' });
    } catch (err) {
      console.error('[noise-processor] init FAILED:', err);
      this.port.postMessage({ type: 'error', message: String(err) });
    }
  }

  _processFrame() {
    // Reuse cached view unless WASM memory has grown (buffer detached)
    let heapF32 = this._heapF32;
    if (heapF32.buffer !== this._exports[WASM.memory].buffer) {
      heapF32 = new Float32Array(this._exports[WASM.memory].buffer);
      this._heapF32 = heapF32;
    }
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
    if (heapF32.buffer !== this._exports[WASM.memory].buffer) {
      heapF32 = new Float32Array(this._exports[WASM.memory].buffer);
      this._heapF32 = heapF32;
    }
    const outOffset = this._outputPtr >> 2;

    // Copy output back, scaling [-32768,32767] → [-1,1]
    for (let i = 0; i < FRAME_SIZE; i++) {
      this._outBuf[i] = heapF32[outOffset + i] / 32768.0;
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

    // Log once to confirm process() is being called
    if (!this._loggedProcess) {
      console.log('[noise-processor] process() called — worklet is alive, ready:', this._ready);
      this._loggedProcess = true;
    }

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

    // Energy-based transient gate — suppresses short impulses (keyboard
    // clicks, mouse clicks) that RNNoise lets through. Typing clicks are
    // typically <20ms; speech sustains energy for many frames.
    //
    // Measure RMS of the RNNoise output (not input) so we gate on what
    // the listener would actually hear after denoising.
    let sum = 0;
    for (let i = 0; i < output.length; i++) {
      sum += output[i] * output[i];
    }
    const rms = Math.sqrt(sum / output.length);

    // Smooth RMS to avoid reacting to single-sample spikes
    this._smoothedRms = 0.3 * rms + 0.7 * this._smoothedRms;

    // Threshold: just above silence. Speech after RNNoise typically has
    // RMS > 0.01; residual typing clicks are lower after denoising.
    const ENERGY_THRESHOLD = 0.005;
    // Require ~30ms of sustained energy before opening (128 samples at
    // 48kHz = 2.67ms per quantum, so 12 quanta ≈ 32ms). Typing clicks
    // spike for 2-5 quanta then drop; speech sustains for many more.
    const HOLD_THRESHOLD = 12;

    if (this._smoothedRms >= ENERGY_THRESHOLD) {
      this._energyHoldCount = Math.min(this._energyHoldCount + 1, HOLD_THRESHOLD + 1);
    } else {
      this._energyHoldCount = 0;
    }

    const gateOpen = this._energyHoldCount >= HOLD_THRESHOLD;
    // Fast attack (open quickly once sustained), moderate release
    const gateTarget = gateOpen ? 1 : 0;
    const rate = gateOpen ? 0.2 : 0.04;

    for (let i = 0; i < output.length; i++) {
      if (this._gateGain < gateTarget) {
        this._gateGain = Math.min(gateTarget, this._gateGain + rate);
      } else {
        this._gateGain = Math.max(gateTarget, this._gateGain - rate);
      }
      output[i] *= this._gateGain;
    }

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
