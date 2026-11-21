import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { updateLinkHealth, type LinkHealth } from "./lib/link-health";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BOOKS = join(ROOT, "public", "data", "books.json");
const OUTPUT = join(ROOT, "public", "data", "link-health.json");
const USER_AGENT = "DevShelf/1.0 (+https://github.com/hungpt99-dev/DevShelf; link health check)";
const TIMEOUT_MS = 10_000;

const args = process.argv.slice(2);
const valueOf = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const limit = Number(valueOf("--limit") ?? "20");
const delay = Number(valueOf("--delay") ?? "200");
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function probe(url: string): Promise<{ ok: boolean; httpStatus: number | null; redirected: boolean }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const headers = { "User-Agent": USER_AGENT, Accept: "*/*" };
  try {
    let response = await fetch(url, { method: "HEAD", headers, signal, redirect: "follow" });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", headers, signal, redirect: "follow" });
    }
    return { ok: response.ok, httpStatus: response.status, redirected: Boolean(response.url && new URL(response.url).href !== new URL(url).href) };
  } catch {
    return { ok: false, httpStatus: null, redirected: false };
  }
}

async function main(): Promise<void> {
  const books = JSON.parse(readFileSync(BOOKS, "utf8")) as { id: string; url: string }[];
  const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, "utf8")) as Record<string, LinkHealth> : {};
  const urls = [...new Set(books.map((book) => book.url))]
    .sort((a, b) => new URL(a).host.localeCompare(new URL(b).host) || a.localeCompare(b))
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 20);

  let checked = 0;
  let broken = 0;
  for (const url of urls) {
    const result = await probe(url);
    const health = updateLinkHealth(previous[url], result);
    previous[url] = health;
    if (health.status === "broken") broken += 1;
    checked += 1;
    if (delay > 0 && checked < urls.length) await sleep(delay);
  }
  const sorted = Object.fromEntries(Object.entries(previous).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  console.log(`Link health: checked ${checked} URLs, ${broken} broken, ${Object.keys(sorted).length} tracked`);
}

main().catch((error: unknown) => {
  // Never fail the scheduled workflow: keep the last known good link-health file.
  console.error(`Link health check skipped: ${error instanceof Error ? error.message : String(error)}`);
});
