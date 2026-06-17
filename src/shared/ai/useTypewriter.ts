"use client";
import { useEffect, useRef, useState } from "react";
import { STREAM_CHAR_MS } from "./constants";

/**
 * Hiệu ứng gõ-từng-chữ. Khi enabled=false → hiện ngay toàn bộ.
 * Animation thuần UI (setInterval), KHÔNG ảnh hưởng dữ liệu/engine.
 */
export function useTypewriter(
  text: string,
  opts?: { speedMs?: number; enabled?: boolean; onDone?: () => void }
): { shown: string; done: boolean } {
  const speed = opts?.speedMs ?? STREAM_CHAR_MS;
  const enabled = opts?.enabled ?? true;
  const [shown, setShown] = useState(enabled ? "" : text);
  const onDoneRef = useRef(opts?.onDone);
  onDoneRef.current = opts?.onDone;

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      onDoneRef.current?.();
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, enabled]);

  return { shown, done: shown.length >= text.length };
}
