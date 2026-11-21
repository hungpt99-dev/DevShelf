"use client";

import { Component, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getCoverSpec, type CoverPattern, type CoverSkin, type CoverSpec } from "@/lib/cover";
import { useCoverUrl } from "@/lib/use-covers";
import { publicPath } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";
import type { Book } from "@/types/book";

const SKIN_CLASSES: Record<CoverSkin, { frame: string; tile: string; meta: string }> = {
  dark: { frame: "border-line-strong bg-cover-dark text-ink", tile: "border-line-strong", meta: "text-muted" },
  lime: { frame: "border-lime bg-lime text-on-lime", tile: "border-on-lime/40", meta: "text-on-lime/75" },
  paper: { frame: "border-[#d4d4ce] bg-[#f4f4f0] text-[#111111]", tile: "border-[#111111]/25", meta: "text-[#111111]/70" },
  ink: { frame: "border-line-strong bg-[#0e0e0e] text-ink", tile: "border-line-strong", meta: "text-muted" },
};

class CoverErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Pattern({ pattern }: { pattern: CoverPattern }) {
  const rawId = useId();
  const id = `devshelf-cover-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`;

  if (pattern === "dots") {
    return (
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <defs><pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="currentColor" /></pattern></defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.14" />
      </svg>
    );
  }
  if (pattern === "grid") {
    return (
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <defs><pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.14" />
      </svg>
    );
  }
  if (pattern === "rings") {
    return (
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <defs><pattern id={id} width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="17" cy="17" r="13" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.14" />
      </svg>
    );
  }
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      <defs><pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V20" stroke="currentColor" strokeWidth="2" /></pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.14" />
    </svg>
  );
}

function DefaultCover({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-[3/4] w-full overflow-hidden rounded-[12px] border border-line bg-[#0e0e0e]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static local SVG in a static export */}
      <img src={publicPath("/images/default-cover.svg")} alt="Default book cover" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
    </div>
  );
}

function GeneratedCover({ book, spec, large, small, className }: { book: Book; spec: CoverSpec; large: boolean; small: boolean; className?: string }) {
  const Icon = spec.topic;
  const skin = SKIN_CLASSES[spec.skin];
  return (
    <div className={cn("relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-[12px] border p-3", skin.frame, className)} aria-hidden="true">
      <Pattern pattern={spec.pattern} />
      <div className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-[10px] border", skin.tile)}>
        <Icon className="size-4" />
      </div>
      <div className="relative min-h-0">
        <p className={cn("line-clamp-4 font-medium leading-[1.15] tracking-[-0.03em]", small ? "text-[11px]" : large ? "text-[24px]" : "text-[17px]")}>{book.title}</p>
        <p className={cn("mt-2 truncate font-mono text-[9px] uppercase tracking-[0.12em]", skin.meta)}>{book.language}</p>
      </div>
    </div>
  );
}

function CoverImage({ src, title, fallback, className, onFallback }: { src: string; title: string; fallback: ReactNode; className?: string; onFallback?: () => void }) {
  const [failed, setFailed] = useState(false);
  const fail = () => { setFailed(true); onFallback?.(); };
  if (failed) return <>{fallback}</>;
  return (
    <div className={cn("relative aspect-[3/4] w-full overflow-hidden rounded-[12px] border border-line bg-card", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party covers are not Next/Image candidates in a static export */}
      <img
        src={src}
        alt={`Cover of ${title}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full object-cover"
        onError={fail}
        onLoad={(event) => { if (event.currentTarget.naturalWidth <= 1) fail(); }}
      />
    </div>
  );
}

export interface BookCoverProps {
  book: Book;
  coverUrl?: string;
  large?: boolean;
  small?: boolean;
  className?: string;
  onFallback?: () => void;
}

export function BookCover({ book, coverUrl, large = false, small = false, className, onFallback }: BookCoverProps) {
  const fetchedUrl = useCoverUrl(book.id);
  const { effective, ready } = usePreferences();
  const canLoadExternal = ready && effective.loadCoverImages;
  const url = coverUrl !== undefined ? (canLoadExternal ? coverUrl : undefined) : (canLoadExternal ? fetchedUrl : undefined);
  const fallback = <DefaultCover className={className} />;

  if (!book.title?.trim()) return fallback;

  let spec: CoverSpec;
  try {
    spec = getCoverSpec(book);
  } catch {
    return fallback;
  }
  const generated = <GeneratedCover book={book} spec={spec} large={large} small={small} className={className} />;

  return (
    <CoverErrorBoundary fallback={fallback}>
      {url ? <CoverImage src={url} title={book.title} fallback={generated} className={className} onFallback={onFallback} /> : generated}
    </CoverErrorBoundary>
  );
}

export { DefaultCover };
