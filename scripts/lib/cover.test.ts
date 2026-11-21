import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookOpen, Coffee, FileCode } from "lucide-react";
import { getCoverSpec, hashString, pickTopic } from "../../src/lib/cover";
import { titlesMatch, titleSimilarity } from "../../src/lib/cover-text";
import { planCoverLookups, shouldRetryMiss } from "./cover-cache";
import { BookCover } from "../../src/components/book/BookCover";
import type { Book } from "../../src/types/book";

function book(id: string, title: string, categories: string[] = [], authors: string[] = []): Book {
  return { id, title, categories, authors, language: "English" } as Book;
}

test("hashString is stable, 32-bit and case-sensitive", () => {
  assert.equal(hashString("devshelf"), hashString("devshelf"));
  assert.notEqual(hashString("devshelf"), hashString("DevShelf"));
  assert.ok(hashString("devshelf") >= 0 && hashString("devshelf") <= 0xffffffff);
});

test("pickTopic matches Java without matching JavaScript", () => {
  assert.equal(pickTopic("Effective Java", ["Java"]), Coffee);
  assert.equal(pickTopic("JavaScript: The Good Parts", ["JavaScript"]), FileCode);
  assert.equal(pickTopic("A Book About Nothing", ["Misc"], ), BookOpen);
});

test("getCoverSpec is deterministic for the same book id", () => {
  const first = getCoverSpec(book("b-c085be43677c", "Clean ABAP", ["Software Architecture"]));
  const second = getCoverSpec(book("b-c085be43677c", "Clean ABAP", ["Software Architecture"]));
  assert.deepEqual(first, second);
  assert.ok(["dark", "lime", "paper", "ink"].includes(first.skin));
  assert.ok(["dots", "grid", "rings", "diagonal"].includes(first.pattern));
});

test("title similarity rejects wrong matches and accepts subtitle variants", () => {
  assert.equal(titlesMatch("The Little Go Book", "The Little Go Book: A Hands-On Guide"), true);
  assert.equal(titlesMatch("Effective Java", "Effective Java 3rd Edition"), true);
  assert.equal(titlesMatch("Effective Java", "Effective JavaScript"), false);
  assert.equal(titlesMatch("Java", "Java Programming"), false);
  assert.equal(titlesMatch("Programming Python", "Programming Rust"), false);
  assert.ok(titleSimilarity("Go Web Programming", "Go Web Programming") > 0.99);
});

test("author surnames must overlap when both sides name authors", () => {
  assert.equal(titlesMatch("The Little Go Book", "The Little Go Book", ["Karl Seguin"], ["Karl Seguin"]), true);
  assert.equal(titlesMatch("The Little Go Book", "The Little Go Book", ["Karl Seguin"], ["Jane Doe"]), false);
  assert.equal(titlesMatch("The Little Go Book", "The Little Go Book", ["Karl Seguin"], []), true);
});

test("cover fetch plan skips cached misses unless forced or stale", () => {
  const books = [book("a", "A Book"), book("b", "B Book")];
  const now = Date.parse("2026-11-21T00:00:00.000Z");
  const misses = { a: { checkedAt: "2026-11-20T00:00:00.000Z" } };
  assert.deepEqual(planCoverLookups({ books, covers: {}, misses, now }), ["b"]);
  assert.deepEqual(planCoverLookups({ books, covers: { b: "https://covers.openlibrary.org/b/id/1-M.jpg?default=false" }, misses, now }), []);
  assert.deepEqual(planCoverLookups({ books, covers: {}, misses, now, force: true }), ["a", "b"]);
  assert.deepEqual(planCoverLookups({ books, covers: {}, misses: { a: { checkedAt: "2026-01-01T00:00:00.000Z" } }, now, limit: 1 }), ["a"]);
  assert.equal(shouldRetryMiss(undefined), true);
});

test("BookCover uses the static default when the title is empty", () => {
  const html = renderToStaticMarkup(createElement(BookCover, { book: book("b-000000000000", "") }));
  assert.match(html, /default-cover\.svg/);
});

test("BookCover reserves the aspect ratio before preferences are ready", () => {
  const html = renderToStaticMarkup(createElement(BookCover, {
    book: book("b-000000000001", "The Little Go Book"),
    coverUrl: "https://covers.openlibrary.org/b/id/123-M.jpg?default=false",
  }));
  assert.match(html, /aspect-\[3\/4\]/);
  assert.match(html, /line-clamp-4/);
  assert.doesNotMatch(html, /covers\.openlibrary\.org/);
});
