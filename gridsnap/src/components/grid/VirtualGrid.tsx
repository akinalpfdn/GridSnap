import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { useGridNavigation } from "../../hooks/useGridNavigation";
import { useColumnResize } from "../../hooks/useColumnResize";
import { useRowResize } from "../../hooks/useRowResize";
import { useClipboard } from "../../hooks/useClipboard";
import { useSearch } from "../../hooks/useSearch";
import { readClipboard } from "../../services/clipboardService";
import { buildPrefixSums, findStartIndex, findEndIndex, colToLetter, hitTestIndex } from "../../utils/gridMath";
import { encodeCellKey } from "../../utils/cellKey";
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
  const draggingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const selection = useVaultStore((s) => s.selection);
  const selectionEnd = useVaultStore((s) => s.selectionEnd);
  const editing = useVaultStore((s) => s.editing);
  const editInitialChar = useVaultStore((s) => s.editInitialChar);
  // Subscribe to specific sheet properties separately for optimal re-renders
  const sheetData = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.data
  );
  const columnWidths = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.columnWidths
  );
  const rowHeights = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.rowHeights
  );
  const isMasked = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.masked ?? false
  );
  const maskedCells = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.maskedCells
  );

  const { handleKeyDown } = useGridNavigation();
  const { onMouseDown: onColResizeDown } = useColumnResize();
  const { onMouseDown: onRowResizeDown } = useRowResize();
  const { copySelected } = useClipboard();
  const { isHit } = useSearch();

  const safeColumnWidths = columnWidths ?? {};
  const safeRowHeights = rowHeights ?? {};
  const safeData = sheetData ?? {};

  // Prefix sums for positioning
  const colSums = useMemo(
    () => buildPrefixSums(TOTAL_COLS, DEFAULT_COL_WIDTH, safeColumnWidths),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnWidths]
  );
  const rowSums = useMemo(
    () => buildPrefixSums(TOTAL_ROWS, DEFAULT_ROW_HEIGHT, safeRowHeights),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowHeights]
  );

  // Store refs for use in mouse handlers (avoid stale closures)
  const colSumsRef = useRef(colSums);
  colSumsRef.current = colSums;
  const rowSumsRef = useRef(rowSums);
  rowSumsRef.current = rowSums;

  const totalWidth = colSums[TOTAL_COLS] + ROW_HEADER_WIDTH;
  const totalHeight = rowSums[TOTAL_ROWS] + DEFAULT_ROW_HEIGHT; // +header row

  // Visible range
  const startRow = Math.max(0, findStartIndex(rowSums, scrollTop) - OVERSCAN);
  const endRow = Math.min(TOTAL_ROWS - 1, findEndIndex(rowSums, scrollTop + viewportHeight) + OVERSCAN);
  const startCol = Math.max(0, findStartIndex(colSums, scrollLeft) - OVERSCAN);
  const endCol = Math.min(TOTAL_COLS - 1, findEndIndex(colSums, scrollLeft + viewportWidth) + OVERSCAN);

  // Compute selection range bounds for cell rendering
  const end = selectionEnd ?? selection;
  const rangeMinRow = selection && end ? Math.min(selection.row, end.row) : -1;
  const rangeMaxRow = selection && end ? Math.max(selection.row, end.row) : -1;
  const rangeMinCol = selection && end ? Math.min(selection.col, end.col) : -1;
  const rangeMaxCol = selection && end ? Math.max(selection.col, end.col) : -1;
  const hasRange = selectionEnd !== null && selection !== null;

  // Hit-test: map mouse event to cell coordinates
  const hitTest = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft - ROW_HEADER_WIDTH;
    const y = e.clientY - rect.top + el.scrollTop - DEFAULT_ROW_HEIGHT;
    const col = hitTestIndex(colSumsRef.current, x);
    const row = hitTestIndex(rowSumsRef.current, y);
    if (row < 0 || col < 0) return null;
    return { row, col };
  }, []);

  // Mouse drag for range selection
  const onGridMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore right-click (handled by onContextMenu)
    if (e.button === 2) return;
    // Ignore if clicking on headers, resize handles, or buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.columnHeader}`) || target.closest(`.${styles.rowHeader}`) || target.closest(`.${styles.cornerCell}`)) return;
    if (target.closest("button") || target.closest("input")) return;

    const cell = hitTest(e);
    if (!cell) return;

    const store = useVaultStore.getState();
    if (e.shiftKey && store.selection) {
      // Shift+click extends range
      store.setSelectionEnd(cell);
    } else {
      store.setSelection(cell);
      draggingRef.current = true;
    }
  }, [hitTest]);

  // Right-click context menu for cell masking
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.columnHeader}`) || target.closest(`.${styles.rowHeader}`) || target.closest(`.${styles.cornerCell}`)) return;

    const cell = hitTest(e);
    if (!cell) return;

    // Select the cell if nothing selected
    const store = useVaultStore.getState();
    if (!store.selection) {
      store.setSelection(cell);
    }

    // Don't show context menu on sheet-level masked sheets
    const sheet = store.vault?.sheets[store.activeSheetIndex];
    if (sheet?.masked) return;

    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [hitTest]);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [contextMenu]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const cell = hitTest(e);
      if (!cell) return;
      const store = useVaultStore.getState();
      const sel = store.selection;
      if (sel && (cell.row !== sel.row || cell.col !== sel.col)) {
        // Only set selectionEnd if different from anchor (creates a range)
        const curEnd = store.selectionEnd;
        if (!curEnd || curEnd.row !== cell.row || curEnd.col !== cell.col) {
          store.setSelectionEnd(cell);
        }
      }
    };
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [hitTest]);

  // Refocus grid container when selection changes and not editing
  useEffect(() => {
    if (selection && !editing && containerRef.current) {
      containerRef.current.focus();
    }
  }, [selection, editing]);

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

  // Paste TSV/plain text at current selection
  const pasteAtSelection = useCallback(async () => {
    const store = useVaultStore.getState();
    if (!store.selection || store.editing) return;
    let text: string;
    try {
      text = await readClipboard();
    } catch {
      return;
    }
    if (!text) return;
    const { row, col } = store.selection;
    const lines = text.split(/\r?\n/);
    for (let r = 0; r < lines.length; r++) {
      const cols = lines[r].split("\t");
      for (let c = 0; c < cols.length; c++) {
        const targetRow = row + r;
        const targetCol = col + c;
        if (targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
          store.setCellValue(targetRow, targetCol, cols[c]);
        }
      }
    }
    // Select the pasted range
    if (lines.length > 1 || (lines[0] && lines[0].includes("\t"))) {
      const lastLine = lines[lines.length - 1];
      const lastColCount = lastLine.split("\t").length;
      store.setSelectionEnd({
        row: Math.min(row + lines.length - 1, TOTAL_ROWS - 1),
        col: Math.min(col + lastColCount - 1, TOTAL_COLS - 1),
      });
    }
  }, []);

  // Keyboard shortcuts
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteAtSelection();
        return;
      }
      handleKeyDown(e);
    },
    [handleKeyDown, copySelected, pasteAtSelection]
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

  // Render cells — pass all values as primitive props so memo works
  const cells: React.ReactNode[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const y = rowSums[r] + DEFAULT_ROW_HEIGHT;
    const h = rowSums[r + 1] - rowSums[r];
    for (let c = startCol; c <= endCol; c++) {
      const x = colSums[c] + ROW_HEADER_WIDTH;
      const w = colSums[c + 1] - colSums[c];
      const isAnchor = selection?.row === r && selection?.col === c;
      const isInRange = r >= rangeMinRow && r <= rangeMaxRow && c >= rangeMinCol && c <= rangeMaxCol;
      const cellKey = encodeCellKey(r, c);
      cells.push(
        <GridCell
          key={cellKey}
          row={r}
          col={c}
          left={x}
          top={y}
          width={w}
          height={h}
          value={safeData[cellKey] ?? ""}
          isSelected={isAnchor}
          isInRange={hasRange && isInRange}
          isEditing={isAnchor && editing}
          editInitialChar={isAnchor && editing ? editInitialChar : undefined}
          isMasked={isMasked || (maskedCells?.[cellKey] === true)}
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
      onMouseDown={onGridMouseDown}
      onContextMenu={onContextMenu}
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
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              useVaultStore.getState().toggleCellMask(true);
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Mask cells
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              useVaultStore.getState().toggleCellMask(false);
              setContextMenu(null);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 019.9-1" />
            </svg>
            Unmask cells
          </button>
        </div>
      )}
    </div>
  );
}
