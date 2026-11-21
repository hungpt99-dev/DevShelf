import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = dirname(dirname(new URL(import.meta.url).pathname));
const source = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const targetDir = join(root, "public", "pdf");
const target = join(targetDir, "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.warn("[devshelf] pdfjs worker not found; run npm install first");
  process.exit(0);
}
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
const fontSource = join(root, "node_modules", "pdfjs-dist", "standard_fonts");
const fontTarget = join(targetDir, "standard_fonts");
if (existsSync(fontSource)) {
  cpSync(fontSource, fontTarget, { recursive: true });
  console.log("[devshelf] pdf standard fonts ready: public/pdf/standard_fonts/");
}
console.log(`[devshelf] pdf worker ready: public/pdf/pdf.worker.min.mjs`);
