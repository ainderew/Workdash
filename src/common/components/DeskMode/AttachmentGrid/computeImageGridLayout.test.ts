import { describe, expect, it } from "vitest";
import { computeImageGridLayout } from "./computeImageGridLayout";

describe("computeImageGridLayout", () => {
    it("returns an empty layout for invalid counts", () => {
        expect(computeImageGridLayout(0).cells).toHaveLength(0);
        expect(computeImageGridLayout(-3).cells).toHaveLength(0);
        expect(computeImageGridLayout(1.5).cells).toHaveLength(0);
    });

    it("single image is intrinsic aspect with no container aspect", () => {
        const layout = computeImageGridLayout(1);
        expect(layout.cells).toHaveLength(1);
        expect(layout.cells[0].aspect).toBe("intrinsic");
        expect(layout.containerAspect).toBeNull();
    });

    it("2 images: side-by-side squares, 2:1 container", () => {
        const layout = computeImageGridLayout(2);
        expect(layout.cells).toHaveLength(2);
        expect(layout.cells.every((c) => c.aspect === "square")).toBe(true);
        expect(layout.containerAspect).toBe(2);
        expect(layout.columns).toBe(2);
        expect(layout.rows).toBe(1);
    });

    it("3 images: tall left + two squares right, 1:1 container", () => {
        const layout = computeImageGridLayout(3);
        expect(layout.cells).toHaveLength(3);
        expect(layout.cells[0].aspect).toBe("tall");
        expect(layout.cells[0].rowSpan).toBe(2);
        expect(layout.cells[1].aspect).toBe("square");
        expect(layout.cells[2].aspect).toBe("square");
        expect(layout.containerAspect).toBe(1);
    });

    it("4 images: 2x2 squares, 1:1 container", () => {
        const layout = computeImageGridLayout(4);
        expect(layout.cells).toHaveLength(4);
        expect(layout.cells.every((c) => c.aspect === "square")).toBe(true);
        expect(layout.containerAspect).toBe(1);
        expect(layout.columns).toBe(2);
        expect(layout.rows).toBe(2);
    });

    it("5 images: 2x3 grid, 5 visible, no overflow cell", () => {
        const layout = computeImageGridLayout(5);
        expect(layout.cells).toHaveLength(5);
        expect(layout.cells.some((c) => c.isOverflow)).toBe(false);
        expect(layout.containerAspect).toBe(3 / 2);
    });

    it("7 images: 5 visible + last cell is overflow with count 2", () => {
        const layout = computeImageGridLayout(7);
        expect(layout.cells).toHaveLength(5);
        const last = layout.cells[layout.cells.length - 1];
        expect(last.isOverflow).toBe(true);
        expect(last.overflowCount).toBe(2);
    });

    it("20 images: 5 visible + overflow count 15", () => {
        const layout = computeImageGridLayout(20);
        expect(layout.cells).toHaveLength(5);
        const last = layout.cells[layout.cells.length - 1];
        expect(last.overflowCount).toBe(15);
    });

    it("honors a custom maxVisible", () => {
        const layout = computeImageGridLayout(7, 3);
        expect(layout.cells).toHaveLength(3);
        const last = layout.cells[layout.cells.length - 1];
        expect(last.isOverflow).toBe(true);
        expect(last.overflowCount).toBe(4);
    });

    it("grid lines are 1-based and span within the declared row/column count", () => {
        const layout = computeImageGridLayout(4);
        for (const cell of layout.cells) {
            expect(cell.colStart + cell.colSpan - 1).toBeLessThanOrEqual(
                layout.columns,
            );
            expect(cell.rowStart + cell.rowSpan - 1).toBeLessThanOrEqual(
                layout.rows,
            );
            expect(cell.colStart).toBeGreaterThanOrEqual(1);
            expect(cell.rowStart).toBeGreaterThanOrEqual(1);
        }
    });
});
