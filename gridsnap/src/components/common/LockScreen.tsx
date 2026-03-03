import { useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { loadVault, createVault } from "../../services/vaultService";
import type { Vault, Sheet } from "../../types/vault";
import styles from "./LockScreen.module.css";

export function LockScreen() {
  const setVault = useVaultStore((s) => s.setVault);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNew, setIsNew] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password) return;
    setError("");
    setLoading(true);
    try {
      const vault = await loadVault(password);
      if (vault) {
        setVault(vault);
      } else {
        // No vault exists yet
        setIsNew(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Decryption failed") || msg.includes("wrong password")) {
        setError("Wrong password. Please try again.");
      } else if (msg.includes("No vault") || msg.includes("not found")) {
        setIsNew(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!password || password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const defaultSheet: Sheet = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: "Sheet 1",
        icon: "grid",
        color: "#D4915E",
        masked: false,
        data: {},
        columnWidths: {},
        rowHeights: {},
      };
      const vault: Vault = {
        version: 1,
        sheets: [defaultSheet],
        settings: {
          theme: "carbon",
          hotkey: "Ctrl+Shift+Space",
          idleLockMinutes: 5,
          autoSaveDebounceMs: 500,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createVault(password, vault);
      setVault(vault);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <img src="/icons/logo.svg" alt="GridSnap" className={styles.logo} />
      <div className={styles.title}>GridSnap</div>
      <div className={styles.subtitle}>
        {isNew ? "Create a master password" : "Enter your master password"}
      </div>
      <div className={styles.form}>
        <input
          type="password"
          className={styles.input}
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isNew) handleUnlock();
            e.stopPropagation();
          }}
          autoFocus
        />
        {isNew && (
          <input
            type="password"
            className={styles.input}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              e.stopPropagation();
            }}
          />
        )}
        {error && <div className={styles.error}>{error}</div>}
        <button
          className={styles.button}
          onClick={isNew ? handleCreate : handleUnlock}
          disabled={loading}
        >
          {loading ? "..." : isNew ? "Create Vault" : "Unlock"}
        </button>
        {isNew === null && (
          <button
            className={styles.button}
            style={{ background: "transparent", color: "var(--gs-text-secondary)", border: "1px solid var(--gs-border-default)" }}
            onClick={() => setIsNew(true)}
          >
            Create New Vault
          </button>
        )}
      </div>
    </div>
  );
}
