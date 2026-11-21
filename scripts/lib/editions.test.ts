import assert from "node:assert/strict";
import test from "node:test";
import { groupEditions, workKey } from "./editions";

function book(id: string, title: string, authors: string[], language: string, format = "pdf", reading = false) {
  return { id, title, authors, language, format, reading: { available: reading } } as never;
}

test("workKey ignores format, language and diacritics", () => {
  assert.equal(workKey(book("a", "The Little Go Book", ["Karl Seguin"], "English", "pdf")), workKey(book("b", "The Little Go Book", ["Karl Seguin"], "German", "html")));
});

test("groupEditions merges true editions and keeps readable first", () => {
  const grouped = groupEditions([
    book("a", "The Little Go Book", ["Karl Seguin"], "English", "pdf"),
    book("b", "The Little Go Book", ["Karl Seguin"], "German", "html", true),
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].editions.length, 2);
  assert.equal(grouped[0].editions[0].id, "b");
});

test("groupEditions rejects similar but different works", () => {
  const grouped = groupEditions([
    book("a", "Learning JavaScript", ["Jane Doe"], "English"),
    book("b", "Learning Java", ["Jane Doe"], "English"),
    book("c", "Learning JavaScript", ["John Roe"], "English"),
  ]);
  assert.equal(grouped.length, 3);
});
