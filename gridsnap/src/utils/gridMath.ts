/**
 * Build prefix-sum array from individual sizes.
 * prefixSums[i] = total size of items 0..i-1 (position of item i's start).
 */
export function buildPrefixSums(
  count: number,
  defaultSize: number,
  customSizes: Record<number, number>
): number[] {
  const sums = new Array(count + 1);
  sums[0] = 0;
  for (let i = 0; i < count; i++) {
    sums[i + 1] = sums[i] + (customSizes[i] ?? defaultSize);
  }
  return sums;
}

/**
 * Binary search for the first item whose start position >= offset.
 */
export function findStartIndex(prefixSums: number[], offset: number): number {
  let lo = 0;
  let hi = prefixSums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (prefixSums[mid + 1] <= offset) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Find the last visible item index given a viewport end offset.
 */
export function findEndIndex(
  prefixSums: number[],
  endOffset: number
): number {
  let lo = 0;
  let hi = prefixSums.length - 2; // max valid index
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (prefixSums[mid] < endOffset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Map a pixel coordinate to a cell index using prefix sums.
 * Returns -1 if out of bounds.
 */
export function hitTestIndex(prefixSums: number[], pos: number): number {
  if (pos < 0 || pos >= prefixSums[prefixSums.length - 1]) return -1;
  return findStartIndex(prefixSums, pos);
}

/**
 * Column index to letter(s): 0->A, 25->Z, 26->AA, etc.
 */
export function colToLetter(col: number): string {
  let result = "";
  let n = col;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}
