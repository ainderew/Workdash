/**
 * Main-thread service for loading and creating RNNoise AudioWorklet nodes.
 *
 * Workflow:
 *   1. Fetch and compile rnnoise.wasm once (cached).
 *   2. Register the AudioWorklet processor module once per AudioContext.
 *   3. Create an AudioWorkletNode and transfer the compiled WASM module to
 *      the worklet thread via port.postMessage.
 *   4. Wait for the worklet to signal readiness before returning.
 */

const INIT_TIMEOUT_MS = 5_000;

export class RNNoiseService {
  private static registeredContexts = new WeakSet<BaseAudioContext>();
  private static wasmModule: WebAssembly.Module | null = null;

  static isSupported(): boolean {
    return (
      typeof AudioWorkletNode !== 'undefined' &&
      typeof WebAssembly !== 'undefined'
    );
  }

  private static async loadWasmModule(): Promise<WebAssembly.Module> {
    if (this.wasmModule) return this.wasmModule;

    const response = await fetch('/rnnoise.wasm');
    const bytes = await response.arrayBuffer();
    this.wasmModule = await WebAssembly.compile(bytes);
    return this.wasmModule;
  }

  static async createNode(ctx: AudioContext): Promise<AudioWorkletNode> {
    // Register worklet processor once per context
    if (!this.registeredContexts.has(ctx)) {
      await ctx.audioWorklet.addModule('/noise-processor.js');
      this.registeredContexts.add(ctx);
    }

    const wasmModule = await this.loadWasmModule();
    const node = new AudioWorkletNode(ctx, 'noise-processor');

    // Transfer compiled WASM module to the worklet thread
    node.port.postMessage({ type: 'init', wasmModule });

    // Wait for worklet to finish WASM instantiation
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('RNNoise worklet init timed out')),
        INIT_TIMEOUT_MS,
      );

      node.port.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          clearTimeout(timeout);
          resolve();
        } else if (e.data.type === 'error') {
          clearTimeout(timeout);
          reject(new Error(e.data.message));
        }
      };
    });

    return node;
  }
}
