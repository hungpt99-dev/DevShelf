"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { exportData, importData } from "@/lib/db/operations";
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
    setMessage("Library exported as JSON.");
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await importData(await file.text());
      setMessage(`Imported ${result.books} books, ${result.readingList} list entries, ${result.bookmarks} bookmarks.`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-line bg-card px-5 pb-2">
        <h2 className="pt-5 text-[15px] font-medium">Appearance and reading</h2>
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
      </section>

      <section className="rounded-[16px] border border-line bg-card p-5">
        <h2 className="text-[15px] font-medium">Your data</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">Export your shelf, progress, bookmarks and preferences as JSON. Importing replaces the existing local data.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => void download()} className="primary-action rounded-[12px] bg-button-bg text-button-fg hover:border-lime"><Download className="size-4" aria-hidden /> Export JSON</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-[12px] border-line-strong hover:border-lime"><Upload className="size-4" aria-hidden /> Import JSON</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} aria-label="Import library JSON" />
        </div>
        {message && <p className="mt-4 text-[12px] text-lime-text" role="status">{message}</p>}
      </section>
    </div>
  );
}
