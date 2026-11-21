import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const SITE = "https://hungpt99-dev.github.io/DevShelf";

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), "utf8")) as T;
}

const books = readJson<{ id: string; title: string }[]>("books.json");
const metadata = readJson<{ syncedAt: string; repository: string }>("metadata.json");
const history = readJson<{ syncedAt: string; added: string[]; initial?: boolean }[]>("sync-history.json");
const latest = history.at(-1);
const ids = latest?.added ?? [];
const byId = new Map(books.map((book) => [book.id, book]));

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char] ?? char));
}

const entries = ids.slice(0, 50).map((id) => {
  const book = byId.get(id);
  if (!book) return "";
  return `  <entry>\n    <title>${escapeXml(book.title)}</title>\n    <id>${SITE}/books/${id}</id>\n    <link href="${SITE}/books/${id}"/>\n    <updated>${escapeXml(metadata.syncedAt)}</updated>\n    <summary>A newly added resource in the free-programming-books catalog.</summary>\n  </entry>`;
}).filter(Boolean).join("\n");

const xml = `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>DevShelf — new books</title>\n  <id>${SITE}/new</id>\n  <link href="${SITE}/new"/>\n  <updated>${escapeXml(metadata.syncedAt)}</updated>\n  <source><title>${escapeXml(metadata.repository)}</title></source>\n${entries}\n</feed>\n`;
writeFileSync(join(ROOT, "public", "feed.xml"), xml, "utf8");
console.log(`Generated feed.xml with ${ids.length} recent book ids`);
