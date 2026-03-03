import { useCallback } from "react";
import { writeClipboard } from "../services/clipboardService";
import { useVaultStore } from "../stores/vaultStore";

export function useClipboard() {
  const copySelected = useCallback(async () => {
    const store = useVaultStore.getState();
    const { selection } = store;
    if (!selection) return false;

    const range = store.getSelectionRange();
    if (!range) return false;

    let text: string;
    if (range.startRow === range.endRow && range.startCol === range.endCol) {
      // Single cell
      text = store.getCellValue(range.startRow, range.startCol);
    } else {
      // Range: build TSV (tab-separated values, Excel-compatible)
      const rows: string[] = [];
      for (let r = range.startRow; r <= range.endRow; r++) {
        const cols: string[] = [];
        for (let c = range.startCol; c <= range.endCol; c++) {
          cols.push(store.getCellValue(r, c));
        }
        rows.push(cols.join("\t"));
      }
      text = rows.join("\n");
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

  return { copySelected };
}
