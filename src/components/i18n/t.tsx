"use client";

import { useI18n, type MessageKey } from "@/lib/i18n";

export function T({ k, values }: { k: MessageKey; values?: Record<string, string> }) {
  const { t } = useI18n();
  let text = t(k);
  if (values) for (const [key, value] of Object.entries(values)) text = text.replace(`{${key}}`, value);
  return <>{text}</>;
}
