export type ThemeMode = "light" | "dark" | "system";

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveThemeForTest(
  mode: ThemeMode,
  systemFallback: "light" | "dark" = "light",
): "light" | "dark" {
  return mode === "system" ? systemFallback : mode;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemTheme() : mode;
}
