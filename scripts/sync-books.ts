import { execFileSync } from "node:child_process";
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Book, LibraryMetadata, ReadableRecord, SyncHistoryEntry } from "../src/types/book";
import { bookIdFor, deduplicate, normalizeUrl, parseMarkdown } from "./lib/parse-books";
import { diffBooks } from "./lib/sync-diff";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache");
const REPOSITORY = "EbookFoundation/free-programming-books";
const REPO_URL = `https://github.com/${REPOSITORY}`;
const DATA_DIR = join(ROOT, "public", "data");
const CONTENT_DIR = join(ROOT, "public", "content");
const REPORT_DIR = join(ROOT, "scripts", "reports");
const ERROR_REPORT = join(REPORT_DIR, "sync-error.md");
const MAX_ATTEMPTS = 3;

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

interface PreviousState {
  books: Book[];
  metadata: LibraryMetadata | null;
  readable: ReadableRecord[];
  history: SyncHistoryEntry[];
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function wait(seconds: number): void {
  execFileSync("sleep", [String(seconds)], { stdio: "ignore" });
}

function retry<T>(label: string, fn: () => T, attempts = MAX_ATTEMPTS): T {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[sync] ${label} failed (attempt ${attempt}/${attempts}): ${message}`);
        wait(2 ** attempt);
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function download(url: string, destination: string, maxBytes: number): number {
  mkdirSync(dirname(destination), { recursive: true });
  execFileSync("curl", ["-fsSL", "--retry", "3", "--max-time", "180", "-o", destination, url], {
    stdio: "pipe",
    timeout: 200_000,
  });
  const size = statSync(destination).size;
  if (size > maxBytes) throw new Error(`Download exceeds ${maxBytes} bytes: ${url} (${size})`);
  return size;
}

function resolveCommit(previous: PreviousState, localSource: string | null, commitOverride: string | null): string {
  if (localSource) return commitOverride ?? previous.metadata?.commit ?? "local-checkout";
  const output = retry("upstream commit lookup", () => execFileSync(
    "git",
    ["ls-remote", "--exit-code", `${REPO_URL}.git`, "refs/heads/main"],
    { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"] },
  ));
  const sha = output.split("\n").map((line) => line.trim()).find((line) => line.endsWith("refs/heads/main"))?.split(/\s+/)[0];
  if (!sha || !/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Unexpected ls-remote result: ${output.slice(0, 200)}`);
  return sha;
}

function readPrevious(): PreviousState {
  return {
    books: readJson<Book[]>(join(DATA_DIR, "books.json"), []),
    metadata: readJson<LibraryMetadata | null>(join(DATA_DIR, "metadata.json"), null),
    readable: readJson<ReadableRecord[]>(join(DATA_DIR, "readable.json"), []),
    history: readJson<SyncHistoryEntry[]>(join(DATA_DIR, "sync-history.json"), []),
  };
}

function filesPresent(): boolean {
  return ["books.json", "categories.json", "languages.json", "readable.json", "metadata.json", "sync-history.json"]
    .every((name) => existsSync(join(DATA_DIR, name)));
}

function main(): void {
  const args = process.argv.slice(2);
  const valueAfter = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  const checkOnly = args.includes("--check");
  const force = args.includes("--force");
  const skipContent = args.includes("--no-content");
  const localSourceArg = valueAfter("--source");
  const localSource = localSourceArg ? resolve(localSourceArg) : null;
  const commitOverride = valueAfter("--commit");
  const syncedAt = new Date().toISOString();

  mkdirSync(CACHE, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(CONTENT_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  const previous = readPrevious();
  const commit = resolveCommit(previous, localSource, commitOverride);
  const changed = force || !filesPresent() || commit !== previous.metadata?.commit;

  if (checkOnly) {
    console.log(`UPSTREAM_COMMIT=${commit}`);
    console.log(`LOCAL_COMMIT=${previous.metadata?.commit ?? "none"}`);
    console.log(`CHANGED=${changed}`);
    writeFileSync(join(CACHE, "sync-check.md"), [
      "# Upstream change check",
      "",
      `- Checked: ${syncedAt}`,
      `- Upstream commit: \`${commit}\``,
      `- Last deployed commit: \`${previous.metadata?.commit ?? "none"}\``,
      `- Changed: **${changed}**`,
      "",
    ].join("\n"), "utf8");
    return;
  }

  if (!changed) {
    console.log(`CHANGED=false`);
    console.log(`[sync] upstream unchanged at ${commit}; keeping last known good dataset`);
    return;
  }

  let sourceDir = localSource;
  if (!sourceDir) {
    const archive = join(CACHE, `catalog-${commit}.tar.gz`);
    const archiveUrl = `https://codeload.github.com/${REPOSITORY}/tar.gz/${commit}`;
    const size = retry("catalog archive download", () => download(archiveUrl, archive, 25 * 1024 * 1024));
    console.log(`[sync] downloaded catalog ${(size / 1024).toFixed(0)} KiB at commit ${commit}`);
    const extractDir = join(CACHE, `source-${commit.slice(0, 12)}`);
    rmSync(extractDir, { recursive: true, force: true });
    mkdirSync(extractDir, { recursive: true });
    execFileSync("tar", ["-xzf", archive, "-C", extractDir], { stdio: "pipe", timeout: 120_000 });
    const candidate = readdirSync(extractDir).find(
      (name) => name.startsWith("free-programming-books-") && statSync(join(extractDir, name)).isDirectory(),
    );
    if (!candidate) throw new Error("Could not locate extracted catalog directory");
    sourceDir = join(extractDir, candidate);
  }
  if (!existsSync(join(sourceDir, "books"))) throw new Error(`No books/ directory in ${sourceDir}`);

  const files = readdirSync(join(sourceDir, "books")).filter((name) => name.endsWith(".md")).sort();
  const perFile: { file: string; entries: number }[] = [];
  const parsed = [];
  let invalidUrlsSkipped = 0;

  for (const file of files) {
    const match = file.match(/^free-programming-books-(.+)\.md$/);
    if (!match) continue;
    const content = readFileSync(join(sourceDir, "books", file), "utf8");
    const entries = parseMarkdown(content, `books/${file}`, match[1]);
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
  if (files.length < 10 || parsed.length < 100) {
    throw new Error(`Refusing to write implausible catalog: ${files.length} files, ${parsed.length} entries`);
  }

  const books = deduplicate(parsed, syncedAt) as Book[];
  if (new Set(books.map((book) => book.id)).size !== books.length) throw new Error("Duplicate book IDs in generated catalog");
  const duplicatesRemoved = parsed.length - books.length;

  const previousById = new Map(previous.books.map((book) => [book.id, book]));
  const newById = new Map(books.map((book) => [book.id, book]));
  const { added, removed, updated, updatedDetails } = diffBooks(previous.books, books);

  const updatedIds = new Set(updated.map((book) => book.id));
  for (const book of books) {
    const previousBook = previousById.get(book.id);
    book.firstSeenAt = previousBook?.firstSeenAt ?? syncedAt;
    book.lastSyncedAt = updatedIds.has(book.id) ? syncedAt : (previousBook?.lastSyncedAt ?? syncedAt);
    book.lastSeenAt = syncedAt;
    book.reading = { available: false, type: null };
  }

  const urlToBook = new Map<string, Book>();
  for (const book of books) {
    for (const url of [book.url, ...book.alternateUrls.map((link) => link.url)]) {
      try { urlToBook.set(normalizeUrl(url), book); } catch { /* malformed alternate link */ }
    }
  }

  const readable: ReadableRecord[] = [];
  const contentResults: { url: string; status: string; bookId?: string }[] = [];
  const staged: { from: string; to: string }[] = [];
  const readingSources = JSON.parse(readFileSync(join(ROOT, "scripts", "reading-sources.json"), "utf8")) as ReadingSource[];

  if (skipContent) {
    for (const record of previous.readable) {
      const book = newById.get(record.bookId);
      if (!book || !existsSync(join(ROOT, "public", record.path.replace(/^\//, "")))) continue;
      readable.push(record);
      book.reading = { available: true, type: record.type };
    }
  } else {
    const failures: string[] = [];
    for (const source of readingSources) {
      try {
        const book = urlToBook.get(normalizeUrl(source.matchUrl));
        if (!book) {
          const old = previous.readable.find((record) => normalizeUrl(record.sourceUrl) === normalizeUrl(source.matchUrl));
          if (old && existsSync(join(ROOT, "public", old.path.replace(/^\//, "")))) {
            readable.push(old);
            newById.get(old.bookId)!.reading = { available: true, type: old.type };
            contentResults.push({ url: source.matchUrl, status: "book no longer in catalog; kept previous content", bookId: old.bookId });
          } else {
            failures.push(`${source.matchUrl}: book not found in catalog`);
          }
          continue;
        }
        const from = join(CACHE, "content", book.id, source.file);
        const size = retry(`content download ${source.file}`, () => download(source.downloadUrl ?? source.matchUrl, from, 3 * 1024 * 1024));
        if (source.format === "markdown" && /^\s*(?:<!doctype|<html)/i.test(readFileSync(from, "utf8").slice(0, 500))) {
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
        staged.push({ from, to: join(CONTENT_DIR, book.id, source.file) });
        contentResults.push({ url: source.matchUrl, status: `ok (${(size / 1024).toFixed(0)} KiB)`, bookId: book.id });
      } catch (error) {
        failures.push(`${source.matchUrl}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (failures.length) throw new Error(`Content download failed; last known good dataset retained:\n- ${failures.join("\n- ")}`);
    // Copy only after every download succeeds so a partial failure cannot corrupt bundled content.
    for (const item of staged) {
      mkdirSync(dirname(item.to), { recursive: true });
      copyFileSync(item.from, item.to);
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
      newSinceLastSync: added.length,
    },
    notes: [
      "All book records are derived from Markdown files in the EbookFoundation/free-programming-books repository.",
      "Descriptions are never invented; only content on the explicit allowlist is downloaded for in-app reading.",
      "Categories and languages are derived from headings and language files of the source repository.",
      "Book IDs are stable SHA-1 prefixes of normalized source URLs and are preserved across syncs.",
    ],
  };

  const baseHistory: SyncHistoryEntry[] = previous.history.length ? previous.history : [{
    syncedAt: previous.metadata?.syncedAt ?? syncedAt,
    commit: previous.metadata?.commit ?? null,
    added: previous.books.map((book) => book.id),
    updated: [],
    removed: [],
    counts: { books: previous.books.length, added: previous.books.length, updated: 0, removed: 0 },
    initial: true,
  }];
  const history = [...baseHistory, {
    syncedAt,
    commit,
    added: added.map((book) => book.id),
    updated: updated.map((book) => book.id),
    removed: removed.map((book) => book.id),
    counts: { books: books.length, added: added.length, updated: updated.length, removed: removed.length },
  }].slice(-24);

  const changedTitleList = (items: { title: string }[], limit = 8): string =>
    items.slice(0, limit).map((item) => `- ${item.title}`).join("\n") || "- none";
  const report = [
    "# DevShelf synchronization report",
    "",
    `- Generated: ${syncedAt}`,
    `- Source: ${REPO_URL} (branch \`main\`)`,
    `- Upstream commit: \`${commit}\``,
    `- Previous commit: \`${previous.metadata?.commit ?? "none"}\``,
    `- License of source catalog: [${metadata.license.name}](${metadata.license.url})`,
    "",
    "## Changes since last sync",
    "",
    `- Added: ${added.length}`,
    `- Updated: ${updated.length}`,
    `- Removed: ${removed.length}`,
    "",
    "### Added (first entries)",
    changedTitleList(added),
    "",
    "### Updated (first entries)",
    updatedDetails.slice(0, 8).map((item) => `- ${item.title} (${item.fields.join(", ")})`).join("\n") || "- none",
    "",
    "### Removed (first entries)",
    changedTitleList(removed),
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
    "The upstream commit is detected with `git ls-remote`; the catalog is downloaded as one tarball pinned to that commit.",
    "Outputs are staged and written only after parsing, diffing and every allowlisted content download succeeds. On failure,",
    "the last known good dataset stays untouched. IDs are SHA-1 prefixes of normalized source URLs, so unchanged resources",
    "keep their IDs. Formats and licenses are recorded only when the source states them or the URL provides direct evidence.",
    "Reading progress, bookmarks and preferences live in the browser's IndexedDB and are never touched by synchronization.",
    "",
  ].join("\n");

  // All checks passed: write the new dataset in one batch.
  writeJson(join(DATA_DIR, "books.json"), books);
  writeJson(join(DATA_DIR, "categories.json"), categories);
  writeJson(join(DATA_DIR, "languages.json"), languages);
  writeJson(join(DATA_DIR, "readable.json"), readable);
  writeJson(join(DATA_DIR, "metadata.json"), metadata);
  writeJson(join(DATA_DIR, "sync-history.json"), history);
  writeFileSync(join(REPORT_DIR, "sync-report.md"), report, "utf8");
  if (existsSync(ERROR_REPORT)) unlinkSync(ERROR_REPORT);

  console.log(`[sync] commit ${commit}: ${books.length} books, ${categories.length} categories, ${languages.length} languages`);
  console.log(`[sync] added ${added.length}, updated ${updated.length}, removed ${removed.length}, readable ${readable.length}`);
  console.log(`[sync] report: scripts/reports/sync-report.md`);
  console.log("CHANGED=true");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(ERROR_REPORT, [
    "# DevShelf synchronization error",
    "",
    `- Failed: ${new Date().toISOString()}`,
    "",
    "```",
    message,
    "```",
    "",
    "The last known good dataset in `public/data/` and `public/content/` was not modified.",
    "",
  ].join("\n"), "utf8");
  console.error(`[sync] ERROR: ${message}`);
  process.exit(1);
}
