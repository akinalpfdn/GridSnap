export interface VaultLockedEvent {
  reason: "idle" | "manual";
}

export interface ClipboardWrittenEvent {
  // empty — just a notification
}
