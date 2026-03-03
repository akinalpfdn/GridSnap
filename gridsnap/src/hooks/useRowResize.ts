import { useCallback, useRef } from "react";
import { useVaultStore } from "../stores/vaultStore";

const MIN_HEIGHT = 22;
const MAX_HEIGHT = 120;

export function useRowResize() {
  const setRowHeight = useVaultStore((s) => s.setRowHeight);
  const originRef = useRef<{ row: number; startY: number; originH: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, row: number, currentHeight: number) => {
      e.preventDefault();
      e.stopPropagation();
      originRef.current = { row, startY: e.clientY, originH: currentHeight };

      const onMouseMove = (me: MouseEvent) => {
        if (!originRef.current) return;
        const delta = me.clientY - originRef.current.startY;
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, originRef.current.originH + delta));
        setRowHeight(originRef.current.row, newHeight);
      };

      const onMouseUp = () => {
        originRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [setRowHeight]
  );

  return { onMouseDown };
}
