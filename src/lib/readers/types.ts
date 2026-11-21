import type { Book, ReaderType } from "@/types/book";

export interface Chapter {
  id: string;
  title: string;
  level: number;
}

export interface ReaderContent {
  type: ReaderType;
  title: string;
  chapters: Chapter[];
  markdown?: string;
  html?: string;
  pdfUrl?: string;
  assetBase: string | null;
  sourceUrl: string;
  attribution: string;
  license: string | null;
}

export interface ReaderProvider {
  readonly name: string;
  canRead(book: Book, readablePath: string | null): boolean;
  getReaderType(book: Book): ReaderType;
  loadContent(book: Book, resourcePath: string, resource: { sourceUrl: string; attribution: string; license: string | null; assetBase: string | null }): Promise<ReaderContent>;
}
