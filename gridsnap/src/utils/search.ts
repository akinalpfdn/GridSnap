import type { Vault } from "../types/vault";
import { decodeCellKey } from "./cellKey";

export interface SearchHit {
  sheetIndex: number;
  row: number;
  col: number;
}

/**
 * Whether a sheet's contents may be searched.
 *
 * A password-protected sheet is only readable while it is the active sheet and
 * has been unlocked this session — the store tracks one unlock flag, for the
 * active sheet. Searching a locked sheet would leak the locations, and with a
 * narrow enough query the contents, of data behind a password.
 */
export function isSheetSearchable(args: {
  passwordHash: string | null;
  sheetIndex: number;
  activeSheetIndex: number;
  activeSheetUnlocked: boolean;
}): boolean {
  const { passwordHash, sheetIndex, activeSheetIndex, activeSheetUnlocked } = args;
  if (!passwordHash) return true;
  return sheetIndex === activeSheetIndex && activeSheetUnlocked;
}

/**
 * Every cell across the vault matching `query`, in sheet-tab order and then
 * reading order, so stepping through hits follows what the user sees.
 */
export function findHits(args: {
  vault: Vault | null;
  query: string;
  activeSheetIndex: number;
  activeSheetUnlocked: boolean;
}): SearchHit[] {
  const { vault, query, activeSheetIndex, activeSheetUnlocked } = args;
  const needle = query.trim().toLowerCase();
  if (!vault || !needle) return [];

  const hits: SearchHit[] = [];
  vault.sheets.forEach((sheet, sheetIndex) => {
    if (
      !isSheetSearchable({
        passwordHash: sheet.passwordHash,
        sheetIndex,
        activeSheetIndex,
        activeSheetUnlocked,
      })
    ) {
      return;
    }

    const matches: SearchHit[] = [];
    for (const [key, value] of Object.entries(sheet.data)) {
      if (!value.toLowerCase().includes(needle)) continue;
      const { row, col } = decodeCellKey(key);
      matches.push({ sheetIndex, row, col });
    }
    // Insertion order of the sparse map is arbitrary, so order explicitly.
    matches.sort((a, b) => a.row - b.row || a.col - b.col);
    hits.push(...matches);
  });

  return hits;
}

/** Steps through hits with wrap-around in both directions. */
export function stepHitIndex(current: number, total: number, direction: 1 | -1): number {
  if (total === 0) return -1;
  if (current < 0) return direction === 1 ? 0 : total - 1;
  return (current + direction + total) % total;
}
