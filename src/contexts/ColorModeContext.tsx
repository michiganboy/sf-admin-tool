import * as React from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { STORAGE_KEYS } from "../constants/storageKeys";

export type ColorMode = "light" | "dark" | "system";

function getSystemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function loadStoredMode(): ColorMode {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEYS.COLOR_MODE);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function saveMode(mode: ColorMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.COLOR_MODE, mode);
}

interface ColorModeContextValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  effectiveMode: "light" | "dark";
}

const ColorModeContext = React.createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
  const ctx = React.useContext(ColorModeContext);
  if (!ctx) throw new Error("useColorMode must be used within ColorModeProvider");
  return ctx;
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ColorMode>(loadStoredMode);
  const [systemPrefersDark, setSystemPrefersDark] = React.useState(getSystemPrefersDark);

  React.useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, [mode]);

  const effectiveMode: "light" | "dark" =
    mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;

  const setMode = React.useCallback((next: ColorMode) => {
    setModeState(next);
    saveMode(next);
  }, []);

  const value = React.useMemo(
    () => ({ mode, setMode, effectiveMode }),
    [mode, setMode, effectiveMode]
  );

  const theme = React.useMemo(
    () => createTheme({ palette: { mode: effectiveMode } }),
    [effectiveMode]
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
