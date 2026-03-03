import { useMemo } from "react";
import { useVaultStore } from "../stores/vaultStore";

export function useSearch() {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const activeSheet = useVaultStore((s) => s.activeSheet);

  const hits = useMemo(() => {
    const sheet = activeSheet();
    if (!sheet || !searchQuery) return new Set<string>();
    const query = searchQuery.toLowerCase();
    const result = new Set<string>();
    for (const [key, value] of Object.entries(sheet.data)) {
      if (value.toLowerCase().includes(query)) {
        result.add(key);
      }
    }
    return result;
  }, [searchQuery, activeSheet]);

  const hitCount = hits.size;

  const isHit = (row: number, col: number) => {
    return hits.has(`${row},${col}`);
  };

  return { hits, hitCount, isHit };
}
