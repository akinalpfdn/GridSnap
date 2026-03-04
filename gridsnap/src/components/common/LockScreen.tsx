import { useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { loadVault } from "../../services/vaultService";
import styles from "./LockScreen.module.css";

interface LockScreenProps {
  onUnlocked?: () => void;
}

export function LockScreen({ onUnlocked }: LockScreenProps) {
  const setVault = useVaultStore((s) => s.setVault);
  const [password, setPassword] = useState("");
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
        useVaultStore.getState().setHasPassword(true);
        onUnlocked?.();
      } else {
        setError("No vault found.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Decryption failed") || msg.includes("wrong password")) {
        setError("Wrong password. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <img src="/icons/logo.svg" alt="GridSnap" className={styles.logo} />
      <div className={styles.title}>GridSnap</div>
      <div className={styles.subtitle}>Enter your master password</div>
      <div className={styles.form}>
        <input
          type="password"
          className={styles.input}
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUnlock();
            e.stopPropagation();
          }}
          autoFocus
        />
        {error && <div className={styles.error}>{error}</div>}
        <button
          className={styles.button}
          onClick={handleUnlock}
          disabled={loading}
        >
          {loading ? "..." : "Unlock"}
        </button>
      </div>
    </div>
  );
}
