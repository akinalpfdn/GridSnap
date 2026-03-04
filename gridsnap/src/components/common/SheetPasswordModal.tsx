import { useState, useEffect, useRef, useCallback } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import {
  hashSheetPassword,
  verifySheetPassword,
} from "../../services/sheetPasswordService";
import styles from "./SheetPasswordModal.module.css";

type Mode = "set" | "unlock" | "remove" | "delete";

interface SheetPasswordModalProps {
  mode: Mode;
  sheetIndex: number;
  sheetName: string;
  onClose: () => void;
  onConfirm?: () => void;
  fullscreen?: boolean;
}

export function SheetPasswordModal({
  mode,
  sheetIndex,
  sheetName,
  onClose,
  onConfirm,
  fullscreen,
}: SheetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const sheet = useVaultStore(
    (s) => s.vault?.sheets[sheetIndex]
  );
  const setSheetPassword = useVaultStore((s) => s.setSheetPassword);
  const setSheetFailedAttempts = useVaultStore((s) => s.setSheetFailedAttempts);
  const setSheetUnlocked = useVaultStore((s) => s.setSheetUnlocked);
  const save = useVaultStore((s) => s.save);

  // Cooldown timer
  useEffect(() => {
    if (!sheet?.lockUntil) {
      setCooldownRemaining(0);
      return;
    }
    const check = () => {
      const remaining = Math.max(
        0,
        new Date(sheet.lockUntil!).getTime() - Date.now()
      );
      setCooldownRemaining(remaining);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [sheet?.lockUntil]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isLocked = cooldownRemaining > 0;
  const cooldownText = isLocked
    ? `Too many attempts. Try again in ${Math.floor(cooldownRemaining / 60000)}:${String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, "0")}`
    : "";

  const handleSet = useCallback(async () => {
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const hash = await hashSheetPassword(password);
      setSheetPassword(sheetIndex, hash);
      await save();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [password, confirm, sheetIndex, setSheetPassword, save, onClose]);

  const handleUnlock = useCallback(async () => {
    if (!sheet?.passwordHash || isLocked) return;
    setError("");
    setLoading(true);
    try {
      const ok = await verifySheetPassword(sheet.passwordHash, password);
      if (ok) {
        // Reset brute force counters
        setSheetFailedAttempts(sheetIndex, 0, null);
        setSheetUnlocked(true);
        await save();
        onClose();
      } else {
        const newAttempts = (sheet.failedAttempts ?? 0) + 1;
        let lockUntil: string | null = null;
        if (newAttempts >= 10) {
          lockUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        }
        setSheetFailedAttempts(sheetIndex, newAttempts, lockUntil);
        await save();
        setError(
          newAttempts >= 10
            ? "Too many attempts. Locked for 2 minutes."
            : `Wrong password. ${10 - newAttempts} attempts remaining.`
        );
        setPassword("");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [
    sheet,
    password,
    isLocked,
    sheetIndex,
    setSheetFailedAttempts,
    setSheetUnlocked,
    save,
    onClose,
  ]);

  const handleRemove = useCallback(async () => {
    if (!sheet?.passwordHash || isLocked) return;
    setError("");
    setLoading(true);
    try {
      const ok = await verifySheetPassword(sheet.passwordHash, password);
      if (ok) {
        setSheetPassword(sheetIndex, null);
        setSheetFailedAttempts(sheetIndex, 0, null);
        setSheetUnlocked(true);
        await save();
        onClose();
      } else {
        const newAttempts = (sheet.failedAttempts ?? 0) + 1;
        let lockUntil: string | null = null;
        if (newAttempts >= 10) {
          lockUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        }
        setSheetFailedAttempts(sheetIndex, newAttempts, lockUntil);
        await save();
        setError(
          newAttempts >= 10
            ? "Too many attempts. Locked for 2 minutes."
            : `Wrong password. ${10 - newAttempts} attempts remaining.`
        );
        setPassword("");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [
    sheet,
    password,
    isLocked,
    sheetIndex,
    setSheetPassword,
    setSheetFailedAttempts,
    setSheetUnlocked,
    save,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!sheet?.passwordHash || isLocked) return;
    setError("");
    setLoading(true);
    try {
      const ok = await verifySheetPassword(sheet.passwordHash, password);
      if (ok) {
        onConfirm?.();
        onClose();
      } else {
        const newAttempts = (sheet.failedAttempts ?? 0) + 1;
        let lockUntil: string | null = null;
        if (newAttempts >= 10) {
          lockUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        }
        setSheetFailedAttempts(sheetIndex, newAttempts, lockUntil);
        await save();
        setError(
          newAttempts >= 10
            ? "Too many attempts. Locked for 2 minutes."
            : `Wrong password. ${10 - newAttempts} attempts remaining.`
        );
        setPassword("");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [
    sheet,
    password,
    isLocked,
    sheetIndex,
    setSheetFailedAttempts,
    save,
    onConfirm,
    onClose,
  ]);

  const handleSubmit = mode === "set" ? handleSet : mode === "delete" ? handleDelete : mode === "remove" ? handleRemove : handleUnlock;

  const title =
    mode === "set"
      ? `Set password for "${sheetName}"`
      : mode === "remove"
        ? `Remove password for "${sheetName}"`
        : mode === "delete"
          ? `Enter password to delete "${sheetName}"`
          : `Enter password for "${sheetName}"`;

  const buttonLabel =
    mode === "set" ? "Save" : mode === "delete" ? "Delete" : mode === "remove" ? "Remove" : "Unlock";

  return (
    <div className={`${styles.overlay} ${fullscreen ? styles.overlayFixed : ""}`}>
      <div className={styles.modal}>
        <div className={styles.title}>{title}</div>
        <div className={styles.form}>
          <input
            ref={inputRef}
            type="password"
            className={styles.input}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (mode === "set" && !confirm) return;
                handleSubmit();
              }
              if (e.key === "Escape") onClose();
              e.stopPropagation();
            }}
            disabled={isLocked || loading}
            autoFocus
          />
          {mode === "set" && (
            <input
              type="password"
              className={styles.input}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
                e.stopPropagation();
              }}
              disabled={loading}
            />
          )}
          {error && <div className={styles.error}>{error}</div>}
          {cooldownText && <div className={styles.cooldown}>{cooldownText}</div>}
          <div className={styles.buttons}>
            {mode !== "unlock" && (
              <button
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading || isLocked}
            >
              {loading ? "..." : buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
