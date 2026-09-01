import { invoke } from "@tauri-apps/api/core";

/**
 * Registers the window-toggle shortcut and, when set, the quick-copy palette
 * shortcut. Both are always sent together: registration replaces everything,
 * so sending one alone would silently unregister the other.
 */
export async function changeShortcut(
  newShortcut: string,
  paletteShortcut?: string | null
): Promise<void> {
  return invoke("change_shortcut", { newShortcut, paletteShortcut: paletteShortcut ?? null });
}
