import assert from "node:assert/strict";
import test from "node:test";
import { bookIdFor, cleanHeading, deduplicate, detectFormat, detectLicense, extractAuthors, normalizeUrl, parseMarkdown } from "./parse-books";

const fixture = `### Index\n\n* [Skip me](https://example.com/skip)\n\n### Go\n\n* [The Little Go Book](https://github.com/karlseguin/the-little-go-book) - Karl Seguin ([PDF](https://www.openmymind.net/assets/go/go.pdf)) (CC BY-NC-SA)\n#### Tools\n\n* [Clean ABAP](https://github.com/SAP/styleguides/blob/master/clean-abap/CleanABAP.md)\n* [C\\# Notes](http://example.org/notes.html) - Jane Doe, John Roe (HTML)\n`;

test("skips index navigation and captures heading hierarchy", () => {
  const entries = parseMarkdown(fixture, "books/free-programming-books-langs.md", "langs");
  assert.equal(entries.length, 3);
  assert.deepEqual(entries[0].categories, ["Go"]);
  assert.deepEqual(entries[1].categories, ["Go", "Tools"]);
  assert.equal(cleanHeading('<a id="csharp"></a>C\\#'), "C#");
});

test("extracts source-provided authors, alternates, format and license", () => {
  const [entry] = parseMarkdown(fixture, "books/free-programming-books-langs.md", "langs");
  assert.deepEqual(entry.authors, ["Karl Seguin"]);
  assert.equal(entry.alternateUrls[0].label, "PDF");
  assert.equal(entry.format, "unknown");
  assert.equal(entry.license, "CC BY-NC-SA");
  const html = parseMarkdown(fixture, "books/free-programming-books-langs.md", "langs")[2];
  assert.deepEqual(html.authors, ["Jane Doe", "John Roe"]);
  assert.equal(html.format, "html");
  assert.equal(html.license, null);
});

test("format and license are inferred only with evidence", () => {
  assert.deepEqual(detectFormat("* [X](https://a.test/x.pdf)", "https://a.test/x.pdf"), { format: "pdf", evidence: "PDF" });
  assert.deepEqual(detectFormat("* [X](https://a.test/x)", "https://a.test/x"), { format: "unknown", evidence: null });
  assert.equal(detectLicense("* [X](https://a.test) (CC BY-SA)"), "CC BY-SA");
  assert.equal(detectLicense("* [X](https://a.test)"), null);
});

test("does not treat format labels as authors", () => {
  assert.deepEqual(extractAuthors(" - Alvin Alexander, PDF (PDF)"), ["Alvin Alexander"]);
  assert.deepEqual(extractAuthors(" - Jane Doe (HTML)"), ["Jane Doe"]);
});

test("normalizes URLs and produces stable ids", () => {
  assert.equal(normalizeUrl("https://Example.com/a/?utm_source=x#top"), "https://example.com/a");
  assert.equal(bookIdFor("https://example.com/a/#x"), bookIdFor("https://example.com/a"));
  assert.deepEqual(extractAuthors(" et al. "), []);
});

test("deduplicates by URL while merging categories and sources", () => {
  const entries = parseMarkdown(fixture, "books/free-programming-books-langs.md", "langs");
  const twice = [...entries, { ...entries[0], categories: ["Extra"], source: { ...entries[0].source, file: "books/free-programming-books-vi.md" }, authors: ["Translator"] }];
  const merged = deduplicate(twice, "2026-01-01T00:00:00.000Z");
  assert.equal(merged.length, 3);
  const goBook = merged.find((book) => book.title === "The Little Go Book")!;
  assert.deepEqual(goBook.categories, ["Extra", "Go"]);
  assert.deepEqual(goBook.authors, ["Karl Seguin", "Translator"]);
  assert.equal(goBook.license, "CC BY-NC-SA");
});
