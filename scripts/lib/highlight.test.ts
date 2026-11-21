import assert from "node:assert/strict";
import test from "node:test";
import { findAnchor, highlightsToMarkdown, makeAnchor } from "../../src/lib/highlight";

const text = "The quick brown fox jumps over the lazy dog. Then the fox runs again.";

test("makeAnchor stores quote and surrounding context", () => {
  const anchor = makeAnchor(text, 4, 15, "intro", "lime", "Remember this", "b-1");
  assert.equal(anchor.quote, "quick brown");
  assert.equal(anchor.prefix, "The ");
  assert.equal(anchor.suffix, " fox");
  assert.equal(anchor.startOffset, 4);
  assert.equal(anchor.endOffset, 15);
});

test("findAnchor relocates a quote after a small content edit", () => {
  const anchor = makeAnchor(text, 4, 15, "intro", "lime");
  const edited = `A note. ${text}`;
  assert.deepEqual(findAnchor(edited, anchor), { start: 12, end: 23 });
});

test("findAnchor returns null when the quote is gone", () => {
  const anchor = makeAnchor(text, 4, 15, "intro", "lime");
  assert.equal(findAnchor("Nothing relevant here.", anchor), null);
});

test("highlights export to Markdown with notes", () => {
  const anchor = makeAnchor(text, 4, 15, "intro", "lime", "Remember this", "b-1");
  const md = highlightsToMarkdown([anchor], { "b-1": "A Book" });
  assert.match(md, /A Book/);
  assert.match(md, /Remember this/);
  assert.match(md, /quick brown/);
});
