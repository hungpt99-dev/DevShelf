import { createHash } from "node:crypto";
import type { Book, BookFormat } from "../../src/types/book";

const REPOSITORY = "EbookFoundation/free-programming-books" as const;

/** Language names are standard metadata for the source filename codes, not book data. */
export const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic", az: "Azerbaijani", bg: "Bulgarian", bn: "Bengali", ca: "Catalan",
  "cs-cp": "Czech (Czechoslovak)", cs: "Czech", da: "Danish", de: "German", el: "Greek",
  en: "English", es: "Spanish", et: "Estonian", fa_IR: "Persian", fi: "Finnish", fr: "French",
  he: "Hebrew", hi: "Hindi", hu: "Hungarian", hy: "Armenian", id: "Indonesian", it: "Italian",
  ja: "Japanese", ko: "Korean", langs: "English", lv: "Latvian", ml: "Malayalam", my: "Burmese",
  nl: "Dutch", no: "Norwegian", pl: "Polish", pt_BR: "Portuguese (Brazil)",
  pt_PT: "Portuguese (Portugal)", ro: "Romanian", ru: "Russian", sk: "Slovak", sl: "Slovenian",
  sr: "Serbian", subjects: "English", sv: "Swedish", ta: "Tamil", te: "Telugu", th: "Thai",
  tr: "Turkish", uk: "Ukrainian", ur: "Urdu", uz: "Uzbek", vi: "Vietnamese", zh: "Chinese",
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rlm: "", lrm: "",
};

function decodeEntities(input: string): string {
  return input.replace(/&([a-z]+|#\d+);/gi, (whole, key: string) => {
    if (key.startsWith("#")) return String.fromCodePoint(Number(key.slice(1)));
    return ENTITIES[key] ?? whole;
  });
}

export function cleanHeading(raw: string): string {
  return decodeEntities(raw)
    .replace(/<a\s[^>]*><\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\\([\\#\[\]`*])/g, "$1")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.host = parsed.host.toLowerCase();
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_|ref$|source$)/i.test(key)) parsed.searchParams.delete(key);
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
}

export function bookIdFor(url: string): string {
  return `b-${createHash("sha1").update(normalizeUrl(url)).digest("hex").slice(0, 12)}`;
}

function stripComments(line: string): string {
  return line
    .replace(/\(\s*(?:PDF|HTML|ePUB|EPUB|Kindle|LaTeX|GitBook|MOBI|DjVu|Video|online|archived)[^)]*\)/gi, " ")
    .replace(/\*\s*:[^*]{1,60}:\s*\*/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[([{]+|[)\]}]+/g, " ")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Authors are taken only from text the source list places after the book link. */
export function extractAuthors(remainder: string): string[] {
  const cleaned = stripComments(remainder);
  if (!cleaned) return [];
  const parts = cleaned
    .replace(/^\s*[-–—:|\s]+/, "")
    .replace(/\s+by\s+/i, " - ")
    .split(/\s+[-–—;]\s+|\s*&\s*|\s*,\s*/)
    .map((part) => part.replace(/^[\s,.;:]+|[\s,.;:]+$/g, ""))
    .map((part) => part.length > 40 ? part.replace(/\s+(?:no|para|nos formatos|ou pelo)\s+.*$/i, "") : part)
    .map((part) => part.replace(/\s+(?:PDF|EPUB|MOBI|HTML|KINDLE|LATEX)$/i, "").trim())
    .filter((part) =>
      part.length > 1 &&
      !/^(et al|and|trans|ed|edt|trl|ill)$/i.test(part) &&
      !/^(pdf|html|epub|mobi|kindle|latex|gitbook|video|web|online|archived|cc\b.*|gfdl)$/i.test(part),
    );
  return [...new Set(parts)];
}

export function detectFormat(line: string, url: string): { format: BookFormat; evidence: string | null } {
  const labels = [...line.matchAll(/\((PDF|HTML|ePUB|EPUB|Kindle|LaTeX|GitBook|MOBI|DjVu|Video)\)/gi)].map(
    (match) => match[1].toUpperCase(),
  );
  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    // Invalid URLs are filtered by the caller.
  }
  const evidence = labels.length ? labels.join(", ") : /\.[a-z0-9]+$/.test(path) ? path.split(".").pop()!.toUpperCase() : null;
  if (labels.includes("PDF") || path.endsWith(".pdf")) return { format: "pdf", evidence };
  if (labels.includes("EPUB") || path.endsWith(".epub")) return { format: "epub", evidence };
  if (labels.includes("HTML") || /\.html?$/.test(path)) return { format: "html", evidence };
  return { format: "unknown", evidence };
}

export function detectLicense(line: string): string | null {
  const match = line.match(/\((CC\s*[^)]{1,40}|GFDL[^)]{0,30}|GNU Free Documentation License|MIT License|Public Domain[^)]{0,30})\)/i);
  if (!match) return null;
  return match[1].replace(/[\u2011\u00ad]/g, "-").trim();
}

export interface ParsedEntry {
  id: string;
  title: string;
  authors: string[];
  language: string;
  languageCode: string;
  categories: string[];
  url: string;
  alternateUrls: { label: string; url: string }[];
  format: BookFormat;
  formatEvidence: string | null;
  source: { repository: typeof REPOSITORY; file: string; heading: string | null; line: number };
  license: string | null;
  parsedUrl: string;
}

export function parseMarkdown(content: string, filePath: string, languageCode: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const headingStack: string[] = [];
  let inIndex = false;

  content.split(/\r?\n/).forEach((line, index) => {
    const heading = line.match(/^(#{2,6})\s+(.*)$/);
    if (heading) {
      const depth = heading[1].length;
      const title = cleanHeading(heading[2]);
      if (depth <= 3) {
        headingStack.length = 0;
        headingStack.push(title);
      } else if (depth === 4) {
        headingStack.length = 1;
        headingStack.push(title);
      }
      inIndex = /^index$/i.test(title);
      return;
    }
    if (inIndex || !/^\s*[-*]\s+/.test(line)) return;

    const links = [...line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi)];
    const primary = links[0];
    if (!primary) return; // Internal catalog navigation and non-HTTP links are not books.

    const remainder = line.slice(primary.index! + primary[0].length, links[1]?.index ?? line.length);
    const { format, evidence } = detectFormat(line, primary[2]);
    const url = primary[2].replace(/&amp;/g, "&");

    entries.push({
      id: bookIdFor(url),
      title: decodeEntities(primary[1].replace(/`/g, "")).trim(),
      authors: extractAuthors(remainder),
      language: LANGUAGE_NAMES[languageCode] ?? languageCode,
      languageCode,
      categories: headingStack.filter(Boolean).length ? [...headingStack.filter(Boolean)] : ["General"],
      url,
      alternateUrls: links.slice(1).map((link) => ({ label: cleanHeading(link[1]), url: link[2].replace(/&amp;/g, "&") })),
      format,
      formatEvidence: evidence,
      source: {
        repository: REPOSITORY,
        file: filePath,
        heading: headingStack.join(" > ") || null,
        line: index + 1,
      },
      license: detectLicense(line),
      parsedUrl: normalizeUrl(url),
    });
  });

  return entries;
}

/** Deduplicates by normalized URL while preserving all useful source metadata. */
export function deduplicate(entries: ParsedEntry[], syncedAt: string): Omit<Book, "reading">[] {
  const byUrl = new Map<string, Omit<Book, "reading">>();
  for (const entry of entries) {
    const existing = byUrl.get(entry.parsedUrl);
    if (!existing) {
      byUrl.set(entry.parsedUrl, {
        id: entry.id,
        title: entry.title,
        authors: entry.authors,
        description: null,
        language: entry.language,
        languageCode: entry.languageCode,
        categories: entry.categories,
        url: entry.url,
        alternateUrls: entry.alternateUrls,
        format: entry.format,
        formatEvidence: entry.formatEvidence,
        source: entry.source,
        license: entry.license,
        lastSyncedAt: syncedAt,
        firstSeenAt: syncedAt,
        lastSeenAt: syncedAt,
      });
      continue;
    }
    existing.categories = [...new Set([...existing.categories, ...entry.categories])].sort();
    existing.authors = [...new Set([...existing.authors, ...entry.authors])].sort();
    existing.alternateUrls = [
      ...existing.alternateUrls,
      ...entry.alternateUrls.filter((link) => !existing.alternateUrls.some((old) => old.url === link.url)),
    ];
    existing.license ??= entry.license;
    if (existing.format === "unknown" && entry.format !== "unknown") {
      existing.format = entry.format;
      existing.formatEvidence = entry.formatEvidence;
    }
    // The English (langs/subjects) source is the canonical primary record.
    if (entry.source.file === "books/free-programming-books-langs.md" || entry.source.file === "books/free-programming-books-subjects.md") {
      if (existing.source.file !== entry.source.file) existing.source = entry.source;
      existing.language = entry.language;
      existing.languageCode = entry.languageCode;
    }
  }
  return [...byUrl.values()].sort((a, b) => a.title.localeCompare(b.title, "en"));
}
