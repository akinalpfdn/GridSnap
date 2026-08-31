import { invoke } from "@tauri-apps/api/core";

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  notes: string;
  releaseUrl: string;
}

interface RawUpdateInfo {
  current_version: string;
  latest_version: string;
  notes: string;
  release_url: string;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const raw = await invoke<RawUpdateInfo | null>("check_for_update");
  if (!raw) return null;
  return {
    currentVersion: raw.current_version,
    latestVersion: raw.latest_version,
    notes: raw.notes,
    releaseUrl: raw.release_url,
  };
}

export async function skipUpdate(version: string): Promise<void> {
  return invoke("skip_update", { version });
}

export async function openReleasePage(url?: string): Promise<void> {
  return invoke("open_release_page", { url: url ?? null });
}
