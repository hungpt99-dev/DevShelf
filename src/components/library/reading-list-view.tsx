"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Clock, Download, Link2, Trash2 } from "lucide-react";
import { BookCover } from "@/components/book/BookCover";
import { useI18n } from "@/lib/i18n";
import { filterAndSortEntries, type ListFilters, type V2ListEntry } from "@/lib/reading-list-v2";
import { shelfToJson, shelfToMarkdown } from "@/lib/export-shelf";
import { publicPath } from "@/lib/utils";
import { encodeShare } from "@/lib/share";
import {
  createShelf, deleteShelf, getLocalBooks, getShelves, getV2Entries, removeFromList, updateListEntry,
} from "@/lib/db/operations";
import type { ListStatus } from "@/lib/db/db";

const STATUSES: ListStatus[] = ["reading", "saved", "completed"];
const COLORS = ["#c8f542", "#f4f4f0", "#9ec9e8", "#d8b47a"];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function EntryCard({
  entry, title, shelfName, onUpdate, onRemove, canRead, statusLabel,
}: {
  entry: V2ListEntry;
  title: string;
  shelfName: string;
  onUpdate: (patch: Partial<V2ListEntry>) => void;
  onRemove: () => void;
  canRead: boolean;
  statusLabel: string;
}) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  return (
    <article className="rounded-[16px] border border-line bg-card p-3 hover:border-lime">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/books/${entry.bookId}`} className="w-14 shrink-0"><BookCover book={{ id: entry.bookId, title, categories: [], language: "", authors: [] } as never} small /></Link>
        <div className="min-w-[160px] flex-1">
          <Link href={`/books/${entry.bookId}`} className="text-[13px] font-medium hover:text-lime-text">{title}</Link>
          <p className="mt-0.5 font-mono text-[10px] text-muted">{statusLabel}{shelfName ? ` · ${shelfName}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entry.rating > 0 && <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">{entry.rating}/5</span>}
          <select value={entry.status} onChange={(event) => onUpdate({ status: event.target.value as ListStatus })} className="rounded-[10px] border border-line bg-background px-2 py-1 text-[11px]" aria-label={`Status for ${title}`}>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {canRead && (
            <Link href={`/read/${entry.bookId}`} className="primary-action inline-flex h-8 items-center gap-1 rounded-[12px] bg-button-bg px-3 text-[12px] font-medium text-button-fg">
              {t("reading.continue")} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
          <button type="button" onClick={() => setShowDetails((value) => !value)} className="rounded-[10px] border border-line px-2 py-1 text-[11px] hover:border-lime" aria-expanded={showDetails}>
            {showDetails ? "Hide" : "Details"}
          </button>
          <button type="button" onClick={onRemove} className="flex size-8 items-center justify-center rounded-[12px] border border-line hover:border-lime" aria-label={`${t("reading.remove")}: ${title}`}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      {showDetails && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Tags
            <input defaultValue={entry.tags.join(", ")} onBlur={(event) => onUpdate({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className="rounded-[10px] border border-line bg-background px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Private note
            <textarea defaultValue={entry.notes} onBlur={(event) => onUpdate({ notes: event.target.value })} rows={2} className="rounded-[10px] border border-line bg-background px-2 py-1" />
          </label>
          <div className="flex gap-1 text-[11px] text-muted" role="group" aria-label={`Rating for ${title}`}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button key={rating} type="button" onClick={() => onUpdate({ rating })} aria-label={`Rate ${rating} stars`} className={`flex size-8 items-center justify-center rounded-[10px] border ${rating <= entry.rating ? "border-lime bg-lime text-on-lime" : "border-line hover:border-lime"}`}>{rating}</button>
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted">
            {entry.startedAt ? `started ${entry.startedAt.slice(0, 10)}` : "not started"}
            {entry.finishedAt ? ` · finished ${entry.finishedAt.slice(0, 10)}` : ""}
          </p>
        </div>
      )}
    </article>
  );
}

export function ReadingListView() {
  const { t } = useI18n();
  const entries = useLiveQuery(() => getV2Entries(), []);
  const shelves = useLiveQuery(() => getShelves(), []);
  const localBooks = useLiveQuery(() => getLocalBooks(), []);
  const [filters, setFilters] = useState<ListFilters>({ sort: "added" });
  const [newShelf, setNewShelf] = useState("");
  const [shareLink, setShareLink] = useState("");

  const titles = useMemo(() => Object.fromEntries((localBooks ?? []).map((book) => [book.id, book.title])), [localBooks]);
  const canRead = useMemo(() => new Set((localBooks ?? []).filter((book) => book.metadata.reading.available).map((book) => book.id)), [localBooks]);
  const list = filterAndSortEntries(entries ?? [], { shelves: shelves ?? [], titles }, filters);
  const tags = useMemo(() => [...new Set((entries ?? []).flatMap((entry) => entry.tags))].sort(), [entries]);
  const shelfName = (id: string | null | undefined) => (shelves ?? []).find((shelf) => shelf.id === id)?.name ?? "";

  const share = async () => {
    const encoded = await encodeShare({
      v: 1, kind: "shelf", items: list.map((entry) => ({ id: entry.bookId, status: entry.status })),
    });
    const url = `${window.location.origin}${publicPath("/shared")}#s=${encoded}`;
    setShareLink(url);
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-line bg-card p-3">
        <select value={filters.status ?? ""} onChange={(event) => setFilters({ ...filters, status: (event.target.value || undefined) as ListStatus | undefined })} aria-label="Filter by status" className="rounded-[10px] border border-line bg-background px-2 py-1 text-[12px]">
          <option value="">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={filters.shelfId ?? ""} onChange={(event) => setFilters({ ...filters, shelfId: event.target.value || undefined })} aria-label="Filter by shelf" className="rounded-[10px] border border-line bg-background px-2 py-1 text-[12px]">
          <option value="">All shelves</option>{(shelves ?? []).map((shelf) => <option key={shelf.id} value={shelf.id}>{shelf.name}</option>)}
        </select>
        <select value={filters.tag ?? ""} onChange={(event) => setFilters({ ...filters, tag: event.target.value || undefined })} aria-label="Filter by tag" className="rounded-[10px] border border-line bg-background px-2 py-1 text-[12px]">
          <option value="">All tags</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <select value={filters.sort ?? "added"} onChange={(event) => setFilters({ ...filters, sort: event.target.value as ListFilters["sort"] })} aria-label="Sort list" className="rounded-[10px] border border-line bg-background px-2 py-1 text-[12px]">
          <option value="added">Recently added</option><option value="title">Title</option><option value="status">Status</option><option value="rating">Rating</option>
        </select>
        <button type="button" onClick={() => void share()} disabled={list.length === 0} className="inline-flex h-8 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime disabled:opacity-40">
          <Link2 className="size-3.5" aria-hidden /> Share
        </button>
        <button type="button" onClick={() => download("devshelf-shelf.md", shelfToMarkdown(list, titles), "text/markdown")} className="inline-flex h-8 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Download className="size-3.5" aria-hidden /> Markdown</button>
        <button type="button" onClick={() => download("devshelf-shelf.json", shelfToJson(list), "application/json")} className="inline-flex h-8 items-center gap-1 rounded-[12px] border border-line px-3 text-[12px] hover:border-lime"><Download className="size-3.5" aria-hidden /> JSON</button>
      </div>
      {shareLink && <p className="break-all rounded-[12px] border border-line p-2 font-mono text-[10px] text-muted" role="status">{shareLink}</p>}
      <div className="flex flex-wrap gap-2">
        <input value={newShelf} onChange={(event) => setNewShelf(event.target.value)} placeholder="New shelf name" aria-label="New shelf name" className="rounded-[10px] border border-line bg-background px-2 py-1 text-[12px]" />
        {COLORS.map((color) => (
          <button key={color} type="button" aria-label={`Create shelf with color ${color}`} onClick={() => { if (newShelf.trim()) { void createShelf(newShelf, color); setNewShelf(""); } }} className="size-7 rounded-[10px] border border-line" style={{ background: color }} />
        ))}
        {(shelves ?? []).map((shelf) => (
          <button key={shelf.id} type="button" onClick={() => void deleteShelf(shelf.id)} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[11px] hover:border-lime" aria-label={`Delete shelf ${shelf.name}`}>
            <span className="size-2 rounded-full" style={{ background: shelf.color }} aria-hidden /> {shelf.name} <Trash2 className="size-3" aria-hidden />
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line py-16 text-center">
          <p className="text-sm font-medium">{t("reading.emptyTitle")}</p>
          <p className="mt-1 text-[13px] text-muted">{t("reading.emptyText")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((entry) => (
            <EntryCard
              key={entry.bookId}
              entry={entry}
              title={titles[entry.bookId] ?? entry.bookId}
              shelfName={shelfName(entry.shelfId)}
              canRead={canRead.has(entry.bookId)}
              statusLabel={t(entry.status === "reading" ? "reading.reading" : entry.status === "saved" ? "reading.saved" : "reading.completed")}
              onUpdate={(patch) => void updateListEntry(entry.bookId, patch)}
              onRemove={() => void removeFromList(entry.bookId)}
            />
          ))}
        </div>
      )}
      {(entries ?? []).length === 0 && <p className="flex items-center gap-2 text-[11px] text-muted"><Clock className="size-3.5" aria-hidden /> {t("reading.localNote")}</p>}
    </div>
  );
}
