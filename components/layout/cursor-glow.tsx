"use client";

import { useEffect, useRef, useState } from "react";

export function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -200, y: -200 });
  const target = useRef({ x: -200, y: -200 });
  const raf = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    setEnabled(true);
    document.documentElement.classList.add("fusion-cursor-fx");

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    const onLeave = () => {
      target.current = { x: -200, y: -200 };
    };

    const tick = () => {
      const ease = 0.16;
      pos.current.x += (target.current.x - pos.current.x) * ease;
      pos.current.y += (target.current.y - pos.current.y) * ease;

      const transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      dotRef.current?.style.setProperty("transform", transform);
      glowRef.current?.style.setProperty("transform", transform);
      ringRef.current?.style.setProperty("transform", transform);

      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
      document.documentElement.classList.remove("fusion-cursor-fx");
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="fusion-cursor-layer" aria-hidden>
      <div ref={glowRef} className="fusion-cursor-glow" />
      <div ref={ringRef} className="fusion-cursor-ring" />
      <div ref={dotRef} className="fusion-cursor-dot" />
    </div>
  );
}
