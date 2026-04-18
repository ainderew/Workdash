export type GridCellAspect = "intrinsic" | "square" | "tall";

export type GridCellSpec = {
    colStart: number;
    colSpan: number;
    rowStart: number;
    rowSpan: number;
    aspect: GridCellAspect;
    isOverflow?: boolean;
    overflowCount?: number;
};

export type GridLayout = {
    cells: GridCellSpec[];
    /** Whole-grid aspect ratio (width / height) when the grid is a fixed shape.
     *  `null` means "the container defers to the only image inside it." */
    containerAspect: number | null;
    /** Grid template columns count (1-indexed grid lines go up to columns + 1). */
    columns: number;
    /** Grid template rows count. */
    rows: number;
};

const MAX_VISIBLE_DEFAULT = 5;

/**
 * Discord-style image grid placement.
 *
 *   1  → single intrinsic image
 *   2  → two squares side by side (2:1 container)
 *   3  → one tall left, two squares stacked right (2:1 container)
 *   4  → 2×2 squares (1:1 container)
 *   5+ → 2×3 with an overflow "+N" cell on the 6th slot when count > 5
 *
 * Grid indices are 1-based (CSS grid convention).
 */
export function computeImageGridLayout(
    count: number,
    maxVisible: number = MAX_VISIBLE_DEFAULT,
): GridLayout {
    if (!Number.isInteger(count) || count <= 0) {
        return { cells: [], containerAspect: null, columns: 0, rows: 0 };
    }

    if (count === 1) {
        return {
            cells: [
                {
                    colStart: 1,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 1,
                    aspect: "intrinsic",
                },
            ],
            containerAspect: null,
            columns: 1,
            rows: 1,
        };
    }

    if (count === 2) {
        return {
            cells: [
                {
                    colStart: 1,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 1,
                    aspect: "square",
                },
                {
                    colStart: 2,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 1,
                    aspect: "square",
                },
            ],
            containerAspect: 2,
            columns: 2,
            rows: 1,
        };
    }

    if (count === 3) {
        return {
            cells: [
                {
                    colStart: 1,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 2,
                    aspect: "tall",
                },
                {
                    colStart: 2,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 1,
                    aspect: "square",
                },
                {
                    colStart: 2,
                    colSpan: 1,
                    rowStart: 2,
                    rowSpan: 1,
                    aspect: "square",
                },
            ],
            containerAspect: 1,
            columns: 2,
            rows: 2,
        };
    }

    if (count === 4) {
        return {
            cells: [
                {
                    colStart: 1,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 1,
                    aspect: "square",
                },
                {
                    colStart: 2,
                    colSpan: 1,
                    rowStart: 1,
                    rowSpan: 1,
                    aspect: "square",
                },
                {
                    colStart: 1,
                    colSpan: 1,
                    rowStart: 2,
                    rowSpan: 1,
                    aspect: "square",
                },
                {
                    colStart: 2,
                    colSpan: 1,
                    rowStart: 2,
                    rowSpan: 1,
                    aspect: "square",
                },
            ],
            containerAspect: 1,
            columns: 2,
            rows: 2,
        };
    }

    // 5+: 2x3 grid, last cell overflows when count > maxVisible
    const visible = Math.min(count, maxVisible);
    const cells: GridCellSpec[] = [];
    for (let i = 0; i < visible; i += 1) {
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) + 1;
        cells.push({
            colStart: col,
            colSpan: 1,
            rowStart: row,
            rowSpan: 1,
            aspect: "square",
        });
    }
    if (count > maxVisible) {
        const overflowCell = cells[cells.length - 1];
        cells[cells.length - 1] = {
            ...overflowCell,
            isOverflow: true,
            overflowCount: count - maxVisible,
        };
    }
    return {
        cells,
        containerAspect: 3 / 2,
        columns: 3,
        rows: 2,
    };
}
