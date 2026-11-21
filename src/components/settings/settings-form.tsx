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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5 last:border-0">
      <div><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>
      {children}
    </div>
  );
}

export function SettingsForm() {
  const { preferences, update } = usePreferences();
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
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card px-5 py-2">
        <h2 className="pt-5 text-base font-semibold">Appearance & reading</h2>
        <Row label="Default theme" description="Applied across the whole application.">
          <select value={preferences.theme} onChange={(event) => select("theme", event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="Default theme">
            <option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option>
          </select>
        </Row>
        <Row label="Reader theme" description="Independent from the application theme; switchable in the reader toolbar.">
          <select value={preferences.readerTheme} onChange={(event) => select("readerTheme", event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="Reader theme">
            <option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option>
          </select>
        </Row>
        <Row label="Font family" description="Serif is tuned for long-form reading.">
          <select value={preferences.fontFamily} onChange={(event) => update("fontFamily", event.target.value as Preferences["fontFamily"])} className="rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="Reading font family">
            <option value="serif">Serif</option><option value="sans">Sans</option>
          </select>
        </Row>
        <Row label="Font size" description={`${preferences.fontSize}px in the reading area.`}>
          <input type="range" min={14} max={28} value={preferences.fontSize} onChange={(event) => update("fontSize", Number(event.target.value))} className="w-44 accent-[var(--primary)]" aria-label="Reading font size" />
        </Row>
        <Row label="Reading width" description={`Up to ${preferences.readingWidth} characters per line.`}>
          <input type="range" min={42} max={100} value={preferences.readingWidth} onChange={(event) => update("readingWidth", Number(event.target.value))} className="w-44 accent-[var(--primary)]" aria-label="Reading width" />
        </Row>
        <Row label="Line height" description={`${preferences.lineHeight}× the font size.`}>
          <input type="range" min={1.3} max={2.2} step={0.05} value={preferences.lineHeight} onChange={(event) => update("lineHeight", Number(event.target.value))} className="w-44 accent-[var(--primary)]" aria-label="Reading line height" />
        </Row>
        <Row label="Sidebar open by default" description="Table of contents state when opening a book.">
          <Switch checked={preferences.sidebarDefaultOpen} onCheckedChange={(checked) => update("sidebarDefaultOpen", checked)} aria-label="Sidebar open by default" />
        </Row>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Your data</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Export your local library, progress, bookmarks and preferences as JSON. Importing replaces the current local data in this browser.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => void download()}><Download className="size-4" aria-hidden /> Export JSON</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" aria-hidden /> Import JSON</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} aria-label="Import library JSON" />
        </div>
        {message && <p className="mt-4 text-sm text-primary" role="status">{message}</p>}
      </section>
    </div>
  );
}
