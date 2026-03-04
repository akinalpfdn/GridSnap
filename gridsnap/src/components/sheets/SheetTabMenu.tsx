import { useEffect } from "react";
import styles from "./SheetTabMenu.module.css";

interface SheetTabMenuProps {
  x: number;
  y: number;
  isMasked: boolean;
  hasPassword: boolean;
  onToggleMask: () => void;
  onSetPassword: () => void;
  onRemovePassword: () => void;
  onClose: () => void;
}

export function SheetTabMenu({
  x,
  y,
  isMasked,
  hasPassword,
  onToggleMask,
  onSetPassword,
  onRemovePassword,
  onClose,
}: SheetTabMenuProps) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  // Position menu above the click point (sheet tabs are at the bottom)
  const bottom = window.innerHeight - y;

  return (
    <div
      className={styles.menu}
      style={{ left: x, bottom }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className={styles.menuItem}
        onClick={() => {
          onToggleMask();
          onClose();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isMasked ? (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 019.9-1" />
            </>
          ) : (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </>
          )}
        </svg>
        {isMasked ? "Unmask sheet" : "Mask sheet"}
      </button>
      <button
        className={styles.menuItem}
        onClick={() => {
          if (hasPassword) {
            onRemovePassword();
          } else {
            onSetPassword();
          }
          onClose();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
        {hasPassword ? "Remove password" : "Set password"}
      </button>
    </div>
  );
}
