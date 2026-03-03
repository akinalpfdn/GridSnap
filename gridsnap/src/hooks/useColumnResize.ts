import { useCallback, useRef } from "react";
import { useVaultStore } from "../stores/vaultStore";

const MIN_WIDTH = 50;
const MAX_WIDTH = 600;

export function useColumnResize() {
  const setColumnWidth = useVaultStore((s) => s.setColumnWidth);
  const originRef = useRef<{ col: number; startX: number; originW: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, col: number, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      originRef.current = { col, startX: e.clientX, originW: currentWidth };

      const onMouseMove = (me: MouseEvent) => {
        if (!originRef.current) return;
        const delta = me.clientX - originRef.current.startX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, originRef.current.originW + delta));
        setColumnWidth(originRef.current.col, newWidth);
      };

      const onMouseUp = () => {
        originRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [setColumnWidth]
  );

  return { onMouseDown };
}
