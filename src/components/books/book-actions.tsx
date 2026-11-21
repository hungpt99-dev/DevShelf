"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, ListPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getListEntry, removeFromList, setBookStatus } from "@/lib/db/operations";
import type { Book, ReadableRecord } from "@/types/book";

export function BookActions({ book, resource }: { book: Book; resource: ReadableRecord | null }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    getListEntry(book.id).then((value) => { if (active) setStatus(value); });
    return () => { active = false; };
  }, [book.id]);

  const apply = async (next: "saved" | "reading" | "completed" | "remove") => {
    setBusy(true);
    if (next === "remove") {
      await removeFromList(book.id);
      setStatus(null);
      setNote("Removed from your shelf.");
    } else {
      await setBookStatus(next, book);
      setStatus(next);
      setNote(next === "completed" ? "Marked as completed." : next === "reading" ? "Added as currently reading." : "Saved to your shelf.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {resource ? (
          <Button asChild className="primary-action rounded-[12px] bg-button-bg px-5 text-button-fg hover:border-lime">
            <Link href={`/read/${book.id}`}>Start reading</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-[12px] border-line-strong hover:border-lime">
            <a href={book.url} target="_blank" rel="noopener noreferrer">Open original source <ExternalLink className="size-4" aria-hidden /></a>
          </Button>
        )}
        <Button variant="outline" disabled={busy || status !== null} onClick={() => void apply("saved")} className="rounded-[12px] border-line-strong hover:border-lime">
          <ListPlus className="size-4" aria-hidden /> {status ? "On your shelf" : "Add to reading list"}
        </Button>
        <Button variant="outline" disabled={busy || status === "completed"} onClick={() => void apply("completed")} className="rounded-[12px] border-line-strong hover:border-lime">
          <Check className="size-4" aria-hidden /> {status === "completed" ? "Completed" : "Mark completed"}
        </Button>
        {status && (
          <Button variant="ghost" size="icon" disabled={busy} onClick={() => void apply("remove")} aria-label="Remove from reading list" className="rounded-[12px] hover:border hover:border-lime">
            <Trash2 className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      <p className="text-[12px] text-muted" role="status">
        {note || (resource
          ? "Bundled from a link in the catalog. Attribution and license are shown in the reader."
          : "Hosted externally. DevShelf opens the original source and never proxies or scrapes it.")}
      </p>
    </div>
  );
}
