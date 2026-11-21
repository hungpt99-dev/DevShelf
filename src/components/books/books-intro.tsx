"use client";

import { useI18n } from "@/lib/i18n";

export function BooksIntro() {
  const { t } = useI18n();
  return (
    <header className="mb-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{t("catalog.label")}</p>
      <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">{t("catalog.title")}</h1>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">{t("catalog.subtitle")}</p>
    </header>
  );
}
