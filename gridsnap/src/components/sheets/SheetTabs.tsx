import { useState, useRef, useEffect } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { SheetTabMenu } from "./SheetTabMenu";
import { SheetPasswordModal } from "../common/SheetPasswordModal";
import { ConfirmDialog } from "../common/ConfirmDialog";
import styles from "./SheetTabs.module.css";

const SHEET_COLORS = ["#D4915E", "#7EBF8E", "#7BA3C9", "#C97070", "#C9B870", "#B07EC9"];

export function SheetTabs() {
  const vault = useVaultStore((s) => s.vault);
  const activeSheetIndex = useVaultStore((s) => s.activeSheetIndex);
  const setActiveSheet = useVaultStore((s) => s.setActiveSheet);
  const addSheet = useVaultStore((s) => s.addSheet);
  const removeSheet = useVaultStore((s) => s.removeSheet);
  const renameSheet = useVaultStore((s) => s.renameSheet);
  const toggleMasked = useVaultStore((s) => s.toggleMasked);

  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ index: number; mode: "set" | "remove" | "delete" } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingIndex !== null && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingIndex]);

  if (!vault) return null;

  const handleAdd = () => {
    const num = vault.sheets.length + 1;
    const color = SHEET_COLORS[(num - 1) % SHEET_COLORS.length];
    addSheet(`Sheet ${num}`, color);
  };

  const handleRenameCommit = (index: number, name: string) => {
    if (name.trim()) {
      renameSheet(index, name.trim());
    }
    setRenamingIndex(null);
  };

  const handleDeleteRequest = (index: number) => {
    setPendingDelete(index);
  };

  const handleDeleteConfirm = () => {
    if (pendingDelete === null) return;
    const sheet = vault.sheets[pendingDelete];
    if (sheet?.passwordHash) {
      // Password-protected: ask for password after confirmation
      setPasswordModal({ index: pendingDelete, mode: "delete" });
      setPendingDelete(null);
    } else {
      removeSheet(pendingDelete);
      setPendingDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setPendingDelete(null);
  };

  return (
    <div className={styles.container}>
      {vault.sheets.map((sheet, i) => (
        <div
          key={sheet.id}
          className={`${styles.tab} ${i === activeSheetIndex ? styles.tabActive : ""}`}
          style={{ borderTopColor: i === activeSheetIndex ? sheet.color : "transparent" }}
          onClick={() => setActiveSheet(i)}
          onDoubleClick={() => setRenamingIndex(i)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ index: i, x: e.clientX, y: e.clientY });
          }}
        >
          {sheet.passwordHash && (
            <svg className={styles.sheetIcon} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          )}
          {sheet.masked && (
            <svg className={styles.sheetIcon} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
          {renamingIndex === i ? (
            <input
              ref={renameRef}
              className={styles.renameInput}
              defaultValue={sheet.name}
              onBlur={(e) => handleRenameCommit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameCommit(i, e.currentTarget.value);
                if (e.key === "Escape") setRenamingIndex(null);
                e.stopPropagation();
              }}
            />
          ) : (
            <span>{sheet.name}</span>
          )}
          {vault.sheets.length > 1 && (
            <button
              className={styles.tabClose}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteRequest(i);
              }}
              title="Remove sheet"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <button className={styles.addBtn} onClick={handleAdd} title="Add sheet">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {contextMenu && (
        <SheetTabMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isMasked={vault.sheets[contextMenu.index]?.masked ?? false}
          hasPassword={!!vault.sheets[contextMenu.index]?.passwordHash}
          onToggleMask={() => toggleMasked(contextMenu.index)}
          onSetPassword={() => setPasswordModal({ index: contextMenu.index, mode: "set" })}
          onRemovePassword={() => setPasswordModal({ index: contextMenu.index, mode: "remove" })}
          onClose={() => setContextMenu(null)}
        />
      )}
      {pendingDelete !== null && (
        <ConfirmDialog
          title="Delete sheet"
          message={`Delete "${vault.sheets[pendingDelete]?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
      {passwordModal && (
        <SheetPasswordModal
          mode={passwordModal.mode}
          sheetIndex={passwordModal.index}
          sheetName={vault.sheets[passwordModal.index]?.name ?? ""}
          onClose={() => setPasswordModal(null)}
          onConfirm={
            passwordModal.mode === "delete"
              ? () => removeSheet(passwordModal.index)
              : undefined
          }
          fullscreen
        />
      )}
    </div>
  );
}
