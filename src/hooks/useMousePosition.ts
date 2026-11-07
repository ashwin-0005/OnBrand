"use client";

import { useEffect, useRef } from "react";

/**
 * Window-level pointer position, normalised to -1..1 and damped (eased toward the
 * real pointer each frame). Returns a ref, so it never causes React re-renders.
 */
export function useMousePosition(damping = 0.08, enabled = true) {
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const target = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const tick = () => {
      pos.current.x += (target.x - pos.current.x) * damping;
      pos.current.y += (target.y - pos.current.y) * damping;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [damping, enabled]);

  return pos;
}
