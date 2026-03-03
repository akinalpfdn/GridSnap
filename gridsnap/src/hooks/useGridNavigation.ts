import { useCallback } from "react";
import { useVaultStore } from "../stores/vaultStore";

const MAX_ROWS = 1000;
const MAX_COLS = 26;

export function useGridNavigation() {
  const selection = useVaultStore((s) => s.selection);
  const selectionEnd = useVaultStore((s) => s.selectionEnd);
  const setSelection = useVaultStore((s) => s.setSelection);
  const setSelectionEnd = useVaultStore((s) => s.setSelectionEnd);
  const editing = useVaultStore((s) => s.editing);
  const setEditing = useVaultStore((s) => s.setEditing);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selection) return;

      const { row, col } = selection;

      if (editing) {
        if (e.key === "Escape") {
          setEditing(false);
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          setEditing(false);
          setSelection({ row: Math.min(row + 1, MAX_ROWS - 1), col });
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          setEditing(false);
          if (e.shiftKey) {
            setSelection({ row, col: Math.max(col - 1, 0) });
          } else {
            setSelection({ row, col: Math.min(col + 1, MAX_COLS - 1) });
          }
          return;
        }
        return; // Let other keys go to the input
      }

      // Navigation mode
      // Determine the "cursor" position (end of range or selection)
      const cursor = selectionEnd ?? selection;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectionEnd({ row: Math.max((cursor.row) - 1, 0), col: cursor.col });
          } else {
            setSelection({ row: Math.max(row - 1, 0), col });
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectionEnd({ row: Math.min((cursor.row) + 1, MAX_ROWS - 1), col: cursor.col });
          } else {
            setSelection({ row: Math.min(row + 1, MAX_ROWS - 1), col });
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectionEnd({ row: cursor.row, col: Math.max((cursor.col) - 1, 0) });
          } else {
            setSelection({ row, col: Math.max(col - 1, 0) });
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectionEnd({ row: cursor.row, col: Math.min((cursor.col) + 1, MAX_COLS - 1) });
          } else {
            setSelection({ row, col: Math.min(col + 1, MAX_COLS - 1) });
          }
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            setSelection({ row, col: Math.max(col - 1, 0) });
          } else {
            setSelection({ row, col: Math.min(col + 1, MAX_COLS - 1) });
          }
          break;
        case "Enter":
          setEditing(true);
          break;
        case "Escape":
          if (selectionEnd) {
            // First Escape clears the range, keeps anchor
            setSelectionEnd(null);
          } else {
            setSelection(null);
          }
          break;
        case "Delete":
        case "Backspace":
          useVaultStore.getState().clearSelection();
          break;
        default:
          // Type-to-edit: any printable character starts editing with that char
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setEditing(true, e.key);
          }
          break;
      }
    },
    [selection, selectionEnd, editing, setSelection, setSelectionEnd, setEditing]
  );

  return { handleKeyDown };
}
