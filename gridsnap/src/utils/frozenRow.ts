import { hitTestIndex } from "./gridMath";

/**
 * Content-coordinate top for the pinned copy of row 0: glued right under the
 * column header band, wherever the viewport is scrolled to.
 */
export function pinnedRowTop(scrollTop: number, headerHeight: number): number {
  return scrollTop + headerHeight;
}

/**
 * Height of the band at the top of the viewport that covers grid content —
 * the column headers, plus row 0 when it is frozen. Scroll-into-view must
 * treat anything under this band as hidden.
 */
export function coveredViewportTop(args: {
  headerHeight: number;
  frozen: boolean;
  row0Height: number;
}): number {
  const { headerHeight, frozen, row0Height } = args;
  return headerHeight + (frozen ? row0Height : 0);
}

/**
 * Maps a viewport-relative Y to a row, honouring the pinned band.
 *
 * When frozen, the band under the header always means row 0 — the rows
 * scrolled beneath it are covered and must not be clickable through it.
 */
export function rowAtViewportY(args: {
  yViewport: number;
  scrollTop: number;
  headerHeight: number;
  frozen: boolean;
  row0Height: number;
  rowSums: number[];
}): number {
  const { yViewport, scrollTop, headerHeight, frozen, row0Height, rowSums } = args;
  // At scroll zero the band coincides with row 0's natural position, so no
  // scroll guard is needed — the two code paths agree there.
  if (frozen) {
    const bandTop = headerHeight;
    const bandBottom = headerHeight + row0Height;
    if (yViewport >= bandTop && yViewport < bandBottom) return 0;
  }
  return hitTestIndex(rowSums, yViewport + scrollTop - headerHeight);
}
