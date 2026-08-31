/**
 * Tab-separated clipboard encoding, following the convention spreadsheets use:
 * a field holding a tab or a newline is wrapped in double quotes, and quotes
 * inside such a field are doubled.
 *
 * Values are only quoted when they would otherwise break the row/column
 * structure. A single cell holding `"quoted"` therefore travels verbatim, which
 * matters here — shell snippets that begin with a quote are ordinary content,
 * not a spreadsheet field.
 */

const QUOTE = '"';

function needsQuoting(value: string): boolean {
  return value.includes("\t") || value.includes("\n") || value.includes("\r");
}

/**
 * Encodes a grid of values for the clipboard.
 *
 * With more than one field, a value starting with a quote is also quoted: the
 * output already contains a tab or newline, so the reader runs the full parser
 * and would otherwise strip those leading quotes.
 */
export function encodeTsv(rows: string[][]): string {
  const multiField = rows.length > 1 || (rows[0]?.length ?? 0) > 1;
  return rows
    .map((row) =>
      row
        .map((value) => {
          const force = multiField && value.startsWith(QUOTE);
          if (!force && !needsQuoting(value)) return value;
          return QUOTE + value.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE;
        })
        .join("\t")
    )
    .join("\n");
}

/**
 * Parses clipboard text into a grid.
 *
 * Text with no tab and no newline is a single value and is returned untouched —
 * no quote handling at all, so a pasted shell snippet survives intact.
 */
export function parseTsv(text: string): string[][] {
  if (!text.includes("\t") && !text.includes("\n") && !text.includes("\r")) {
    return [[text]];
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;

  const readPlainField = (): string => {
    const start = i;
    while (i < text.length && text[i] !== "\t" && text[i] !== "\n" && text[i] !== "\r") {
      i++;
    }
    return text.slice(start, i);
  };

  /**
   * Reads a quoted field, or returns null when the closing quote is not
   * followed by a delimiter — `"C:\path with spaces" --flag` is one literal
   * value, not a quoted field with trailing junk.
   */
  const readQuotedField = (): string | null => {
    let j = i + 1;
    let buffer = "";
    let closed = false;
    while (j < text.length) {
      if (text[j] === QUOTE) {
        if (text[j + 1] === QUOTE) {
          buffer += QUOTE;
          j += 2;
          continue;
        }
        closed = true;
        j++;
        break;
      }
      buffer += text[j];
      j++;
    }
    if (!closed) return null;
    const next = text[j];
    if (next !== undefined && next !== "\t" && next !== "\n" && next !== "\r") return null;
    i = j;
    return buffer;
  };

  for (;;) {
    const quoted = text[i] === QUOTE ? readQuotedField() : null;
    row.push(quoted ?? readPlainField());

    if (i >= text.length) break;

    if (text[i] === "\t") {
      i++;
      continue;
    }

    if (text[i] === "\r") i++;
    if (text[i] === "\n") i++;
    rows.push(row);
    row = [];
    // A trailing newline ends the data rather than starting an empty row.
    if (i >= text.length) return rows;
  }

  rows.push(row);
  return rows;
}
