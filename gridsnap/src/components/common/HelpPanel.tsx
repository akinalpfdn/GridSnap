import { useEffect } from "react";
import styles from "./HelpPanel.module.css";

interface HelpPanelProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Ctrl+S", label: "Save" },
  { key: "Ctrl+Tab", label: "Next sheet" },
  { key: "Ctrl+Shift+Tab", label: "Previous sheet" },
  { key: "Ctrl+1-9", label: "Jump to sheet" },
  { key: "Ctrl+K", label: "Sheet switcher" },
  { key: "Arrow keys", label: "Navigate grid" },
  { key: "Enter", label: "Edit cell" },
  { key: "Escape", label: "Stop editing / deselect" },
  { key: "Delete", label: "Clear cell(s)" },
  { key: "Ctrl+C", label: "Copy cell(s)" },
  { key: "Ctrl+V", label: "Paste" },
];

const TIPS = [
  "Right-click a sheet tab to mask it, set a password, or rename it",
  "Right-click cells to mask or unmask them",
  "Double-click a sheet tab to rename it",
  "Drag sheet tabs to reorder them",
  "Click a cell to select, Shift+click to select a range",
  "Start typing to edit the selected cell directly",
  "Masked cells show \u25cf\u25cf\u25cf but still hold your data safely",
  "Password-protected sheets require the password to view, search, or delete",
];

export function HelpPanel({ onClose }: HelpPanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Help</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Keyboard shortcuts</div>
            <div className={styles.shortcutList}>
              {SHORTCUTS.map(({ key, label }) => (
                <div key={key} className={styles.shortcutRow}>
                  <span className={styles.shortcutLabel}>{label}</span>
                  <span className={styles.shortcutKey}>{key}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Tips</div>
            <div className={styles.tipList}>
              {TIPS.map((tip) => (
                <div key={tip} className={styles.tip}>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
