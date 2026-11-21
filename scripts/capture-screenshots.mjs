import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "https://hungpt99-dev.github.io/DevShelf";
const out = process.argv[3] ?? "docs/screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
const routes = [
  ["home", "/"],
  ["catalog", "/books"],
  ["markdown-reader", "/read/b-c085be43677c"],
  ["pdf-reader", "/read/b-9645f99c21e5"],
];

for (const [name, route] of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  if (name === "catalog") await page.waitForSelector("article", { timeout: 30_000 });
  if (name === "markdown-reader") await page.waitForSelector(".prose-reader h1", { timeout: 30_000 });
  if (name === "pdf-reader") {
    await page.waitForSelector("canvas", { timeout: 30_000 });
    const painted = () => page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return 0;
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) count += 1;
      return count;
    });
    for (let attempt = 0; attempt < 40 && (await painted()) < 500; attempt += 1) await page.waitForTimeout(500);
    for (let i = 0; i < 9; i += 1) {
      await page.getByRole("button", { name: "Next page" }).click();
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(1500);
  } else {
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`${name}: ${out}/${name}.png`);
  await page.close();
}
await browser.close();
