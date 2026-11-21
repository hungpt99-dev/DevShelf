"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Import } from "lucide-react";
import { fetchBooks } from "@/lib/client-data";
import { decodeShare, type SharePayload } from "@/lib/share";
import { rememberBook, setBookStatus } from "@/lib/db/operations";
import { shelfToJson, shelfToMarkdown } from "@/lib/export-shelf";
import type { Book } from "@/types/book";
import type { V2ListEntry } from "@/lib/reading-list-v2";
import type { ListStatus } from "@/lib/db/db";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export function SharedView() {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    let active = true;
    void decodeShare(window.location.hash).then((decoded) => {
      if (!active) return;
      if (!decoded) { setError("This share link is invalid or too large."); return; }
      setPayload(decoded);
      void fetchBooks().then((all) => {
        if (!active) return;
        setBooks(all.filter((book) => decoded.items.some((item) => item.id === book.id)));
      });
    });
    return () => { active = false; };
  }, []);

  if (error) return <div role="alert" className="rounded-[16px] border border-destructive/50 p-6 text-center text-[13px] text-destructive">{error}</div>;
  if (!payload) return <p className="py-16 text-center text-[13px] text-muted">Reading shared shelf...</p>;

  const entries: V2ListEntry[] = payload.items.map((item) => ({
    bookId: item.id,
    status: item.status ?? "saved",
    addedAt: new Date().toISOString(),
    shelfId: null, tags: [], notes: "", rating: 0, startedAt: null, finishedAt: null,
  }));
  const titles = Object.fromEntries(books.map((book) => [book.id, book.title]));

  const importAll = async () => {
    for (const entry of entries) {
      const book = books.find((item) => item.id === entry.bookId);
      if (!book) continue;
      await rememberBook(book);
      await setBookStatus(entry.status as ListStatus, book);
    }
    setImported(true);
  };

  return (
    <div>
      <Link href="/books" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-lime-text"><ArrowLeft className="size-4" aria-hidden /> Back to library</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Shared {payload.kind}</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight">{payload.title ?? "DevShelf shelf"}</h1>
          <p className="mt-2 text-[13px] text-muted">{payload.items.length} books · read-only preview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void importAll()} disabled={imported || books.length === 0} className="primary-action inline-flex h-9 items-center gap-1 rounded-[12px] bg-button-bg px-4 text-[12px] font-medium text-button-fg disabled:opacity-40"><Import className="size-4" aria-hidden /> {imported ? "Imported" : "Import to my list"}</button>
          <button type="button" onClick={() => download("shared-shelf.md", shelfToMarkdown(entries, titles, payload.title), "text/markdown")} className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Download className="size-4" aria-hidden /> Markdown</button>
          <button type="button" onClick={() => download("shared-shelf.json", shelfToJson(entries, payload.title), "application/json")} className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Download className="size-4" aria-hidden /> JSON</button>
        </div>
      </div>
      {imported && <p className="mt-4 text-[12px] text-lime-text" role="status">Added to your local reading list.</p>}
      <ul className="mt-8 space-y-2">
        {books.map((book) => (
          <li key={book.id}>
            <Link href={`/books/${book.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-line bg-card p-4 hover:border-lime">
              <span className="text-[13px] font-medium">{book.title}</span>
              <span className="font-mono text-[10px] text-muted">{payload.items.find((item) => item.id === book.id)?.status ?? "saved"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
