import { useState, useEffect, useCallback } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { changeShortcut } from "../../services/shortcutService";
import styles from "./SettingsPanel.module.css";

// Map KeyboardEvent.code to display name for the shortcut string
function codeToKeyName(code: string): string | null {
  // Letters
  if (code.startsWith("Key")) return code.slice(3);
  // Digits
  if (code.startsWith("Digit")) return code.slice(5);
  // Function keys
  if (/^F\d+$/.test(code)) return code;
  // Special keys
  const map: Record<string, string> = {
    Space: "Space",
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Escape",
    Backspace: "Backspace",
    Delete: "Delete",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backquote: "`",
  };
  return map[code] ?? null;
}

function isModifierKey(code: string): boolean {
  return (
    code === "ControlLeft" || code === "ControlRight" ||
    code === "ShiftLeft" || code === "ShiftRight" ||
    code === "AltLeft" || code === "AltRight" ||
    code === "MetaLeft" || code === "MetaRight"
  );
}

export function ShortcutRecorder() {
  const hotkey = useVaultStore((s) => s.vault?.settings.hotkey ?? "Ctrl+Shift+Space");
  const setHotkey = useVaultStore((s) => s.setHotkey);

  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore if only modifier pressed
      if (isModifierKey(e.code)) return;

      const keyName = codeToKeyName(e.code);
      if (!keyName) return;

      // Must have at least one modifier
      if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        setError("Must include Ctrl, Shift, or Alt");
        return;
      }

      // Build shortcut string
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      parts.push(keyName);

      const shortcutStr = parts.join("+");

      setSaving(true);
      setError("");
      try {
        await changeShortcut(shortcutStr);
        setHotkey(shortcutStr);
        setRecording(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [setHotkey]
  );

  useEffect(() => {
    if (!recording) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recording, handleKeyDown]);

  if (recording) {
    return (
      <div className={styles.recorderRow}>
        <span className={styles.recorderHint}>
          {saving ? "Saving..." : "Press shortcut keys..."}
        </span>
        <button
          className={styles.recorderBtn}
          onClick={() => {
            setRecording(false);
            setError("");
          }}
        >
          Cancel
        </button>
        {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
      </div>
    );
  }

  return (
    <div className={styles.recorderRow}>
      <span className={styles.shortcutDisplay}>{hotkey}</span>
      <button className={styles.recorderBtn} onClick={() => setRecording(true)}>
        Change
      </button>
    </div>
  );
}
