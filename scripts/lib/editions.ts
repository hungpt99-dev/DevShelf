import type { Book } from "../../src/types/book";

type EditionSource = Pick<Book, "id" | "title" | "authors" | "language" | "format" | "reading">;

export interface Edition {
  id: string;
  title: string;
  authors: string[];
  language: string;
  format: string;
  readable: boolean;
}

export interface GroupedWork extends Edition {
  editions: Edition[];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function workKey(book: EditionSource): string {
  const title = normalize(book.title);
  const author = normalize(book.authors[0] ?? "");
  return author ? `${title}::${author}` : title;
}

export function groupEditions(books: EditionSource[]): GroupedWork[] {
  const groups = new Map<string, EditionSource[]>();
  for (const book of books) {
    const key = workKey(book);
    groups.set(key, [...(groups.get(key) ?? []), book]);
  }
  return [...groups.values()].map((members) => {
    const editions: Edition[] = members.map((book) => ({
      id: book.id, title: book.title, authors: book.authors, language: book.language,
      format: book.format, readable: Boolean(book.reading?.available),
    })).sort((a, b) => Number(b.readable) - Number(a.readable) || a.language.localeCompare(b.language) || a.format.localeCompare(b.format));
    const best = editions[0];
    return { ...best, editions };
  });
}
