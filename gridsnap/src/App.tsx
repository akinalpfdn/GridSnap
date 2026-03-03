import { useState } from "react";
import { useVaultStore } from "./stores/vaultStore";
import { VirtualGrid } from "./components/grid/VirtualGrid";
import { SheetTabs } from "./components/sheets/SheetTabs";
import { Toolbar } from "./components/toolbar/Toolbar";
import { StatusBar } from "./components/toolbar/StatusBar";
import { LockScreen } from "./components/common/LockScreen";
import { Toast } from "./components/common/Toast";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import styles from "./App.module.css";

export default function App() {
  const locked = useVaultStore((s) => s.locked);
  const setLocked = useVaultStore((s) => s.setLocked);
  const [toast, setToast] = useState<string | null>(null);

  // Listen for clipboard events from Rust
  useEffect(() => {
    const unlisten = listen("clipboard-written", () => {
      setToast("Copied to clipboard");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for vault-locked events
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
      <Toolbar />
      <div className={styles.gridArea}>
        <VirtualGrid />
      </div>
      <SheetTabs />
      <StatusBar />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
