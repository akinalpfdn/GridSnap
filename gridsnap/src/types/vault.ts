export interface Vault {
  version: number;
  sheets: Sheet[];
  settings: VaultSettings;
  createdAt: string;
  updatedAt: string;
  /** Cells recently copied, newest first. Optional: older vaults lack it. */
  recentCopies?: RecentCopy[];
}

export interface RecentCopy {
  sheetId: string;
  row: number;
  col: number;
}

export interface Sheet {
  id: string;
  name: string;
  icon: string;
  color: string;
  masked: boolean;
  maskedCells: Record<string, boolean>;
  passwordHash: string | null;
  failedAttempts: number;
  lockUntil: string | null;
  /** Keeps row 1 visible while scrolling — a table header row. */
  frozenFirstRow?: boolean;
  data: Record<string, string>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export interface VaultSettings {
  theme: string;
  hotkey: string;
  idleLockMinutes: number;
  autoSaveDebounceMs: number;
  /** Second global shortcut: summon straight into the quick-copy palette. */
  paletteHotkey?: string;
}

export type CellKey = `${number},${number}`;
