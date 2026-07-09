"use client";

import { useRef, useState, type CSSProperties } from "react";

export function SidebarLuxuryBg() {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 42, y: 18 });

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  const style = {
    "--sb-mx": `${spot.x}%`,
    "--sb-my": `${spot.y}%`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className="fusion-sidebar-bg"
      style={style}
      onPointerMove={onPointerMove}
      aria-hidden
    >
      <div className="fusion-sidebar-bg__base" />
      <div className="fusion-sidebar-bg__spotlight" />
      <div className="fusion-sidebar-bg__orb fusion-sidebar-bg__orb--1" />
      <div className="fusion-sidebar-bg__orb fusion-sidebar-bg__orb--2" />
      <div className="fusion-sidebar-bg__orb fusion-sidebar-bg__orb--3" />
      <div className="fusion-sidebar-bg__grid" />
      <div className="fusion-sidebar-bg__vignette" />
    </div>
  );
}
