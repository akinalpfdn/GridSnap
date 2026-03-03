import { memo } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { useClipboard } from "../../hooks/useClipboard";
import { CellEditor } from "./CellEditor";
import styles from "./GridCell.module.css";

interface GridCellProps {
  row: number;
  col: number;
  style: React.CSSProperties;
  isSelected: boolean;
  isEditing: boolean;
  isMasked: boolean;
  isSearchHit: boolean;
}

export const GridCell = memo(function GridCell({
  row,
  col,
  style,
  isSelected,
  isEditing,
  isMasked,
  isSearchHit,
}: GridCellProps) {
  const getCellValue = useVaultStore((s) => s.getCellValue);
  const setSelection = useVaultStore((s) => s.setSelection);
  const setEditing = useVaultStore((s) => s.setEditing);
  const { copySelected } = useClipboard();

  const value = getCellValue(row, col);

  if (isEditing && isSelected) {
    return <CellEditor row={row} col={col} style={style} />;
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

  return (
    <div
      className={classNames}
      style={style}
      onMouseDown={() => setSelection({ row, col })}
      onDoubleClick={() => {
        setSelection({ row, col });
        setEditing(true);
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
          onClick={(e) => {
            e.stopPropagation();
            copySelected();
          }}
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
