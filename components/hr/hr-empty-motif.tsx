"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function HrEmptyMotif({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "fl-hr-empty-motif relative flex flex-col items-center justify-center overflow-hidden text-center",
        size === "sm" && "px-4 py-10",
        size === "md" && "px-6 py-14",
        size === "lg" && "px-8 py-20",
        className
      )}
    >
      <div className="relative z-[1] flex flex-col items-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--glass-solid)] shadow-sm">
          <Icon className="size-5 fl-faint" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-1 max-w-xs text-xs fl-faint">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
