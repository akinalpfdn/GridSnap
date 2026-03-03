import { useEffect, useRef } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import styles from "./GridCell.module.css";

interface CellEditorProps {
  row: number;
  col: number;
  style: React.CSSProperties;
}

export function CellEditor({ row, col, style }: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const getCellValue = useVaultStore((s) => s.getCellValue);
  const setCellValue = useVaultStore((s) => s.setCellValue);
  const setEditing = useVaultStore((s) => s.setEditing);
  const setSelection = useVaultStore((s) => s.setSelection);

  const value = getCellValue(row, col);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const commit = (newValue: string) => {
    setCellValue(row, col, newValue);
    setEditing(false);
  };

  return (
    <input
      ref={inputRef}
      className={styles.cell}
      style={{
        ...style,
        background: "var(--gs-bg-overlay)",
        outline: "2px solid var(--gs-accent)",
        outlineOffset: "-1px",
        zIndex: 10,
        padding: "0 6px",
        cursor: "text",
      }}
      defaultValue={value}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          commit(e.currentTarget.value);
          setSelection({ row: row + 1, col });
        } else if (e.key === "Tab") {
          e.preventDefault();
          commit(e.currentTarget.value);
          setSelection({ row, col: col + (e.shiftKey ? -1 : 1) });
        } else if (e.key === "Escape") {
          setEditing(false);
        }
        e.stopPropagation();
      }}
    />
  );
}
