"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, Link2 } from "lucide-react";
import { BookCover } from "@/components/book/BookCover";
import { getV2Entries } from "@/lib/db/operations";
import { pathProgress, type LearningPath } from "@/lib/paths";
import { encodeShare } from "@/lib/share";
import { shelfToJson, shelfToMarkdown } from "@/lib/export-shelf";
import { publicPath } from "@/lib/utils";
import type { Book } from "@/types/book";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export function PathDetail({ path, books }: { path: LearningPath; books: Book[] }) {
  const entries = useLiveQuery(() => getV2Entries(), []);
  const [shareLink, setShareLink] = useState("");
  const byId = new Map(books.map((book) => [book.id, book]));
  const statuses = Object.fromEntries((entries ?? []).map((entry) => [entry.bookId, entry.status]));
  const progress = pathProgress(path.books, statuses);
  const titles = Object.fromEntries(books.map((book) => [book.id, book.title]));

  const share = async () => {
    const encoded = await encodeShare({ v: 1, kind: "path", title: path.title, items: path.books.map((book) => ({ id: book.id, status: statuses[book.id] })) });
    const url = `${window.location.origin}${publicPath("/shared")}#s=${encoded}`;
    setShareLink(url);
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  return (
    <div>
      <Link href="/paths" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-lime-text"><ArrowLeft className="size-4" aria-hidden /> All paths</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{path.level}{path.estimatedHours ? ` · ${path.estimatedHours} hours` : ""}</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">{path.title}</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{path.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void share()} className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Link2 className="size-4" aria-hidden /> Share</button>
          <button type="button" onClick={() => download(`${path.id}.md`, shelfToMarkdown((entries ?? []).filter((entry) => path.books.some((book) => book.id === entry.bookId)), titles, path.title), "text/markdown")} className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Download className="size-4" aria-hidden /> Markdown</button>
          <button type="button" onClick={() => download(`${path.id}.json`, shelfToJson((entries ?? []).filter((entry) => path.books.some((book) => book.id === entry.bookId)), path.title), "application/json")} className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Download className="size-4" aria-hidden /> JSON</button>
        </div>
      </div>
      {shareLink && <p className="mt-3 break-all rounded-[12px] border border-line p-2 font-mono text-[10px] text-muted" role="status">{shareLink}</p>}
      <div className="mt-6 max-w-md">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-lime" style={{ width: `${progress.percentage}%` }} role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Path progress" />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-muted">{progress.completed}/{progress.total} complete · {progress.reading} reading</p>
      </div>
      <ol className="mt-10 space-y-3">
        {path.books.map((item, index) => {
          const book = byId.get(item.id);
          if (!book) return null;
          const status = statuses[item.id];
          return (
            <li key={item.id} className="flex flex-wrap items-start gap-4 rounded-[16px] border border-line bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[12px]">{index + 1}</span>
              <Link href={`/books/${book.id}`} className="w-14 shrink-0"><BookCover book={book} small /></Link>
              <div className="min-w-[200px] flex-1">
                <Link href={`/books/${book.id}`} className="text-[14px] font-medium hover:text-lime-text">{book.title}</Link>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.why}</p>
              </div>
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">{status ?? "not started"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
