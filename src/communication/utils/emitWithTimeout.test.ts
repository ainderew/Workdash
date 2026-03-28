import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  emitWithTimeout,
  assertTransportReady,
  validateNoError,
  SFU_TIMEOUTS,
} from "./emitWithTimeout";

function createMockSocket() {
  return {
    emit: vi.fn(),
  } as unknown as Parameters<typeof emitWithTimeout>[0]["socket"];
}

describe("emitWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("resolves when server responds within timeout", async () => {
    const socket = createMockSocket();
    vi.mocked(socket.emit).mockImplementation(
      (_event: string, _data: unknown, cb: (res: unknown) => void) => {
        cb({ id: "abc" });
        return socket as ReturnType<typeof socket.emit>;
      },
    );

    const result = await emitWithTimeout<{ id: string }>({
      socket,
      event: "produce",
      data: {},
      timeoutMs: 5000,
    });

    expect(result).toEqual({ id: "abc" });
  });

  it("rejects when server does not respond within timeout", async () => {
    const socket = createMockSocket();
    vi.mocked(socket.emit).mockReturnValue(
      socket as ReturnType<typeof socket.emit>,
    );

    const promise = emitWithTimeout({
      socket,
      event: "produce",
      data: {},
      timeoutMs: 5000,
    });

    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(
      'Socket emit "produce" timed out after 5000ms',
    );
  });

  it("rejects when validate throws", async () => {
    const socket = createMockSocket();
    vi.mocked(socket.emit).mockImplementation(
      (_event: string, _data: unknown, cb: (res: unknown) => void) => {
        cb({ error: "not found" });
        return socket as ReturnType<typeof socket.emit>;
      },
    );

    const promise = emitWithTimeout({
      socket,
      event: "consume",
      data: {},
      timeoutMs: 5000,
      validate: validateNoError,
    });

    await expect(promise).rejects.toThrow("not found");
  });

  it("clears the timer on successful response", async () => {
    const socket = createMockSocket();
    vi.mocked(socket.emit).mockImplementation(
      (_event: string, _data: unknown, cb: (res: unknown) => void) => {
        cb({ id: "x" });
        return socket as ReturnType<typeof socket.emit>;
      },
    );

    await emitWithTimeout({
      socket,
      event: "test",
      data: {},
      timeoutMs: 5000,
    });

    // Advancing past timeout should not cause issues
    vi.advanceTimersByTime(10000);
  });
});

describe("validateNoError", () => {
  it("does nothing for a valid response", () => {
    expect(() => validateNoError({ id: "123" })).not.toThrow();
  });

  it("throws for a response with error field", () => {
    expect(() => validateNoError({ error: "bad request" })).toThrow(
      "bad request",
    );
  });

  it("does nothing for null/undefined", () => {
    expect(() => validateNoError(null)).not.toThrow();
    expect(() => validateNoError(undefined)).not.toThrow();
  });
});

describe("assertTransportReady", () => {
  it("throws if transport is null", () => {
    expect(() => assertTransportReady(null, "Send")).toThrow(
      "Send transport is null",
    );
  });

  it("throws if transport is closed", () => {
    const transport = { closed: true } as Parameters<
      typeof assertTransportReady
    >[0] &
      object;
    expect(() => assertTransportReady(transport, "Recv")).toThrow(
      "Recv transport is closed",
    );
  });

  it("throws if SFU is resetting", () => {
    const transport = { closed: false } as Parameters<
      typeof assertTransportReady
    >[0] &
      object;
    expect(() => assertTransportReady(transport, "Send", true)).toThrow(
      "Send transport unavailable — SFU is resetting",
    );
  });

  it("passes for a valid open transport", () => {
    const transport = { closed: false } as Parameters<
      typeof assertTransportReady
    >[0] &
      object;
    expect(() => assertTransportReady(transport, "Send")).not.toThrow();
  });
});

describe("SFU_TIMEOUTS", () => {
  it("has expected default values", () => {
    expect(SFU_TIMEOUTS.PRODUCE).toBe(15_000);
    expect(SFU_TIMEOUTS.CONNECT_TRANSPORT).toBe(15_000);
    expect(SFU_TIMEOUTS.CONSUME).toBe(15_000);
    expect(SFU_TIMEOUTS.RESUME_CONSUMER).toBe(8_000);
    expect(SFU_TIMEOUTS.GET_PRODUCERS).toBe(10_000);
  });
});
