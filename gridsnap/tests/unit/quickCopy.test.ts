import { describe, expect, it } from "vitest";
import { matchRank, previewOf, rankResults, type QuickCopyResult } from "../../src/utils/quickCopy";
import type { Sheet, Vault } from "../../src/types/vault";

function sheet(
  name: string,
  data: Record<string, string>,
  extra: Partial<Sheet> = {}
): Sheet {
  return {
    id: name,
    name,
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

function vault(sheets: Sheet[]): Vault {
  return {
    version: 1,
    sheets,
    settings: { theme: "carbon", hotkey: "Ctrl+Shift+Space", idleLockMinutes: 5, autoSaveDebounceMs: 500 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Vault;
}

function run(v: Vault | null, query: string, activeSheetUnlocked = false) {
  return rankResults({ vault: v, query, activeSheetIndex: 0, activeSheetUnlocked });
}

describe("matchRank", () => {
  it("should rank an exact match best", () => {
    expect(matchRank("aws", "aws")).toBe(0);
  });

  it("should rank a prefix match above a match in the middle", () => {
    expect(matchRank("aws-key", "aws")).toBeLessThan(matchRank("my-aws-key", "aws"));
  });

  it("should ignore case and surrounding whitespace in the query", () => {
    expect(matchRank("AWS", "  aws  ")).toBe(0);
  });
});

describe("rankResults", () => {
  it("should put an exact match before a prefix match before a contains match", () => {
    const v = vault([
      sheet("s", { "0,0": "my-aws-key", "1,0": "aws-key", "2,0": "aws" }),
    ]);

    expect(run(v, "aws").map((r) => r.value)).toEqual(["aws", "aws-key", "my-aws-key"]);
  });

  it("should keep sheet and reading order for equally ranked matches", () => {
    const v = vault([
      sheet("first", { "5,0": "contains aws b", "1,0": "contains aws a" }),
      sheet("second", { "0,0": "contains aws c" }),
    ]);

    expect(run(v, "aws").map((r) => r.value)).toEqual([
      "contains aws a",
      "contains aws b",
      "contains aws c",
    ]);
  });

  it("should carry the sheet name so a result can be placed", () => {
    const v = vault([sheet("prod", {}), sheet("staging", { "2,3": "aws" })]);
    const [result] = run(v, "aws");
    expect(result).toMatchObject({ sheetName: "staging", sheetIndex: 1, row: 2, col: 3 });
  });

  it("should exclude a locked sheet entirely", () => {
    const v = vault([
      sheet("open", { "0,0": "aws one" }),
      sheet("secret", { "0,0": "aws two" }, { passwordHash: "hash" }),
    ]);

    expect(run(v, "aws").map((r) => r.value)).toEqual(["aws one"]);
  });

  it("should flag a cell on a masked sheet rather than dropping it", () => {
    const v = vault([sheet("s", { "0,0": "aws" }, { masked: true })]);
    const [result] = run(v, "aws");
    expect(result.masked).toBe(true);
    // The value is still carried, exactly as the grid's copy button allows.
    expect(result.value).toBe("aws");
  });

  it("should flag an individually masked cell", () => {
    const v = vault([sheet("s", { "0,0": "aws" }, { maskedCells: { "0,0": true } })]);
    expect(run(v, "aws")[0].masked).toBe(true);
  });

  it("should return nothing for an empty query", () => {
    expect(run(vault([sheet("s", { "0,0": "aws" })]), "")).toEqual([]);
  });

  it("should return nothing without a vault", () => {
    expect(run(null, "aws")).toEqual([]);
  });

  it("should cap the number of results", () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < 120; i++) data[`${i},0`] = "aws";
    expect(rankResults({ vault: vault([sheet("s", data)]), query: "aws", activeSheetIndex: 0, activeSheetUnlocked: false, limit: 10 })).toHaveLength(10);
  });
});

describe("previewOf", () => {
  const base: QuickCopyResult = {
    sheetIndex: 0,
    sheetName: "s",
    row: 0,
    col: 0,
    value: "value",
    masked: false,
  };

  it("should never reveal a masked value", () => {
    expect(previewOf({ ...base, value: "hunter2", masked: true })).not.toContain("hunter2");
  });

  it("should show only the first line of a multi-line value", () => {
    const preview = previewOf({ ...base, value: "line one\nline two" });
    expect(preview).toContain("line one");
    expect(preview).not.toContain("line two");
  });

  it("should truncate a long value", () => {
    const preview = previewOf({ ...base, value: "x".repeat(200) }, 20);
    expect(preview.length).toBeLessThanOrEqual(21);
  });

  it("should leave a short single-line value alone", () => {
    expect(previewOf({ ...base, value: "ssh host" })).toBe("ssh host");
  });
});
