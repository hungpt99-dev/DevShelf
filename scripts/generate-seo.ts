import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "public", "data");
const OG_DIR = join(ROOT, "public", "og");
const SITE = "https://hungpt99-dev.github.io/DevShelf";

interface Book { id: string; title: string; authors: string[]; language: string; categories: string[] }

const books = JSON.parse(readFileSync(join(DATA, "books.json"), "utf8")) as Book[];
const start = Date.now();
mkdirSync(OG_DIR, { recursive: true });

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char] ?? char));
}

for (const book of books) {
  const topic = escapeXml(book.categories[0] ?? "Programming");
  const title = escapeXml(book.title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0e0e0e"/><rect x="0" y="0" width="1200" height="8" fill="#c8f542"/><rect x="72" y="150" width="180" height="240" rx="12" fill="#c8f542"/><text x="72" y="460" font-family="sans-serif" font-size="22" fill="#c8f542">DEVSHELF</text><text x="320" y="240" font-family="sans-serif" font-size="58" fill="#f4f4f0">${title.slice(0, 70)}</text><text x="322" y="300" font-family="sans-serif" font-size="24" fill="#a3a3a3">${topic} · ${escapeXml(book.language)}</text><text x="322" y="540" font-family="sans-serif" font-size="20" fill="#a3a3a3">Read the best programming books, free.</text></svg>`;
  writeFileSync(join(OG_DIR, `${book.id}.svg`), svg, "utf8");
}

const urls = ["", "/books", "/paths", "/new", "/changelog", "/reading-list", "/settings", ...books.map((book) => `/books/${book.id}`)];
writeFileSync(join(ROOT, "public", "sitemap.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${SITE}${path}</loc></url>`).join("\n")}\n</urlset>\n`, "utf8");
writeFileSync(join(ROOT, "public", "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`, "utf8");
console.log(`SEO: ${books.length} OG images, sitemap and robots in ${Date.now() - start}ms`);
