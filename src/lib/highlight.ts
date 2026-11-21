export interface HighlightAnchor {
  id: string;
  bookId: string;
  chapterId: string;
  quote: string;
  prefix: string | null;
  suffix: string | null;
  startOffset: number;
  endOffset: number;
  color: "lime" | "blue" | "amber" | "rose";
  note: string;
  createdAt: string;
}

export function makeAnchor(
  text: string,
  start: number,
  end: number,
  chapterId: string,
  color: HighlightAnchor["color"],
  note = "",
  bookId = "",
): HighlightAnchor {
  return {
    id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    bookId,
    chapterId,
    quote: text.slice(start, end),
    prefix: start > 0 ? text.slice(text.lastIndexOf(" ", Math.max(0, start - 2)) + 1, start) : null,
    suffix: end < text.length ? text.slice(end, text.indexOf(" ", end + 1) < 0 ? text.length : text.indexOf(" ", end + 1)) : null,
    startOffset: start,
    endOffset: end,
    color,
    note,
    createdAt: new Date().toISOString(),
  };
}

export function findAnchor(text: string, anchor: HighlightAnchor): { start: number; end: number } | null {
  if (!anchor.quote) return null;
  const context = `${anchor.prefix ?? ""}${anchor.quote}${anchor.suffix ?? ""}`;
  const exact = text.indexOf(context);
  if (exact >= 0) {
    const start = exact + (anchor.prefix?.length ?? 0);
    return { start, end: start + anchor.quote.length };
  }
  const quoteIndex = text.indexOf(anchor.quote);
  if (quoteIndex >= 0) return { start: quoteIndex, end: quoteIndex + anchor.quote.length };
  return null;
}

export function highlightsToMarkdown(highlights: HighlightAnchor[], titles: Record<string, string>): string {
  const lines: string[] = ["# Highlights", ""];
  const byBook = new Map<string, HighlightAnchor[]>();
  for (const item of highlights) byBook.set(item.bookId, [...(byBook.get(item.bookId) ?? []), item]);
  for (const [bookId, items] of byBook) {
    lines.push(`## ${titles[bookId] ?? bookId}`, "");
    for (const item of items) {
      lines.push(`> ${item.quote}`);
      if (item.note) lines.push("", item.note);
      lines.push("", `— ${item.chapterId}, ${item.color}`, "");
    }
  }
  return `${lines.join("\n")}\n`;
}
