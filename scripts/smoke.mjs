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

await check("homepage", "/", (body) => ["Your library for learning to code.", "Featured categories", "Last synchronized", "Source repository"].every((needle) => body.includes(needle)));
await check("catalog", "/books", (body) => body.includes("Explore the library") && body.includes("All languages"));
await check("reading list", "/reading-list", (body) => body.includes("Reading list"));
await check("settings", "/settings", (body) => body.includes("Appearance") && body.includes("Export JSON"));
await check("book index", "/data/books.json", (body) => JSON.parse(body).length > 4000);
await check("categories index", "/data/categories.json", (body) => JSON.parse(body).length > 100);
await check("languages index", "/data/languages.json", (body) => JSON.parse(body).length > 20);
await check("metadata", "/data/metadata.json", (body) => JSON.parse(body).repository === "EbookFoundation/free-programming-books");
await check("sync history", "/data/sync-history.json", (body) => Array.isArray(JSON.parse(body)) && JSON.parse(body).length > 0);
await check("pdf worker", "/pdf/pdf.worker.min.mjs", (body) => body.length > 10000);

for (const entry of readable) {
  const book = books.find((item) => item.id === entry.bookId);
  await check(`detail: ${book.title}`, `/books/${book.id}`, (body) => body.includes(book.title));
  await check(`reader: ${book.title}`, `/read/${book.id}`, (body) => body.includes(book.title) && body.includes("reader-scope"));
  await check(`content: ${book.title}`, entry.path, () => true);
}

const failures = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} ${item.path} (${item.status}, ${item.bytes} bytes)`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);
if (failures.length) process.exit(1);
