import { decodeCellKey, encodeCellKey } from "./cellKey";

/** The sheet pieces a structural edit touches, as plain data. */
export interface SheetStructure {
  data: Record<string, string>;
  maskedCells: Record<string, boolean>;
  rowHeights: Record<number, number>;
  columnWidths: Record<number, number>;
}

/**
 * A grid has fixed bounds, so inserting can only shift content into the last
 * row/column if that edge is empty — otherwise cells would silently fall off.
 * These report whether the edge is free.
 */
export function canInsertRow(data: Record<string, string>, totalRows: number): boolean {
  return !Object.keys(data).some((key) => decodeCellKey(key).row === totalRows - 1);
}

export function canInsertColumn(data: Record<string, string>, totalCols: number): boolean {
  return !Object.keys(data).some((key) => decodeCellKey(key).col === totalCols - 1);
}

/** Maps an axis position to its new position, or null when it is removed. */
type AxisMap = (index: number) => number | null;

const identity: AxisMap = (i) => i;

function shiftFrom(index: number): AxisMap {
  return (i) => (i >= index ? i + 1 : i);
}

function collapseAt(index: number): AxisMap {
  return (i) => (i === index ? null : i > index ? i - 1 : i);
}

/**
 * Rebuilds all keyed structures through independent row and column mappings.
 * Row heights follow only the row map and column widths only the column map —
 * deleting column 0 must not disturb a row's height.
 */
function remap(structure: SheetStructure, mapRow: AxisMap, mapCol: AxisMap): SheetStructure {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(structure.data)) {
    const { row, col } = decodeCellKey(key);
    const toRow = mapRow(row);
    const toCol = mapCol(col);
    if (toRow !== null && toCol !== null) data[encodeCellKey(toRow, toCol)] = value;
  }

  const maskedCells: Record<string, boolean> = {};
  for (const key of Object.keys(structure.maskedCells)) {
    if (!structure.maskedCells[key]) continue;
    const { row, col } = decodeCellKey(key);
    const toRow = mapRow(row);
    const toCol = mapCol(col);
    if (toRow !== null && toCol !== null) maskedCells[encodeCellKey(toRow, toCol)] = true;
  }

  const rowHeights: Record<number, number> = {};
  for (const [rowStr, height] of Object.entries(structure.rowHeights)) {
    const to = mapRow(Number(rowStr));
    if (to !== null) rowHeights[to] = height;
  }

  const columnWidths: Record<number, number> = {};
  for (const [colStr, width] of Object.entries(structure.columnWidths)) {
    const to = mapCol(Number(colStr));
    if (to !== null) columnWidths[to] = width;
  }

  return { data, maskedCells, rowHeights, columnWidths };
}

/** Everything at `index` and below moves down one; the caller checks the edge. */
export function insertRow(structure: SheetStructure, index: number): SheetStructure {
  return remap(structure, shiftFrom(index), identity);
}

/** Row `index` disappears; everything below moves up one. */
export function deleteRow(structure: SheetStructure, index: number): SheetStructure {
  return remap(structure, collapseAt(index), identity);
}

export function insertColumn(structure: SheetStructure, index: number): SheetStructure {
  return remap(structure, identity, shiftFrom(index));
}

export function deleteColumn(structure: SheetStructure, index: number): SheetStructure {
  return remap(structure, identity, collapseAt(index));
}
