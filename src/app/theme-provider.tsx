"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

// A theme flip changes colors on nearly every element; with transitions on, the
// page smears instead of snapping. Disable them for one frame around the swap.
// `keep` exempts elements that should still animate (the toggle's icon).
function withoutTransitions(fn: () => void, keep?: string) {
  const sel = keep ? `:not(${keep})` : "";
  const style = document.createElement("style");
  style.textContent = `*${sel},*${sel}::before,*${sel}::after{transition:none!important}`;
  document.head.appendChild(style);
  fn();
  void document.body.offsetHeight;
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    // The inline script in layout.tsx already set the class; this only syncs
    // React, so nothing (including the toggle icon) should animate.
    withoutTransitions(() => {
      if (stored) {
        setTheme(stored);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }
    });
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", next);
    withoutTransitions(() => {
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }, ".theme-icon");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
