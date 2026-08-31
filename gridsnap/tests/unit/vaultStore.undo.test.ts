import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultStore } from "../../src/stores/vaultStore";
import type { Sheet, Vault } from "../../src/types/vault";

// Persistence goes through Tauri IPC, which does not exist in a test process.
// These tests are about the in-memory history, so the writer is stubbed out.
vi.mock("../../src/services/vaultService", () => ({
  saveVault: vi.fn().mockResolvedValue(undefined),
}));

function makeSheet(id: string, data: Record<string, string> = {}): Sheet {
  return {
    id,
    name: id,
    icon: "grid",
    color: "#D4915E",
    masked: false,
    maskedCells: {},
    passwordHash: null,
    failedAttempts: 0,
    lockUntil: null,
    data,
    columnWidths: {},
    rowHeights: {},
  } as Sheet;
}

function makeVault(sheets: Sheet[]): Vault {
  return {
    version: 1,
    sheets,
    settings: {
      theme: "carbon",
      hotkey: "Ctrl+Shift+Space",
      idleLockMinutes: 5,
      autoSaveDebounceMs: 500,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Vault;
}

const store = () => useVaultStore.getState();
const dataOf = (sheetIndex = 0) => store().vault!.sheets[sheetIndex].data;

beforeEach(() => {
  useVaultStore.setState({
    activeSheetIndex: 0,
    selection: null,
    selectionEnd: null,
    editing: false,
    sheetUnlocked: false,
  });
  // setVault also resets both history stacks, so this is a clean slate.
  store().setVault(makeVault([makeSheet("sheet-a", { "0,0": "alpha" }), makeSheet("sheet-b")]));
});

describe("undo", () => {
  it("should restore the previous value when a cell edit is undone", () => {
    store().setCellValue(0, 0, "beta");
    expect(dataOf()["0,0"]).toBe("beta");

    store().undo();
    expect(dataOf()["0,0"]).toBe("alpha");
  });

  it("should remove the cell again when undoing a write into an empty cell", () => {
    store().setCellValue(5, 5, "new");
    store().undo();

    // Must be absent, not an empty string — the sparse map has no empty entries.
    expect("5,5" in dataOf()).toBe(false);
  });

  it("should restore every cleared cell when a range delete is undone", () => {
    store().setCells([
      { row: 0, col: 0, value: "a" },
      { row: 0, col: 1, value: "b" },
      { row: 1, col: 0, value: "c" },
    ]);
    useVaultStore.setState({ selection: { row: 0, col: 0 }, selectionEnd: { row: 1, col: 1 } });

    store().clearSelection();
    expect(Object.keys(dataOf())).toHaveLength(0);

    store().undo();
    expect(dataOf()).toEqual({ "0,0": "a", "0,1": "b", "1,0": "c" });
  });

  it("should revert a whole pasted block in one step", () => {
    const block = [
      { row: 10, col: 0, value: "x1" },
      { row: 10, col: 1, value: "x2" },
      { row: 11, col: 0, value: "x3" },
      { row: 11, col: 1, value: "x4" },
    ];
    store().setCells(block);

    store().undo();

    // One Ctrl+Z, not four.
    expect(Object.keys(dataOf())).toEqual(["0,0"]);
    expect(store().canUndo()).toBe(false);
  });

  it("should do nothing when there is no history", () => {
    const before = dataOf();
    store().undo();
    expect(dataOf()).toEqual(before);
  });

  it("should not record a step when a cell is written its existing value", () => {
    store().setCellValue(0, 0, "alpha");
    expect(store().canUndo()).toBe(false);
  });

  it("should mark the vault dirty so an undone change still gets saved", () => {
    store().setCellValue(0, 0, "beta");
    useVaultStore.setState({ dirty: false });

    store().undo();
    expect(store().dirty).toBe(true);
  });

  it("should cap history at 100 steps and drop the oldest", () => {
    for (let i = 1; i <= 105; i++) {
      store().setCellValue(0, 0, `v${i}`);
    }
    for (let i = 0; i < 105; i++) {
      store().undo();
    }

    // The first five steps fell out, so "alpha" is unreachable and the value
    // settles on the oldest retained state instead.
    expect(dataOf()["0,0"]).toBe("v5");
    expect(store().canUndo()).toBe(false);
  });
});

describe("redo", () => {
  it("should reapply a change that was undone", () => {
    store().setCellValue(0, 0, "beta");
    store().undo();
    expect(store().canRedo()).toBe(true);

    store().redo();
    expect(dataOf()["0,0"]).toBe("beta");
  });

  it("should discard the redo branch once a new edit is made", () => {
    store().setCellValue(0, 0, "beta");
    store().undo();
    store().setCellValue(0, 1, "unrelated");

    expect(store().canRedo()).toBe(false);
  });

  it("should do nothing when there is nothing to redo", () => {
    store().setCellValue(0, 0, "beta");
    const before = dataOf();

    store().redo();
    expect(dataOf()).toEqual(before);
  });
});

describe("history isolation", () => {
  it("should keep each sheet's history separate", () => {
    store().setCellValue(0, 0, "edited-a");
    store().setActiveSheet(1);
    store().setCellValue(0, 0, "edited-b");

    store().undo();
    expect(dataOf(1)["0,0"]).toBeUndefined();

    // Sheet A's own step survived the detour through sheet B.
    store().setActiveSheet(0);
    expect(store().canUndo()).toBe(true);
    store().undo();
    expect(dataOf(0)["0,0"]).toBe("alpha");
  });

  it("should not undo into a sheet other than the active one", () => {
    store().setCellValue(0, 0, "edited-a");
    store().setActiveSheet(1);

    store().undo();

    // Sheet A must be untouched while sheet B is active.
    expect(dataOf(0)["0,0"]).toBe("edited-a");
    expect(store().canUndo()).toBe(false);
  });

  it("should clear all history when the vault is locked", () => {
    store().setCellValue(0, 0, "beta");
    expect(store().canUndo()).toBe(true);

    store().setLocked(true);

    expect(useVaultStore.getState().undoStacks).toEqual({});
    expect(useVaultStore.getState().redoStacks).toEqual({});
  });

  it("should drop a deleted sheet's history", () => {
    store().setActiveSheet(1);
    store().setCellValue(0, 0, "doomed");
    expect(useVaultStore.getState().undoStacks["sheet-b"]).toHaveLength(1);

    store().removeSheet(1);

    expect(useVaultStore.getState().undoStacks["sheet-b"]).toBeUndefined();
  });
});

describe("selection after undo", () => {
  it("should select the whole affected block so the change is visible", () => {
    store().setCells([
      { row: 3, col: 1, value: "x" },
      { row: 5, col: 4, value: "y" },
    ]);

    store().undo();

    expect(store().selection).toEqual({ row: 3, col: 1 });
    expect(store().selectionEnd).toEqual({ row: 5, col: 4 });
  });

  it("should leave a single-cell undo as a plain selection, not a 1x1 range", () => {
    store().setCellValue(2, 2, "x");

    store().undo();

    expect(store().selection).toEqual({ row: 2, col: 2 });
    // A non-null selectionEnd would read as a range and hide the copy button.
    expect(store().selectionEnd).toBeNull();
  });

  it("should stop cell editing when undoing", () => {
    store().setCellValue(0, 0, "beta");
    store().setEditing(true);

    store().undo();
    expect(store().editing).toBe(false);
  });
});
