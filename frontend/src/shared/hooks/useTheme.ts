import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "stu.theme";

function safeGetStoredTheme(): Theme | null {
  try {
    const stored = globalThis.localStorage?.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function safeDetectSystemTheme(): Theme {
  try {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;

    return prefersDark ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getInitialTheme(): Theme {
  const stored = safeGetStoredTheme();
  if (stored) return stored;
  return safeDetectSystemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    // SSR guard
    if (typeof document === "undefined") return;

    document.documentElement.dataset.theme = theme;

    try {
      globalThis.localStorage?.setItem(KEY, theme);
    } catch {
      // ignore storage failures (private mode / blocked storage)
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggle };
}
