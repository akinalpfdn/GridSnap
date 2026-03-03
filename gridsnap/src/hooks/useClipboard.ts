import { useCallback } from "react";
import { writeClipboard } from "../services/clipboardService";
import { useVaultStore } from "../stores/vaultStore";

export function useClipboard() {
  const selection = useVaultStore((s) => s.selection);
  const getCellValue = useVaultStore((s) => s.getCellValue);

  const copySelected = useCallback(async () => {
    if (!selection) return false;
    const value = getCellValue(selection.row, selection.col);
    if (!value) return false;
    try {
      await writeClipboard(value);
      return true;
    } catch {
      // Fallback to browser clipboard API
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        return false;
      }
    }
  }, [selection, getCellValue]);

  return { copySelected };
}
