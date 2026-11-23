"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Github, Library, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { getApplePlatformServerSnapshot, getApplePlatformSnapshot, shortcutHint, subscribePlatform } from "@/lib/platform";
import { usePreferences } from "@/providers/preferences-provider";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const links = [
  { href: "/books", key: "nav.library" as const },
  { href: "/reading-list", key: "nav.readingList" as const },
  { href: "/settings", key: "nav.settings" as const },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { setSearchOpen } = useUIStore();
  const { effective, update } = usePreferences();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = effective.theme;
  const apple = useSyncExternalStore(subscribePlatform, getApplePlatformSnapshot, getApplePlatformServerSnapshot);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="DevShelf home">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-lime text-on-lime">
            <Library className="size-[18px]" aria-hidden />
          </span>
          <span className="text-[17px] font-medium tracking-tight">DevShelf</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 rounded-full border border-line bg-card p-1 md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] hover:border hover:border-lime",
                  active ? "bg-background text-ink" : "text-muted",
                )}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-[12px] border border-line bg-card px-3 text-[13px] text-muted hover:border-lime sm:flex"
            aria-label="Search books"
          >
            <Search className="size-4" aria-hidden />
            <span>{t("nav.search")}</span>
            <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">{shortcutHint(apple)}</kbd>
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} className="flex size-9 items-center justify-center rounded-[12px] border border-line hover:border-lime sm:hidden" aria-label="Search books">
            <Search className="size-4" aria-hidden />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex size-9 items-center justify-center rounded-[12px] border border-line hover:border-lime" aria-label="Change theme">
                {theme === "dark" ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card">
              <DropdownMenuLabel>{t("nav.appearance")}</DropdownMenuLabel>
              {(["dark", "light", "sepia"] as const).map((value) => (
                <DropdownMenuItem key={value} onClick={() => update("theme", value)} className="capitalize">
                  {value}
                  {theme === value && <Check className="ml-auto size-4 text-lime" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <a href="https://github.com/hungpt99-dev/DevShelf" target="_blank" rel="noopener noreferrer" className="hidden size-9 items-center justify-center rounded-[12px] border border-line hover:border-lime sm:flex" aria-label="DevShelf on GitHub">
            <Github className="size-4" aria-hidden />
          </a>
          <button type="button" onClick={() => setMobileOpen((open) => !open)} className="flex size-9 items-center justify-center rounded-[12px] border border-line hover:border-lime md:hidden" aria-label="Toggle navigation">
            {mobileOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-line bg-background px-4 py-3 md:hidden" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-sm text-muted hover:text-ink">
              {t(link.key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
