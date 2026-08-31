import { describe, expect, it } from "vitest";
import { coveredViewportTop, pinnedRowTop, rowAtViewportY } from "../../src/utils/frozenRow";
import { buildPrefixSums } from "../../src/utils/gridMath";

const HEADER = 28;
// 10 rows of 28px; row 0 given a custom height of 40.
const rowSums = buildPrefixSums(10, 28, { 0: 40 });

function hit(yViewport: number, scrollTop: number, frozen: boolean) {
  return rowAtViewportY({
    yViewport,
    scrollTop,
    headerHeight: HEADER,
    frozen,
    row0Height: 40,
    rowSums,
  });
}

describe("pinnedRowTop", () => {
  it("should sit right under the header at any scroll position", () => {
    expect(pinnedRowTop(0, HEADER)).toBe(28);
    expect(pinnedRowTop(500, HEADER)).toBe(528);
  });
});

describe("coveredViewportTop", () => {
  it("should cover only the header when nothing is frozen", () => {
    expect(coveredViewportTop({ headerHeight: HEADER, frozen: false, row0Height: 40 })).toBe(28);
  });

  it("should include the frozen row's own height, not a default", () => {
    expect(coveredViewportTop({ headerHeight: HEADER, frozen: true, row0Height: 40 })).toBe(68);
  });
});

describe("rowAtViewportY", () => {
  it("should map clicks normally when not frozen", () => {
    // Scrolled 100px; click 30px below the header lands in content y=130.
    expect(hit(HEADER + 30, 100, false)).toBe(hitAtContentY(130));
  });

  it("should send clicks in the pinned band to row 0 when frozen and scrolled", () => {
    expect(hit(HEADER + 5, 100, true)).toBe(0);
    expect(hit(HEADER + 39, 100, true)).toBe(0);
  });

  it("should not intercept clicks below the pinned band", () => {
    const below = hit(HEADER + 40, 100, true);
    expect(below).not.toBe(0);
    expect(below).toBe(hitAtContentY(HEADER + 40 + 100 - HEADER));
  });

  it("should map clicks just below the band to row 1 at scroll zero", () => {
    // The band and row 0's natural position coincide here; the boundary at
    // band-bottom must belong to row 1.
    expect(hit(HEADER + 45, 0, true)).toBe(1);
    expect(hit(HEADER + 39, 0, true)).toBe(0);
  });

  it("should return -1 above the grid content", () => {
    expect(hit(2, 0, false)).toBe(-1);
  });
});

/** Reference: direct prefix-sum lookup for a content-coordinate Y. */
function hitAtContentY(contentY: number): number {
  for (let i = 0; i < rowSums.length - 1; i++) {
    if (contentY >= rowSums[i] && contentY < rowSums[i + 1]) return i;
  }
  return -1;
}
