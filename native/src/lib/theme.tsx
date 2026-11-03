import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme, vars } from "nativewind";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemePref = "system" | "light" | "dark";
export type Scheme = "light" | "dark";
const KEY = "mini_shop_theme";

/** Design tokens as space-separated RGB triplets, consumed by tailwind.config.js via `rgb(var(--x) / <alpha>)`. */
const TOKENS: Record<Scheme, Record<string, string>> = {
  light: {
    "--ink": "17 17 17",
    "--soft": "107 114 128",
    "--surface": "255 255 255",
    "--primary": "20 20 31",
    "--canvas": "236 232 255",
    "--glass": "255 255 255",
    "--glass-dark": "18 20 32",
    "--glass-line": "255 255 255",
    "--line": "209 213 219",
  },
  dark: {
    "--ink": "240 240 250",
    "--soft": "156 163 184",
    "--surface": "30 31 46",
    "--primary": "109 92 231",
    "--canvas": "14 14 24",
    "--glass": "30 31 46",
    "--glass-dark": "10 10 18",
    "--glass-line": "72 74 102",
    "--line": "63 65 90",
  },
};

/** The same palette as plain strings, for places Tailwind can't reach (SVG icons, placeholders, canvas, Telegram). */
export const PALETTE = {
  light: {
    ink: "#111111", soft: "#6b7280", faint: "#9ca3af", placeholder: "#a9adb8", primary: "#14141f", canvas: "#ece8ff",
    onPrimary: "#ffffff", icon: "#111111", iconSoft: "#6b7280", star: "#d1d5db", tgHeader: "#f6ecfb", tgBottom: "#ffffff",
    blobs: ["#ffb4d6", "#a9c8ff", "#b9f0d8", "#d6bcff"], barStyle: "dark" as const, blur: "light" as const,
  },
  dark: {
    ink: "#f0f0fa", soft: "#9ca3b8", faint: "#6b7390", placeholder: "#6b7390", primary: "#6d5ce7", canvas: "#0e0e18",
    onPrimary: "#ffffff", icon: "#f0f0fa", iconSoft: "#9ca3b8", star: "#4a4e68", tgHeader: "#14142a", tgBottom: "#1e1f2e",
    blobs: ["#7a2d57", "#2b4a8a", "#1f6a52", "#4b2f8a"], barStyle: "light" as const, blur: "dark" as const,
  },
};
export type Palette = (typeof PALETTE)["light"] | (typeof PALETTE)["dark"];

type Ctx = { pref: ThemePref; scheme: Scheme; dark: boolean; c: Palette; setPref: (p: ThemePref) => void; vars: ReturnType<typeof vars>; paper: ReturnType<typeof vars> };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === "light" || v === "dark" || v === "system") && setPrefState(v))
      .catch(() => {});
  }, []);

  const scheme: Scheme = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;

  // keep NativeWind's `dark:` variants in sync with the resolved scheme
  useEffect(() => {
    colorScheme.set(scheme);
  }, [scheme]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({ pref, scheme, dark: scheme === "dark", c: PALETTE[scheme], setPref, vars: vars(TOKENS[scheme]), paper: vars(TOKENS.light) }),
    [pref, scheme, setPref],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}
