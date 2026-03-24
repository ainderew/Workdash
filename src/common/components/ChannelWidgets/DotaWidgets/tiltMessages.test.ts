import { describe, it, expect } from "vitest";
import {
  pickTiltMessage,
  pickComfortRoast,
  interpolate,
  TILT_MESSAGES,
  COMFORT_PICK_ROASTS,
} from "./tiltMessages";

describe("tiltMessages", () => {
  describe("interpolate", () => {
    it("replaces all template variables", () => {
      const result = interpolate("{name} lost {streak} games", {
        name: "Andrew",
        streak: 5,
      });
      expect(result).toBe("Andrew lost 5 games");
    });

    it("handles multiple occurrences of the same variable", () => {
      const result = interpolate("{name} is {name}", { name: "Test" });
      expect(result).toBe("Test is Test");
    });

    it("leaves unknown placeholders unchanged", () => {
      const result = interpolate("{name} has {unknown}", { name: "Test" });
      expect(result).toBe("Test has {unknown}");
    });

    it("handles empty vars object", () => {
      const result = interpolate("no variables here", {});
      expect(result).toBe("no variables here");
    });
  });

  describe("pickTiltMessage", () => {
    it("returns a string from the warning tier", () => {
      const result = pickTiltMessage("warning", 123, 3);
      expect(TILT_MESSAGES.warning).toContain(result);
    });

    it("returns from danger tier for danger severity", () => {
      const result = pickTiltMessage("danger", 456, 4);
      expect(TILT_MESSAGES.danger).toContain(result);
    });

    it("returns from critical tier for critical severity", () => {
      const result = pickTiltMessage("critical", 789, 6);
      expect(TILT_MESSAGES.critical).toContain(result);
    });

    it("is deterministic — same inputs produce same output", () => {
      const a = pickTiltMessage("warning", 123, 3);
      const b = pickTiltMessage("warning", 123, 3);
      expect(a).toBe(b);
    });

    it("produces different results for different account IDs", () => {
      const results = new Set(
        [100, 200, 300, 400, 500].map((id) =>
          pickTiltMessage("warning", id, 3),
        ),
      );
      expect(results.size).toBeGreaterThan(1);
    });

    it("returns a template containing {name} placeholder", () => {
      const result = pickTiltMessage("warning", 123, 3);
      expect(result).toContain("{name}");
    });
  });

  describe("pickComfortRoast", () => {
    it("returns a string from the roast templates", () => {
      const result = pickComfortRoast(123, 45);
      expect(COMFORT_PICK_ROASTS).toContain(result);
    });

    it("is deterministic", () => {
      const a = pickComfortRoast(123, 45);
      const b = pickComfortRoast(123, 45);
      expect(a).toBe(b);
    });

    it("returns template with {name} and {hero} placeholders", () => {
      const result = pickComfortRoast(123, 45);
      expect(result).toContain("{name}");
      expect(result).toContain("{hero}");
    });
  });
});
