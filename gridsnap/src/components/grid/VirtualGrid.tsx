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
import { parseTsv } from "../../utils/tsv";
import { coveredViewportTop, pinnedRowTop, rowAtViewportY } from "../../utils/frozenRow";
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
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number; axis: "row" | "col"; index: number } | null>(null);

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
  const sheetPasswordHash = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.passwordHash ?? null
  );
  const sheetUnlocked = useVaultStore((s) => s.sheetUnlocked);
  const isSheetLocked = !!sheetPasswordHash && !sheetUnlocked;
  const isFrozen = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.frozenFirstRow ?? false
  );

  const { handleKeyDown } = useGridNavigation();
  const { onMouseDown: onColResizeDown } = useColumnResize();
  const { onMouseDown: onRowResizeDown } = useRowResize();
  const { copySelected, cutSelected } = useClipboard();
  const { isHit, isCurrentHit } = useSearch();

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
  const isFrozenRef = useRef(isFrozen);
  isFrozenRef.current = isFrozen;

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
    const col = hitTestIndex(colSumsRef.current, x);
    const row = rowAtViewportY({
      yViewport: e.clientY - rect.top,
      scrollTop: el.scrollTop,
      headerHeight: DEFAULT_ROW_HEIGHT,
      frozen: isFrozenRef.current,
      row0Height: rowSumsRef.current[1] - rowSumsRef.current[0],
      rowSums: rowSumsRef.current,
    });
    if (row < 0 || col < 0) return null;
    return { row, col };
  }, []);

  // Mouse drag for range selection
  const onGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSheetLocked) return;
    // Ignore right-click (handled by onContextMenu)
    if (e.button === 2) return;
    // Ignore if clicking on headers, resize handles, or buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.columnHeader}`) || target.closest(`.${styles.rowHeader}`) || target.closest(`.${styles.cornerCell}`)) return;
    // textarea covers the cell editor: without it a click inside the editor
    // would reselect the cell and commit instead of moving the caret.
    if (target.closest("button") || target.closest("input") || target.closest("textarea")) return;

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
  }, [hitTest, isSheetLocked]);

  // Right-click context menu for cell masking
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (isSheetLocked) return;
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.cornerCell}`)) return;

    // Header right-click: structural operations on that row or column.
    const colHeader = target.closest(`.${styles.columnHeader}`);
    const rowHeader = target.closest(`.${styles.rowHeader}`);
    if (colHeader || rowHeader) {
      e.preventDefault();
      const index = Number((colHeader ?? rowHeader)!.getAttribute("data-index"));
      if (!Number.isNaN(index)) {
        setHeaderMenu({ x: e.clientX, y: e.clientY, axis: colHeader ? "col" : "row", index });
      }
      return;
    }

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
  }, [hitTest, isSheetLocked]);

  // Close context menus on click anywhere
  useEffect(() => {
    if (!contextMenu && !headerMenu) return;
    const close = () => {
      setContextMenu(null);
      setHeaderMenu(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [contextMenu, headerMenu]);

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

  // Search navigation asks the grid to reveal a cell; only the grid knows the
  // prefix sums and the viewport, so the request is fulfilled here.
  const pendingScroll = useVaultStore((s) => s.pendingScroll);
  useEffect(() => {
    if (!pendingScroll) return;
    const el = containerRef.current;
    if (!el) return;

    const cellTop = rowSumsRef.current[pendingScroll.row] + DEFAULT_ROW_HEIGHT;
    const cellBottom = rowSumsRef.current[pendingScroll.row + 1] + DEFAULT_ROW_HEIGHT;
    const cellLeft = colSumsRef.current[pendingScroll.col] + ROW_HEADER_WIDTH;
    const cellRight = colSumsRef.current[pendingScroll.col + 1] + ROW_HEADER_WIDTH;

    const covered = coveredViewportTop({
      headerHeight: DEFAULT_ROW_HEIGHT,
      frozen: isFrozenRef.current && pendingScroll.row !== 0,
      row0Height: rowSumsRef.current[1] - rowSumsRef.current[0],
    });
    // Only move if the cell is outside the viewport, so stepping through
    // neighbouring hits does not jerk the view around.
    if (cellTop < el.scrollTop + covered) {
      el.scrollTop = cellTop - covered - DEFAULT_ROW_HEIGHT;
    } else if (cellBottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = cellBottom - el.clientHeight + DEFAULT_ROW_HEIGHT;
    }
    if (cellLeft < el.scrollLeft + ROW_HEADER_WIDTH) {
      el.scrollLeft = cellLeft - ROW_HEADER_WIDTH * 2;
    } else if (cellRight > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = cellRight - el.clientWidth + ROW_HEADER_WIDTH;
    }

    useVaultStore.getState().requestScroll(null);
  }, [pendingScroll]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setScrollTop(el.scrollTop);
      setScrollLeft(el.scrollLeft);
    }
  }, []);

  /**
   * Writes clipboard text into the grid.
   *
   * `raw` puts the whole clipboard into the selected cell untouched, which is
   * the only way to land a multi-line snippet copied from a terminal in one
   * cell — such text carries no quoting, so the spreadsheet rules would spread
   * it over several rows.
   */
  const pasteAtSelection = useCallback(async (raw: boolean) => {
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
    const grid = raw ? [[text]] : parseTsv(text);

    // Collected and written in one call so a whole pasted block is a single
    // undo step rather than one per cell.
    const cells: { row: number; col: number; value: string }[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const targetRow = row + r;
        const targetCol = col + c;
        if (targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
          cells.push({ row: targetRow, col: targetCol, value: grid[r][c] });
        }
      }
    }
    store.setCells(cells);

    // Select the pasted range
    const widest = Math.max(...grid.map((r) => r.length));
    if (grid.length > 1 || widest > 1) {
      store.setSelectionEnd({
        row: Math.min(row + grid.length - 1, TOTAL_ROWS - 1),
        col: Math.min(col + widest - 1, TOTAL_COLS - 1),
      });
    }
  }, []);

  // Keyboard shortcuts
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSheetLocked) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        cutSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        // Shift bypasses the spreadsheet rules: whole clipboard, one cell.
        pasteAtSelection(e.shiftKey);
        return;
      }
      // Undo/redo are skipped while a cell is being edited so the input keeps
      // its own native undo.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (useVaultStore.getState().editing) return;
        e.preventDefault();
        if (e.shiftKey) {
          useVaultStore.getState().redo();
        } else {
          useVaultStore.getState().undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (useVaultStore.getState().editing) return;
        e.preventDefault();
        useVaultStore.getState().redo();
        return;
      }
      handleKeyDown(e);
    },
    [handleKeyDown, copySelected, cutSelected, pasteAtSelection, isSheetLocked]
  );

  // Render column headers — pinned by translating with the vertical scroll
  const colHeaders: React.ReactNode[] = [];
  for (let c = startCol; c <= endCol; c++) {
    const x = colSums[c] + ROW_HEADER_WIDTH;
    const w = colSums[c + 1] - colSums[c];
    colHeaders.push(
      <div
        key={`ch-${c}`}
        className={styles.columnHeader}
        data-index={c}
        style={{
          position: "absolute",
          left: x,
          top: scrollTop,
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

  // Render row headers — pinned by translating with the horizontal scroll
  const rowHeaders: React.ReactNode[] = [];
  for (let r = startRow; r <= endRow; r++) {
    if (isFrozen && r === 0) continue; // rendered pinned below
    const y = rowSums[r] + DEFAULT_ROW_HEIGHT;
    const h = rowSums[r + 1] - rowSums[r];
    rowHeaders.push(
      <div
        key={`rh-${r}`}
        className={styles.rowHeader}
        data-index={r}
        style={{
          position: "absolute",
          left: scrollLeft,
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
    if (isFrozen && r === 0) continue; // rendered pinned below
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
          isMasked={isSheetLocked || isMasked || (maskedCells?.[cellKey] === true)}
          isSearchHit={isHit(r, c)}
          isCurrentSearchHit={isCurrentHit(r, c)}
        />
      );
    }
  }

  // The frozen copy of row 0: same cells, same interactions, glued under the
  // column headers. Rendered instead of the in-place row, so at scroll zero it
  // simply occupies row 0's natural position.
  const frozenRow: React.ReactNode[] = [];
  if (isFrozen) {
    const row0Height = rowSums[1] - rowSums[0];
    const pinnedTop = pinnedRowTop(scrollTop, DEFAULT_ROW_HEIGHT);
    for (let c = startCol; c <= endCol; c++) {
      const x = colSums[c] + ROW_HEADER_WIDTH;
      const w = colSums[c + 1] - colSums[c];
      const isAnchor = selection?.row === 0 && selection?.col === c;
      const isInRange = 0 >= rangeMinRow && 0 <= rangeMaxRow && c >= rangeMinCol && c <= rangeMaxCol;
      const cellKey = encodeCellKey(0, c);
      frozenRow.push(
        <GridCell
          key={`fz-${cellKey}`}
          row={0}
          col={c}
          left={x}
          top={pinnedTop}
          width={w}
          height={row0Height}
          value={safeData[cellKey] ?? ""}
          isSelected={isAnchor}
          isInRange={hasRange && isInRange}
          isEditing={isAnchor && editing}
          editInitialChar={isAnchor && editing ? editInitialChar : undefined}
          isMasked={isSheetLocked || isMasked || (maskedCells?.[cellKey] === true)}
          isSearchHit={isHit(0, c)}
          isCurrentSearchHit={isCurrentHit(0, c)}
        />
      );
    }
    frozenRow.push(
      <div
        key="fz-rh"
        className={styles.rowHeader}
        data-index={0}
        style={{
          position: "absolute",
          left: scrollLeft,
          top: pinnedTop,
          width: ROW_HEADER_WIDTH,
          height: row0Height,
        }}
      >
        1
        <div className={styles.resizeHandleRow} onMouseDown={(e) => onRowResizeDown(e, 0, row0Height)} />
      </div>
    );
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
            left: scrollLeft,
            top: scrollTop,
            width: ROW_HEADER_WIDTH,
            height: DEFAULT_ROW_HEIGHT,
          }}
        />
        {cells}
        {isFrozen && (
          <div className={styles.frozenRowLayer}>{frozenRow}</div>
        )}
        {colHeaders}
        {rowHeaders}
      </div>
      {headerMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: headerMenu.x, top: headerMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(() => {
            const { axis, index } = headerMenu;
            const run = (op: "insertRow" | "deleteRow" | "insertColumn" | "deleteColumn", at: number) => {
              const done = useVaultStore.getState().applyStructural(op, at);
              setHeaderMenu(null);
              if (!done) {
                // The only refusal: the far edge holds data that would fall off.
                window.dispatchEvent(new CustomEvent("gridsnap:edge-blocked"));
              }
            };
            const name = axis === "row" ? `row ${index + 1}` : `column ${colToLetter(index)}`;
            return axis === "row" ? (
              <>
                <button className={styles.contextMenuItem} onClick={() => run("insertRow", index)}>
                  Insert row above
                </button>
                <button className={styles.contextMenuItem} onClick={() => run("insertRow", index + 1)}>
                  Insert row below
                </button>
                <button className={styles.contextMenuItem} onClick={() => run("deleteRow", index)}>
                  Delete {name}
                </button>
              </>
            ) : (
              <>
                <button className={styles.contextMenuItem} onClick={() => run("insertColumn", index)}>
                  Insert column left
                </button>
                <button className={styles.contextMenuItem} onClick={() => run("insertColumn", index + 1)}>
                  Insert column right
                </button>
                <button className={styles.contextMenuItem} onClick={() => run("deleteColumn", index)}>
                  Delete {name}
                </button>
              </>
            );
          })()}
        </div>
      )}
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
