import { useEffect, useCallback } from "react";
import { openReleasePage, type UpdateInfo } from "../../services/updateService";
import styles from "./UpdateDialog.module.css";

interface UpdateDialogProps {
  update: UpdateInfo;
  /** Close for now — the indicator stays, and the update reappears next launch. */
  onLater: () => void;
  /** Suppress this specific version permanently. */
  onSkip: () => void;
}

export function UpdateDialog({ update, onLater, onSkip }: UpdateDialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onLater();
    },
    [onLater]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleView = async () => {
    try {
      await openReleasePage(update.releaseUrl);
    } catch (e) {
      console.error("Failed to open release page:", e);
    }
    onLater();
  };

  return (
    <div className={styles.overlay} onMouseDown={onLater}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>Update available</div>
        <div className={styles.message}>
          GridSnap {update.latestVersion} is available.{" "}
          <span className={styles.versionFrom}>
            You are running {update.currentVersion}.
          </span>
        </div>
        {update.notes && <div className={styles.notes}>{update.notes}</div>}
        <div className={styles.buttons}>
          <button className={styles.laterBtn} onClick={onLater}>
            Later
          </button>
          <button className={styles.viewBtn} onClick={handleView} autoFocus>
            View release
          </button>
        </div>
        <button className={styles.skipBtn} onClick={onSkip}>
          Skip version {update.latestVersion}
        </button>
      </div>
    </div>
  );
}
