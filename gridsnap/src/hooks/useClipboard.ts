import { useCallback } from "react";
import { writeClipboard } from "../services/clipboardService";
import { useVaultStore } from "../stores/vaultStore";
import { encodeTsv } from "../utils/tsv";

export function useClipboard() {
  const copySelected = useCallback(async () => {
    const store = useVaultStore.getState();
    const { selection } = store;
    if (!selection) return false;

    const range = store.getSelectionRange();
    if (!range) return false;

    let text: string;
    if (range.startRow === range.endRow && range.startCol === range.endCol) {
      // A single cell travels verbatim. Quoting a multi-line SSH command on its
      // way to a terminal would be wrong far more often than it would be right;
      // Ctrl+Shift+V puts such a value back into one cell.
      text = store.getCellValue(range.startRow, range.startCol);
    } else {
      // A range carries structure, so it is encoded as spreadsheet TSV.
      const rows: string[][] = [];
      for (let r = range.startRow; r <= range.endRow; r++) {
        const cols: string[] = [];
        for (let c = range.startCol; c <= range.endCol; c++) {
          cols.push(store.getCellValue(r, c));
        }
        rows.push(cols);
      }
      text = encodeTsv(rows);
    }

    if (!text) return false;

    try {
      await writeClipboard(text);
      return true;
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  /**
   * Copy, then clear — and only clear if the copy actually landed, so a
   * clipboard failure cannot destroy the cells it failed to capture.
   */
  const cutSelected = useCallback(async () => {
    const copied = await copySelected();
    if (!copied) return false;
    useVaultStore.getState().clearSelection();
    return true;
  }, [copySelected]);

  return { copySelected, cutSelected };
}
