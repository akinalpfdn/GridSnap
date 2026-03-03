import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { useGridNavigation } from "../../hooks/useGridNavigation";
import { useColumnResize } from "../../hooks/useColumnResize";
import { useRowResize } from "../../hooks/useRowResize";
import { useClipboard } from "../../hooks/useClipboard";
import { useSearch } from "../../hooks/useSearch";
import { buildPrefixSums, findStartIndex, findEndIndex, colToLetter } from "../../utils/gridMath";
import { GridCell } from "./GridCell";
import styles from "./VirtualGrid.module.css";

const TOTAL_ROWS = 1000;
const TOTAL_COLS = 26;
const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 28;
const ROW_HEADER_WIDTH = 40;
const OVERSCAN = 3;

export function VirtualGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(900);
  const [viewportHeight, setViewportHeight] = useState(600);

  const activeSheet = useVaultStore((s) => s.activeSheet);
  const selection = useVaultStore((s) => s.selection);
  const editing = useVaultStore((s) => s.editing);
  const { handleKeyDown } = useGridNavigation();
  const { onMouseDown: onColResizeDown } = useColumnResize();
  const { onMouseDown: onRowResizeDown } = useRowResize();
  const { copySelected } = useClipboard();
  const { isHit } = useSearch();

  const sheet = activeSheet();
  const columnWidths = sheet?.columnWidths ?? {};
  const rowHeights = sheet?.rowHeights ?? {};
  const isMasked = sheet?.masked ?? false;

  // Prefix sums for positioning
  const colSums = useMemo(
    () => buildPrefixSums(TOTAL_COLS, DEFAULT_COL_WIDTH, columnWidths),
    [columnWidths]
  );
  const rowSums = useMemo(
    () => buildPrefixSums(TOTAL_ROWS, DEFAULT_ROW_HEIGHT, rowHeights),
    [rowHeights]
  );

  const totalWidth = colSums[TOTAL_COLS] + ROW_HEADER_WIDTH;
  const totalHeight = rowSums[TOTAL_ROWS] + DEFAULT_ROW_HEIGHT; // +header row

  // Visible range
  const startRow = Math.max(0, findStartIndex(rowSums, scrollTop) - OVERSCAN);
  const endRow = Math.min(TOTAL_ROWS - 1, findEndIndex(rowSums, scrollTop + viewportHeight) + OVERSCAN);
  const startCol = Math.max(0, findStartIndex(colSums, scrollLeft) - OVERSCAN);
  const endCol = Math.min(TOTAL_COLS - 1, findEndIndex(colSums, scrollLeft + viewportWidth) + OVERSCAN);

  // ResizeObserver for container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setScrollTop(el.scrollTop);
      setScrollLeft(el.scrollLeft);
    }
  }, []);

  // Ctrl+C shortcut
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      handleKeyDown(e);
    },
    [handleKeyDown, copySelected]
  );

  // Render column headers
  const colHeaders: React.ReactNode[] = [];
  for (let c = startCol; c <= endCol; c++) {
    const x = colSums[c] + ROW_HEADER_WIDTH;
    const w = colSums[c + 1] - colSums[c];
    colHeaders.push(
      <div
        key={`ch-${c}`}
        className={styles.columnHeader}
        style={{
          position: "absolute",
          left: x,
          top: 0,
          width: w,
          height: DEFAULT_ROW_HEIGHT,
        }}
      >
        {colToLetter(c)}
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => onColResizeDown(e, c, w)}
        />
      </div>
    );
  }

  // Render row headers
  const rowHeaders: React.ReactNode[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const y = rowSums[r] + DEFAULT_ROW_HEIGHT;
    const h = rowSums[r + 1] - rowSums[r];
    rowHeaders.push(
      <div
        key={`rh-${r}`}
        className={styles.rowHeader}
        style={{
          position: "absolute",
          left: 0,
          top: y,
          width: ROW_HEADER_WIDTH,
          height: h,
        }}
      >
        {r + 1}
        <div
          className={styles.resizeHandleRow}
          onMouseDown={(e) => onRowResizeDown(e, r, h)}
        />
      </div>
    );
  }

  // Render cells
  const cells: React.ReactNode[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const y = rowSums[r] + DEFAULT_ROW_HEIGHT;
    const h = rowSums[r + 1] - rowSums[r];
    for (let c = startCol; c <= endCol; c++) {
      const x = colSums[c] + ROW_HEADER_WIDTH;
      const w = colSums[c + 1] - colSums[c];
      const isSelected = selection?.row === r && selection?.col === c;
      cells.push(
        <GridCell
          key={`${r},${c}`}
          row={r}
          col={c}
          style={{ left: x, top: y, width: w, height: h }}
          isSelected={isSelected}
          isEditing={isSelected && editing}
          isMasked={isMasked}
          isSearchHit={isHit(r, c)}
        />
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="grid"
    >
      <div className={styles.viewport} style={{ width: totalWidth, height: totalHeight }}>
        {/* Corner cell */}
        <div
          className={styles.cornerCell}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: ROW_HEADER_WIDTH,
            height: DEFAULT_ROW_HEIGHT,
          }}
        />
        {colHeaders}
        {rowHeaders}
        {cells}
      </div>
    </div>
  );
}
