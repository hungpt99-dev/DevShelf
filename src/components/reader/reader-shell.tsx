"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft, BookmarkPlus, ChevronLeft, ChevronRight, List, Loader2,
  Maximize2, Minus, Plus, Type,
} from "lucide-react";
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
  loading: () => <div className="py-24 text-center text-[13px] text-muted">Loading PDF...</div>,
});

const THEME_CYCLE = ["dark", "light", "sepia"] as const;

export function ReaderShell({ book, resource }: { book: Book; resource: ReadableRecord }) {
  const { effective, update } = usePreferences();
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
    setTocOpen(window.innerWidth >= 1024 && effective.sidebarDefaultOpen);
  }, [effective.sidebarDefaultOpen, setTocOpen]);

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
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(effective.readerTheme) + 1) % THEME_CYCLE.length];
    update("readerTheme", next);
  }, [effective.readerTheme, update]);

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
      else if (event.key === "+" || event.key === "=") update("fontSize", Math.min(28, effective.fontSize + 1));
      else if (event.key === "-") update("fontSize", Math.max(14, effective.fontSize - 1));
      else if (event.key.toLowerCase() === "t") cycleTheme();
      else if (event.key.toLowerCase() === "f") toggleFullscreen();
      else if (event.key === "Escape") setTocOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentChapter, cycleTheme, effective.fontSize, goToChapter, setTocOpen, toggleFullscreen, update]);

  const style = {
    "--reader-font": effective.fontFamily === "sans" ? "var(--font-sans)" : "var(--font-serif)",
    "--reader-font-size": `${effective.fontSize}px`,
    "--reader-line-height": effective.lineHeight,
    "--reader-width": `${effective.readingWidth}ch`,
  } as CSSProperties;

  const pdfProgress = useCallback((page: number, total: number) => {
    const percentage = total > 0 ? (page / total) * 100 : 0;
    setProgress(percentage);
    persist(null, page, percentage);
  }, [persist]);

  const chapters = content?.chapters ?? [];

  return (
    <div className="reader-scope min-h-screen" data-reader-theme={effective.readerTheme} style={style}>
      <div className="sticky top-16 z-30 flex h-12 items-center gap-2 border-b border-line bg-background/85 px-3 backdrop-blur-xl">
        <Link href="/books" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] border border-line px-2.5 text-[12px] hover:border-lime">
          <ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">Library</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate px-1 text-[13px] font-medium">{book.title}</h1>
        <span className="hidden shrink-0 font-mono text-[10px] text-muted sm:block">{Math.round(progress)}%</span>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => update("fontSize", Math.max(14, effective.fontSize - 1))} className="flex size-8 items-center justify-center rounded-[10px] border border-line hover:border-lime" aria-label="Decrease font size"><Minus className="size-4" aria-hidden /></button>
          <button type="button" onClick={() => update("fontSize", Math.min(28, effective.fontSize + 1))} className="flex size-8 items-center justify-center rounded-[10px] border border-line hover:border-lime" aria-label="Increase font size"><Plus className="size-4" aria-hidden /></button>
          <button type="button" onClick={cycleTheme} className="flex size-8 items-center justify-center rounded-[10px] border border-line hover:border-lime" aria-label={`Reading theme: ${effective.readerTheme}`}><Type className="size-4" aria-hidden /></button>
          <button type="button" onClick={() => setTocOpen(!tocOpen)} className="flex size-8 items-center justify-center rounded-[10px] border border-line hover:border-lime" aria-label="Toggle table of contents"><List className="size-4" aria-hidden /></button>
          <button type="button" onClick={toggleFullscreen} className="flex size-8 items-center justify-center rounded-[10px] border border-line hover:border-lime" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}><Maximize2 className="size-4" aria-hidden /></button>
        </div>
      </div>

      <div className="h-0.5 bg-line">
        <div className="h-full bg-lime transition-[width]" style={{ width: `${Math.round(progress)}%` }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress" />
      </div>

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-28 z-20 w-[280px] overflow-y-auto border-r border-line bg-background p-5",
          tocOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Table of contents"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Contents</p>
        <p className="mt-2 text-[13px] font-medium leading-snug">{book.title}</p>
        {chapters.length === 0 ? (
          <p className="mt-6 text-[12px] text-muted">This resource has no chapter headings.</p>
        ) : (
          <nav className="mt-5 space-y-0.5" aria-label="Chapters">
            {chapters.map((chapter, index) => (
              <button
                key={`${chapter.id}-${index}`}
                onClick={() => goToChapter(index)}
                className={cn(
                  "block w-full border-l-2 py-1.5 pr-2 text-left text-[12px] leading-snug hover:text-lime-text",
                  index === currentChapter ? "border-lime bg-card pl-2 text-foreground" : "border-transparent pl-2 text-muted",
                  chapter.level >= 3 && "pl-4",
                  chapter.level >= 4 && "pl-6",
                )}
                aria-current={index === currentChapter ? "location" : undefined}
              >
                {chapter.title}
              </button>
            ))}
          </nav>
        )}
        <div className="mt-8 border-t border-line pt-4 text-[11px] text-muted">
          <p>Keys: ← → chapters, + − font, T theme, F fullscreen.</p>
          <button
            type="button"
            onClick={async () => {
              await addBookmark(book.id, chapters[currentChapter]?.id ?? null, Math.round(window.scrollY), chapters[currentChapter]?.title ?? "");
              setNote("Bookmark saved.");
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border border-line px-2 py-1.5 hover:border-lime"
          >
            <BookmarkPlus className="size-3.5" aria-hidden /> Bookmark here
          </button>
          {note && <p className="mt-2 text-lime-text" role="status">{note}</p>}
        </div>
      </aside>

      <main className={cn("px-4 py-10 sm:px-8", tocOpen && "lg:pl-[312px]")} id="reader-content">
        {error && (
          <div role="alert" className="mx-auto max-w-xl rounded-[16px] border border-destructive/50 p-6 text-center text-[13px] text-destructive">
            {error} <Link className="underline" href={`/books/${book.id}`}>Back to book details</Link>
          </div>
        )}
        {!content && !error && (
          <div className="flex justify-center py-24 text-[13px] text-muted"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Opening book...</div>
        )}
        {content?.type === "markdown" && <MarkdownContent markdown={content.markdown ?? ""} assetBase={content.assetBase} />}
        {content?.type === "html" && <HtmlContent html={content.html ?? ""} />}
        {content?.type === "pdf" && <PdfReader url={content.pdfUrl ?? ""} initialPage={initialPage} onProgress={pdfProgress} />}

        {content && (
          <footer className="mx-auto mt-12 max-w-[var(--reader-width)] border-t border-line pt-5 font-mono text-[10px] leading-relaxed text-muted">
            <p><span className="text-reader-fg">Source:</span> <a href={content.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-lime-text underline underline-offset-2">{content.sourceUrl}</a></p>
            <p className="mt-1"><span className="text-reader-fg">Attribution:</span> {content.attribution}{content.license ? ` · ${content.license}` : ""}</p>
            <p className="mt-1">Catalog: EbookFoundation/free-programming-books · CC BY 4.0</p>
          </footer>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-background/90 px-4 py-2.5 backdrop-blur-xl" aria-label="Chapter navigation">
        <button type="button" disabled={currentChapter <= 0 || content?.type === "pdf"} onClick={() => goToChapter(currentChapter - 1)} className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-line px-3 text-[12px] hover:border-lime disabled:opacity-40">
          <ChevronLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="truncate font-mono text-[10px] text-muted">
          {chapters.length ? `${currentChapter + 1}/${chapters.length} · ` : ""}{Math.round(progress)}%
        </span>
        <button type="button" disabled={currentChapter >= chapters.length - 1 || content?.type === "pdf"} onClick={() => goToChapter(currentChapter + 1)} className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-line px-3 text-[12px] hover:border-lime disabled:opacity-40">
          <span className="hidden sm:inline">Next</span> <ChevronRight className="size-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
}
