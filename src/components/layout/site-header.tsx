"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Check, Github, LibraryBig, Menu, Moon, Search, Settings, Sun, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreferences } from "@/providers/preferences-provider";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const links = [
  { href: "/books", label: "Explore", icon: LibraryBig },
  { href: "/reading-list", label: "Reading list", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "sepia", label: "Sepia", icon: BookOpen },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { setSearchOpen } = useUIStore();
  const { preferences, update } = usePreferences();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="DevShelf home">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-4.5" aria-hidden />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">DevShelf</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary",
                pathname === link.href || pathname.startsWith(`${link.href}/`)
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 w-56 justify-start gap-2 text-muted-foreground sm:flex"
            onClick={() => setSearchOpen(true)}
            aria-label="Search books"
          >
            <Search className="size-4" aria-hidden />
            <span>Search books...</span>
            <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="size-9 sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Search books">
            <Search className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Change theme">
                {preferences.theme === "dark" ? <Moon className="size-4" /> : preferences.theme === "sepia" ? <BookOpen className="size-4" /> : <Sun className="size-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Appearance</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {themes.map((theme) => (
                <DropdownMenuItem key={theme.value} onClick={() => update("theme", theme.value)}>
                  <theme.icon className="size-4" aria-hidden />
                  {theme.label}
                  {preferences.theme === theme.value && <Check className="ml-auto size-4" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="size-9 hidden sm:inline-flex" asChild aria-label="Data source on GitHub">
            <a href="https://github.com/EbookFoundation/free-programming-books" target="_blank" rel="noopener noreferrer">
              <Github className="size-4" />
            </a>
          </Button>

          <Button variant="ghost" size="icon" className="size-9 md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-background px-4 py-3 md:hidden" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-secondary">
              <link.icon className="size-4" aria-hidden />{link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
