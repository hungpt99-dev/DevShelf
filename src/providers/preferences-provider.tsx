"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/db/db";
import { getPreferences, setPreference } from "@/lib/db/operations";

interface PreferencesContextValue {
  preferences: Preferences;
  effective: Preferences;
  ready: boolean;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const DARK_DEFAULTS: Preferences = {
  ...DEFAULT_PREFERENCES,
  theme: "dark",
  readerTheme: "dark",
  fontFamily: "sans",
  fontSize: 18,
  readingWidth: 70,
};

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  effective: DARK_DEFAULTS,
  ready: false,
  update: () => undefined,
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [customized, setCustomized] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let cleanup: () => void = () => undefined;
    try {
      const timer = window.setTimeout(() => setCustomized(window.localStorage.getItem("devshelf-customized") === "1"), 0);
      cleanup = () => window.clearTimeout(timer);
    } catch { /* private browsing */ }
    getPreferences().then((value) => {
      if (!active) return;
      setPreferences(value);
      setReady(true);
    });
    return () => { active = false; cleanup(); };
  }, []);

  const effective = customized ? preferences : DARK_DEFAULTS;

  useEffect(() => {
    document.documentElement.lang = effective.locale;
    document.documentElement.dataset.theme = effective.theme;
    try {
      window.localStorage.setItem("devshelf-theme", effective.theme);
    } catch { /* private browsing */ }
  }, [effective.theme, effective.locale]);

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setCustomized(true);
    try { window.localStorage.setItem("devshelf-customized", "1"); } catch { /* private browsing */ }
    void setPreference(key, value);
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, effective, ready, update }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}
