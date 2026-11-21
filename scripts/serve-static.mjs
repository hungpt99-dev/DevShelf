import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".md": "text/markdown", ".txt": "text/plain", ".woff2": "font/woff2",
};

http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (pathname === "/") pathname = "/index.html";
  let file = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
  if (!extname(file)) file += ".html";
  try {
    if (!statSync(file).isFile()) throw new Error("not a file");
    response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} on http://127.0.0.1:${port}`));
