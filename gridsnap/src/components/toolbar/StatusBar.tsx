import { useVaultStore } from "../../stores/vaultStore";
import { colToLetter } from "../../utils/gridMath";
import styles from "./Toolbar.module.css";

export function StatusBar() {
  const selection = useVaultStore((s) => s.selection);
  const activeSheet = useVaultStore((s) => s.activeSheet);
  const sheet = activeSheet();
  const cellCount = sheet ? Object.keys(sheet.data).length : 0;

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
      {sheet?.masked && <span>Masked</span>}
    </div>
  );
}
