import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../../src/lib/i18n/en";
import { vi } from "../../src/lib/i18n/vi";

test("English and Vietnamese catalogs have identical keys", () => {
  assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort());
});

test("every message is a non-empty string", () => {
  for (const [key, value] of Object.entries(en)) assert.equal(typeof value, "string", `en.${key}`);
  for (const [key, value] of Object.entries(vi)) {
    assert.equal(typeof value, "string", `vi.${key}`);
    assert.ok(value.trim().length > 0, `vi.${key}`);
  }
});

test("book content is never translated by the UI catalog", () => {
  assert.doesNotMatch(JSON.stringify(en), /The Little Go Book|Clean ABAP/);
  assert.doesNotMatch(JSON.stringify(vi), /The Little Go Book|Clean ABAP/);
});
