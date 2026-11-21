import type { Metadata } from "next";
import Link from "next/link";
import { StatsPanel } from "@/components/stats/stats-panel";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Reading stats", description: "Local-only reading time and streaks." };

export default function StatsPage() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Local only</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">Reading stats</h1>
          <p className="mt-2 text-[13px] text-muted">Sessions are counted in this browser only. Turn on Reading stats in Settings to record them.</p>
        </header>
        <StatsPanel />
        <p className="mt-6"><Link href="/settings" className="text-[13px] link-lime">Open Settings</Link></p>
      </div>
      <SiteFooter />
    </>
  );
}
