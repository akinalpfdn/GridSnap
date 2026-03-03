import { create } from "zustand";
import type { Sheet, Vault } from "../types/vault";
import type { GridSelection } from "../types/grid";
import { encodeCellKey } from "../utils/cellKey";
import { saveVault } from "../services/vaultService";
import { debounce } from "../utils/debounce";

interface VaultStore {
  // State
  vault: Vault | null;
  activeSheetIndex: number;
  selection: GridSelection | null;
  editing: boolean;
  searchQuery: string;
  locked: boolean;

  // Computed-like
  activeSheet: () => Sheet | undefined;

  // Actions
  setVault: (vault: Vault) => void;
  setActiveSheet: (index: number) => void;
  setSelection: (sel: GridSelection | null) => void;
  setEditing: (editing: boolean) => void;
  setSearchQuery: (query: string) => void;
  setLocked: (locked: boolean) => void;

  // Cell operations
  setCellValue: (row: number, col: number, value: string) => void;
  clearCell: (row: number, col: number) => void;
  getCellValue: (row: number, col: number) => string;

  // Column/Row resize
  setColumnWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;

  // Sheet operations
  addSheet: (name: string, color: string) => void;
  removeSheet: (index: number) => void;
  renameSheet: (index: number, name: string) => void;
  toggleMasked: (index: number) => void;

  // Persistence
  triggerSave: () => void;
}

const debouncedSave = debounce(async (vault: Vault) => {
  try {
    await saveVault(vault);
  } catch (e) {
    console.error("Auto-save failed:", e);
  }
}, 500);

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  vault: null,
  activeSheetIndex: 0,
  selection: null,
  editing: false,
  searchQuery: "",
  locked: true,

  activeSheet: () => {
    const { vault, activeSheetIndex } = get();
    return vault?.sheets[activeSheetIndex];
  },

  setVault: (vault) => set({ vault, locked: false }),
  setActiveSheet: (index) =>
    set({ activeSheetIndex: index, selection: null, editing: false, searchQuery: "" }),
  setSelection: (sel) => set({ selection: sel, editing: false }),
  setEditing: (editing) => set({ editing }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLocked: (locked) => set({ locked, selection: null, editing: false }),

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
    set({ vault: updated });
    get().triggerSave();
  },

  clearCell: (row, col) => get().setCellValue(row, col, ""),

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
    set({ vault: { ...vault, sheets } });
    get().triggerSave();
  },

  setRowHeight: (row, height) => {
    const { vault, activeSheetIndex } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    const sheet = { ...sheets[activeSheetIndex] };
    sheet.rowHeights = { ...sheet.rowHeights, [row]: height };
    sheets[activeSheetIndex] = sheet;
    set({ vault: { ...vault, sheets } });
    get().triggerSave();
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
      data: {},
      columnWidths: {},
      rowHeights: {},
    };
    const updated = {
      ...vault,
      sheets: [...vault.sheets, newSheet],
      updatedAt: String(Date.now()),
    };
    set({ vault: updated, activeSheetIndex: updated.sheets.length - 1 });
    get().triggerSave();
  },

  removeSheet: (index) => {
    const { vault, activeSheetIndex } = get();
    if (!vault || vault.sheets.length <= 1) return;
    const sheets = vault.sheets.filter((_, i) => i !== index);
    const newIndex = activeSheetIndex >= sheets.length ? sheets.length - 1 : activeSheetIndex;
    set({ vault: { ...vault, sheets, updatedAt: String(Date.now()) }, activeSheetIndex: newIndex });
    get().triggerSave();
  },

  renameSheet: (index, name) => {
    const { vault } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    sheets[index] = { ...sheets[index], name };
    set({ vault: { ...vault, sheets } });
    get().triggerSave();
  },

  toggleMasked: (index) => {
    const { vault } = get();
    if (!vault) return;
    const sheets = [...vault.sheets];
    sheets[index] = { ...sheets[index], masked: !sheets[index].masked };
    set({ vault: { ...vault, sheets } });
    get().triggerSave();
  },

  triggerSave: () => {
    const { vault } = get();
    if (vault) debouncedSave(vault);
  },
}));
