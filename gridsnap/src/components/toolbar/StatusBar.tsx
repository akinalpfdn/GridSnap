import { useVaultStore } from "../../stores/vaultStore";
import { colToLetter } from "../../utils/gridMath";
import styles from "./Toolbar.module.css";

export function StatusBar() {
  const selection = useVaultStore((s) => s.selection);
  const dirty = useVaultStore((s) => s.dirty);
  const saving = useVaultStore((s) => s.saving);
  const cellCount = useVaultStore(
    (s) => {
      const sheet = s.vault?.sheets[s.activeSheetIndex];
      return sheet ? Object.keys(sheet.data).length : 0;
    }
  );
  const isMasked = useVaultStore(
    (s) => s.vault?.sheets[s.activeSheetIndex]?.masked ?? false
  );

  return (
    <div className={styles.statusBar}>
      {selection ? (
        <span>
          {colToLetter(selection.col)}
          {selection.row + 1}
        </span>
      ) : (
        <span>Ready</span>
      )}
      <span>{cellCount} cells</span>
      {isMasked && <span>Masked</span>}
      <span style={{ marginLeft: "auto" }}>
        {saving ? "Saving..." : dirty ? "Unsaved" : "Saved"}
      </span>
    </div>
  );
}
