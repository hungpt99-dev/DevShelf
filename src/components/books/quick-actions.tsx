"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { getListEntry, setBookStatus } from "@/lib/db/operations";
import type { Book } from "@/types/book";

export function QuickActions({ book, compact = false }: { book: Book; compact?: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getListEntry(book.id).then((value) => { if (active) setStatus(value); });
    return () => { active = false; };
  }, [book.id]);

  const apply = async (next: "reading" | "completed") => {
    await setBookStatus(next, book);
    setStatus(next);
  };

  const className = compact
    ? "flex size-7 items-center justify-center rounded-[10px] border border-line hover:border-lime"
    : "inline-flex h-8 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => void apply("reading")}
        className={className}
        aria-label={`Mark ${book.title} as reading`}
        title="Mark as reading"
      >
        <BookOpen className="size-3.5" aria-hidden /> {!compact && "Mark as reading"}
      </button>
      <button
        type="button"
        onClick={() => void apply("completed")}
        className={className}
        aria-label={`Mark ${book.title} as done`}
        title="Mark as done"
      >
        <Check className="size-3.5" aria-hidden /> {!compact && "Mark as done"}
      </button>
      {status && <span className="sr-only">Status: {status}</span>}
    </div>
  );
}
