"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 100;
  const h = 38;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const coords = data.map((v, i) => [
    pad + i * step,
    h - pad - ((v - min) / rng) * (h - pad * 2),
  ]);
  const d = coords
    .map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(" ");
  const area = `${d} L${coords[coords.length - 1][0].toFixed(1)} ${h} L${coords[0][0].toFixed(1)} ${h} Z`;
  const last = coords[coords.length - 1];
  const id = `sg-${data.join("-")}`;

  return (
    <svg className="spark mt-3 block h-[38px] w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

export function FlAva({
  children,
  className,
  sm,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  sm?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("fl-ava", sm && "sm", className)} style={style}>
      {children}
    </div>
  );
}

export function FlProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("fl-progress", className)}>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}

export function FlDelta({
  children,
  up,
}: {
  children: React.ReactNode;
  up?: boolean;
}) {
  return (
    <span className={cn("fl-delta", up ? "up" : "down")}>
      {up ? <TrendingUp className="size-[13px]" strokeWidth={2.5} /> : <TrendingDown className="size-[13px]" strokeWidth={2.5} />}
      {children}
    </span>
  );
}

export function CellMain({
  initials,
  gradient,
  title,
  sub,
}: {
  initials: string;
  gradient: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="cell-main flex items-center gap-[11px]">
      <FlAva style={{ background: gradient }}>{initials}</FlAva>
      <div>
        <div className="font-medium">{title}</div>
        {sub && <div className="cell-sub text-[11.5px] fl-faint">{sub}</div>}
      </div>
    </div>
  );
}

export function AvatarStack({ items }: { items: { initials: string; bg: string }[] }) {
  return (
    <div className="stack flex">
      {items.map((item) => (
        <FlAva key={item.initials} sm className="ring-2 ring-[var(--bg-2)]" style={{ background: item.bg }}>
          {item.initials}
        </FlAva>
      ))}
    </div>
  );
}

export function StatLine({ value, unit }: { value: string; unit?: string }) {
  return (
    <div className="stat-line mt-1.5 flex items-baseline gap-2.5">
      <span className="font-[family-name:var(--font-display)] text-[26px] font-semibold tracking-[-0.03em]">
        {value}
      </span>
      {unit && <span className="fl-faint fl-tny">{unit}</span>}
    </div>
  );
}

export function FunnelBar({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: string;
  width: string;
  color: string;
}) {
  return (
    <div className="funnel-row flex items-center gap-3.5 py-2.5">
      <span className="fl-name w-[120px] shrink-0 text-[12.5px] fl-muted">{label}</span>
      <div className="fl-bar relative h-8 flex-1 overflow-hidden rounded-[9px] bg-[var(--track)]">
        <i
          className="flex h-full items-center rounded-[9px] px-3 text-xs font-semibold text-white fl-mono"
          style={{ width, background: color }}
        >
          {value}
        </i>
      </div>
    </div>
  );
}

export function FlChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="chip inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass-hi)] px-2.5 py-1 text-[11.5px] font-semibold fl-muted">
      {children}
    </span>
  );
}

export function FlTabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: number;
  onChange?: (i: number) => void;
}) {
  return (
    <div className="tabs mb-5 flex gap-0.5 overflow-x-auto border-b border-[var(--border)]">
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          className={cn("px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors", i === active ? "on border-b-2 border-[var(--iris-2)] text-[var(--text)]" : "fl-muted")}
          onClick={() => onChange?.(i)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
