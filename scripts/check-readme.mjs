import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const file = process.argv[2] ?? "README.md";
const root = dirname(resolve(file));
const text = readFileSync(file, "utf8");
const errors = [];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-");
}

const headings = new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1])));

for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  const target = match[1].split("#")[0];
  const anchor = match[1].includes("#") ? match[1].split("#")[1] : null;
  if (!target) {
    if (anchor && !headings.has(anchor)) errors.push(`missing anchor #${anchor}`);
    continue;
  }
  if (/^(https?:|mailto:)/.test(target)) continue;
  if (!existsSync(resolve(root, target))) errors.push(`missing link target ${target}`);
}
for (const match of text.matchAll(/(?:src|srcset)="([^"]+)"/g)) {
  const target = match[1];
  if (/^https?:/.test(target)) continue;
  if (!existsSync(resolve(root, target))) errors.push(`missing asset ${target}`);
}
for (const match of text.matchAll(/\]\(#([^)]+)\)/g)) {
  if (!headings.has(match[1])) errors.push(`missing anchor #${match[1]}`);
}

if (errors.length) {
  console.error(`FAIL (${errors.length})\n${[...new Set(errors)].join("\n")}`);
  process.exit(1);
}
console.log(`PASS — ${file}: links, anchors and local assets resolve`);
