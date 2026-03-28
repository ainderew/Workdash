import type { Transport } from "mediasoup-client/types";

interface SocketLike {
  emit(event: string, ...args: unknown[]): unknown;
}

interface EmitWithTimeoutOptions<T> {
  socket: SocketLike;
  event: string;
  data: unknown;
  timeoutMs: number;
  validate?: (response: T) => void;
}

export function emitWithTimeout<T>(
  opts: EmitWithTimeoutOptions<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Socket emit "${opts.event}" timed out after ${opts.timeoutMs}ms`,
        ),
      );
    }, opts.timeoutMs);

    opts.socket.emit(opts.event, opts.data, (response: T) => {
      clearTimeout(timer);
      try {
        opts.validate?.(response);
        resolve(response);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function assertTransportReady(
  transport: Transport | null,
  label: string,
  resetting?: boolean,
): asserts transport is Transport {
  if (resetting) {
    throw new Error(`${label} transport unavailable — SFU is resetting`);
  }
  if (!transport) {
    throw new Error(`${label} transport is null — SFU not initialized`);
  }
  if (transport.closed) {
    throw new Error(`${label} transport is closed`);
  }
}

export function validateNoError<T>(response: T): void {
  const res = response as Record<string, unknown>;
  if (res && typeof res === "object" && "error" in res && res.error) {
    throw new Error(String(res.error));
  }
}

export const SFU_TIMEOUTS = {
  PRODUCE: 15_000,
  CONNECT_TRANSPORT: 15_000,
  CONSUME: 15_000,
  RESUME_CONSUMER: 8_000,
  GET_PRODUCERS: 10_000,
} as const;
