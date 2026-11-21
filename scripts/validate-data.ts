import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { validatePath } from "../src/lib/paths";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");

const BookSchema = z.object({
  id: z.string().regex(/^b-[0-9a-f]{12}$/),
  title: z.string().min(1),
  authors: z.array(z.string()),
  description: z.null(),
  language: z.string().min(1),
  languageCode: z.string().min(1),
  categories: z.array(z.string()).min(1),
  url: z.url().refine((url) => /^https?:$/.test(new URL(url).protocol), "must be http(s)"),
  alternateUrls: z.array(z.object({ label: z.string(), url: z.string() })),
  format: z.enum(["pdf", "html", "epub", "web", "unknown"]),
  formatEvidence: z.string().nullable(),
  source: z.object({
    repository: z.literal("EbookFoundation/free-programming-books"),
    file: z.string().startsWith("books/"),
    heading: z.string().nullable(),
    line: z.number().int().positive(),
  }),
  license: z.string().nullable(),
  lastSyncedAt: z.iso.datetime(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  reading: z.object({ available: z.boolean(), type: z.enum(["markdown", "html", "pdf", "external"]).nullable() }),
  editions: z.array(z.object({
    id: z.string(), title: z.string(), authors: z.array(z.string()), language: z.string(),
    format: z.string(), readable: z.boolean(), url: z.string().optional(),
  })).optional(),
});

const MetadataSchema = z.object({
  repository: z.literal("EbookFoundation/free-programming-books"),
  sourceUrl: z.url(),
  ref: z.string(),
  commit: z.string().nullable(),
  syncedAt: z.iso.datetime(),
  license: z.object({ name: z.string(), url: z.url() }),
  counts: z.object({
    books: z.number(), categories: z.number(), languages: z.number(), readable: z.number(),
    sourceFiles: z.number(), duplicatesRemoved: z.number(), invalidUrlsSkipped: z.number(), newSinceLastSync: z.number(),
  }),
  notes: z.array(z.string()),
});

const HistorySchema = z.object({
  syncedAt: z.iso.datetime(),
  commit: z.string().nullable(),
  added: z.array(z.string()),
  updated: z.array(z.string()),
  removed: z.array(z.string()),
  counts: z.object({ books: z.number(), added: z.number(), updated: z.number(), removed: z.number() }),
  initial: z.boolean().optional(),
});

const ReadableSchema = z.object({
  bookId: z.string(), type: z.enum(["markdown", "html", "pdf"]), path: z.string().startsWith("/content/"),
  sourceUrl: z.url(), originalUrl: z.url(), license: z.string().nullable(), attribution: z.string().min(1),
  assetBase: z.string().nullable(), downloadedAt: z.iso.datetime(),
});

function readJson(name: string, fallback: unknown = {}): unknown {
  try { return JSON.parse(readFileSync(join(DATA, name), "utf8")); } catch { return fallback; }
}

function main(): void {
  const errors: string[] = [];
  const books = z.array(BookSchema).safeParse(readJson("books.json"));
  const metadata = MetadataSchema.safeParse(readJson("metadata.json"));
  const readable = z.array(ReadableSchema).safeParse(readJson("readable.json"));
  const categories = z.array(z.object({ name: z.string(), slug: z.string(), count: z.number() })).safeParse(readJson("categories.json"));
  const languages = z.array(z.object({ code: z.string(), name: z.string(), count: z.number() })).safeParse(readJson("languages.json"));
  const history = z.array(HistorySchema).safeParse(readJson("sync-history.json"));
  const covers = z.record(z.string(), z.url()).safeParse(readJson("covers.json"));
  const coverMetadata = z.record(z.string(), z.object({
    description: z.string().optional(), firstPublishYear: z.number().int().positive().optional(),
    isbn: z.string().optional(), pageCount: z.number().int().positive().optional(),
    sources: z.record(z.string(), z.string().url()),
  })).safeParse(readJson("cover-metadata.json", {}));
  const linkHealth = z.record(z.string(), z.object({
    status: z.enum(["ok", "redirected", "broken", "unknown"]),
    httpStatus: z.number().nullable(), checkedAt: z.iso.datetime(), consecutiveFailures: z.number(),
  })).safeParse(readJson("link-health.json"));
  const pathDir = join(ROOT, "data", "paths");
  const pathFiles = existsSync(pathDir)
    ? readdirSync(pathDir).filter((name) => name.endsWith(".json") && name !== "schema.json").sort()
    : [];
  const PathSchema = z.object({
    id: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1), description: z.string().min(1),
    level: z.enum(["beginner", "intermediate", "advanced"]), estimatedHours: z.number().positive().optional(),
    books: z.array(z.object({ id: z.string(), why: z.string().min(1) })).min(1),
  });
  const paths = pathFiles.map((file) => ({ file, parsed: PathSchema.safeParse(JSON.parse(readFileSync(join(pathDir, file), "utf8"))) }));

  for (const [name, result] of Object.entries({ books, metadata, readable, categories, languages, history, covers, coverMetadata, linkHealth })) {
    if (!result.success) errors.push(`${name}: ${result.error.issues.slice(0, 3).map((issue) => issue.message).join("; ")}`);
  }
  if (errors.length) {
    console.error("FAIL\n" + errors.join("\n"));
    process.exit(1);
  }
  if (!books.success || !metadata.success || !readable.success || !categories.success || !languages.success || !history.success || !covers.success || !coverMetadata.success || !linkHealth.success) {
    process.exit(1); // Narrowing for TypeScript after schema errors.
  }

  const bookList = books.data;
  const readableList = readable.data;
  const ids = new Set<string>();
  for (const book of bookList) {
    if (ids.has(book.id)) errors.push(`duplicate book id ${book.id}`);
    ids.add(book.id);
    if (book.description !== null) errors.push(`${book.id}: description must be null`);
    if (book.license && !/^(CC|GFDL|GNU|MIT|Public Domain)/i.test(book.license)) errors.push(`${book.id}: suspicious license "${book.license}"`);
  }
  if (coverMetadata.success) for (const id of Object.keys(coverMetadata.data)) {
    if (!ids.has(id)) errors.push(`cover metadata id ${id} is not in the catalog`);
  }
  for (const [id, url] of Object.entries(covers.data)) {
    if (!ids.has(id)) errors.push(`cover entry references unknown book ${id}`);
    if (!url.startsWith("https://")) errors.push(`cover URL for ${id} is not https`);
    else if (new URL(url).hostname !== "covers.openlibrary.org") errors.push(`cover URL for ${id} is not from Open Library`);
  }

  const meta = metadata.data;
  if (meta.counts.books !== bookList.length) errors.push(`metadata book count ${meta.counts.books} != ${bookList.length}`);
  if (meta.counts.categories !== categories.data.length) errors.push("metadata category count mismatch");
  if (meta.counts.languages !== languages.data.length) errors.push("metadata language count mismatch");
  if (meta.counts.readable !== readableList.length) errors.push("metadata readable count mismatch");
  for (const entry of readableList) {
    if (!ids.has(entry.bookId)) errors.push(`readable entry references unknown book ${entry.bookId}`);
    const file = join(ROOT, "public", entry.path.replace(/^\//, ""));
    if (!existsSync(file)) errors.push(`readable content missing: ${entry.path}`);
    else if (entry.type === "markdown" && /^\s*(?:<!doctype|<html)/i.test(readFileSync(file, "utf8").slice(0, 500))) {
      errors.push(`${entry.path}: Markdown content is actually an HTML page`);
    }
    const book = bookList.find((item) => item.id === entry.bookId);
    if (book && !book.reading.available) errors.push(`book ${book.id} readable record but reading.available=false`);
  }
  for (const book of bookList.filter((item) => item.reading.available)) {
    if (!readableList.some((entry) => entry.bookId === book.id)) errors.push(`book ${book.id} claims readable but no content record`);
  }
  const latest = history.data.at(-1);
  if (!latest) errors.push("sync history is empty");
  else {
    if (latest.syncedAt !== meta.syncedAt) errors.push("latest sync history timestamp does not match metadata");
    if (latest.commit !== meta.commit) errors.push("latest sync history commit does not match metadata");
    if (latest.counts.added !== meta.counts.newSinceLastSync) errors.push("history added count does not match metadata newSinceLastSync");
    for (const id of latest.added) if (!ids.has(id)) errors.push(`history added book ${id} is missing from books.json`);
  }

  for (const { file, parsed } of paths) {
    if (!parsed.success) {
      errors.push(`paths/${file}: ${parsed.error.issues.slice(0, 2).map((issue) => issue.message).join("; ")}`);
      continue;
    }
    for (const message of validatePath(parsed.data, [...ids])) errors.push(`paths/${file}: ${message}`);
  }

  const categoryTotal = categories.data.reduce((sum, item) => sum + item.count, 0);
  if (categoryTotal < bookList.length) errors.push("category counts do not cover every book");

  if (errors.length) {
    console.error(`FAIL (${errors.length})\n` + errors.slice(0, 20).join("\n"));
    process.exit(1);
  }
  console.log(`PASS — ${bookList.length} books, ${categories.data.length} categories, ${languages.data.length} languages, ${readableList.length} readable books, ${history.data.length} sync-history entries, ${Object.keys(covers.data).length} cover images, ${pathFiles.length} learning paths`);
}
main();
