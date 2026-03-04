import { invoke } from "@tauri-apps/api/core";

export async function changeShortcut(newShortcut: string): Promise<void> {
  return invoke("change_shortcut", { newShortcut });
}
