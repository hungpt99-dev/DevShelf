export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pdfHighlightKey(bookId: string, page: number): string {
  return `${bookId}:${page}`;
}

const clamp = (value: number) => Math.min(1000, Math.max(0, Math.round(value)));

export function clampRect(rect: PdfRect): PdfRect {
  return { x: clamp(rect.x), y: clamp(rect.y), width: clamp(rect.width), height: clamp(rect.height) };
}
