import { describe, it, expect } from "vitest";
import {
  displayName,
  formatBytes,
  formatCompact,
  formatCount,
  formatPercent,
  formatRelative,
} from "./format";

describe("formatBytes", () => {
  it("returns 0 B for zero and negative input", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
  });

  it("keeps whole bytes unrounded", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("shows one decimal below 10 units and none above", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 20)).toBe("20 KB");
  });

  it("scales up to terabytes and stops there", () => {
    expect(formatBytes(1024 ** 3 * 2)).toBe("2.0 GB");
    expect(formatBytes(1024 ** 5)).toBe("1024 TB");
  });
});

describe("formatCompact", () => {
  it("shows exact values below 1000", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("abbreviates at and above 1000", () => {
    expect(formatCompact(1500)).toBe("1.5K");
  });
});

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

describe("formatPercent", () => {
  it("rounds to one decimal place", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatRelative", () => {
  it("renders an em dash for a null timestamp", () => {
    expect(formatRelative(null)).toBe("—");
  });

  it("renders a relative phrase for a real timestamp", () => {
    const result = formatRelative(new Date(Date.now() - 86_400_000).toISOString());
    expect(result).toMatch(/ago/);
  });
});

describe("displayName", () => {
  const base = { name: null, nickname: null, email: "ada@example.com" };

  it("prefers nickname over name", () => {
    expect(displayName({ ...base, name: "Ada", nickname: "ada_l" })).toBe("ada_l");
  });

  it("falls back to name when there is no nickname", () => {
    expect(displayName({ ...base, name: "Ada" })).toBe("Ada");
  });

  it("falls back to the email local part when both are missing", () => {
    expect(displayName(base)).toBe("ada");
  });
});
