import { useState, useEffect, useCallback } from "react";
import { useVaultStore } from "./stores/vaultStore";
import { VirtualGrid } from "./components/grid/VirtualGrid";
import { SheetTabs } from "./components/sheets/SheetTabs";
import { Toolbar } from "./components/toolbar/Toolbar";
import { StatusBar } from "./components/toolbar/StatusBar";
import { LockScreen } from "./components/common/LockScreen";
import { SettingsPanel } from "./components/common/SettingsPanel";
import { Toast } from "./components/common/Toast";
import { listen } from "@tauri-apps/api/event";
import styles from "./App.module.css";

export default function App() {
  const locked = useVaultStore((s) => s.locked);
  const setLocked = useVaultStore((s) => s.setLocked);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  if (locked) {
    return <LockScreen />;
  }

  return (
    <div className={styles.app}>
      <Toolbar onSettingsClick={() => setSettingsOpen(true)} onSave={handleSave} />
      <div className={styles.gridArea}>
        <VirtualGrid />
      </div>
      <SheetTabs />
      <StatusBar />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
