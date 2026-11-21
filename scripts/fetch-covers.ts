import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Book } from "../src/types/book";
import { titlesMatch } from "../src/lib/cover-text";
import { planCoverLookups, type CoverMissCache } from "./lib/cover-cache";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const CACHE_DIR = join(ROOT, "scripts", "cache");
const MISSES_FILE = join(CACHE_DIR, "cover-misses.json");
const COVERS_FILE = join(DATA, "covers.json");
const USER_AGENT = "DevShelf/1.0 (+https://github.com/hungpt99-dev/DevShelf)";
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

interface Options { catalog?: string; limit?: number; delay: number; force: boolean }

function parseArgs(argv: string[]): Options {
  const options: Options = { delay: 1000, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const [flag, inline] = argv[index].split("=", 2);
    if (flag === "--force") options.force = true;
    else if (flag === "--catalog" || flag === "--limit" || flag === "--delay") {
      const value = inline ?? argv[++index];
      if (!value) throw new Error(`Missing value for ${flag}`);
      if (flag === "--catalog") options.catalog = value;
      else if (flag === "--limit") {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0) throw new Error("--limit must be a non-negative integer");
        options.limit = parsed;
      } else {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0) throw new Error("--delay must be a non-negative integer");
        options.delay = parsed;
      }
    } else throw new Error(`Unknown flag ${flag}`);
  }
  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf8")) as T; } catch { return fallback; }
}

function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temp, path);
}

function sortedEntries(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
}

function detectCatalog(explicit?: string): string {
  const candidates = explicit
    ? [explicit]
    : ["books.json", "catalog.json", "books-index.json"].map((name) => join(DATA, name));
  const found = candidates.find((candidate) => existsSync(resolve(ROOT, candidate)));
  if (!found) throw new Error(`No catalog JSON found (tried ${candidates.join(", ")})`);
  return resolve(ROOT, found);
}

function loadBooks(path: string): Book[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const books = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { books?: unknown }).books)
      ? (parsed as { books: unknown[] }).books
      : null;
  if (!books) throw new Error("Catalog must be an array or an object with a books array");
  return books.filter((book): book is Book => Boolean(book && typeof book === "object" && typeof (book as Book).id === "string" && typeof (book as Book).title === "string"));
}

async function requestJson(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (response.status === 429) {
        const header = Number(response.headers.get("retry-after"));
        const wait = Number.isFinite(header) && header > 0 ? header * 1000 : 2000 * (attempt + 1);
        if (attempt === MAX_ATTEMPTS - 1) throw new Error("Open Library rate limited the request");
        await sleep(wait);
        continue;
      }
      if (!response.ok) throw new Error(`Open Library returned ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) throw error;
      await sleep(500 * (2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Open Library request failed");
}

function coverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`;
}

async function findCover(book: Book): Promise<number | null> {
  const params = new URLSearchParams({
    title: book.title,
    limit: "5",
    fields: "title,author_name,cover_i",
  });
  if (book.authors?.[0]) params.set("author", book.authors[0]);
  const payload = await requestJson(`https://openlibrary.org/search.json?${params.toString()}`) as {
    docs?: unknown[];
  };
  const results = Array.isArray(payload?.docs) ? payload.docs : [];
  for (const entry of results) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as { cover_i?: unknown; title?: unknown; author_name?: unknown };
    const id = Number(candidate.cover_i);
    if (!Number.isInteger(id) || id <= 0) continue;
    const title = typeof candidate.title === "string" ? candidate.title : "";
    const authors = Array.isArray(candidate.author_name)
      ? candidate.author_name.filter((name): name is string => typeof name === "string")
      : [];
    if (titlesMatch(book.title, title, book.authors ?? [], authors)) return id;
  }
  return null;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const catalogPath = detectCatalog(options.catalog);
  const books = loadBooks(catalogPath);
  const byId = new Map(books.map((book) => [book.id, book]));

  const covers = readJson<Record<string, string>>(COVERS_FILE, {});
  const misses = readJson<CoverMissCache>(MISSES_FILE, {});
  const initialCovers = JSON.stringify(covers);
  const initialMisses = JSON.stringify(misses);

  for (const id of Object.keys(covers)) {
    if (!/^https:\/\//.test(covers[id]) || !byId.has(id)) delete covers[id];
  }

  const pending = planCoverLookups({ books, covers, misses, force: options.force, limit: options.limit });
  let added = 0;
  let missed = 0;
  let processed = 0;
  const checkpoint = () => {
    writeJsonAtomic(COVERS_FILE, sortedEntries(covers));
    writeJsonAtomic(MISSES_FILE, Object.fromEntries(Object.entries(misses).sort(([a], [b]) => a.localeCompare(b))));
  };

  console.log(`Catalog: ${catalogPath} (${books.length} books); ${pending.length} lookups planned`);
  for (const id of pending) {
    const book = byId.get(id);
    if (!book) continue;
    try {
      const coverId = await findCover(book);
      if (coverId !== null) {
        covers[book.id] = coverUrl(coverId);
        delete misses[book.id];
        added += 1;
      } else {
        misses[book.id] = { checkedAt: new Date().toISOString() };
        missed += 1;
      }
    } catch (error) {
      console.error(`STOP: cover lookup failed for ${book.id} (${book.title}): ${error instanceof Error ? error.message : String(error)}`);
      console.error("No final output was written; the last checkpoint remains intact.");
      process.exit(1);
    }
    processed += 1;
    if (processed % 25 === 0) checkpoint();
    if (options.delay > 0 && processed < pending.length) await sleep(options.delay);
  }
  checkpoint();

  const changed = JSON.stringify(covers) !== initialCovers || JSON.stringify(misses) !== initialMisses;
  console.log(`Covers: +${added} found, ${missed} missed, ${pending.length - processed} skipped; ${Object.keys(covers).length} total`);
  console.log(`CHANGED=${changed ? "true" : "false"}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
