export interface Vault {
  version: number;
  sheets: Sheet[];
  settings: VaultSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Sheet {
  id: string;
  name: string;
  icon: string;
  color: string;
  masked: boolean;
  data: Record<string, string>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export interface VaultSettings {
  theme: string;
  hotkey: string;
  idleLockMinutes: number;
  autoSaveDebounceMs: number;
}

export type CellKey = `${number},${number}`;
