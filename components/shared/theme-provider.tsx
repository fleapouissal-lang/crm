"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppTheme = "light" | "dark";

const STORAGE_KEY = "theme";

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readDomTheme(): AppTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readDomTheme());
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    const value: AppTheme = next === "dark" ? "dark" : "light";
    setThemeState(value);
    applyTheme(value);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mounted ? theme : "light",
      resolvedTheme: mounted ? theme : "light",
      setTheme,
    }),
    [mounted, theme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Inline bootstrap for root layout — must stay sync with STORAGE_KEY. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
