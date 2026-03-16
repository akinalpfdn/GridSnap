import { useState, useEffect } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { changePassword, exportVault, importVault } from "../../services/vaultService";
import { enableAutostart, disableAutostart, isAutostartEnabled } from "../../services/autostartService";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { ShortcutRecorder } from "./ShortcutRecorder";
import { THEMES, applyTheme } from "../../theme/themes";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const vault = useVaultStore((s) => s.vault);
  const setLocked = useVaultStore((s) => s.setLocked);
  const hasPassword = useVaultStore((s) => s.hasPassword);
  const setHasPassword = useVaultStore((s) => s.setHasPassword);

  // Autostart
  const [autostart, setAutostart] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(true);

  useEffect(() => {
    isAutostartEnabled()
      .then(setAutostart)
      .catch(() => setAutostart(false))
      .finally(() => setAutostartLoading(false));
  }, []);

  const handleAutostartToggle = async () => {
    setAutostartLoading(true);
    try {
      if (autostart) {
        await disableAutostart();
        setAutostart(false);
      } else {
        await enableAutostart();
        setAutostart(true);
      }
    } catch (e) {
      console.error("Autostart toggle failed:", e);
    } finally {
      setAutostartLoading(false);
    }
  };

  // Password fields
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleSetPassword = async () => {
    if (!newPw || newPw !== confirmPw) {
      setPwMsg({ text: "Passwords don't match.", ok: false });
      return;
    }
    if (newPw.length < 4) {
      setPwMsg({ text: "Password must be at least 4 characters.", ok: false });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      // old password is empty (plaintext mode)
      await changePassword("", newPw);
      setPwMsg({ text: "Password set. Vault is now encrypted.", ok: true });
      setHasPassword(true);
      setNewPw("");
      setConfirmPw("");
    } catch (e: unknown) {
      setPwMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw !== confirmPw) {
      setPwMsg({ text: "Passwords don't match.", ok: false });
      return;
    }
    if (newPw.length < 4) {
      setPwMsg({ text: "Password must be at least 4 characters.", ok: false });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await changePassword(oldPw, newPw);
      setPwMsg({ text: "Password changed successfully.", ok: true });
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: unknown) {
      setPwMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!oldPw) {
      setPwMsg({ text: "Enter your current password to remove it.", ok: false });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await changePassword(oldPw, "");
      setPwMsg({ text: "Password removed. Vault is now unprotected.", ok: true });
      setHasPassword(false);
      setOldPw("");
    } catch (e: unknown) {
      setPwMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  const handleLock = () => {
    setLocked(true);
    onClose();
  };

  // Backup
  const setVault = useVaultStore((s) => s.setVault);
  const [backupMsg, setBackupMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importStep, setImportStep] = useState<"idle" | "confirm" | "password">("idle");
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState("");

  const handleExport = async () => {
    setBackupMsg(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dest = await saveDialog({
        defaultPath: `gridsnap-backup-${today}.gs`,
        filters: [{ name: "GridSnap Vault", extensions: ["gs"] }],
      });
      if (!dest) return;
      setBackupLoading(true);
      await exportVault(dest);
      setBackupMsg({ text: "Backup exported successfully.", ok: true });
    } catch (e: unknown) {
      setBackupMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportSelect = async () => {
    setBackupMsg(null);
    try {
      const selected = await openDialog({
        filters: [{ name: "GridSnap Vault", extensions: ["gs"] }],
        multiple: false,
      });
      if (!selected) return;
      setImportFilePath(selected);
      setImportStep("confirm");
    } catch (e: unknown) {
      setBackupMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    }
  };

  const handleImportConfirm = async () => {
    if (!importFilePath) return;
    setImportStep("idle");
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const vault = await importVault(importFilePath, "");
      setVault(vault);
      setBackupMsg({ text: "Backup imported successfully.", ok: true });
      setImportFilePath(null);
    } catch {
      // Likely encrypted — ask for password
      setBackupLoading(false);
      setImportStep("password");
    }
  };

  const handleImportWithPassword = async () => {
    if (!importFilePath) return;
    setImportStep("idle");
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const vault = await importVault(importFilePath, importPassword);
      setVault(vault);
      setBackupMsg({ text: "Backup imported successfully.", ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Decryption failed") || msg.includes("wrong password")) {
        setBackupMsg({ text: "Wrong password for backup file.", ok: false });
      } else {
        setBackupMsg({ text: msg, ok: false });
      }
    } finally {
      setBackupLoading(false);
      setImportPassword("");
      setImportFilePath(null);
    }
  };

  const handleImportCancel = () => {
    setImportStep("idle");
    setImportFilePath(null);
    setImportPassword("");
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Shortcut */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Global Shortcut</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Toggle window</span>
            <ShortcutRecorder />
          </div>
        </div>

        {/* Startup */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Startup</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Launch on system startup</span>
            <button
              className={`${styles.toggle} ${autostart ? styles.toggleOn : ""}`}
              onClick={handleAutostartToggle}
              disabled={autostartLoading}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Theme</div>
          <div className={styles.themeGrid}>
            {THEMES.map((t) => {
              const active = (vault?.settings.theme ?? "carbon") === t.id;
              return (
                <button
                  key={t.id}
                  className={`${styles.themeCard} ${active ? styles.themeCardActive : ""}`}
                  onClick={() => {
                    applyTheme(t.id);
                    useVaultStore.getState().setTheme(t.id);
                  }}
                >
                  <div className={styles.themeSwatches}>
                    <span style={{ background: t.swatches[0] }} />
                    <span style={{ background: t.swatches[1] }} />
                    <span style={{ background: t.swatches[2] }} />
                  </div>
                  <span className={styles.themeName}>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Security</div>

          {!hasPassword ? (
            <>
              <p className={styles.hint}>
                No password set. Vault is stored as plaintext.
              </p>
              <div className={styles.field}>
                <label className={styles.label}>New password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="New password"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Confirm password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSetPassword();
                    e.stopPropagation();
                  }}
                />
              </div>
              {pwMsg && (
                <div className={`${styles.message} ${pwMsg.ok ? styles.success : styles.error}`}>
                  {pwMsg.text}
                </div>
              )}
              <button
                className={styles.btn}
                onClick={handleSetPassword}
                disabled={pwLoading}
              >
                {pwLoading ? "..." : "Set Password"}
              </button>
            </>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Current password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  placeholder="Current password"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>New password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="New password (leave empty to remove)"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm new password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleChangePassword();
                    e.stopPropagation();
                  }}
                />
              </div>
              {pwMsg && (
                <div className={`${styles.message} ${pwMsg.ok ? styles.success : styles.error}`}>
                  {pwMsg.text}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={styles.btn}
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                >
                  {pwLoading ? "..." : "Change Password"}
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={handleRemovePassword}
                  disabled={pwLoading}
                >
                  Remove Password
                </button>
              </div>
            </>
          )}
        </div>

        {/* Backup */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Backup</div>
          {importStep === "idle" && (
            <>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={styles.btnSecondary}
                  onClick={handleExport}
                  disabled={backupLoading}
                >
                  {backupLoading ? "..." : "Export Backup"}
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={handleImportSelect}
                  disabled={backupLoading}
                >
                  Import Backup
                </button>
              </div>
              {backupMsg && (
                <div className={`${styles.message} ${backupMsg.ok ? styles.success : styles.error}`}>
                  {backupMsg.text}
                </div>
              )}
            </>
          )}
          {importStep === "confirm" && (
            <>
              <p className={styles.hint}>
                This will replace all current vault data with the backup. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className={styles.btnSecondary} onClick={handleImportCancel}>
                  Cancel
                </button>
                <button className={styles.btn} onClick={handleImportConfirm}>
                  Replace & Import
                </button>
              </div>
            </>
          )}
          {importStep === "password" && (
            <>
              <p className={styles.hint}>
                This backup is encrypted. Enter the password it was created with.
              </p>
              <div className={styles.field}>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Backup password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleImportWithPassword();
                    if (e.key === "Escape") handleImportCancel();
                    e.stopPropagation();
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className={styles.btnSecondary} onClick={handleImportCancel}>
                  Cancel
                </button>
                <button className={styles.btn} onClick={handleImportWithPassword}>
                  Unlock & Import
                </button>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {hasPassword && (
          <div className={styles.section}>
            <button className={styles.btnSecondary} onClick={handleLock}>
              Lock Vault
            </button>
          </div>
        )}

        <div className={styles.version}>GridSnap v1.2.2</div>
      </div>
    </div>
  );
}
