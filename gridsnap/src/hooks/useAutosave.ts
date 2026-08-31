import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useVaultStore } from "../stores/vaultStore";

/**
 * Dirty work older than this reaches disk even if no blur or quit happens.
 * Event-driven rather than keystroke-debounced: every save derives a fresh
 * Argon2id key on purpose, so saving is something to do at moments, not on
 * every pause in typing.
 */
const SAFETY_INTERVAL_MS = 60_000;

export function useAutosave() {
  useEffect(() => {
    const trySave = () => {
      // save() itself refuses when clean, locked or already saving; a failure
      // keeps dirty set, so the next trigger simply retries.
      useVaultStore
        .getState()
        .save()
        .catch((e) => console.error("Autosave failed:", e));
    };

    // Leaving the window — another app, the tray, a hide — is the moment work
    // is most likely to be forgotten.
    window.addEventListener("blur", trySave);
    const interval = setInterval(trySave, SAFETY_INTERVAL_MS);

    // Tray Quit asks us to persist first; the Rust side force-exits after a
    // timeout in case this listener can no longer run.
    const unlisten = listen("quit-requested", async () => {
      try {
        await useVaultStore.getState().flushSave();
      } catch (e) {
        console.error("Save on quit failed:", e);
      }
      invoke("quit_app").catch(() => {});
    });

    return () => {
      window.removeEventListener("blur", trySave);
      clearInterval(interval);
      unlisten.then((fn) => fn());
    };
  }, []);
}
