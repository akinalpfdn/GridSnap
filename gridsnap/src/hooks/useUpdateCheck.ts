import { useCallback, useEffect, useState } from "react";
import { checkForUpdate, skipUpdate, type UpdateInfo } from "../services/updateService";

// GridSnap lives in the tray for days at a time, so a check only on mount would
// mean never noticing a release. Six hours is well inside GitHub's rate limit.
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function useUpdateCheck() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  const run = useCallback(async () => {
    try {
      setUpdate(await checkForUpdate());
    } catch (e) {
      // Being offline is the normal case, not an app error: leave the indicator
      // hidden and try again on the next interval.
      console.debug("Update check failed:", e);
    }
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(run, RECHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [run]);

  const skip = useCallback(async () => {
    if (!update) return;
    try {
      await skipUpdate(update.latestVersion);
    } catch (e) {
      console.error("Failed to persist skipped version:", e);
    }
    setUpdate(null);
  }, [update]);

  return { update, skip };
}
