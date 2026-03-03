import { useCallback } from "react";
import { useVaultStore } from "../stores/vaultStore";

const MAX_ROWS = 1000;
const MAX_COLS = 26;

export function useGridNavigation() {
  const selection = useVaultStore((s) => s.selection);
  const setSelection = useVaultStore((s) => s.setSelection);
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
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelection({ row: Math.max(row - 1, 0), col });
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelection({ row: Math.min(row + 1, MAX_ROWS - 1), col });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setSelection({ row, col: Math.max(col - 1, 0) });
          break;
        case "ArrowRight":
          e.preventDefault();
          setSelection({ row, col: Math.min(col + 1, MAX_COLS - 1) });
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
          setSelection(null);
          break;
        case "Delete":
        case "Backspace":
          useVaultStore.getState().clearCell(row, col);
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
    [selection, editing, setSelection, setEditing]
  );

  return { handleKeyDown };
}
