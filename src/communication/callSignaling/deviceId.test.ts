import { describe, it, expect, beforeEach } from "vitest";
import { getDeviceId } from "./deviceId";

beforeEach(() => {
  sessionStorage.clear();
});

describe("getDeviceId", () => {
  it("should generate a UUID on first call", () => {
    const id = getDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("should return the same UUID on subsequent calls", () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(first).toBe(second);
  });

  it("should persist to sessionStorage under workdash:deviceId", () => {
    const id = getDeviceId();
    expect(sessionStorage.getItem("workdash:deviceId")).toBe(id);
  });

  it("should generate a new UUID if sessionStorage is cleared", () => {
    const first = getDeviceId();
    sessionStorage.clear();
    const second = getDeviceId();
    expect(second).not.toBe(first);
  });
});
