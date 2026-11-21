"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GistSyncPanel } from "@/components/sync/gist-sync-panel";
import { exportData, importData } from "@/lib/db/operations";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/providers/preferences-provider";
import type { Preferences } from "@/lib/db/db";

function Row({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5 last:border-0">
      <div><p className="text-[13px] font-medium">{label}</p><p className="mt-0.5 text-[11px] text-muted">{description}</p></div>
      {children}
    </div>
  );
}

const selectClass = "rounded-[12px] border border-line bg-background px-3 py-2 text-[13px] outline-none hover:border-lime focus:border-lime";

export function SettingsForm() {
  const { effective, update } = usePreferences();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const select = (key: "theme" | "readerTheme", value: string) => update(key, value as Preferences["theme"]);

  const download = async () => {
    const json = await exportData();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devshelf-library-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(t("settings.exported"));
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await importData(await file.text());
      setMessage(t("settings.imported").replace("{books}", String(result.books)).replace("{readingList}", String(result.readingList)).replace("{bookmarks}", String(result.bookmarks)));
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settings.importFailed"));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-line bg-card px-5 pb-2">
        <h2 className="pt-5 text-[15px] font-medium">{t("settings.appearance")}</h2>
        <Row label={t("settings.language")} description={t("settings.languageDescription")}>
          <select value={effective.locale} onChange={(event) => update("locale", event.target.value as Preferences["locale"])} className={selectClass} aria-label={t("settings.language")}>
            <option value="en">English</option><option value="vi">Tiếng Việt</option>
          </select>
        </Row>
        <Row label="Default theme" description="Applied across the application.">
          <select value={effective.theme} onChange={(event) => select("theme", event.target.value)} className={selectClass} aria-label="Default theme">
            <option value="dark">Dark</option><option value="light">Light</option><option value="sepia">Sepia</option>
          </select>
        </Row>
        <Row label="Reader theme" description="Independent from the application theme.">
          <select value={effective.readerTheme} onChange={(event) => select("readerTheme", event.target.value)} className={selectClass} aria-label="Reader theme">
            <option value="dark">Dark</option><option value="light">Light</option><option value="sepia">Sepia</option>
          </select>
        </Row>
        <Row label="Font family" description="Geist Sans is used for reading.">
          <select value={effective.fontFamily} onChange={(event) => update("fontFamily", event.target.value as Preferences["fontFamily"])} className={selectClass} aria-label="Reading font family">
            <option value="sans">Sans</option><option value="serif">Serif</option>
          </select>
        </Row>
        <Row label="Font size" description={`${effective.fontSize}px in the reader.`}>
          <input type="range" min={14} max={28} value={effective.fontSize} onChange={(event) => update("fontSize", Number(event.target.value))} className="w-44 accent-[#c8f542]" aria-label="Reading font size" />
        </Row>
        <Row label="Reading width" description={`Up to ${effective.readingWidth} characters per line.`}>
          <input type="range" min={42} max={100} value={effective.readingWidth} onChange={(event) => update("readingWidth", Number(event.target.value))} className="w-44 accent-[#c8f542]" aria-label="Reading width" />
        </Row>
        <Row label="Line height" description={`${effective.lineHeight}× the font size.`}>
          <input type="range" min={1.3} max={2.2} step={0.05} value={effective.lineHeight} onChange={(event) => update("lineHeight", Number(event.target.value))} className="w-44 accent-[#c8f542]" aria-label="Reading line height" />
        </Row>
        <Row label="Sidebar open by default" description="Table of contents state when opening a book.">
          <Switch checked={effective.sidebarDefaultOpen} onCheckedChange={(checked) => update("sidebarDefaultOpen", checked)} aria-label="Sidebar open by default" />
        </Row>
        <Row label="Load cover images from Open Library" description="When off, covers are generated locally and no third-party image requests are made.">
          <Switch checked={effective.loadCoverImages} onCheckedChange={(checked) => update("loadCoverImages", checked)} aria-label="Load cover images from Open Library" />
        </Row>
        <Row label={t("settings.offline")} description={t("settings.offlineDescription")}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={async () => { const keys = await caches.keys(); await Promise.all(keys.filter((key) => key.startsWith("devshelf-")).map((key) => caches.delete(key))); setMessage("Offline data cleared."); }} className="text-[12px] link-lime">Clear offline data</button>
            <Switch checked={effective.offlineMode} onCheckedChange={(checked) => update("offlineMode", checked)} aria-label={t("settings.offline")} />
          </div>
        </Row>
        <Row label={t("settings.stats")} description={t("settings.statsDescription")}>
          <div className="flex items-center gap-3">
            <a href="/stats" className="text-[12px] link-lime">View stats</a>
            <Switch checked={effective.readingStats} onCheckedChange={(checked) => update("readingStats", checked)} aria-label={t("settings.stats")} />
          </div>
        </Row>
      </section>

      <GistSyncPanel />

      <section className="rounded-[16px] border border-line bg-card p-5">
        <h2 className="text-[15px] font-medium">{t("settings.yourData")}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("settings.yourDataText")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => void download()} className="primary-action rounded-[12px] bg-button-bg text-button-fg hover:border-lime"><Download className="size-4" aria-hidden /> {t("settings.exportJson")}</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-[12px] border-line-strong hover:border-lime"><Upload className="size-4" aria-hidden /> {t("settings.importJson")}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} aria-label="Import library JSON" />
        </div>
        {message && <p className="mt-4 text-[12px] text-lime-text" role="status">{message}</p>}
      </section>
    </div>
  );
}
