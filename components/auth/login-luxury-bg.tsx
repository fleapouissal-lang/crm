"use client";

import { useEffect, useRef } from "react";

export function LoginLuxuryBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      root.style.setProperty("--mx", `${x}%`);
      root.style.setProperty("--my", `${y}%`);
      root.style.setProperty("--spot-x", `${e.clientX}px`);
      root.style.setProperty("--spot-y", `${e.clientY}px`);
    };

    if (!reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={rootRef} className="login-luxe-bg" aria-hidden>
      <div className="login-luxe-bg__base" />
      <div className="login-luxe-bg__mesh" />
      <div className="login-luxe-bg__blob login-luxe-bg__blob--1" />
      <div className="login-luxe-bg__blob login-luxe-bg__blob--2" />
      <div className="login-luxe-bg__blob login-luxe-bg__blob--3" />
      <div className="login-luxe-bg__spotlight" />
      <div className="login-luxe-bg__ring" />
      <div className="login-luxe-bg__grain" />
      <div className="login-luxe-bg__vignette" />
    </div>
  );
}
