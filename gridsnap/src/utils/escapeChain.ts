/**
 * Whether an Escape press should hide the window.
 *
 * Escape already means many things, in order: cancel the cell edit, collapse
 * the range, drop the selection, close whatever overlay is open. Hiding is the
 * step after all of those — it may only trigger when every other consumer of
 * the key has nothing left to do. The caller evaluates these flags BEFORE the
 * other handlers run (capture phase), so each press advances one step of the
 * chain rather than falling through several at once.
 */
export function shouldHideOnEscape(args: {
  editing: boolean;
  hasSelection: boolean;
  hasRange: boolean;
  overlayOpen: boolean;
}): boolean {
  const { editing, hasSelection, hasRange, overlayOpen } = args;
  return !editing && !hasSelection && !hasRange && !overlayOpen;
}
