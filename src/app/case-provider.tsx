"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CaseMode = "lower" | "typed";

const CaseContext = createContext<{
  mode: CaseMode;
  toggle: () => void;
}>({ mode: "lower", toggle: () => {} });

export function useCase() {
  return useContext(CaseContext);
}

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<CaseMode>("lower");

  useEffect(() => {
    const stored = localStorage.getItem("caseMode") as CaseMode | null;
    if (stored) setMode(stored);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (mode === "lower") {
      html.setAttribute("data-case", "lower");
    } else {
      html.setAttribute("data-case", "typed");
    }
    localStorage.setItem("caseMode", mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === "lower" ? "typed" : "lower"));

  return (
    <CaseContext.Provider value={{ mode, toggle }}>
      {children}
    </CaseContext.Provider>
  );
}
