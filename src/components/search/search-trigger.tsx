"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Search } from "lucide-react";
import { getApplePlatformServerSnapshot, getApplePlatformSnapshot, shortcutHint, subscribePlatform } from "@/lib/platform";
import { useUIStore } from "@/stores/ui-store";

export function SearchTrigger({ count }: { count: number }) {
  const { setSearchOpen } = useUIStore();
  const apple = useSyncExternalStore(subscribePlatform, getApplePlatformSnapshot, getApplePlatformServerSnapshot);
  return (
    <button
      onClick={() => setSearchOpen(true)}
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:border-primary/50"
      aria-label="Search the library"
    >
      <Search className="size-5 text-muted-foreground" aria-hidden />
      <span className="flex-1 text-sm text-muted-foreground">Search {count.toLocaleString()} books, authors, categories...</span>
      <span className="hidden items-center gap-2 sm:flex">
        <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px]">{shortcutHint(apple)}</kbd>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
    </button>
  );
}
