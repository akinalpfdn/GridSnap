import { useEffect, useRef } from "react";

/** Selectable idle delays, in minutes. 0 disables auto-lock. */
export const IDLE_LOCK_OPTIONS = [0, 1, 5, 15, 30, 60] as const;

/** How often the countdown is evaluated. */
const CHECK_INTERVAL_MS = 10_000;

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "focus"] as const;

/**
 * Whether the vault should lock right now.
 *
 * Kept pure and exported so the rules are testable without a React tree:
 * a vault with no master password has nothing to unlock, and 0 means off.
 */
export function shouldLock(args: {
  hasPassword: boolean;
  idleLockMinutes: number;
  lastActivityAt: number;
  now: number;
}): boolean {
  const { hasPassword, idleLockMinutes, lastActivityAt, now } = args;
  if (!hasPassword) return false;
  if (idleLockMinutes <= 0) return false;
  return now - lastActivityAt >= idleLockMinutes * 60_000;
}

/**
 * Locks the vault after a period without interaction.
 *
 * Idleness is measured by comparing timestamps rather than counting down, so
 * time spent hidden in the tray — or with the machine asleep — still counts.
 */
export function useIdleLock(args: {
  hasPassword: boolean;
  idleLockMinutes: number;
  onIdle: () => void;
}) {
  const { hasPassword, idleLockMinutes, onIdle } = args;
  const lastActivityRef = useRef(Date.now());
  // Held in a ref so changing the callback does not restart the timer.
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive);
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasPassword || idleLockMinutes <= 0) return;
    // Any settings change counts as activity, so lowering the delay cannot
    // lock the user out mid-keystroke.
    lastActivityRef.current = Date.now();
    const id = setInterval(() => {
      const idle = shouldLock({
        hasPassword,
        idleLockMinutes,
        lastActivityAt: lastActivityRef.current,
        now: Date.now(),
      });
      if (idle) onIdleRef.current();
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasPassword, idleLockMinutes]);
}
