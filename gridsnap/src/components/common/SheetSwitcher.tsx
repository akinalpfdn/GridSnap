import { useState, useEffect, useRef, useCallback } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import styles from "./SheetSwitcher.module.css";

interface SheetSwitcherProps {
  onClose: () => void;
}

export function SheetSwitcher({ onClose }: SheetSwitcherProps) {
  const sheets = useVaultStore((s) => s.vault?.sheets ?? []);
  const setActiveSheet = useVaultStore((s) => s.setActiveSheet);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = sheets
    .map((sheet, originalIndex) => ({ sheet, originalIndex }))
    .filter(({ sheet }) =>
      sheet.name.toLowerCase().includes(query.toLowerCase())
    );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const select = useCallback(
    (originalIndex: number) => {
      setActiveSheet(originalIndex);
      onClose();
    },
    [setActiveSheet, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[activeIndex]) {
          select(filtered[activeIndex].originalIndex);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
      e.stopPropagation();
    },
    [filtered, activeIndex, select, onClose]
  );

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          placeholder="Switch to sheet..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No sheets found</div>
          ) : (
            filtered.map(({ sheet, originalIndex }, i) => (
              <div
                key={sheet.id}
                className={`${styles.item} ${i === activeIndex ? styles.itemActive : ""}`}
                onMouseDown={() => select(originalIndex)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span
                  className={styles.colorDot}
                  style={{ background: sheet.color }}
                />
                <span className={styles.name}>{sheet.name}</span>
                {originalIndex < 9 && (
                  <span className={styles.shortcut}>
                    Ctrl+{originalIndex + 1}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
