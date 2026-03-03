import { useVaultStore } from "../../stores/vaultStore";
import { useSearch } from "../../hooks/useSearch";
import styles from "./Toolbar.module.css";

export function Toolbar() {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const { hitCount } = useSearch();

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchBox}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className={styles.searchInput}
          placeholder="Search cells..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
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
      <div className={styles.spacer} />
    </div>
  );
}
