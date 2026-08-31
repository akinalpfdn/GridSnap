import type { Vault } from "../types/vault";
import { encodeCellKey } from "./cellKey";
import { findHits } from "./search";

export interface QuickCopyResult {
  sheetIndex: number;
  sheetName: string;
  row: number;
  col: number;
  value: string;
  /** Preview should be hidden; the value is still copyable, as in the grid. */
  masked: boolean;
}

/** Keeps the list navigable and bounds the work done per keystroke. */
export const QUICK_COPY_LIMIT = 50;

/**
 * How well a value answers the query. Lower is better: an exact match beats a
 * prefix match, which beats a match anywhere in the value. Everything else is
 * left to the caller's ordering.
 */
export function matchRank(value: string, query: string): number {
  const v = value.toLowerCase();
  const q = query.trim().toLowerCase();
  if (v === q) return 0;
  if (v.startsWith(q)) return 1;
  return 2;
}

/**
 * Cells matching `query`, best matches first, ready to show in the palette.
 *
 * Ties keep the order `findHits` produced — sheet-tab order, then reading
 * order — so the list stays stable as the user types.
 */
export function rankResults(args: {
  vault: Vault | null;
  query: string;
  activeSheetIndex: number;
  activeSheetUnlocked: boolean;
  limit?: number;
}): QuickCopyResult[] {
  const { vault, query, activeSheetIndex, activeSheetUnlocked, limit = QUICK_COPY_LIMIT } = args;
  if (!vault) return [];

  const hits = findHits({ vault, query, activeSheetIndex, activeSheetUnlocked });

  const results: QuickCopyResult[] = hits.map((hit) => {
    const sheet = vault.sheets[hit.sheetIndex];
    const key = encodeCellKey(hit.row, hit.col);
    return {
      sheetIndex: hit.sheetIndex,
      sheetName: sheet.name,
      row: hit.row,
      col: hit.col,
      value: sheet.data[key] ?? "",
      masked: sheet.masked || !!sheet.maskedCells?.[key],
    };
  });

  // Array.prototype.sort is stable, so equal ranks keep the hit ordering.
  results.sort((a, b) => matchRank(a.value, query) - matchRank(b.value, query));

  return results.slice(0, limit);
}

/** One line for the list: masked values stay hidden, long values get trimmed. */
export function previewOf(result: QuickCopyResult, maxLength = 80): string {
  if (result.masked) return "●●●●●●";
  const newlineAt = result.value.indexOf("\n");
  const firstLine = newlineAt === -1 ? result.value : `${result.value.slice(0, newlineAt)} …`;
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength)}…` : firstLine;
}
