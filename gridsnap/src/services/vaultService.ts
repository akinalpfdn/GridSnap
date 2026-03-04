import { invoke } from "@tauri-apps/api/core";
import type { Vault } from "../types/vault";

export async function loadVault(password: string): Promise<Vault | null> {
  return invoke<Vault | null>("load_vault", { password });
}

export async function saveVault(vault: Vault): Promise<boolean> {
  return invoke<boolean>("save_vault", { vault });
}

export async function createVault(
  password: string,
  vault: Vault
): Promise<boolean> {
  return invoke<boolean>("create_vault", { password, vault });
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  return invoke<boolean>("change_password", { oldPassword, newPassword });
}

export async function exportVault(destPath: string): Promise<boolean> {
  return invoke<boolean>("export_vault", { destPath });
}

export async function importVault(
  sourcePath: string,
  backupPassword: string
): Promise<Vault> {
  return invoke<Vault>("import_vault", { sourcePath, backupPassword });
}
