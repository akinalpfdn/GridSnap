import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultStore } from "../../src/stores/vaultStore";
import { saveVault } from "../../src/services/vaultService";
import type { Sheet, Vault } from "../../src/types/vault";

vi.mock("../../src/services/vaultService", () => ({
  saveVault: vi.fn().mockResolvedValue(true),
}));

const savedVault = vi.mocked(saveVault);

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
        maskedCells: {},
        passwordHash: null,
        failedAttempts: 0,
        lockUntil: null,
        data: {},
        columnWidths: {},
        rowHeights: {},
      } as Sheet,
    ],
    settings: { theme: "carbon", hotkey: "Ctrl+Shift+Space", idleLockMinutes: 5, autoSaveDebounceMs: 500 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Vault;
}

const store = () => useVaultStore.getState();

beforeEach(() => {
  savedVault.mockClear();
  savedVault.mockResolvedValue(true);
  useVaultStore.setState({ saving: false });
  store().setVault(makeVault());
});

describe("save", () => {
  it("should write and clear dirty when there are pending changes", async () => {
    store().setCellValue(0, 0, "x");

    await store().save();

    expect(savedVault).toHaveBeenCalledTimes(1);
    expect(store().dirty).toBe(false);
  });

  it("should not write when the vault is clean", async () => {
    await store().save();
    expect(savedVault).not.toHaveBeenCalled();
  });

  it("should not start a second write while one is in flight", async () => {
    store().setCellValue(0, 0, "x");
    useVaultStore.setState({ saving: true });

    await store().save();

    expect(savedVault).not.toHaveBeenCalled();
  });

  it("should not write after the vault was locked away", async () => {
    store().setCellValue(0, 0, "x");
    store().setLocked(true); // drops the vault from memory

    await store().save();

    expect(savedVault).not.toHaveBeenCalled();
  });

  it("should keep dirty set when the write fails, so a retry can happen", async () => {
    store().setCellValue(0, 0, "x");
    savedVault.mockRejectedValueOnce(new Error("disk full"));

    await expect(store().save()).rejects.toThrow("disk full");

    expect(store().dirty).toBe(true);
    expect(store().saving).toBe(false);
  });
});

describe("flushSave", () => {
  it("should save pending changes immediately when nothing is in flight", async () => {
    store().setCellValue(0, 0, "x");

    await store().flushSave(1);

    expect(savedVault).toHaveBeenCalledTimes(1);
    expect(store().dirty).toBe(false);
  });

  it("should do nothing when the vault is clean", async () => {
    await store().flushSave(1);
    expect(savedVault).not.toHaveBeenCalled();
  });

  it("should wait for an in-flight save and then persist newer edits", async () => {
    store().setCellValue(0, 0, "x");
    useVaultStore.setState({ saving: true });

    // The in-flight save finishes shortly after the flush starts waiting.
    setTimeout(() => useVaultStore.setState({ saving: false }), 10);
    await store().flushSave(2);

    expect(savedVault).toHaveBeenCalledTimes(1);
    expect(store().dirty).toBe(false);
  });

  it("should give up rather than wait forever on a wedged save", async () => {
    store().setCellValue(0, 0, "x");
    useVaultStore.setState({ saving: true }); // never clears

    await store().flushSave(1);

    // Bounded: returns without writing, leaving the caller's fallback to act.
    expect(savedVault).not.toHaveBeenCalled();
  });
});
