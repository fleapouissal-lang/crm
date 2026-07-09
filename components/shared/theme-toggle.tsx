"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const btnClass = cn("fusion-icon-btn", className);

  if (!mounted) {
    return (
      <button type="button" className={btnClass} aria-label="Toggle theme">
        <Moon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={btnClass}
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Moon /> : <Sun />}
    </button>
  );
}
