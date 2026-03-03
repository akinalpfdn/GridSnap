import { invoke } from "@tauri-apps/api/core";

export async function writeClipboard(text: string): Promise<void> {
  return invoke("write_clipboard", { text });
}
