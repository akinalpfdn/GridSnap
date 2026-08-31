import { useCallback, useMemo } from "react";
import { useVaultStore } from "../stores/vaultStore";
import { findHits, stepHitIndex, type SearchHit } from "../utils/search";
import { encodeCellKey } from "../utils/cellKey";

export function useSearch() {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const vault = useVaultStore((s) => s.vault);
  const activeSheetIndex = useVaultStore((s) => s.activeSheetIndex);
  const sheetUnlocked = useVaultStore((s) => s.sheetUnlocked);
  const activeHitIndex = useVaultStore((s) => s.activeHitIndex);
  const sheetPasswordHash = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.passwordHash ?? null
  );
  const isSheetLocked = !!sheetPasswordHash && !sheetUnlocked;

  const hits = useMemo(
    () =>
      findHits({
        vault,
        query: searchQuery,
        activeSheetIndex,
        activeSheetUnlocked: sheetUnlocked,
      }),
    [vault, searchQuery, activeSheetIndex, sheetUnlocked]
  );

  // Keys of the hits on the sheet currently shown, for cell highlighting.
  const activeSheetHitKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const hit of hits) {
      if (hit.sheetIndex === activeSheetIndex) keys.add(encodeCellKey(hit.row, hit.col));
    }
    return keys;
  }, [hits, activeSheetIndex]);

  const currentHit: SearchHit | null = hits[activeHitIndex] ?? null;

  const goToHit = useCallback((hit: SearchHit) => {
    const store = useVaultStore.getState();
    if (hit.sheetIndex !== store.activeSheetIndex) {
      store.setActiveSheet(hit.sheetIndex, { keepSearch: true });
    }
    store.setSelection({ row: hit.row, col: hit.col });
    store.requestScroll({ row: hit.row, col: hit.col });
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (hits.length === 0) return;
      const next = stepHitIndex(useVaultStore.getState().activeHitIndex, hits.length, direction);
      useVaultStore.getState().setActiveHitIndex(next);
      const hit = hits[next];
      if (hit) goToHit(hit);
    },
    [hits, goToHit]
  );

  const nextHit = useCallback(() => step(1), [step]);
  const previousHit = useCallback(() => step(-1), [step]);

  const isHit = useCallback(
    (row: number, col: number) => activeSheetHitKeys.has(encodeCellKey(row, col)),
    [activeSheetHitKeys]
  );

  const isCurrentHit = useCallback(
    (row: number, col: number) =>
      !!currentHit &&
      currentHit.sheetIndex === activeSheetIndex &&
      currentHit.row === row &&
      currentHit.col === col,
    [currentHit, activeSheetIndex]
  );

  return {
    hits,
    hitCount: hits.length,
    activeHitIndex,
    isHit,
    isCurrentHit,
    nextHit,
    previousHit,
    isSheetLocked,
  };
}
