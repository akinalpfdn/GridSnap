import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultStore } from "../../src/stores/vaultStore";
import type { Sheet, Vault } from "../../src/types/vault";

vi.mock("../../src/services/vaultService", () => ({
  saveVault: vi.fn().mockResolvedValue(undefined),
}));

function makeVault(): Vault {
  return {
    version: 1,
    sheets: [
      {
        id: "sheet-a",
        name: "Sheet 1",
        icon: "grid",
        color: "#D4915E",
        masked: false,
        maskedCells: {},
        passwordHash: null,
        failedAttempts: 0,
        lockUntil: null,
        data: { "0,0": "secret-value" },
        columnWidths: {},
        rowHeights: {},
      } as Sheet,
    ],
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

beforeEach(() => {
  useVaultStore.setState({ selection: null, selectionEnd: null, editing: false });
  store().setVault(makeVault());
});

describe("locking", () => {
  it("should drop the decrypted vault from memory", () => {
    store().setLocked(true);

    // The lock screen must not leave plaintext cell values in the store.
    expect(store().vault).toBeNull();
  });

  it("should drop the undo history along with the vault", () => {
    store().setCellValue(0, 0, "changed");
    expect(store().canUndo()).toBe(true);

    store().setLocked(true);

    expect(useVaultStore.getState().undoStacks).toEqual({});
    expect(useVaultStore.getState().redoStacks).toEqual({});
  });

  it("should clear the selection so nothing is highlighted behind the lock screen", () => {
    useVaultStore.setState({ selection: { row: 0, col: 0 }, selectionEnd: { row: 1, col: 1 } });

    store().setLocked(true);

    expect(store().selection).toBeNull();
    expect(store().selectionEnd).toBeNull();
  });

  it("should keep the vault when unlocking is signalled", () => {
    // setLocked(false) is the "no longer locked" signal; the vault itself
    // arrives via setVault after a successful decrypt.
    store().setLocked(false);
    expect(store().vault).not.toBeNull();
  });

  it("should restore a working store when a vault is loaded after a lock", () => {
    store().setLocked(true);
    store().setVault(makeVault());

    expect(store().locked).toBe(false);
    expect(store().vault?.sheets[0].data["0,0"]).toBe("secret-value");
  });
});

describe("idle lock setting", () => {
  it("should persist the chosen delay into vault settings", () => {
    store().setIdleLockMinutes(15);
    expect(store().vault?.settings.idleLockMinutes).toBe(15);
  });

  it("should mark the vault dirty so the choice survives a save", () => {
    useVaultStore.setState({ dirty: false });
    store().setIdleLockMinutes(30);
    expect(store().dirty).toBe(true);
  });

  it("should accept zero to turn auto-lock off", () => {
    store().setIdleLockMinutes(0);
    expect(store().vault?.settings.idleLockMinutes).toBe(0);
  });
});
