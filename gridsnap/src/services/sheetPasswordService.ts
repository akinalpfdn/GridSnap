import { invoke } from "@tauri-apps/api/core";

export async function hashSheetPassword(password: string): Promise<string> {
  return invoke<string>("hash_sheet_password", { password });
}

export async function verifySheetPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return invoke<boolean>("verify_sheet_password", { hash, password });
}
