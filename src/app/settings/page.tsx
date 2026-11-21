import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Settings", description: "Reading preferences and local data export/import." };

export default function SettingsPage() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Preferences</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Everything is saved locally in IndexedDB. Nothing is uploaded.</p>
        </header>
        <SettingsForm />
      </div>
      <SiteFooter />
    </>
  );
}
