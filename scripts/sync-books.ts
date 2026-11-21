import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Book, LibraryMetadata, ReadableRecord } from "../src/types/book";
import { bookIdFor, deduplicate, normalizeUrl, parseMarkdown } from "./lib/parse-books";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache");
const REPOSITORY = "EbookFoundation/free-programming-books";
const REPO_URL = `https://github.com/${REPOSITORY}`;
const TARBALL = `${REPO_URL}/archive/refs/heads/main.tar.gz`;
const DATA_DIR = join(ROOT, "public", "data");
const CONTENT_DIR = join(ROOT, "public", "content");
const REPORT_DIR = join(ROOT, "scripts", "reports");

interface ReadingSource {
  matchUrl: string;
  downloadUrl?: string;
  format: "markdown" | "html" | "pdf";
  file: string;
  assetBase: string | null;
  license: string | null;
  attribution: string;
  note: string;
}

function download(url: string, destination: string, maxBytes: number): number {
  execFileSync("curl", ["-fsSL", "--retry", "3", "--max-time", "180", "-o", destination, url], { stdio: "pipe" });
  const size = statSync(destination).size;
  if (size > maxBytes) throw new Error(`Download exceeds ${maxBytes} bytes: ${url} (${size})`);
  return size;
}

function fetchJson(url: string): unknown | null {
  try {
    const output = execFileSync("curl", ["-fsSL", "--max-time", "30", url], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf("--source");
  const localSource = sourceIndex >= 0 ? resolve(args[sourceIndex + 1]) : null;
  const skipContent = args.includes("--no-content");
  const syncedAt = new Date().toISOString();
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(CONTENT_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  let sourceDir = localSource;
  if (!sourceDir) {
    const archive = join(CACHE, "free-programming-books-main.tar.gz");
    const size = download(TARBALL, archive, 25 * 1024 * 1024);
    console.log(`[sync] downloaded catalog ${(size / 1024).toFixed(0)} KiB from main`);
    execFileSync("tar", ["-xzf", archive, "-C", CACHE], { stdio: "pipe" });
    const candidate = readdirSync(CACHE).find(
      (name) => name.startsWith("free-programming-books-") && statSync(join(CACHE, name)).isDirectory(),
    );
    if (!candidate) throw new Error("Could not locate extracted catalog directory");
    sourceDir = join(CACHE, candidate);
  }
  if (!existsSync(join(sourceDir, "books"))) throw new Error(`No books/ directory in ${sourceDir}`);

  const commitInfo = fetchJson("https://api.github.com/repos/EbookFoundation/free-programming-books/commits/main") as { sha?: string } | null;
  const commit = commitInfo?.sha ?? null;

  const files = readdirSync(join(sourceDir, "books"))
    .filter((name) => name.endsWith(".md"))
    .sort();
  const perFile: { file: string; entries: number }[] = [];
  const parsed = [];
  let invalidUrlsSkipped = 0;

  for (const file of files) {
    const match = file.match(/^free-programming-books-(.+)\.md$/);
    if (!match) continue;
    const code = match[1];
    const content = readFileSync(join(sourceDir, "books", file), "utf8");
    const entries = parseMarkdown(content, `books/${file}`, code);
    const valid = entries.filter((entry) => {
      try {
        normalizeUrl(entry.url);
        return true;
      } catch {
        invalidUrlsSkipped += 1;
        return false;
      }
    });
    perFile.push({ file, entries: valid.length });
    parsed.push(...valid);
  }

  const books = deduplicate(parsed, syncedAt) as Book[];
  const duplicatesRemoved = parsed.length - books.length;

  const previousPath = join(DATA_DIR, "books.json");
  const previous = existsSync(previousPath)
    ? (JSON.parse(readFileSync(previousPath, "utf8")) as Book[])
    : [];
  const previousFirstSeen = new Map(previous.map((book) => [book.id, book.firstSeenAt]));
  let newSinceLastSync = 0;
  for (const book of books) {
    const seen = previousFirstSeen.get(book.id);
    book.firstSeenAt = seen ?? syncedAt;
    book.lastSeenAt = syncedAt;
    if (!seen) newSinceLastSync += 1;
    book.reading = { available: false, type: null };
  }

  const urlToBook = new Map<string, Book>();
  for (const book of books) {
    for (const url of [book.url, ...book.alternateUrls.map((link) => link.url)]) {
      try {
        urlToBook.set(normalizeUrl(url), book);
      } catch {
        // Primary URLs were validated above; ignore malformed alternate links.
      }
    }
  }

  const readable: ReadableRecord[] = [];
  const contentResults: { url: string; status: string; bookId?: string }[] = [];
  const readingSources = JSON.parse(readFileSync(join(ROOT, "scripts", "reading-sources.json"), "utf8")) as ReadingSource[];

  if (!skipContent) {
    for (const source of readingSources) {
      try {
        const book = urlToBook.get(normalizeUrl(source.matchUrl));
        if (!book) {
          contentResults.push({ url: source.matchUrl, status: "not found in catalog" });
          continue;
        }
        const dir = join(CONTENT_DIR, book.id);
        mkdirSync(dir, { recursive: true });
        const destination = join(dir, source.file);
        const size = download(source.downloadUrl ?? source.matchUrl, destination, 3 * 1024 * 1024);
        if (source.format === "markdown" && /^\s*(?:<!doctype|<html)/i.test(readFileSync(destination, "utf8").slice(0, 500))) {
          throw new Error("Downloaded an HTML page instead of Markdown — set downloadUrl to a raw file URL");
        }
        readable.push({
          bookId: book.id,
          type: source.format,
          path: `/content/${book.id}/${source.file}`,
          sourceUrl: source.matchUrl,
          originalUrl: book.url,
          license: source.license,
          attribution: source.attribution,
          assetBase: source.assetBase,
          downloadedAt: syncedAt,
        });
        book.reading = { available: true, type: source.format };
        contentResults.push({ url: source.matchUrl, status: `ok (${(size / 1024).toFixed(0)} KiB)`, bookId: book.id });
      } catch (error) {
        contentResults.push({ url: source.matchUrl, status: `failed: ${error instanceof Error ? error.message : String(error)}` });
      }
    }
  }

  const categoryCounts = new Map<string, number>();
  const languageCounts = new Map<string, { name: string; count: number }>();
  for (const book of books) {
    for (const category of book.categories) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    const entry = languageCounts.get(book.languageCode) ?? { name: book.language, count: 0 };
    entry.count += 1;
    languageCounts.set(book.languageCode, entry);
  }
  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, slug: bookIdFor(`category:${name}`).replace(/^b-/, "c-"), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const languages = [...languageCounts.entries()]
    .map(([code, value]) => ({ code, name: value.name, count: value.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const metadata: LibraryMetadata = {
    repository: REPOSITORY,
    sourceUrl: REPO_URL,
    ref: "main",
    commit,
    syncedAt,
    license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    counts: {
      books: books.length,
      categories: categories.length,
      languages: languages.length,
      readable: readable.length,
      sourceFiles: files.length,
      duplicatesRemoved,
      invalidUrlsSkipped,
      newSinceLastSync,
    },
    notes: [
      "All book records are derived from Markdown files in the EbookFoundation/free-programming-books repository.",
      "Descriptions are never invented; only content on the explicit allowlist is downloaded for in-app reading.",
      "Categories and languages are derived from headings and language files of the source repository.",
    ],
  };

  writeJson(join(DATA_DIR, "books.json"), books);
  writeJson(join(DATA_DIR, "categories.json"), categories);
  writeJson(join(DATA_DIR, "languages.json"), languages);
  writeJson(join(DATA_DIR, "readable.json"), readable);
  writeJson(join(DATA_DIR, "metadata.json"), metadata);

  const report = [
    "# DevShelf synchronization report",
    "",
    `- Generated: ${syncedAt}`,
    `- Source: ${REPO_URL} (branch \`main\`)`,
    `- Commit: ${commit ?? "unavailable"}`,
    `- License of source catalog: [${metadata.license.name}](${metadata.license.url})`,
    "",
    "## Counts",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...Object.entries(metadata.counts).map(([key, value]) => `| ${key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} | ${value} |`),
    "",
    "## Source files",
    "",
    "| File | Parsed entries |",
    "| --- | ---: |",
    ...perFile.map((item) => `| \`${item.file}\` | ${item.entries} |`),
    "",
    "## Bundled reading content (explicit allowlist only)",
    "",
    "| Source URL | Result | Book |",
    "| --- | --- | --- |",
    ...contentResults.map((item) => `| ${item.url} | ${item.status} | ${item.bookId ?? "-"} |`),
    "",
    "## Method",
    "",
    "Catalog Markdown is downloaded as a single GitHub tarball; individual books are never mirrored.",
    "IDs are SHA-1 prefixes of normalized source URLs. Duplicates are merged by normalized URL, keeping",
    "all source files, headings, authors, categories and licenses. Formats and licenses are recorded only",
    "when the source states them or the URL provides direct evidence; all other values stay `unknown`/`null`.",
    "",
  ].join("\n");
  writeFileSync(join(REPORT_DIR, "sync-report.md"), report, "utf8");

  console.log(`[sync] ${books.length} books, ${categories.length} categories, ${languages.length} languages`);
  console.log(`[sync] ${duplicatesRemoved} duplicates merged, ${invalidUrlsSkipped} invalid URLs skipped`);
  console.log(`[sync] ${readable.length} readable books bundled, ${newSinceLastSync} new since last sync`);
  console.log(`[sync] report: scripts/reports/sync-report.md`);
}

main();
