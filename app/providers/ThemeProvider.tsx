import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getSystemTheme,
  resolveTheme,
  type ThemeMode,
} from "../utils/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "appify-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
  });

  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    resolveTheme(mode),
  );

  const applyTheme = useCallback((resolvedTheme: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    setResolved(resolvedTheme);
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(resolveTheme(next));
    },
    [applyTheme],
  );

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  useEffect(() => {
    applyTheme(resolveTheme(mode));
  }, [mode, applyTheme]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export type { ThemeMode };
