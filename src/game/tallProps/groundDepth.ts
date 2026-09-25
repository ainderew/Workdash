/** Players and tall props share this depth band (tile layers are 0, doors 100, name tags 200). */
const GROUND_SORT_DEPTH = 10;

/**
 * Depth for something that touches the ground at world y: whatever stands
 * further south is drawn in front, so a player north of a tree is hidden by
 * its canopy and one south of it is drawn over it.
 */
export function depthForGroundY(groundY: number) {
    return GROUND_SORT_DEPTH + groundY / 100_000;
}
