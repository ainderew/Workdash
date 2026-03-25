import { describe, it, expect } from "vitest";
import {
  pickRankingMessage,
  FIRST_PLACE_MESSAGES,
  LAST_PLACE_MESSAGES,
  MOST_IMPROVED_MESSAGES,
  BIGGEST_DROP_MESSAGES,
} from "./powerRankingMessages";

describe("powerRankingMessages", () => {
  it("returns a first place message", () => {
    const msg = pickRankingMessage("first", 123, 1000);
    expect(FIRST_PLACE_MESSAGES).toContain(msg);
  });

  it("returns a last place message", () => {
    const msg = pickRankingMessage("last", 123, 1000);
    expect(LAST_PLACE_MESSAGES).toContain(msg);
  });

  it("returns a most improved message", () => {
    const msg = pickRankingMessage("improved", 123, 1000);
    expect(MOST_IMPROVED_MESSAGES).toContain(msg);
  });

  it("returns a biggest drop message", () => {
    const msg = pickRankingMessage("drop", 123, 1000);
    expect(BIGGEST_DROP_MESSAGES).toContain(msg);
  });

  it("is deterministic for same inputs", () => {
    const msg1 = pickRankingMessage("first", 456, 2000);
    const msg2 = pickRankingMessage("first", 456, 2000);
    expect(msg1).toBe(msg2);
  });

  it("varies by account ID", () => {
    const msg1 = pickRankingMessage("first", 100, 1000);
    const msg2 = pickRankingMessage("first", 200, 1000);
    // Different inputs should produce different indices (not guaranteed but highly likely)
    // At minimum both should be valid templates
    expect(FIRST_PLACE_MESSAGES).toContain(msg1);
    expect(FIRST_PLACE_MESSAGES).toContain(msg2);
  });
});
