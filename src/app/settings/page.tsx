import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Settings", description: "Reading preferences and local data export and import." };

export default function SettingsPage() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Preferences</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">Settings</h1>
          <p className="mt-2 text-[13px] text-muted">Everything is saved locally in this browser.</p>
        </header>
        <SettingsForm />
      </div>
      <SiteFooter />
    </>
  );
}
