"use client";

import { useEffect, useState } from "react";
import { usePreferences } from "@/providers/preferences-provider";
import { en, type MessageKey } from "./en";
import type { vi as ViCatalog } from "./vi";

export type { MessageKey };
export const messages = { en } as const;

let viPromise: Promise<typeof ViCatalog> | null = null;
function loadVietnamese(): Promise<typeof ViCatalog> {
  viPromise ??= import("./vi").then((module) => module.vi);
  return viPromise;
}

export function useI18n() {
  const { effective } = usePreferences();
  const [vietnamese, setVietnamese] = useState<typeof ViCatalog | null>(null);

  useEffect(() => {
    if (effective.locale !== "vi") return;
    let active = true;
    void loadVietnamese().then((catalog) => { if (active) setVietnamese(catalog); });
    return () => { active = false; };
  }, [effective.locale]);

  const catalog = effective.locale === "vi" ? (vietnamese ?? en) : en;
  return {
    locale: effective.locale,
    t: (key: MessageKey): string => catalog[key],
  };
}
