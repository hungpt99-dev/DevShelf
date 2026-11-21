import assert from "node:assert/strict";
import test from "node:test";
import { extractCoverMetadata } from "./cover-metadata";

const url = "https://openlibrary.org/search.json?title=Example";

test("extractCoverMetadata only stores values supplied by Open Library", () => {
  const result = extractCoverMetadata({
    description: "A real description.", first_publish_year: 2018,
    isbn: ["9780000000001"], number_of_pages_median: 244,
  }, url);
  assert.equal(result?.description, "A real description.");
  assert.equal(result?.firstPublishYear, 2018);
  assert.equal(result?.isbn, "9780000000001");
  assert.equal(result?.pageCount, 244);
  assert.equal(result?.sources.description, url);
});

test("extractCoverMetadata returns null when nothing is available", () => {
  assert.equal(extractCoverMetadata({ title: "Only title" }, url), null);
});
