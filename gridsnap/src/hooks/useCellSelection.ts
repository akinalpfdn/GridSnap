import { useCallback, useRef } from "react";
import { useVaultStore } from "../stores/vaultStore";

export function useCellSelection() {
  const selection = useVaultStore((s) => s.selection);
  const setSelection = useVaultStore((s) => s.setSelection);
  const setEditing = useVaultStore((s) => s.setEditing);
  const draggingRef = useRef(false);

  const select = useCallback(
    (row: number, col: number) => {
      if (draggingRef.current) return;
      setSelection({ row, col });
    },
    [setSelection]
  );

  const deselect = useCallback(() => {
    setSelection(null);
    setEditing(false);
  }, [setSelection, setEditing]);

  const isSelected = useCallback(
    (row: number, col: number) => {
      return selection?.row === row && selection?.col === col;
    },
    [selection]
  );

  return { selection, select, deselect, isSelected, draggingRef };
}
