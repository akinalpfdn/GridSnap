import { create } from "zustand";
import type { Sheet, Vault } from "../types/vault";
import type { GridSelection, GridRange } from "../types/grid";
import { encodeCellKey } from "../utils/cellKey";
import { saveVault } from "../services/vaultService";

interface VaultStore {
  // State
  vault: Vault | null;
  activeSheetIndex: number;
  selection: GridSelection | null;
  selectionEnd: GridSelection | null;
  editing: boolean;
  editInitialChar: string | undefined;
  searchQuery: string;
  locked: boolean;
  dirty: boolean;
  saving: boolean;
  hasPassword: boolean;
  sheetUnlocked: boolean;

  // Computed-like
  activeSheet: () => Sheet | undefined;
  getSelectionRange: () => GridRange | null;

  // Actions
  setVault: (vault: Vault) => void;
  setActiveSheet: (index: number) => void;
  setSelection: (sel: GridSelection | null) => void;
  setSelectionEnd: (sel: GridSelection | null) => void;
  setEditing: (editing: boolean, initialChar?: string) => void;
  setSearchQuery: (query: string) => void;
  setLocked: (locked: boolean) => void;
  setHasPassword: (hasPassword: boolean) => void;
  setSheetUnlocked: (unlocked: boolean) => void;

  // Cell operations
  setCellValue: (row: number, col: number, value: string) => void;
  clearCell: (row: number, col: number) => void;
  clearSelection: () => void;
  getCellValue: (row: number, col: number) => string;

  // Column/Row resize
  setColumnWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;

  // Settings
  setHotkey: (hotkey: string) => void;
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
  locked: true,
  dirty: false,
  saving: false,
  hasPassword: false,
  sheetUnlocked: false,

  activeSheet: () => {
    const { vault, activeSheetIndex } = get();
    return vault?.sheets[activeSheetIndex];
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

  setVault: (vault) => set({ vault, locked: false, dirty: false }),
  setActiveSheet: (index) =>
    set({ activeSheetIndex: index, selection: null, selectionEnd: null, editing: false, searchQuery: "", sheetUnlocked: false }),
  setSelection: (sel) => set({ selection: sel, selectionEnd: null, editing: false, editInitialChar: undefined }),
  setSelectionEnd: (sel) => set({ selectionEnd: sel }),
  setEditing: (editing, initialChar) => set({ editing, editInitialChar: initialChar }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLocked: (locked) => set({ locked, selection: null, selectionEnd: null, editing: false }),
  setHasPassword: (hasPassword) => set({ hasPassword }),
  setSheetUnlocked: (unlocked) => set({ sheetUnlocked: unlocked }),

  setCellValue: (row, col, value) => {
    const { vault, activeSheetIndex } = get();
    if (!vault) return;
    const key = encodeCellKey(row, col);
    const sheets = [...vault.sheets];
    const sheet = { ...sheets[activeSheetIndex] };
    sheet.data = { ...sheet.data };
    if (value === "") {
      delete sheet.data[key];
    } else {
      sheet.data[key] = value;
    }
    sheets[activeSheetIndex] = sheet;
    const updated = { ...vault, sheets, updatedAt: String(Date.now()) };
    set({ vault: updated, dirty: true });
  },

  clearCell: (row, col) => get().setCellValue(row, col, ""),

  clearSelection: () => {
    const range = get().getSelectionRange();
    if (!range) return;
    const { vault, activeSheetIndex } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    const sheet = { ...sheets[activeSheetIndex] };
    sheet.data = { ...sheet.data };
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        delete sheet.data[encodeCellKey(r, c)];
      }
    }
    sheets[activeSheetIndex] = sheet;
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, dirty: true });
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
    const { vault, activeSheetIndex } = get();
    if (!vault || vault.sheets.length <= 1) return;
    const sheets = vault.sheets.filter((_, i) => i !== index);
    const newIndex = activeSheetIndex >= sheets.length ? sheets.length - 1 : activeSheetIndex;
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, activeSheetIndex: newIndex, dirty: true });
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
}));
