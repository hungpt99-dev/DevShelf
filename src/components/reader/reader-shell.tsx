"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft, BookmarkPlus, ChevronLeft, ChevronRight, List, Loader2,
  Maximize2, Minus, Plus, Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HtmlContent } from "@/components/reader/html-content";
import { MarkdownContent } from "@/components/reader/markdown-content";
import { usePreferences } from "@/providers/preferences-provider";
import { useUIStore } from "@/stores/ui-store";
import { addBookmark, getProgress, rememberBook, saveProgress } from "@/lib/db/operations";
import { selectProvider } from "@/lib/readers/providers";
import type { ReaderContent } from "@/lib/readers/types";
import { cn } from "@/lib/utils";
import type { Book, ReadableRecord } from "@/types/book";

const PdfReader = dynamic(() => import("@/components/reader/pdf-reader"), {
  ssr: false,
  loading: () => <div className="py-24 text-center text-sm text-muted-foreground">Loading PDF reader...</div>,
});

const THEME_CYCLE = ["sepia", "light", "dark"] as const;

export function ReaderShell({ book, resource }: { book: Book; resource: ReadableRecord }) {
  const { preferences, update } = usePreferences();
  const { tocOpen, setTocOpen } = useUIStore();
  const [content, setContent] = useState<ReaderContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [initialPage, setInitialPage] = useState(1);
  const [restored, setRestored] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [note, setNote] = useState("");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const provider = selectProvider(book, resource.path, resource.type);
    provider.loadContent(book, resource.path, {
      sourceUrl: resource.sourceUrl, attribution: resource.attribution,
      license: resource.license, assetBase: resource.assetBase,
    }).then(async (loaded) => {
      if (!active) return;
      setContent(loaded);
      const saved = await getProgress(book.id);
      if (!active) return;
      if (saved) {
        setProgress(saved.percentage);
        setInitialPage(Math.max(1, Math.round(saved.position || 1)));
        if (loaded.type !== "pdf" && saved.position > 0) window.scrollTo({ top: saved.position, behavior: "auto" });
      }
      setRestored(true);
      void rememberBook(book);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Could not load this book");
    });
    return () => { active = false; };
  }, [book, resource]);

  useEffect(() => {
    setTocOpen(window.innerWidth >= 1024 && preferences.sidebarDefaultOpen);
  }, [preferences.sidebarDefaultOpen, setTocOpen]);

  const persist = useCallback((chapterId: string | null, position: number, percentage: number) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveProgress(book.id, chapterId, position, percentage);
    }, 450);
  }, [book.id]);

  const onScroll = useCallback(() => {
    if (content?.type === "pdf" || !restored) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    setProgress(percentage);
    const headings = [...document.querySelectorAll<HTMLElement>(".prose-reader h1[id], .prose-reader h2[id], .prose-reader h3[id], .prose-reader h4[id]")];
    let index = 0;
    headings.forEach((heading, headingIndex) => {
      if (heading.getBoundingClientRect().top <= 140) index = headingIndex;
    });
    setCurrentChapter(index);
    persist(headings[index]?.id ?? null, window.scrollY, percentage);
  }, [content, restored, persist]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const goToChapter = useCallback((index: number) => {
    const chapters = content?.chapters ?? [];
    if (index < 0 || index >= chapters.length) return;
    setCurrentChapter(index);
    document.getElementById(chapters[index].id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(window.innerWidth < 1024 ? false : tocOpen);
  }, [content, tocOpen, setTocOpen]);

  const cycleTheme = useCallback(() => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(preferences.readerTheme) + 1) % THEME_CYCLE.length];
    update("readerTheme", next);
  }, [preferences.readerTheme, update]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight") goToChapter(currentChapter + 1);
      else if (event.key === "ArrowLeft") goToChapter(currentChapter - 1);
      else if (event.key === "+" || event.key === "=") update("fontSize", Math.min(28, preferences.fontSize + 1));
      else if (event.key === "-") update("fontSize", Math.max(14, preferences.fontSize - 1));
      else if (event.key.toLowerCase() === "t") cycleTheme();
      else if (event.key.toLowerCase() === "f") toggleFullscreen();
      else if (event.key === "Escape") setTocOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentChapter, cycleTheme, goToChapter, preferences.fontSize, setTocOpen, toggleFullscreen, update]);

  const style = {
    "--reader-font": preferences.fontFamily === "sans" ? "var(--font-sans)" : "var(--font-serif)",
    "--reader-font-size": `${preferences.fontSize}px`,
    "--reader-line-height": preferences.lineHeight,
    "--reader-width": `${preferences.readingWidth}ch`,
  } as CSSProperties;

  const pdfProgress = useCallback((page: number, total: number) => {
    const percentage = total > 0 ? (page / total) * 100 : 0;
    setProgress(percentage);
    persist(null, page, percentage);
  }, [persist]);

  const chapters = content?.chapters ?? [];

  return (
    <div className="reader-scope min-h-screen" data-reader-theme={preferences.readerTheme} style={style}>
      <div className="sticky top-16 z-30 flex h-12 items-center gap-2 border-b border-[var(--reader-border)] bg-[var(--reader-bg)]/95 px-3 backdrop-blur">
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/books"><ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">Library</span></Link>
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-[var(--reader-border)] sm:block" aria-hidden />
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{book.title}</h1>
        <span className="hidden shrink-0 text-xs tabular-nums text-[var(--reader-muted)] sm:block">{Math.round(progress)}%</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => update("fontSize", Math.max(14, preferences.fontSize - 1))} aria-label="Decrease font size"><Minus className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => update("fontSize", Math.min(28, preferences.fontSize + 1))} aria-label="Increase font size"><Plus className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={cycleTheme} aria-label={`Reading theme: ${preferences.readerTheme}`}><Type className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setTocOpen(!tocOpen)} aria-label="Toggle table of contents"><List className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}><Maximize2 className="size-4" /></Button>
        </div>
      </div>

      <div className={cn("h-0.5 bg-[var(--reader-border)]")}>
        <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.round(progress)}%` }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress" />
      </div>

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-28 z-20 w-[280px] overflow-y-auto border-r border-[var(--reader-border)] bg-[var(--reader-bg)] p-5 transition-transform duration-200 lg:top-28",
          tocOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Table of contents"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--reader-muted)]">Contents</p>
        <p className="mt-2 text-sm font-semibold leading-snug">{book.title}</p>
        {chapters.length === 0 ? (
          <p className="mt-6 text-xs text-[var(--reader-muted)]">This resource has no chapter headings.</p>
        ) : (
          <nav className="mt-5 space-y-0.5" aria-label="Chapters">
            {chapters.map((chapter, index) => (
              <button
                key={`${chapter.id}-${index}`}
                onClick={() => goToChapter(index)}
                className={cn(
                  "block w-full rounded px-2 py-1.5 text-left text-sm leading-snug transition-colors hover:bg-[var(--reader-code-bg)]",
                  index === currentChapter ? "bg-[var(--reader-code-bg)] font-medium text-foreground" : "text-[var(--reader-muted)]",
                  chapter.level >= 3 && "pl-5 text-xs",
                  chapter.level >= 4 && "pl-8",
                )}
                aria-current={index === currentChapter ? "location" : undefined}
              >
                {chapter.title}
              </button>
            ))}
          </nav>
        )}
        <div className="mt-8 border-t border-[var(--reader-border)] pt-4 text-xs text-[var(--reader-muted)]">
          <p>Keyboard: ← → chapters, + − font, T theme, F fullscreen.</p>
          <Button variant="ghost" size="sm" className="mt-3 h-8 px-2 text-xs" onClick={async () => {
            await addBookmark(book.id, chapters[currentChapter]?.id ?? null, Math.round(window.scrollY), chapters[currentChapter]?.title ?? "");
            setNote("Bookmark saved locally.");
          }}><BookmarkPlus className="size-3.5" aria-hidden /> Bookmark here</Button>
          {note && <p className="mt-2 text-xs text-primary" role="status">{note}</p>}
        </div>
      </aside>

      <main className={cn("px-4 py-10 transition-[padding] sm:px-8", tocOpen && "lg:pl-[312px]")} id="reader-content">
        {error && (
          <div role="alert" className="mx-auto max-w-xl rounded-lg border border-destructive/40 p-6 text-center text-sm text-destructive">
            {error} <Link className="underline" href={`/books/${book.id}`}>Back to book details</Link>
          </div>
        )}
        {!content && !error && (
          <div className="flex justify-center py-24 text-sm text-[var(--reader-muted)]"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Opening book...</div>
        )}
        {content?.type === "markdown" && <MarkdownContent markdown={content.markdown ?? ""} assetBase={content.assetBase} />}
        {content?.type === "html" && <HtmlContent html={content.html ?? ""} />}
        {content?.type === "pdf" && <PdfReader url={content.pdfUrl ?? ""} initialPage={initialPage} onProgress={pdfProgress} />}

        {content && (
          <footer className="mx-auto mt-12 max-w-[var(--reader-width)] border-t border-[var(--reader-border)] pt-5 text-xs leading-relaxed text-[var(--reader-muted)]">
            <p><span className="font-medium">Source:</span> <a href={content.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{content.sourceUrl}</a></p>
            <p className="mt-1"><span className="font-medium">Attribution:</span> {content.attribution}{content.license ? ` · ${content.license}` : ""}</p>
            <p className="mt-1">Catalog: <a href="https://github.com/EbookFoundation/free-programming-books" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">EbookFoundation/free-programming-books</a> (CC BY 4.0)</p>
          </footer>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-3 border-t border-[var(--reader-border)] bg-[var(--reader-bg)]/95 px-4 py-2.5 backdrop-blur" aria-label="Chapter navigation">
        <Button variant="ghost" size="sm" disabled={currentChapter <= 0 || content?.type === "pdf"} onClick={() => goToChapter(currentChapter - 1)}>
          <ChevronLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="truncate text-xs text-[var(--reader-muted)]">
          {chapters.length ? `${currentChapter + 1} / ${chapters.length} · ` : ""}{Math.round(progress)}% complete
        </span>
        <Button variant="ghost" size="sm" disabled={currentChapter >= chapters.length - 1 || content?.type === "pdf"} onClick={() => goToChapter(currentChapter + 1)}>
          <span className="hidden sm:inline">Next</span> <ChevronRight className="size-4" aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
