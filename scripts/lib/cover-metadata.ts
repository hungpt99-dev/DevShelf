export interface CoverMetadata {
  description?: string;
  firstPublishYear?: number;
  isbn?: string;
  pageCount?: number;
  sources: Record<string, string>;
}

export function extractCoverMetadata(doc: Record<string, unknown>, sourceUrl: string): CoverMetadata | null {
  const result: CoverMetadata = { sources: {} };
  const description = typeof doc.description === "string" ? doc.description : Array.isArray(doc.description) ? String(doc.description[0] ?? "") : "";
  if (description.trim()) { result.description = description.slice(0, 500); result.sources.description = sourceUrl; }
  const year = Number(doc.first_publish_year);
  if (Number.isInteger(year) && year > 0) { result.firstPublishYear = year; result.sources.firstPublishYear = sourceUrl; }
  const isbn = Array.isArray(doc.isbn) ? doc.isbn.find((value) => typeof value === "string" && value.length === 13) : null;
  if (isbn) { result.isbn = isbn; result.sources.isbn = sourceUrl; }
  const pages = Number(doc.number_of_pages_median);
  if (Number.isInteger(pages) && pages > 0) { result.pageCount = pages; result.sources.pageCount = sourceUrl; }
  return Object.keys(result.sources).length ? result : null;
}
