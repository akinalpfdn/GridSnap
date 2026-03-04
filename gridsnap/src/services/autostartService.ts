import { invoke } from "@tauri-apps/api/core";

export async function enableAutostart(): Promise<void> {
  return invoke("autostart_enable");
}

export async function disableAutostart(): Promise<void> {
  return invoke("autostart_disable");
}

export async function isAutostartEnabled(): Promise<boolean> {
  return invoke<boolean>("autostart_is_enabled");
}
