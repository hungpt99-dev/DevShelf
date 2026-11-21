import assert from "node:assert/strict";
import test from "node:test";
import { clampRect, pdfHighlightKey } from "../../src/lib/pdf-highlights";

test("pdfHighlightKey is stable per book and page", () => {
  assert.equal(pdfHighlightKey("b-1", 3), "b-1:3");
});

test("clampRect keeps normalized coordinates inside the page", () => {
  assert.deepEqual(clampRect({ x: -5, y: 10, width: 2000, height: 30 }), { x: 0, y: 10, width: 1000, height: 30 });
});
