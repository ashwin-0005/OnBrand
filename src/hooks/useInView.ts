"use client";

import { useEffect, useRef, useState } from "react";

/** [ref, inView, seenOnce]. inView is true while the element is on screen. Used to pause 3D rendering off-screen. */
export function useInView<T extends Element>(rootMargin = "0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView, seen] as const;
}

/** True while the browser tab is visible. */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}
