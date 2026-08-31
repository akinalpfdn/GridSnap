import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultStore } from "../../src/stores/vaultStore";
import type { Sheet, Vault } from "../../src/types/vault";

vi.mock("../../src/services/vaultService", () => ({
  saveVault: vi.fn().mockResolvedValue(true),
}));

function makeVault(): Vault {
  return {
    version: 1,
    sheets: [
      {
        id: "s",
        name: "s",
        icon: "grid",
        color: "#D4915E",
        masked: false,
        maskedCells: { "5,1": true },
        passwordHash: null,
        failedAttempts: 0,
        lockUntil: null,
        data: { "2,0": "above", "5,1": "moved", "9,2": "below" },
        columnWidths: { 1: 200 },
        rowHeights: { 5: 44 },
      } as Sheet,
    ],
    settings: { theme: "carbon", hotkey: "Ctrl+Shift+Space", idleLockMinutes: 5, autoSaveDebounceMs: 500 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Vault;
}

const store = () => useVaultStore.getState();
const sheet = () => store().vault!.sheets[0];

beforeEach(() => {
  useVaultStore.setState({ activeSheetIndex: 0, selection: null, selectionEnd: null, editing: false });
  store().setVault(makeVault());
});

describe("applyStructural", () => {
  it("should shift data, masks and heights when inserting a row", () => {
    expect(store().applyStructural("insertRow", 4)).toBe(true);

    expect(sheet().data).toEqual({ "2,0": "above", "6,1": "moved", "10,2": "below" });
    expect(sheet().maskedCells).toEqual({ "6,1": true });
    expect(sheet().rowHeights).toEqual({ 6: 44 });
    expect(sheet().columnWidths).toEqual({ 1: 200 });
  });

  it("should remove a deleted row's contents and pull the rest up", () => {
    store().applyStructural("deleteRow", 5);

    expect(sheet().data).toEqual({ "2,0": "above", "8,2": "below" });
    expect(sheet().maskedCells).toEqual({});
    expect(sheet().rowHeights).toEqual({});
  });

  it("should restore data AND layout on undo of a row delete", () => {
    const before = { data: sheet().data, maskedCells: sheet().maskedCells, rowHeights: sheet().rowHeights };

    store().applyStructural("deleteRow", 5);
    store().undo();

    expect(sheet().data).toEqual(before.data);
    expect(sheet().maskedCells).toEqual(before.maskedCells);
    expect(sheet().rowHeights).toEqual(before.rowHeights);
  });

  it("should redo a structural edit including its layout", () => {
    store().applyStructural("insertColumn", 1);
    const after = { data: sheet().data, columnWidths: sheet().columnWidths };

    store().undo();
    store().redo();

    expect(sheet().data).toEqual(after.data);
    expect(sheet().columnWidths).toEqual(after.columnWidths);
  });

  it("should be a single undo step even when many cells move", () => {
    store().applyStructural("insertRow", 0);
    store().undo();

    expect(store().canUndo()).toBe(false);
    expect(sheet().data).toEqual(makeVault().sheets[0].data);
  });

  it("should refuse a row insert when the last row is occupied", () => {
    store().setCellValue(999, 0, "edge");

    expect(store().applyStructural("insertRow", 10)).toBe(false);
    // Nothing changed, nothing recorded beyond the edge cell edit itself.
    expect(sheet().data["999,0"]).toBe("edge");
  });

  it("should refuse a column insert when the last column is occupied", () => {
    store().setCellValue(0, 25, "edge");
    expect(store().applyStructural("insertColumn", 3)).toBe(false);
  });

  it("should not crash when undoing an insert that moved no cells", () => {
    store().setVault({ ...makeVault(), sheets: [{ ...makeVault().sheets[0], data: {}, maskedCells: {}, rowHeights: {}, columnWidths: {} }] });

    store().applyStructural("insertRow", 0);
    store().undo();

    expect(sheet().data).toEqual({});
    // The undo moved no cells, so the selection stays where the insert put it —
    // and in particular never becomes Math.min()-of-nothing (Infinity).
    expect(store().selection).toEqual({ row: 0, col: 0 });
  });

  it("should invalidate redo when a structural edit follows an undo", () => {
    store().setCellValue(0, 0, "x");
    store().undo();
    store().applyStructural("deleteRow", 9);

    expect(store().canRedo()).toBe(false);
  });
});
