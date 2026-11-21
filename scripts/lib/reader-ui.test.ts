import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "../../src/components/reader/markdown-content";
import { chaptersFromMarkdown } from "../../src/lib/readers/providers";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

test("tailwind exposes ink and reader foreground tokens", () => {
  assert.match(css, /--color-ink:\s*var\(--ink\)/);
  assert.match(css, /--color-reader-fg:\s*var\(--reader-fg\)/);
});

test("inline code stays inline while fenced code renders as a block", () => {
  const inline = renderToStaticMarkup(createElement(MarkdownContent, { markdown: "Use `value` here.", assetBase: null }));
  assert.match(inline, /<code/);
  assert.doesNotMatch(inline, /<pre/);
  const fenced = renderToStaticMarkup(createElement(MarkdownContent, { markdown: "```js\nconst x = 1;\n```", assetBase: null }));
  assert.match(fenced, /<pre/);
});

test("duplicate markdown headings get unique chapter ids", () => {
  const chapters = chaptersFromMarkdown("## Overview\n\n## Overview\n\n### Details\n");
  assert.deepEqual(chapters.map((chapter) => chapter.id), ["overview", "overview-1", "details"]);
  assert.equal(new Set(chapters.map((chapter) => chapter.id)).size, chapters.length);
});
