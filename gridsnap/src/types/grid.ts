export interface GridSelection {
  row: number;
  col: number;
}

export interface GridRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
}

export interface VisibleRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}
