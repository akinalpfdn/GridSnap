import { useEffect, useRef, useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import styles from "./GridCell.module.css";

interface CellEditorProps {
  row: number;
  col: number;
  left: number;
  top: number;
  width: number;
  height: number;
  existingValue: string;
  initialChar?: string;
}

/** How far the editor may grow before it scrolls instead. */
const MAX_EDITOR_HEIGHT = 220;

export function CellEditor({ row, col, left, top, width, height, existingValue, initialChar }: CellEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const committedRef = useRef(false);
  const valueRef = useRef(initialChar !== undefined ? initialChar : existingValue);

  const [localValue, setLocalValue] = useState(valueRef.current);

  // Grow with the content so a multi-line value is fully visible while editing.
  const resize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = `${height}px`;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, height), MAX_EDITOR_HEIGHT)}px`;
  };

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      if (initialChar === undefined) {
        el.select();
      } else {
        el.setSelectionRange(el.value.length, el.value.length);
      }
      resize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChar]);

  // Commit on unmount (handles click-away case)
  // Reset committedRef on (re)mount to handle React StrictMode's unmount/remount cycle
  useEffect(() => {
    committedRef.current = false;
    return () => {
      if (!committedRef.current) {
        committedRef.current = true;
        useVaultStore.getState().setCellValue(row, col, valueRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const store = useVaultStore.getState();
    store.setCellValue(row, col, valueRef.current);
    store.setEditing(false);
  };

  const setValue = (next: string) => {
    valueRef.current = next;
    setLocalValue(next);
  };

  /**
   * Enter commits, so a newline needs its own chord. Inserted by hand rather
   * than left to the textarea, which would otherwise never see the key.
   */
  const insertNewline = () => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${localValue.slice(0, start)}\n${localValue.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 1;
      resize();
    });
  };

  return (
    <textarea
      ref={inputRef}
      className={styles.cellEditor}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        zIndex: 10,
      }}
      value={localValue}
      onChange={(e) => {
        setValue(e.target.value);
        resize();
      }}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey || e.altKey)) {
          e.preventDefault();
          insertNewline();
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
          useVaultStore.getState().setSelection({ row: row + 1, col });
        } else if (e.key === "Tab") {
          e.preventDefault();
          commit();
          useVaultStore.getState().setSelection({ row, col: col + (e.shiftKey ? -1 : 1) });
        } else if (e.key === "Escape") {
          committedRef.current = true; // skip save on escape
          useVaultStore.getState().setEditing(false);
        }
        // Everything else, paste included, is handled natively by the textarea
        // and must not reach the grid's own shortcut handler.
        e.stopPropagation();
      }}
      onPaste={() => requestAnimationFrame(resize)}
    />
  );
}
