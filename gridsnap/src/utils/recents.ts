import type { RecentCopy, Vault } from "../types/vault";
import { encodeCellKey } from "./cellKey";
import { isSheetSearchable } from "./search";
import type { QuickCopyResult } from "./quickCopy";

/** Enough to cover a day's habits without turning into a history feature. */
export const RECENT_COPIES_CAP = 10;

/**
 * Front-inserts a copy record. Copying a cell that is already listed moves it
 * to the front instead of duplicating it; the cap drops the oldest entry.
 */
export function pushRecent(
  list: RecentCopy[],
  entry: RecentCopy,
  cap = RECENT_COPIES_CAP
): RecentCopy[] {
  const rest = list.filter(
    (r) => !(r.sheetId === entry.sheetId && r.row === entry.row && r.col === entry.col)
  );
  return [entry, ...rest].slice(0, cap);
}

/**
 * Turns stored records into palette rows, silently dropping anything that no
 * longer resolves: a deleted sheet, a cleared cell, or a sheet that is locked
 * right now. Stale entries stay in the vault — the cell may return, and the
 * lock may open — they are just not shown.
 */
export function resolveRecents(args: {
  vault: Vault | null;
  activeSheetIndex: number;
  activeSheetUnlocked: boolean;
}): QuickCopyResult[] {
  const { vault, activeSheetIndex, activeSheetUnlocked } = args;
  if (!vault) return [];

  const results: QuickCopyResult[] = [];
  for (const recent of vault.recentCopies ?? []) {
    const sheetIndex = vault.sheets.findIndex((s) => s.id === recent.sheetId);
    if (sheetIndex === -1) continue;
    const sheet = vault.sheets[sheetIndex];
    if (
      !isSheetSearchable({
        passwordHash: sheet.passwordHash,
        sheetIndex,
        activeSheetIndex,
        activeSheetUnlocked,
      })
    ) {
      continue;
    }
    const key = encodeCellKey(recent.row, recent.col);
    const value = sheet.data[key];
    if (!value) continue;

    results.push({
      sheetIndex,
      sheetName: sheet.name,
      row: recent.row,
      col: recent.col,
      value,
      masked: sheet.masked || !!sheet.maskedCells?.[key],
    });
  }
  return results;
}
