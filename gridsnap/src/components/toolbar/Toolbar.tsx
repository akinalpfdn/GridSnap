import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useVaultStore } from "../../stores/vaultStore";
import { useSearch } from "../../hooks/useSearch";
import styles from "./Toolbar.module.css";

const appWindow = getCurrentWindow();

interface ToolbarProps {
  onSettingsClick: () => void;
  onHelpClick: () => void;
  onSave: () => void;
}

export function Toolbar({ onSettingsClick, onHelpClick, onSave }: ToolbarProps) {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const dirty = useVaultStore((s) => s.dirty);
  const saving = useVaultStore((s) => s.saving);
  const { hitCount, isSheetLocked } = useSearch();

  return (
    <div className={styles.toolbar} data-tauri-drag-region onMouseDown={(e) => { if (e.buttons === 1 && e.target === e.currentTarget) appWindow.startDragging(); }}>
      <div className={styles.searchBox}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className={styles.searchInput}
          placeholder={isSheetLocked ? "Search disabled" : "Search cells..."}
          value={isSheetLocked ? "" : searchQuery}
          onChange={(e) => !isSheetLocked && setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={isSheetLocked}
        />
        {searchQuery && (
          <>
            <span className={styles.hitCount}>{hitCount}</span>
            <button
              className={styles.searchClear}
              onClick={() => setSearchQuery("")}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className={styles.spacer} data-tauri-drag-region onMouseDown={(e) => { if (e.buttons === 1) appWindow.startDragging(); }} />
      <button
        className={styles.toolBtn}
        onClick={onSave}
        disabled={!dirty || saving}
        title="Save (Ctrl+S)"
      >
        {saving ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.spin}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        )}
        {dirty && <span className={styles.dirtyDot} />}
      </button>
      <button
        className={styles.toolBtn}
        onClick={onSettingsClick}
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      <button
        className={styles.toolBtn}
        onClick={onHelpClick}
        title="Help"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
      <div className={styles.windowDivider} />
      <button
        className={`${styles.windowBtn} ${styles.closeBtn}`}
        onClick={() => invoke("hide_window")}
        title="Hide to tray"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}
