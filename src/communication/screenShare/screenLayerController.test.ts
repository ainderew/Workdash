import { describe, it, expect } from "vitest";
import {
  SCREEN_LOW_LAYER,
  SCREEN_HIGH_LAYER,
  HD_MIN_WIDTH,
  screenQualityCeiling,
  computeScreenLayerForWidth,
} from "./screenLayerController";

describe("screenQualityCeiling", () => {
  it("caps screens to the low layer on a poor link", () => {
    expect(screenQualityCeiling("poor")).toBe(SCREEN_LOW_LAYER);
  });

  it("allows the high layer on fair/good/unknown links", () => {
    expect(screenQualityCeiling("fair")).toBe(SCREEN_HIGH_LAYER);
    expect(screenQualityCeiling("good")).toBe(SCREEN_HIGH_LAYER);
    expect(screenQualityCeiling("unknown")).toBe(SCREEN_HIGH_LAYER);
  });
});

describe("computeScreenLayerForWidth", () => {
  it("requests the full-res layer for a large tile on a healthy link", () => {
    expect(computeScreenLayerForWidth(HD_MIN_WIDTH, "good")).toBe(SCREEN_HIGH_LAYER);
    expect(computeScreenLayerForWidth(1280, "good")).toBe(SCREEN_HIGH_LAYER);
  });

  it("requests the thumbnail layer for a small tile", () => {
    expect(computeScreenLayerForWidth(HD_MIN_WIDTH - 1, "good")).toBe(SCREEN_LOW_LAYER);
    expect(computeScreenLayerForWidth(100, "good")).toBe(SCREEN_LOW_LAYER);
  });

  it("a zero-width (not-yet-measured) tile stays on the cheap layer", () => {
    expect(computeScreenLayerForWidth(0, "good")).toBe(SCREEN_LOW_LAYER);
  });

  it("never exceeds the quality ceiling, even for a large tile", () => {
    // A weak link clamps even a fullscreen screen back to the thumbnail layer.
    expect(computeScreenLayerForWidth(1920, "poor")).toBe(SCREEN_LOW_LAYER);
  });

  it("still serves full-res to a large tile on a merely 'fair' link", () => {
    expect(computeScreenLayerForWidth(1280, "fair")).toBe(SCREEN_HIGH_LAYER);
  });
});
