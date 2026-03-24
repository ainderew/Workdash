/**
 * Main-thread service for loading and creating RNNoise AudioWorklet nodes.
 */

import { logger } from '@/common/utils/logger';

const INIT_TIMEOUT_MS = 10_000;

export class RNNoiseService {
  private static registeredContexts = new WeakSet<BaseAudioContext>();
  private static wasmBytes: ArrayBuffer | null = null;

  static isSupported(): boolean {
    return (
      typeof AudioWorkletNode !== 'undefined' &&
      typeof WebAssembly !== 'undefined'
    );
  }

  private static async loadWasmBytes(): Promise<ArrayBuffer> {
    if (this.wasmBytes) {
      logger.log('[RNNoise] Using cached WASM bytes');
      return this.wasmBytes;
    }

    logger.log('[RNNoise] Fetching rnnoise.wasm...');
    const response = await fetch('/rnnoise.wasm');
    if (!response.ok) {
      throw new Error(`Failed to fetch rnnoise.wasm: ${response.status}`);
    }
    this.wasmBytes = await response.arrayBuffer();
    logger.log(
      `[RNNoise] WASM fetched (${this.wasmBytes.byteLength} bytes)`,
    );
    return this.wasmBytes;
  }

  static async createNode(ctx: AudioContext): Promise<AudioWorkletNode> {
    logger.log(`[RNNoise] createNode called, ctx state: ${ctx.state}`);

    // Register worklet processor once per context
    if (!this.registeredContexts.has(ctx)) {
      // Cache-bust to avoid stale worklet file in dev
      const url = `/noise-processor.js?v=${Date.now()}`;
      logger.log(`[RNNoise] Registering worklet module: ${url}`);
      await ctx.audioWorklet.addModule(url);
      this.registeredContexts.add(ctx);
      logger.log('[RNNoise] Worklet module registered');
    }

    const wasmBytes = await this.loadWasmBytes();

    logger.log('[RNNoise] Creating AudioWorkletNode...');
    const node = new AudioWorkletNode(ctx, 'noise-processor');
    logger.log('[RNNoise] AudioWorkletNode created');

    // Set up the message handler BEFORE the node can send anything.
    // Use addEventListener instead of onmessage to avoid implicit port.start()
    // timing issues — AudioWorkletNode ports are auto-started, so we need
    // the listener attached before any messages arrive.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.error('[RNNoise] TIMEOUT — no response from worklet after 10s');
        reject(new Error('RNNoise worklet init timed out'));
      }, INIT_TIMEOUT_MS);

      const handler = (e: MessageEvent) => {
        logger.log(`[RNNoise] Main thread received message: ${e.data.type}`);

        if (e.data.type === 'ready-for-init') {
          logger.log('[RNNoise] Worklet ready — sending WASM bytes...');
          // Send raw ArrayBuffer instead of compiled WebAssembly.Module —
          // AudioWorklet MessagePort can't structured-clone Module objects
          // in Chrome, causing postMessage to silently fail.
          try {
            node.port.postMessage({ type: 'init', wasmBytes });
          } catch (err) {
            clearTimeout(timeout);
            node.port.removeEventListener('message', handler);
            reject(
              new Error(`Failed to send WASM to worklet: ${String(err)}`),
            );
          }
        } else if (e.data.type === 'ready') {
          logger.log('[RNNoise] Worklet WASM init complete');
          clearTimeout(timeout);
          node.port.removeEventListener('message', handler);
          resolve();
        } else if (e.data.type === 'error') {
          logger.error(`[RNNoise] Worklet error: ${e.data.message}`);
          clearTimeout(timeout);
          node.port.removeEventListener('message', handler);
          reject(new Error(e.data.message));
        }
      };

      node.port.addEventListener('message', handler);
      // Explicitly start the port to ensure queued messages are dispatched
      node.port.start();
      logger.log('[RNNoise] Port listener attached and started, waiting for worklet...');
    });

    return node;
  }
}
