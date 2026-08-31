import { describe, expect, it } from "vitest";
import { shouldHideOnEscape } from "../../src/utils/escapeChain";

function check(overrides: Partial<Parameters<typeof shouldHideOnEscape>[0]> = {}) {
  return shouldHideOnEscape({
    editing: false,
    hasSelection: false,
    hasRange: false,
    overlayOpen: false,
    ...overrides,
  });
}

describe("shouldHideOnEscape", () => {
  it("should hide when nothing else can consume the key", () => {
    expect(check()).toBe(true);
  });

  it("should let the editor cancel first", () => {
    expect(check({ editing: true })).toBe(false);
  });

  it("should let a range collapse first", () => {
    expect(check({ hasSelection: true, hasRange: true })).toBe(false);
  });

  it("should let a selection clear first", () => {
    expect(check({ hasSelection: true })).toBe(false);
  });

  it("should never fall through an open overlay", () => {
    expect(check({ overlayOpen: true })).toBe(false);
  });

  it("should stay closed while editing inside an overlay-less selection", () => {
    // Editing implies a selection in practice, but each flag must hold alone.
    expect(check({ editing: true, hasSelection: false })).toBe(false);
  });
});
