/** Pure text helpers shared by the cover UI and the build-time cover fetcher. */

export function normalizeCoverText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function coverTokens(value: string): string[] {
  const normalized = normalizeCoverText(value);
  return normalized ? normalized.split(" ") : [];
}

export function titleSimilarity(left: string, right: string): number {
  const a = new Set(coverTokens(left));
  const b = new Set(coverTokens(right));
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function surnames(authors: string[]): string[] {
  return authors
    .map((author) => coverTokens(author).at(-1) ?? "")
    .filter((token) => token.length > 1);
}

/**
 * Conservative match: titles need two or more tokens and either Jaccard >= 0.8
 * or a prefix/subtitle relationship. If both sides name authors, one surname
 * must overlap. A wrong cover is worse than no cover.
 */
export function titlesMatch(
  bookTitle: string,
  candidateTitle: string,
  bookAuthors: string[] = [],
  candidateAuthors: string[] = [],
): boolean {
  const left = coverTokens(bookTitle);
  const right = coverTokens(candidateTitle);
  if (left.length < 2 || right.length < 2) return false;

  const a = new Set(left);
  const b = new Set(right);
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  const isSubtitleVariant = [...smaller].every((token) => larger.has(token));
  if (titleSimilarity(bookTitle, candidateTitle) < 0.8 && !isSubtitleVariant) return false;

  if (bookAuthors.length > 0 && candidateAuthors.length > 0) {
    const leftNames = surnames(bookAuthors);
    const rightNames = surnames(candidateAuthors);
    if (!leftNames.some((name) => rightNames.includes(name))) return false;
  }
  return true;
}
