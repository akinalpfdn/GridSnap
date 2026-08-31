import { describe, expect, it } from "vitest";
import {
  canInsertColumn,
  canInsertRow,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  type SheetStructure,
} from "../../src/utils/gridStructure";

function structure(overrides: Partial<SheetStructure> = {}): SheetStructure {
  return {
    data: {},
    maskedCells: {},
    rowHeights: {},
    columnWidths: {},
    ...overrides,
  };
}

describe("insertRow", () => {
  it("should shift rows at and below the index down by one", () => {
    const s = structure({ data: { "1,0": "above", "5,0": "at", "9,2": "below" } });
    expect(insertRow(s, 5).data).toEqual({ "1,0": "above", "6,0": "at", "10,2": "below" });
  });

  it("should move row heights and masks along with the data", () => {
    const s = structure({
      data: { "5,0": "x" },
      maskedCells: { "5,0": true },
      rowHeights: { 5: 44, 2: 30 },
    });
    const out = insertRow(s, 3);
    expect(out.rowHeights).toEqual({ 6: 44, 2: 30 });
    expect(out.maskedCells).toEqual({ "6,0": true });
  });

  it("should leave column widths untouched", () => {
    const s = structure({ columnWidths: { 3: 200 } });
    expect(insertRow(s, 0).columnWidths).toEqual({ 3: 200 });
  });
});

describe("deleteRow", () => {
  it("should drop the row and shift the rest up", () => {
    const s = structure({ data: { "2,0": "above", "5,1": "victim", "8,0": "below" } });
    expect(deleteRow(s, 5).data).toEqual({ "2,0": "above", "7,0": "below" });
  });

  it("should drop the row's height and mask entries too", () => {
    const s = structure({
      data: { "5,0": "victim" },
      maskedCells: { "5,0": true },
      rowHeights: { 5: 44, 9: 30 },
    });
    const out = deleteRow(s, 5);
    expect(out.maskedCells).toEqual({});
    expect(out.rowHeights).toEqual({ 8: 30 });
  });
});

describe("insertColumn / deleteColumn", () => {
  it("should shift columns and their widths", () => {
    const s = structure({ data: { "0,1": "a", "0,4": "b" }, columnWidths: { 4: 250 } });
    const out = insertColumn(s, 2);
    expect(out.data).toEqual({ "0,1": "a", "0,5": "b" });
    expect(out.columnWidths).toEqual({ 5: 250 });
  });

  it("should drop the deleted column's contents and width", () => {
    const s = structure({
      data: { "0,1": "keep", "0,3": "victim", "0,5": "shift" },
      columnWidths: { 3: 250, 5: 90 },
      maskedCells: { "0,3": true },
    });
    const out = deleteColumn(s, 3);
    expect(out.data).toEqual({ "0,1": "keep", "0,4": "shift" });
    expect(out.columnWidths).toEqual({ 4: 90 });
    expect(out.maskedCells).toEqual({});
  });

  it("should leave row heights untouched", () => {
    const s = structure({ rowHeights: { 2: 44 } });
    expect(deleteColumn(s, 0).rowHeights).toEqual({ 2: 44 });
  });
});

describe("round-trip", () => {
  it("should restore the exact structure when a row insert is deleted again", () => {
    const s = structure({
      data: { "1,0": "a", "5,3": "b", "9,1": "c" },
      maskedCells: { "5,3": true },
      rowHeights: { 5: 44 },
      columnWidths: { 3: 200 },
    });
    expect(deleteRow(insertRow(s, 4), 4)).toEqual(s);
  });

  it("should restore the exact structure when a column insert is deleted again", () => {
    const s = structure({ data: { "0,0": "a", "3,4": "b" }, columnWidths: { 4: 180 } });
    expect(deleteColumn(insertColumn(s, 2), 2)).toEqual(s);
  });
});

describe("edge guards", () => {
  it("should refuse a row insert when the last row holds data", () => {
    expect(canInsertRow({ "999,3": "edge" }, 1000)).toBe(false);
    expect(canInsertRow({ "998,3": "safe" }, 1000)).toBe(true);
  });

  it("should refuse a column insert when the last column holds data", () => {
    expect(canInsertColumn({ "0,25": "edge" }, 26)).toBe(false);
    expect(canInsertColumn({ "0,24": "safe" }, 26)).toBe(true);
  });

  it("should allow inserts into an empty sheet", () => {
    expect(canInsertRow({}, 1000)).toBe(true);
    expect(canInsertColumn({}, 26)).toBe(true);
  });
});
