import { describe, expect, it } from "vitest";
import { IDLE_LOCK_OPTIONS, shouldLock } from "../../src/hooks/useIdleLock";

const MINUTE = 60_000;
const NOW = 1_700_000_000_000;

function check(overrides: Partial<Parameters<typeof shouldLock>[0]> = {}) {
  return shouldLock({
    hasPassword: true,
    idleLockMinutes: 5,
    lastActivityAt: NOW - 5 * MINUTE,
    now: NOW,
    ...overrides,
  });
}

describe("shouldLock", () => {
  it("should lock once the idle delay has elapsed", () => {
    expect(check({ lastActivityAt: NOW - 5 * MINUTE })).toBe(true);
  });

  it("should not lock while the delay has not elapsed", () => {
    expect(check({ lastActivityAt: NOW - 5 * MINUTE + 1 })).toBe(false);
  });

  it("should never lock a vault with no master password", () => {
    // Nothing to unlock — locking would strand the user behind a password
    // screen that accepts nothing.
    expect(check({ hasPassword: false, lastActivityAt: NOW - 60 * MINUTE })).toBe(false);
  });

  it("should treat zero minutes as disabled", () => {
    expect(check({ idleLockMinutes: 0, lastActivityAt: NOW - 60 * MINUTE })).toBe(false);
  });

  it("should treat a negative delay as disabled rather than always locking", () => {
    expect(check({ idleLockMinutes: -1 })).toBe(false);
  });

  it("should lock after a long gap such as machine sleep", () => {
    // Timestamps are compared rather than counted down, so a timer that never
    // fired while the machine slept still results in a lock on wake.
    expect(check({ idleLockMinutes: 15, lastActivityAt: NOW - 8 * 60 * MINUTE })).toBe(true);
  });

  it("should not lock immediately after activity", () => {
    expect(check({ lastActivityAt: NOW })).toBe(false);
  });

  it("should respect each offered delay", () => {
    for (const minutes of IDLE_LOCK_OPTIONS) {
      if (minutes === 0) continue;
      expect(check({ idleLockMinutes: minutes, lastActivityAt: NOW - minutes * MINUTE })).toBe(true);
      expect(
        check({ idleLockMinutes: minutes, lastActivityAt: NOW - minutes * MINUTE + 1000 })
      ).toBe(false);
    }
  });
});

describe("IDLE_LOCK_OPTIONS", () => {
  it("should offer an off value so auto-lock can be turned off entirely", () => {
    expect(IDLE_LOCK_OPTIONS).toContain(0);
  });

  it("should be ordered ascending so the Settings list reads sensibly", () => {
    const sorted = [...IDLE_LOCK_OPTIONS].sort((a, b) => a - b);
    expect([...IDLE_LOCK_OPTIONS]).toEqual(sorted);
  });
});
