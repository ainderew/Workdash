import { describe, it, expect } from "vitest";
import {
    ALLOWED_UPLOAD_CONTENT_TYPES,
    UPLOAD_CONTENT_TYPE_ALIASES,
} from "./uploadAllowlist";

/**
 * Drift detector: this snapshot must match
 * workdash-media-server/src/config/gcs.config.ts
 * (ALLOWED_CONTENT_TYPES + CONTENT_TYPE_ALIASES).
 *
 * If this snapshot fails, do NOT update the snapshot blindly. Reconcile the
 * two files manually, then run `vitest -u` only after both sides agree.
 */
describe("upload allowlist mirror", () => {
    it("ALLOWED_UPLOAD_CONTENT_TYPES matches the backend snapshot", () => {
        expect([...ALLOWED_UPLOAD_CONTENT_TYPES]).toMatchSnapshot();
    });

    it("UPLOAD_CONTENT_TYPE_ALIASES matches the backend snapshot", () => {
        expect(UPLOAD_CONTENT_TYPE_ALIASES).toMatchSnapshot();
    });

    it("every alias maps to a canonical that is itself in the allowlist", () => {
        const set = new Set<string>(ALLOWED_UPLOAD_CONTENT_TYPES);
        for (const canonical of Object.values(UPLOAD_CONTENT_TYPE_ALIASES)) {
            expect(set.has(canonical)).toBe(true);
        }
    });
});
