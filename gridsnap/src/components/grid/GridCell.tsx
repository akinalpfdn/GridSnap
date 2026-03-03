import { memo } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { writeClipboard } from "../../services/clipboardService";
import { CellEditor } from "./CellEditor";
import styles from "./GridCell.module.css";

interface GridCellProps {
  row: number;
  col: number;
  left: number;
  top: number;
  width: number;
  height: number;
  value: string;
  isSelected: boolean;
  isEditing: boolean;
  editInitialChar?: string;
  isMasked: boolean;
  isSearchHit: boolean;
}

export const GridCell = memo(function GridCell({
  row,
  col,
  left,
  top,
  width,
  height,
  value,
  isSelected,
  isEditing,
  editInitialChar,
  isMasked,
  isSearchHit,
}: GridCellProps) {
  if (isEditing && isSelected) {
    return (
      <CellEditor
        row={row}
        col={col}
        left={left}
        top={top}
        width={width}
        height={height}
        existingValue={value}
        initialChar={editInitialChar}
      />
    );
  }

  const classNames = [
    styles.cell,
    isSelected && styles.selected,
    isMasked && value && styles.masked,
    isSearchHit && styles.searchHit,
  ]
    .filter(Boolean)
    .join(" ");

  const displayValue = isMasked && value && !isSelected ? "●●●●" : value;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await writeClipboard(value);
    } catch {
      try {
        await navigator.clipboard.writeText(value);
      } catch { /* ignore */ }
    }
  };

  return (
    <div
      className={classNames}
      style={{ position: "absolute", left, top, width, height }}
      onMouseDown={() => useVaultStore.getState().setSelection({ row, col })}
      onDoubleClick={() => {
        const store = useVaultStore.getState();
        store.setSelection({ row, col });
        store.setEditing(true);
      }}
      role="gridcell"
      aria-selected={isSelected}
      data-selected={isSelected}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
        {displayValue}
      </span>
      {isSelected && value && (
        <button
          className={styles.copyBtn}
          onClick={handleCopy}
          title="Copy to clipboard"
          aria-label="Copy cell value"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
      )}
    </div>
  );
});
