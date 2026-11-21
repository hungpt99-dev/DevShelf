"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/db/db";
import { getPreferences, setPreference } from "@/lib/db/operations";

interface PreferencesContextValue {
  preferences: Preferences;
  ready: boolean;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  ready: false,
  update: () => undefined,
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getPreferences().then((value) => {
      if (!active) return;
      setPreferences(value);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    try {
      window.localStorage.setItem("devshelf-theme", preferences.theme);
    } catch {
      // Private browsing may disallow localStorage; the in-memory theme still works.
    }
  }, [preferences.theme]);

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    void setPreference(key, value);
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, ready, update }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}
