import { describe, expect, it } from "vitest";
import { pushRecent, resolveRecents, RECENT_COPIES_CAP } from "../../src/utils/recents";
import type { RecentCopy, Sheet, Vault } from "../../src/types/vault";

const entry = (sheetId: string, row: number, col = 0): RecentCopy => ({ sheetId, row, col });

function sheet(id: string, data: Record<string, string>, extra: Partial<Sheet> = {}): Sheet {
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
    ...extra,
  } as Sheet;
}

function vault(sheets: Sheet[], recentCopies: RecentCopy[]): Vault {
  return {
    version: 1,
    sheets,
    settings: { theme: "carbon", hotkey: "Ctrl+Shift+Space", idleLockMinutes: 5, autoSaveDebounceMs: 500 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    recentCopies,
  } as Vault;
}

function resolve(v: Vault | null, activeSheetIndex = 0, activeSheetUnlocked = false) {
  return resolveRecents({ vault: v, activeSheetIndex, activeSheetUnlocked });
}

describe("pushRecent", () => {
  it("should put the newest copy first", () => {
    const list = pushRecent([entry("s", 1)], entry("s", 2));
    expect(list.map((r) => r.row)).toEqual([2, 1]);
  });

  it("should move a re-copied cell to the front instead of duplicating it", () => {
    const list = pushRecent([entry("s", 1), entry("s", 2)], entry("s", 2));
    expect(list.map((r) => r.row)).toEqual([2, 1]);
  });

  it("should drop the oldest entry beyond the cap", () => {
    let list: RecentCopy[] = [];
    for (let i = 0; i < RECENT_COPIES_CAP + 3; i++) {
      list = pushRecent(list, entry("s", i));
    }
    expect(list).toHaveLength(RECENT_COPIES_CAP);
    expect(list[0].row).toBe(RECENT_COPIES_CAP + 2);
    expect(list[list.length - 1].row).toBe(3);
  });

  it("should treat same coordinates on different sheets as different cells", () => {
    const list = pushRecent([entry("a", 1)], entry("b", 1));
    expect(list).toHaveLength(2);
  });
});

describe("resolveRecents", () => {
  it("should resolve entries to values in stored order", () => {
    const v = vault(
      [sheet("s", { "1,0": "first", "2,0": "second" })],
      [entry("s", 2), entry("s", 1)]
    );
    expect(resolve(v).map((r) => r.value)).toEqual(["second", "first"]);
  });

  it("should drop an entry whose sheet was deleted", () => {
    const v = vault([sheet("s", { "1,0": "kept" })], [entry("gone", 1), entry("s", 1)]);
    expect(resolve(v).map((r) => r.value)).toEqual(["kept"]);
  });

  it("should drop an entry whose cell was cleared", () => {
    const v = vault([sheet("s", { "1,0": "kept" })], [entry("s", 9), entry("s", 1)]);
    expect(resolve(v).map((r) => r.value)).toEqual(["kept"]);
  });

  it("should drop an entry whose stored value is an empty string", () => {
    // The store deletes empty cells, but an imported backup may carry "".
    const v = vault([sheet("s", { "1,0": "", "2,0": "kept" })], [entry("s", 1), entry("s", 2)]);
    expect(resolve(v).map((r) => r.value)).toEqual(["kept"]);
  });

  it("should drop entries from a locked sheet", () => {
    const v = vault(
      [sheet("open", { "1,0": "visible" }), sheet("secret", { "1,0": "hidden" }, { passwordHash: "h" })],
      [entry("secret", 1), entry("open", 1)]
    );
    expect(resolve(v).map((r) => r.value)).toEqual(["visible"]);
  });

  it("should show a protected sheet's entries while it is the active, unlocked sheet", () => {
    const v = vault([sheet("secret", { "1,0": "shown" }, { passwordHash: "h" })], [entry("secret", 1)]);
    expect(resolve(v, 0, true).map((r) => r.value)).toEqual(["shown"]);
  });

  it("should flag masked cells so the palette hides their preview", () => {
    const v = vault([sheet("s", { "1,0": "top secret" }, { masked: true })], [entry("s", 1)]);
    expect(resolve(v)[0].masked).toBe(true);
  });

  it("should carry the sheet name and position for display", () => {
    const v = vault([sheet("prod", { "3,2": "x" })], [entry("prod", 3, 2)]);
    expect(resolve(v)[0]).toMatchObject({ sheetName: "prod", sheetIndex: 0, row: 3, col: 2 });
  });

  it("should return nothing without a vault or without records", () => {
    expect(resolve(null)).toEqual([]);
    expect(resolve(vault([sheet("s", {})], []))).toEqual([]);
  });
});
