import { describe, expect, it } from "vitest";
import { encodeTsv, parseTsv } from "../../src/utils/tsv";

describe("parseTsv", () => {
  it("should treat text with no tab or newline as a single value", () => {
    expect(parseTsv("hello world")).toEqual([["hello world"]]);
  });

  it("should not strip quotes from a single-line shell snippet", () => {
    // The whole point of the fast path: this is content, not a quoted field.
    expect(parseTsv('"C:\\Program Files\\app.exe" --flag')).toEqual([
      ['"C:\\Program Files\\app.exe" --flag'],
    ]);
  });

  it("should split plain rows and columns", () => {
    expect(parseTsv("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should keep a quoted multi-line field in one cell", () => {
    expect(parseTsv('"line1\nline2"\tb')).toEqual([["line1\nline2", "b"]]);
  });

  it("should undouble quotes inside a quoted field", () => {
    expect(parseTsv('"say ""hi""\nagain"\tb')).toEqual([['say "hi"\nagain', "b"]]);
  });

  it("should treat an unterminated quoted field as literal text", () => {
    // Closing quote is not followed by a delimiter, so it is not a field.
    expect(parseTsv('"a" b\tc')).toEqual([['"a" b', "c"]]);
  });

  it("should treat a field with no closing quote as literal text", () => {
    expect(parseTsv('"unclosed\tc')).toEqual([['"unclosed', "c"]]);
  });

  it("should handle CRLF line endings", () => {
    expect(parseTsv("a\tb\r\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should not produce an empty trailing row for a trailing newline", () => {
    expect(parseTsv("a\tb\n")).toEqual([["a", "b"]]);
  });

  it("should keep a trailing empty field after a trailing tab", () => {
    expect(parseTsv("a\t")).toEqual([["a", ""]]);
  });

  it("should keep empty cells between delimiters", () => {
    expect(parseTsv("a\t\tb\n\tc\t")).toEqual([
      ["a", "", "b"],
      ["", "c", ""],
    ]);
  });
});

describe("encodeTsv", () => {
  it("should leave a plain single value untouched", () => {
    expect(encodeTsv([["hello"]])).toBe("hello");
  });

  it("should not quote a single value merely because it contains quotes", () => {
    expect(encodeTsv([['say "hi"']])).toBe('say "hi"');
  });

  it("should quote a value containing a newline", () => {
    expect(encodeTsv([["line1\nline2"]])).toBe('"line1\nline2"');
  });

  it("should quote a value containing a tab", () => {
    expect(encodeTsv([["a\tb"]])).toBe('"a\tb"');
  });

  it("should double quotes inside a quoted value", () => {
    expect(encodeTsv([['say "hi"\nagain']])).toBe('"say ""hi""\nagain"');
  });

  it("should quote a leading-quote value when other fields are present", () => {
    // Alone it would travel verbatim, but here the reader runs the full parser.
    expect(encodeTsv([['"hi"', "b"]])).toBe('"""hi"""\tb');
  });

  it("should join rows and columns with tabs and newlines", () => {
    expect(
      encodeTsv([
        ["a", "b"],
        ["c", "d"],
      ])
    ).toBe("a\tb\nc\td");
  });
});

describe("round-trip", () => {
  const cases: { name: string; grid: string[][] }[] = [
    { name: "plain single cell", grid: [["hello"]] },
    { name: "single cell with quotes", grid: [['say "hi"']] },
    { name: "single cell starting with a quote", grid: [['"quoted"']] },
    { name: "multi-line single cell", grid: [["line1\nline2\nline3"]] },
    { name: "multi-line cell with quotes", grid: [['a "b"\nc']] },
    { name: "single cell containing a tab", grid: [["a\tb"]] },
    {
      name: "grid of plain values",
      grid: [
        ["a", "b"],
        ["c", "d"],
      ],
    },
    {
      name: "grid with a multi-line cell",
      grid: [
        ["ssh -i key\nhost", "note"],
        ["x", "y"],
      ],
    },
    { name: "grid with a leading-quote value", grid: [['"hi"', "b"]] },
    { name: "grid with empty cells", grid: [["a", "", "b"]] },
  ];

  for (const { name, grid } of cases) {
    it(`should survive encode then parse: ${name}`, () => {
      expect(parseTsv(encodeTsv(grid))).toEqual(grid);
    });
  }
});
