import { create } from "zustand";
import type { Sheet, Vault } from "../types/vault";
import { pushRecent } from "../utils/recents";
import type { GridSelection, GridRange } from "../types/grid";
import { encodeCellKey, decodeCellKey } from "../utils/cellKey";
import { saveVault } from "../services/vaultService";

/** One cell's value before and after a write. `undefined` means the cell is empty. */
interface CellChange {
  key: string;
  before: string | undefined;
  after: string | undefined;
}

/** One undoable step. A paste of 500 cells is a single entry, not 500. */
interface HistoryEntry {
  changes: CellChange[];
}

/**
 * History is kept per sheet id rather than per sheet index: indices shift when
 * sheets are added, removed or reordered, and undoing into a password-protected
 * sheet the user has not unlocked would work around that lock.
 */
type HistoryStacks = Record<string, HistoryEntry[]>;

const MAX_HISTORY = 100;

function pushHistory(stacks: HistoryStacks, sheetId: string, entry: HistoryEntry): HistoryStacks {
  return { ...stacks, [sheetId]: [...(stacks[sheetId] ?? []), entry].slice(-MAX_HISTORY) };
}

function applyChanges(
  data: Record<string, string>,
  changes: CellChange[],
  direction: "before" | "after"
): Record<string, string> {
  const next = { ...data };
  for (const change of changes) {
    const value = direction === "before" ? change.before : change.after;
    if (value === undefined) {
      delete next[change.key];
    } else {
      next[change.key] = value;
    }
  }
  return next;
}

/**
 * Selection covering what an entry touched, so undo/redo shows its own effect.
 * A single cell yields no `end`, keeping it an ordinary selection rather than a
 * 1x1 range — ranges suppress the per-cell copy button.
 */
function changedSelection(changes: CellChange[]): {
  selection: GridSelection;
  selectionEnd: GridSelection | null;
} {
  const cells = changes.map((c) => decodeCellKey(c.key));
  const start = {
    row: Math.min(...cells.map((c) => c.row)),
    col: Math.min(...cells.map((c) => c.col)),
  };
  const end = {
    row: Math.max(...cells.map((c) => c.row)),
    col: Math.max(...cells.map((c) => c.col)),
  };
  const isSingleCell = start.row === end.row && start.col === end.col;
  return { selection: start, selectionEnd: isSingleCell ? null : end };
}

interface VaultStore {
  // State
  vault: Vault | null;
  activeSheetIndex: number;
  selection: GridSelection | null;
  selectionEnd: GridSelection | null;
  editing: boolean;
  editInitialChar: string | undefined;
  searchQuery: string;
  /** Position within the current search results; -1 when none is targeted. */
  activeHitIndex: number;
  /** Cell the grid should scroll into view, cleared once it has. */
  pendingScroll: GridSelection | null;
  locked: boolean;
  dirty: boolean;
  saving: boolean;
  hasPassword: boolean;
  sheetUnlocked: boolean;
  undoStacks: HistoryStacks;
  redoStacks: HistoryStacks;

  // Computed-like
  activeSheet: () => Sheet | undefined;
  getSelectionRange: () => GridRange | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  setVault: (vault: Vault) => void;
  setActiveSheet: (index: number, options?: { keepSearch?: boolean }) => void;
  setSelection: (sel: GridSelection | null) => void;
  setSelectionEnd: (sel: GridSelection | null) => void;
  setEditing: (editing: boolean, initialChar?: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveHitIndex: (index: number) => void;
  requestScroll: (cell: GridSelection | null) => void;
  setLocked: (locked: boolean) => void;
  setHasPassword: (hasPassword: boolean) => void;
  setSheetUnlocked: (unlocked: boolean) => void;

  // Cell operations
  setCellValue: (row: number, col: number, value: string) => void;
  /** Writes many cells as ONE undoable step — use this for paste and range clears. */
  setCells: (cells: { row: number; col: number; value: string }[]) => void;
  clearCell: (row: number, col: number) => void;
  clearSelection: () => void;
  getCellValue: (row: number, col: number) => string;
  undo: () => void;
  redo: () => void;

  // Column/Row resize
  setColumnWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;

  // Settings
  setHotkey: (hotkey: string) => void;
  setIdleLockMinutes: (minutes: number) => void;
  setOpenPaletteOnSummon: (value: boolean) => void;
  /** Remembers a successful single-cell copy for the palette recents list. */
  recordCopy: (sheetIndex: number, row: number, col: number) => void;
  setTheme: (theme: string) => void;

  // Sheet operations
  addSheet: (name: string, color: string) => void;
  removeSheet: (index: number) => void;
  moveSheet: (fromIndex: number, toIndex: number) => void;
  renameSheet: (index: number, name: string) => void;
  toggleMasked: (index: number) => void;
  toggleCellMask: (mask: boolean) => void;
  setSheetPassword: (index: number, hash: string | null) => void;
  setSheetFailedAttempts: (index: number, attempts: number, lockUntil: string | null) => void;

  // Persistence
  save: () => Promise<void>;
  /** Waits out an in-flight save, then saves if still dirty. For quit/hide paths. */
  flushSave: (pollMs?: number) => Promise<void>;
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  vault: null,
  activeSheetIndex: 0,
  selection: null,
  selectionEnd: null,
  editing: false,
  editInitialChar: undefined,
  searchQuery: "",
  activeHitIndex: -1,
  pendingScroll: null,
  locked: true,
  dirty: false,
  saving: false,
  hasPassword: false,
  sheetUnlocked: false,
  undoStacks: {},
  redoStacks: {},

  activeSheet: () => {
    const { vault, activeSheetIndex } = get();
    return vault?.sheets[activeSheetIndex];
  },

  canUndo: () => {
    const sheet = get().activeSheet();
    return !!sheet && (get().undoStacks[sheet.id]?.length ?? 0) > 0;
  },

  canRedo: () => {
    const sheet = get().activeSheet();
    return !!sheet && (get().redoStacks[sheet.id]?.length ?? 0) > 0;
  },

  getSelectionRange: () => {
    const { selection, selectionEnd } = get();
    if (!selection) return null;
    const end = selectionEnd ?? selection;
    return {
      startRow: Math.min(selection.row, end.row),
      startCol: Math.min(selection.col, end.col),
      endRow: Math.max(selection.row, end.row),
      endCol: Math.max(selection.col, end.col),
    };
  },

  // A freshly loaded or imported vault has no history to undo into.
  setVault: (vault) => set({ vault, locked: false, dirty: false, undoStacks: {}, redoStacks: {} }),
  setActiveSheet: (index, options) =>
    set({
      activeSheetIndex: index,
      selection: null,
      selectionEnd: null,
      editing: false,
      sheetUnlocked: false,
      // Search-result navigation switches sheets mid-search and must keep the
      // query; an ordinary tab click still clears it.
      ...(options?.keepSearch ? {} : { searchQuery: "", activeHitIndex: -1 }),
    }),
  setSelection: (sel) => set({ selection: sel, selectionEnd: null, editing: false, editInitialChar: undefined }),
  setSelectionEnd: (sel) => set({ selectionEnd: sel }),
  setEditing: (editing, initialChar) => set({ editing, editInitialChar: initialChar }),
  // A new query invalidates whatever result was being stepped through.
  setSearchQuery: (query) => set({ searchQuery: query, activeHitIndex: -1 }),
  setActiveHitIndex: (activeHitIndex) => set({ activeHitIndex }),
  requestScroll: (pendingScroll) => set({ pendingScroll }),
  // Locking drops the decrypted vault and the history with it — both hold
  // plaintext in memory. Callers must save first; a locked vault refuses to save.
  setLocked: (locked) =>
    set(
      locked
        ? { locked, vault: null, selection: null, selectionEnd: null, editing: false, undoStacks: {}, redoStacks: {} }
        : { locked, selection: null, selectionEnd: null, editing: false }
    ),
  setHasPassword: (hasPassword) => set({ hasPassword }),
  setSheetUnlocked: (unlocked) => set({ sheetUnlocked: unlocked }),

  setCellValue: (row, col, value) => get().setCells([{ row, col, value }]),

  setCells: (cells) => {
    const { vault, activeSheetIndex, undoStacks, redoStacks } = get();
    if (!vault) return;
    const sheet = vault.sheets[activeSheetIndex];
    if (!sheet) return;

    const changes: CellChange[] = [];
    for (const { row, col, value } of cells) {
      const key = encodeCellKey(row, col);
      const before = sheet.data[key];
      const after = value === "" ? undefined : value;
      // Writing a cell its current value is not a step worth undoing.
      if (before === after) continue;
      changes.push({ key, before, after });
    }
    if (changes.length === 0) return;

    const sheets = [...vault.sheets];
    sheets[activeSheetIndex] = { ...sheet, data: applyChanges(sheet.data, changes, "after") };
    set({
      vault: { ...vault, sheets, updatedAt: String(Date.now()) },
      dirty: true,
      undoStacks: pushHistory(undoStacks, sheet.id, { changes }),
      // Any new edit invalidates the redo branch.
      redoStacks: { ...redoStacks, [sheet.id]: [] },
    });
  },

  clearCell: (row, col) => get().setCellValue(row, col, ""),

  clearSelection: () => {
    const range = get().getSelectionRange();
    if (!range) return;
    const cells: { row: number; col: number; value: string }[] = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        cells.push({ row: r, col: c, value: "" });
      }
    }
    get().setCells(cells);
  },

  undo: () => {
    const { vault, activeSheetIndex, undoStacks, redoStacks } = get();
    if (!vault) return;
    const sheet = vault.sheets[activeSheetIndex];
    if (!sheet) return;
    const stack = undoStacks[sheet.id] ?? [];
    const entry = stack[stack.length - 1];
    if (!entry) return;

    const sheets = [...vault.sheets];
    sheets[activeSheetIndex] = { ...sheet, data: applyChanges(sheet.data, entry.changes, "before") };
    set({
      vault: { ...vault, sheets, updatedAt: String(Date.now()) },
      dirty: true,
      undoStacks: { ...undoStacks, [sheet.id]: stack.slice(0, -1) },
      redoStacks: pushHistory(redoStacks, sheet.id, entry),
      // Show what was reverted rather than leaving the user hunting for it.
      ...changedSelection(entry.changes),
      editing: false,
    });
  },

  redo: () => {
    const { vault, activeSheetIndex, undoStacks, redoStacks } = get();
    if (!vault) return;
    const sheet = vault.sheets[activeSheetIndex];
    if (!sheet) return;
    const stack = redoStacks[sheet.id] ?? [];
    const entry = stack[stack.length - 1];
    if (!entry) return;

    const sheets = [...vault.sheets];
    sheets[activeSheetIndex] = { ...sheet, data: applyChanges(sheet.data, entry.changes, "after") };
    set({
      vault: { ...vault, sheets, updatedAt: String(Date.now()) },
      dirty: true,
      redoStacks: { ...redoStacks, [sheet.id]: stack.slice(0, -1) },
      undoStacks: pushHistory(undoStacks, sheet.id, entry),
      ...changedSelection(entry.changes),
      editing: false,
    });
  },

  getCellValue: (row, col) => {
    const sheet = get().activeSheet();
    if (!sheet) return "";
    return sheet.data[encodeCellKey(row, col)] ?? "";
  },

  setColumnWidth: (col, width) => {
    const { vault, activeSheetIndex } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    const sheet = { ...sheets[activeSheetIndex] };
    sheet.columnWidths = { ...sheet.columnWidths, [col]: width };
    sheets[activeSheetIndex] = sheet;
    set({ vault: { ...vault, sheets }, dirty: true });
  },

  setRowHeight: (row, height) => {
    const { vault, activeSheetIndex } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    const sheet = { ...sheets[activeSheetIndex] };
    sheet.rowHeights = { ...sheet.rowHeights, [row]: height };
    sheets[activeSheetIndex] = sheet;
    set({ vault: { ...vault, sheets }, dirty: true });
  },

  setHotkey: (hotkey) => {
    const { vault } = get();
    if (!vault) return;
    set({ vault: { ...vault, settings: { ...vault.settings, hotkey } }, dirty: true });
  },

  setTheme: (theme) => {
    const { vault } = get();
    if (!vault) return;
    set({ vault: { ...vault, settings: { ...vault.settings, theme } }, dirty: true });
  },

  setIdleLockMinutes: (idleLockMinutes) => {
    const { vault } = get();
    if (!vault) return;
    set({ vault: { ...vault, settings: { ...vault.settings, idleLockMinutes } }, dirty: true });
  },

  setOpenPaletteOnSummon: (openPaletteOnSummon) => {
    const { vault } = get();
    if (!vault) return;
    set({ vault: { ...vault, settings: { ...vault.settings, openPaletteOnSummon } }, dirty: true });
  },

  recordCopy: (sheetIndex, row, col) => {
    const { vault } = get();
    const sheet = vault?.sheets[sheetIndex];
    if (!vault || !sheet) return;
    const recentCopies = pushRecent(vault.recentCopies ?? [], { sheetId: sheet.id, row, col });
    // Marks the vault dirty on purpose: the list is worth surviving a restart,
    // and the event-driven autosave makes the cost invisible.
    set({ vault: { ...vault, recentCopies }, dirty: true });
  },

  addSheet: (name, color) => {
    const { vault } = get();
    if (!vault) return;
    const newSheet: Sheet = {
      id: generateId(),
      name,
      icon: "grid",
      color,
      masked: false,
      maskedCells: {},
      passwordHash: null,
      failedAttempts: 0,
      lockUntil: null,
      data: {},
      columnWidths: {},
      rowHeights: {},
    };
    const updated = {
      ...vault,
      sheets: [...vault.sheets, newSheet],
      updatedAt: String(Date.now()),
    };
    set({ vault: updated, activeSheetIndex: updated.sheets.length - 1, dirty: true });
  },

  removeSheet: (index) => {
    const { vault, activeSheetIndex, undoStacks, redoStacks } = get();
    if (!vault || vault.sheets.length <= 1) return;
    const removedId = vault.sheets[index]?.id;
    const sheets = vault.sheets.filter((_, i) => i !== index);
    const newIndex = activeSheetIndex >= sheets.length ? sheets.length - 1 : activeSheetIndex;
    // Drop the deleted sheet's history — it would otherwise keep that sheet's
    // plaintext cell values alive with nothing able to reach them.
    const undo = { ...undoStacks };
    const redo = { ...redoStacks };
    if (removedId) {
      delete undo[removedId];
      delete redo[removedId];
    }
    set({
      vault: { ...vault, sheets, updatedAt: String(Date.now()) },
      activeSheetIndex: newIndex,
      dirty: true,
      undoStacks: undo,
      redoStacks: redo,
    });
  },

  moveSheet: (fromIndex, toIndex) => {
    const { vault, activeSheetIndex } = get();
    if (!vault || fromIndex === toIndex) return;
    const sheets = [...vault.sheets];
    const [moved] = sheets.splice(fromIndex, 1);
    sheets.splice(toIndex, 0, moved);
    let newActive = activeSheetIndex;
    if (activeSheetIndex === fromIndex) {
      newActive = toIndex;
    } else if (fromIndex < activeSheetIndex && toIndex >= activeSheetIndex) {
      newActive--;
    } else if (fromIndex > activeSheetIndex && toIndex <= activeSheetIndex) {
      newActive++;
    }
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, activeSheetIndex: newActive, dirty: true });
  },

  renameSheet: (index, name) => {
    const { vault } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    sheets[index] = { ...sheets[index], name };
    set({ vault: { ...vault, sheets }, dirty: true });
  },

  toggleMasked: (index) => {
    const { vault } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    sheets[index] = { ...sheets[index], masked: !sheets[index].masked };
    set({ vault: { ...vault, sheets }, dirty: true });
  },

  toggleCellMask: (mask) => {
    const range = get().getSelectionRange();
    if (!range) return;
    const { vault, activeSheetIndex } = get();
    if (!vault) return;
    const sheet = vault.sheets[activeSheetIndex];
    if (sheet.masked) return; // sheet-level mask takes precedence
    const sheets = [...vault.sheets];
    const maskedCells = { ...(sheet.maskedCells ?? {}) };
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        const key = encodeCellKey(r, c);
        if (mask) {
          maskedCells[key] = true;
        } else {
          delete maskedCells[key];
        }
      }
    }
    sheets[activeSheetIndex] = { ...sheet, maskedCells };
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, dirty: true });
  },

  setSheetPassword: (index, hash) => {
    const { vault } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    sheets[index] = {
      ...sheets[index],
      passwordHash: hash,
      failedAttempts: 0,
      lockUntil: null,
    };
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, dirty: true });
  },

  setSheetFailedAttempts: (index, attempts, lockUntil) => {
    const { vault } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    sheets[index] = { ...sheets[index], failedAttempts: attempts, lockUntil };
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, dirty: true });
  },

  save: async () => {
    const { vault, dirty, saving } = get();
    if (!vault || !dirty || saving) return;
    set({ saving: true });
    try {
      await saveVault(vault);
      set({ dirty: false, saving: false });
    } catch (e) {
      set({ saving: false });
      console.error("Save failed:", e);
      throw e;
    }
  },

  flushSave: async (pollMs = 100) => {
    // An in-flight save is writing an older snapshot; edits made meanwhile
    // leave dirty set, so wait for it and then persist the rest. Bounded so a
    // wedged save cannot block a quit forever — the caller's fallback decides.
    for (let i = 0; i < 25 && get().saving; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    // save() itself refuses while another write is in flight, so a wedged
    // save simply falls through to the caller's fallback.
    if (get().dirty) {
      await get().save();
    }
  },
}));
