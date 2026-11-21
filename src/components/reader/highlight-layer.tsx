"use client";

import { useEffect, useState } from "react";
import { addHighlight, getHighlights, removeHighlight, updateHighlight } from "@/lib/db/operations";
import { findAnchor, makeAnchor, type HighlightAnchor } from "@/lib/highlight";
import { highlightsToMarkdown } from "@/lib/highlight";

const COLORS: HighlightAnchor["color"][] = ["lime", "blue", "amber", "rose"];
const COLOR_CLASS: Record<HighlightAnchor["color"], string> = {
  lime: "bg-[#c8f542]/30", blue: "bg-[#9ec9e8]/30", amber: "bg-[#d8b47a]/30", rose: "bg-[#e6a4a4]/30",
};

export function HighlightLayer({ bookId, open, onToggle }: { bookId: string; open: boolean; onToggle: () => void }) {
  const [highlights, setHighlights] = useState<HighlightAnchor[]>([]);
  const [selection, setSelection] = useState<{ quote: string; chapterId: string; start: number; end: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    void getHighlights(bookId).then((items) => { if (active) setHighlights(items as HighlightAnchor[]); });
    return () => { active = false; };
  }, [bookId]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-reader");
    if (!root) return;
    const apply = () => {
      for (const mark of root.querySelectorAll("mark[data-highlight]")) mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
      for (const item of highlights) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent ?? "";
          const found = findAnchor(text, item);
          if (!found) continue;
          const range = document.createRange();
          range.setStart(node, found.start);
          range.setEnd(node, found.end);
          const mark = document.createElement("mark");
          mark.dataset.highlight = item.id;
          mark.className = COLOR_CLASS[item.color];
          try { range.surroundContents(mark); } catch { /* skip spanning ranges */ }
          break;
        }
      }
    };
    apply();
  }, [highlights]);

  useEffect(() => {
    const onMouseUp = () => {
      const selected = window.getSelection();
      const text = selected?.toString().trim();
      if (!selected || !text || !selected.rangeCount) { setSelection(null); return; }
      const range = selected.getRangeAt(0);
      const container = range.commonAncestorContainer.parentElement;
      const chapter = container?.closest("h1[id],h2[id],h3[id],h4[id]")?.id
        ?? (container?.closest("section[id]")?.id) ?? "content";
      const rect = range.getBoundingClientRect();
      setSelection({ quote: text, chapterId: chapter, start: 0, end: text.length, x: rect.left, y: rect.bottom });
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  const save = async (color: HighlightAnchor["color"]) => {
    if (!selection) return;
    const root = document.querySelector<HTMLElement>(".prose-reader");
    const walker = root ? document.createTreeWalker(root, NodeFilter.SHOW_TEXT) : null;
    let anchor: HighlightAnchor | null = null;
    let node: Node | null;
    while (walker && (node = walker.nextNode())) {
      const text = node.textContent ?? "";
      const index = text.indexOf(selection.quote);
      if (index < 0) continue;
      anchor = makeAnchor(text, index, index + selection.quote.length, selection.chapterId, color, "", bookId);
      break;
    }
    if (!anchor) {
      anchor = makeAnchor(selection.quote, 0, selection.quote.length, selection.chapterId, color, "", bookId);
    }
    await addHighlight(anchor);
    setHighlights((current) => [...current, anchor!]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const exportMarkdown = () => {
    const url = URL.createObjectURL(new Blob([highlightsToMarkdown(highlights, { [bookId]: bookId })], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "devshelf-highlights.md"; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      {selection && (
        <div className="fixed z-50 flex gap-1 rounded-[12px] border border-line bg-card p-2" style={{ left: Math.max(8, selection.x), top: selection.y + 8 }}>
          {COLORS.map((color) => (
            <button key={color} type="button" onClick={() => void save(color)} className={`size-7 rounded-[8px] border border-line ${COLOR_CLASS[color]}`} aria-label={`Highlight in ${color}`} />
          ))}
        </div>
      )}
      <button type="button" onClick={onToggle} className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-line px-2 text-[12px] hover:border-lime" aria-label="Highlights and notes" aria-expanded={open}>
        Notes ({highlights.length})
      </button>
      {open && (
        <div className="fixed bottom-12 right-0 top-28 z-30 w-[320px] overflow-y-auto border-l border-line bg-background p-4" aria-label="Highlights panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-medium">Highlights</h2>
            <button type="button" onClick={exportMarkdown} className="text-[11px] link-lime">Export</button>
          </div>
          {highlights.length === 0 && <p className="mt-4 text-[12px] text-muted">Select text to make a highlight.</p>}
          <ul className="mt-4 space-y-3">
            {highlights.map((item) => (
              <li key={item.id} className="rounded-[12px] border border-line p-3">
                <p className="text-[12px] leading-relaxed">“{item.quote}”</p>
                <p className="mt-1 font-mono text-[10px] text-muted">{item.chapterId}</p>
                <textarea
                  defaultValue={item.note}
                  onBlur={(event) => void updateHighlight(item.id, { note: event.target.value })}
                  placeholder="Private note"
                  aria-label="Private note"
                  className="mt-2 w-full rounded-[8px] border border-line bg-background p-2 text-[11px]"
                  rows={2}
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => document.getElementById(item.chapterId)?.scrollIntoView({ behavior: "smooth" })} className="text-[11px] link-lime">Jump</button>
                  <button type="button" onClick={() => { void removeHighlight(item.id); setHighlights((current) => current.filter((h) => h.id !== item.id)); }} className="text-[11px] text-muted">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
