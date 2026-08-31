import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useVaultStore } from "../../stores/vaultStore";
import { writeClipboard } from "../../services/clipboardService";
import { previewOf, rankResults, type QuickCopyResult } from "../../utils/quickCopy";
import { resolveRecents } from "../../utils/recents";
import { colToLetter } from "../../utils/gridMath";
import styles from "./QuickCopy.module.css";

interface QuickCopyProps {
  onClose: () => void;
  onCopied: (result: QuickCopyResult) => void;
}

/**
 * Type a few characters, hit Enter, and the matching value is on the clipboard
 * with the window out of the way — the grid is never touched.
 */
export function QuickCopy({ onClose, onCopied }: QuickCopyProps) {
  const vault = useVaultStore((s) => s.vault);
  const activeSheetIndex = useVaultStore((s) => s.activeSheetIndex);
  const sheetUnlocked = useVaultStore((s) => s.sheetUnlocked);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // An empty palette is not empty-handed: it offers what was copied recently.
  const results = useMemo(
    () =>
      query.trim()
        ? rankResults({ vault, query, activeSheetIndex, activeSheetUnlocked: sheetUnlocked })
        : resolveRecents({ vault, activeSheetIndex, activeSheetUnlocked: sheetUnlocked }),
    [vault, query, activeSheetIndex, sheetUnlocked]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const copy = useCallback(
    async (result: QuickCopyResult) => {
      try {
        await writeClipboard(result.value);
      } catch {
        try {
          await navigator.clipboard.writeText(result.value);
        } catch {
          return;
        }
      }
      useVaultStore.getState().recordCopy(result.sheetIndex, result.row, result.col);
      onCopied(result);
      onClose();
      // Getting out of the way is the point: the value is already in hand.
      invoke("hide_window").catch(() => {});
    },
    [onCopied, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const result = results[activeIndex];
        if (result) copy(result);
      } else if (e.key === "Escape") {
        onClose();
      }
      e.stopPropagation();
    },
    [results, activeIndex, copy, onClose]
  );

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          placeholder="Copy a value from any sheet..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.list} ref={listRef}>
          {results.length === 0 ? (
            <div className={styles.hintRow}>
              {query.trim()
                ? "No matching cells"
                : "Start typing to search every unlocked sheet"}
            </div>
          ) : (
            results.map((result, i) => (
              <div
                key={`${result.sheetIndex}:${result.row}:${result.col}`}
                className={`${styles.item} ${i === activeIndex ? styles.itemActive : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  copy(result);
                }}
              >
                <span className={styles.sheetName}>{result.sheetName}</span>
                <span className={styles.cellRef}>
                  {colToLetter(result.col)}
                  {result.row + 1}
                </span>
                <span
                  className={`${styles.preview} ${result.masked ? styles.previewMasked : ""}`}
                >
                  {previewOf(result)}
                </span>
              </div>
            ))
          )}
        </div>
        <div className={styles.footer}>
          <span>
            <span className={styles.key}>↑↓</span> move
          </span>
          <span>
            <span className={styles.key}>Enter</span> copy and hide
          </span>
          <span>
            <span className={styles.key}>Esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
