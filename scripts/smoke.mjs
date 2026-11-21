import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] ?? "http://127.0.0.1:4173";
const readable = JSON.parse(readFileSync(join(root, "public", "data", "readable.json"), "utf8"));
const books = JSON.parse(readFileSync(join(root, "public", "data", "books.json"), "utf8"));

const checks = [];
async function check(name, path, predicate) {
  const response = await fetch(`${base}${path}`);
  const body = await response.text();
  const ok = response.status === 200 && predicate(body);
  checks.push({ name, path, status: response.status, ok, bytes: body.length });
}

await check("homepage", "/", (body) => ["Read the best programming books", "Recently added", "Ready to read here", "synced"].every((needle) => body.includes(needle)));
await check("catalog", "/books", (body) => body.includes("The library") && body.includes("Search by title or author"));
await check("catalog filtered url", "/books?lang=English&sort=new", (body) => body.includes("The library"));
await check("reading list", "/reading-list", (body) => body.includes("Reading list"));
await check("learning paths", "/paths", (body) => body.includes("Learning paths") && body.includes("Learn Rust"));
await check("path detail", "/paths/learn-rust", (body) => body.includes("The Rust Programming Language"));
await check("new books", "/new", (body) => body.includes("New books"));
await check("changelog", "/changelog", (body) => body.includes("Changelog"));
await check("shared", "/shared", () => true);
await check("feed", "/feed.xml", (body) => body.includes("<feed") && body.includes("DevShelf"));
await check("settings", "/settings", (body) => body.includes("Appearance") && body.includes("Export JSON"));
await check("settings language switcher", "/settings", (body) => body.includes("Tiếng Việt") && body.includes("Offline reading"));
await check("book index", "/data/books.json", (body) => JSON.parse(body).length > 4000);
await check("categories index", "/data/categories.json", (body) => JSON.parse(body).length > 100);
await check("languages index", "/data/languages.json", (body) => JSON.parse(body).length > 20);
await check("metadata", "/data/metadata.json", (body) => JSON.parse(body).repository === "EbookFoundation/free-programming-books");
await check("sync history", "/data/sync-history.json", (body) => Array.isArray(JSON.parse(body)) && JSON.parse(body).length > 0);
await check("covers index", "/data/covers.json", (body) => {
  const covers = JSON.parse(body);
  return covers && typeof covers === "object" && Object.values(covers).every((url) => typeof url === "string" && url.startsWith("https://"));
});
await check("default cover", "/images/default-cover.svg", (body) => body.includes("<svg") && body.includes("#c8f542"));
await check("pdf worker", "/pdf/pdf.worker.min.mjs", (body) => body.length > 10000);
await check("link health index", "/data/link-health.json", (body) => {
  const health = JSON.parse(body);
  return health && typeof health === "object";
});

for (const entry of readable) {
  const book = books.find((item) => item.id === entry.bookId);
  await check(`detail: ${book.title}`, `/books/${book.id}`, (body) => body.includes(book.title));
  await check(`reader: ${book.title}`, `/read/${book.id}`, (body) => body.includes(book.title) && body.includes("reader-scope") && body.includes("Table of contents") && body.includes("Chapter navigation") && body.includes("Next"));
  await check(`content: ${book.title}`, entry.path, () => true);
}

const failures = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} ${item.path} (${item.status}, ${item.bytes} bytes)`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);
if (failures.length) process.exit(1);
