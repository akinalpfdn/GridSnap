import { describe, expect, it } from "vitest";
import { findHits, isSheetSearchable, stepHitIndex } from "../../src/utils/search";
import type { Sheet, Vault } from "../../src/types/vault";

function sheet(id: string, data: Record<string, string>, passwordHash: string | null = null): Sheet {
  return {
    id,
    name: id,
    icon: "grid",
    color: "#D4915E",
    masked: false,
    maskedCells: {},
    passwordHash,
    failedAttempts: 0,
    lockUntil: null,
    data,
    columnWidths: {},
    rowHeights: {},
  } as Sheet;
}

function vault(sheets: Sheet[]): Vault {
  return {
    version: 1,
    sheets,
    settings: { theme: "carbon", hotkey: "Ctrl+Shift+Space", idleLockMinutes: 5, autoSaveDebounceMs: 500 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Vault;
}

function search(v: Vault | null, query: string, activeSheetIndex = 0, activeSheetUnlocked = false) {
  return findHits({ vault: v, query, activeSheetIndex, activeSheetUnlocked });
}

describe("findHits", () => {
  it("should find matches on every sheet, not just the active one", () => {
    const v = vault([
      sheet("a", { "0,0": "aws key" }),
      sheet("b", { "3,1": "aws secret" }),
      sheet("c", { "0,0": "unrelated" }),
    ]);

    expect(search(v, "aws")).toEqual([
      { sheetIndex: 0, row: 0, col: 0 },
      { sheetIndex: 1, row: 3, col: 1 },
    ]);
  });

  it("should match case-insensitively", () => {
    const v = vault([sheet("a", { "0,0": "AWS Key" })]);
    expect(search(v, "aws key")).toHaveLength(1);
  });

  it("should match on a substring", () => {
    const v = vault([sheet("a", { "0,0": "ssh -i ~/.ssh/id_rsa host" })]);
    expect(search(v, "id_rsa")).toHaveLength(1);
  });

  it("should return nothing for an empty or whitespace query", () => {
    const v = vault([sheet("a", { "0,0": "anything" })]);
    expect(search(v, "")).toEqual([]);
    expect(search(v, "   ")).toEqual([]);
  });

  it("should return nothing when there is no vault", () => {
    expect(search(null, "aws")).toEqual([]);
  });

  it("should order hits by sheet, then row, then column", () => {
    const v = vault([
      sheet("a", { "10,0": "x", "2,5": "x", "2,1": "x" }),
      sheet("b", { "0,0": "x" }),
    ]);

    expect(search(v, "x")).toEqual([
      { sheetIndex: 0, row: 2, col: 1 },
      { sheetIndex: 0, row: 2, col: 5 },
      { sheetIndex: 0, row: 10, col: 0 },
      { sheetIndex: 1, row: 0, col: 0 },
    ]);
  });

  it("should order rows numerically, not as strings", () => {
    // "10" sorts before "9" lexically — the bug this guards against.
    const v = vault([sheet("a", { "9,0": "x", "10,0": "x" })]);
    expect(search(v, "x")).toEqual([
      { sheetIndex: 0, row: 9, col: 0 },
      { sheetIndex: 0, row: 10, col: 0 },
    ]);
  });

  it("should never return hits from a password-protected sheet that is not active", () => {
    const v = vault([sheet("a", { "0,0": "aws" }), sheet("b", { "0,0": "aws" }, "hash")]);
    expect(search(v, "aws", 0, true)).toEqual([{ sheetIndex: 0, row: 0, col: 0 }]);
  });

  it("should not search the active protected sheet while it is still locked", () => {
    const v = vault([sheet("a", { "0,0": "aws" }, "hash")]);
    expect(search(v, "aws", 0, false)).toEqual([]);
  });

  it("should search the active protected sheet once it is unlocked", () => {
    const v = vault([sheet("a", { "0,0": "aws" }, "hash")]);
    expect(search(v, "aws", 0, true)).toEqual([{ sheetIndex: 0, row: 0, col: 0 }]);
  });

  it("should still search a masked sheet, since masking is only visual", () => {
    const masked = { ...sheet("a", { "0,0": "aws" }), masked: true } as Sheet;
    expect(search(vault([masked]), "aws")).toHaveLength(1);
  });
});

describe("isSheetSearchable", () => {
  it("should allow any sheet without a password", () => {
    expect(
      isSheetSearchable({ passwordHash: null, sheetIndex: 3, activeSheetIndex: 0, activeSheetUnlocked: false })
    ).toBe(true);
  });

  it("should refuse a protected sheet that is not the active one even when something is unlocked", () => {
    // The unlock flag belongs to the active sheet only.
    expect(
      isSheetSearchable({ passwordHash: "h", sheetIndex: 1, activeSheetIndex: 0, activeSheetUnlocked: true })
    ).toBe(false);
  });
});

describe("stepHitIndex", () => {
  it("should start at the first hit when moving forward from nothing", () => {
    expect(stepHitIndex(-1, 5, 1)).toBe(0);
  });

  it("should start at the last hit when moving backward from nothing", () => {
    expect(stepHitIndex(-1, 5, -1)).toBe(4);
  });

  it("should advance and wrap at the end", () => {
    expect(stepHitIndex(3, 5, 1)).toBe(4);
    expect(stepHitIndex(4, 5, 1)).toBe(0);
  });

  it("should go back and wrap at the start", () => {
    expect(stepHitIndex(1, 5, -1)).toBe(0);
    expect(stepHitIndex(0, 5, -1)).toBe(4);
  });

  it("should report no hit when the result set is empty", () => {
    expect(stepHitIndex(-1, 0, 1)).toBe(-1);
    expect(stepHitIndex(2, 0, -1)).toBe(-1);
  });

  it("should stay put with a single hit", () => {
    expect(stepHitIndex(0, 1, 1)).toBe(0);
    expect(stepHitIndex(0, 1, -1)).toBe(0);
  });
});
