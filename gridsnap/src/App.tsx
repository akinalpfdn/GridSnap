import { useState, useEffect, useCallback } from "react";
import { useVaultStore } from "./stores/vaultStore";
import { loadVault, createVault } from "./services/vaultService";
import { changeShortcut } from "./services/shortcutService";
import { applyTheme } from "./theme/themes";
import { VirtualGrid } from "./components/grid/VirtualGrid";
import { SheetTabs } from "./components/sheets/SheetTabs";
import { Toolbar } from "./components/toolbar/Toolbar";
import { StatusBar } from "./components/toolbar/StatusBar";
import { LockScreen } from "./components/common/LockScreen";
import { SheetPasswordModal } from "./components/common/SheetPasswordModal";
import { SettingsPanel } from "./components/common/SettingsPanel";
import { Toast } from "./components/common/Toast";
import { listen } from "@tauri-apps/api/event";
import type { Vault, Sheet } from "./types/vault";
import styles from "./App.module.css";

function createDefaultVault(): Vault {
  return {
    version: 1,
    sheets: [{
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      name: "Sheet 1",
      icon: "grid",
      color: "#D4915E",
      masked: false,
      maskedCells: {},
      passwordHash: null,
      failedAttempts: 0,
      lockUntil: null,
      data: {},
      columnWidths: {},
      rowHeights: {},
    } as Sheet],
    settings: {
      theme: "carbon",
      hotkey: "Ctrl+Shift+Space",
      idleLockMinutes: 5,
      autoSaveDebounceMs: 500,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const locked = useVaultStore((s) => s.locked);
  const setLocked = useVaultStore((s) => s.setLocked);
  const setVault = useVaultStore((s) => s.setVault);
  const activeSheetIndex = useVaultStore((s) => s.activeSheetIndex);
  const activeSheetPasswordHash = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.passwordHash ?? null
  );
  const activeSheetName = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.name ?? ""
  );
  const sheetUnlocked = useVaultStore((s) => s.sheetUnlocked);
  const isSheetLocked = !!activeSheetPasswordHash && !sheetUnlocked;
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);

  // On mount: try loading vault without password (plaintext mode)
  useEffect(() => {
    (async () => {
      try {
        const vault = await loadVault("");
        if (vault) {
          // Vault exists in plaintext mode — open directly
          setVault(vault);
          useVaultStore.getState().setHasPassword(false);
          applyTheme(vault.settings.theme);
          // Re-register saved shortcut if different from default
          if (vault.settings.hotkey && vault.settings.hotkey !== "Ctrl+Shift+Space") {
            changeShortcut(vault.settings.hotkey).catch(console.error);
          }
          setBooting(false);
          return;
        }
      } catch {
        // Vault file exists but is encrypted — needs password
        setNeedsPassword(true);
        setBooting(false);
        return;
      }
      // No vault file at all — create a new plaintext vault
      try {
        const vault = createDefaultVault();
        await createVault("", vault);
        setVault(vault);
      } catch (e) {
        console.error("Failed to create vault:", e);
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await useVaultStore.getState().save();
      setToast("Saved");
    } catch {
      setToast("Save failed");
    }
  }, []);

  // Ctrl+S global save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    const unlisten = listen("clipboard-written", () => {
      setToast("Copied to clipboard");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen("vault-locked", () => {
      setLocked(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setLocked]);

  if (booting) {
    return null; // Brief loading, no flash
  }

  if (locked || needsPassword) {
    return <LockScreen onUnlocked={() => {
      setNeedsPassword(false);
      const v = useVaultStore.getState().vault;
      if (v) applyTheme(v.settings.theme);
      if (v?.settings.hotkey && v.settings.hotkey !== "Ctrl+Shift+Space") {
        changeShortcut(v.settings.hotkey).catch(console.error);
      }
    }} />;
  }

  return (
    <div className={styles.app}>
      <Toolbar onSettingsClick={() => setSettingsOpen(true)} onSave={handleSave} />
      <div className={styles.gridArea}>
        <VirtualGrid />
        {isSheetLocked && (
          <SheetPasswordModal
            mode="unlock"
            sheetIndex={activeSheetIndex}
            sheetName={activeSheetName}
            onClose={() => {}}
          />
        )}
      </div>
      <SheetTabs />
      <StatusBar />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
