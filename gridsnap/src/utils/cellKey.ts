import type { CellKey } from "../types/vault";

export function encodeCellKey(row: number, col: number): CellKey {
  return `${row},${col}`;
}

export function decodeCellKey(key: string): { row: number; col: number } {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}
