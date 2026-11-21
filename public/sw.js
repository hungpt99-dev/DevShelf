/* DevShelf offline shell. Opt-in: registered only when Offline reading is enabled. */
const base = self.location.pathname.replace(/\/sw\.js$/, "");
let version = "dev";
let contentPaths = [];

async function cacheName() {
  try {
    const response = await fetch(`${base}/data/metadata.json`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      version = (data.commit || data.syncedAt || "dev").slice(0, 12);
    }
    const readable = await fetch(`${base}/data/readable.json`, { cache: "no-store" });
    if (readable.ok) contentPaths = (await readable.json()).map((item) => item.path);
  } catch { /* keep defaults */ }
  return `devshelf-${version}`;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const name = await cacheName();
    const cache = await caches.open(name);
    const shell = ["/", "/books", "/reading-list", "/settings", "/data/readable.json", "/manifest.webmanifest"];
    await cache.addAll([...shell.map((path) => `${base}${path}`), ...contentPaths.map((path) => `${base}${path}`)]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const name = await cacheName();
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("devshelf-") && key !== name).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(`${base}/`) && url.pathname !== base) return;
  if (url.pathname.includes("/data/books.json")) return;
  event.respondWith((async () => {
    const cache = await caches.open(await cacheName());
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then((response) => {
      if (response.ok) void cache.put(event.request, response.clone());
      return response;
    }).catch(() => cached);
    return cached || network;
  })());
});
