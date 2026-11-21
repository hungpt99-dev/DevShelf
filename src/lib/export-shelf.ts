import type { V2ListEntry } from "./reading-list-v2";

export function shelfToMarkdown(entries: V2ListEntry[], titles: Record<string, string>, title = "DevShelf shelf"): string {
  const lines = [`# ${title}`, ""];
  for (const entry of entries) {
    lines.push(`- ${titles[entry.bookId] ?? entry.bookId} — ${entry.status}`);
    if (entry.tags.length) lines.push(`  - Tags: ${entry.tags.join(", ")}`);
    if (entry.rating > 0) lines.push(`  - Rating: ${entry.rating}/5`);
    if (entry.notes.trim()) lines.push(`  - Note: ${entry.notes.replace(/\n/g, " ")}`);
  }
  return `${lines.join("\n")}\n`;
}

export function shelfToJson(entries: V2ListEntry[], title = "DevShelf shelf"): string {
  return JSON.stringify({ title, version: 1, entries }, null, 2);
}
