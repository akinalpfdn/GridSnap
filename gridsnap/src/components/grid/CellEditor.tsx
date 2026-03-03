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

export function CellEditor({ row, col, left, top, width, height, existingValue, initialChar }: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);
  const valueRef = useRef(initialChar !== undefined ? initialChar : existingValue);

  const [localValue, setLocalValue] = useState(valueRef.current);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      if (initialChar === undefined) {
        el.select();
      } else {
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
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

  return (
    <input
      ref={inputRef}
      className={styles.cell}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        background: "var(--gs-bg-overlay)",
        outline: "2px solid var(--gs-accent)",
        outlineOffset: "-1px",
        zIndex: 10,
        padding: "0 6px",
        cursor: "text",
      }}
      value={localValue}
      onChange={(e) => {
        const v = e.target.value;
        valueRef.current = v;
        setLocalValue(v);
      }}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
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
        e.stopPropagation();
      }}
    />
  );
}
