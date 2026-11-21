import GithubSlugger from "github-slugger";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { publicPath } from "@/lib/utils";
import type { Book, ReaderType } from "@/types/book";
import type { Chapter, ReaderContent, ReaderProvider } from "./types";

type MdNode = { type: string; depth?: number; value?: string; children?: MdNode[] };

function textOf(node: MdNode): string {
  if (node.value) return node.value;
  return (node.children ?? []).map(textOf).join("");
}

export function chaptersFromMarkdown(markdown: string): Chapter[] {
  const tree = unified().use(remarkParse).parse(markdown) as MdNode;
  const slugger = new GithubSlugger();
  const chapters: Chapter[] = [];
  const walk = (node: MdNode) => {
    if (node.type === "heading" && node.depth && node.depth <= 4) {
      const title = textOf(node).trim();
      if (title) chapters.push({ id: slugger.slug(title), title, level: node.depth });
    }
    (node.children ?? []).forEach(walk);
  };
  walk(tree);
  return chapters;
}

function chaptersFromHtml(html: string): { html: string; chapters: Chapter[] } {
  const document = new DOMParser().parseFromString(html, "text/html");
  const slugger = new GithubSlugger();
  const chapters: Chapter[] = [];
  document.querySelectorAll("h1,h2,h3,h4").forEach((heading) => {
    const title = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!title) return;
    if (!heading.id) heading.id = slugger.slug(title);
    chapters.push({ id: heading.id, title, level: Number(heading.tagName.slice(1)) });
  });
  return { html: document.body.innerHTML, chapters };
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(publicPath(path));
  if (!response.ok) throw new Error(`Could not load reading content (${response.status})`);
  return response.text();
}

type Resource = Parameters<ReaderProvider["loadContent"]>[2];

export class MarkdownReaderProvider implements ReaderProvider {
  readonly name = "MarkdownReaderProvider";
  canRead(book: Book, path: string | null): boolean {
    return book.reading.available && book.reading.type === "markdown" && Boolean(path);
  }
  getReaderType(): ReaderType { return "markdown"; }
  async loadContent(book: Book, path: string, resource: Resource): Promise<ReaderContent> {
    const markdown = await fetchText(path);
    return {
      type: "markdown", title: book.title, chapters: chaptersFromMarkdown(markdown), markdown,
      assetBase: resource.assetBase, sourceUrl: resource.sourceUrl,
      attribution: resource.attribution, license: resource.license,
    };
  }
}

export class HtmlReaderProvider implements ReaderProvider {
  readonly name = "HtmlReaderProvider";
  canRead(book: Book, path: string | null): boolean {
    return book.reading.available && book.reading.type === "html" && Boolean(path);
  }
  getReaderType(): ReaderType { return "html"; }
  async loadContent(book: Book, path: string, resource: Resource): Promise<ReaderContent> {
    const raw = await fetchText(path);
    const parsed = chaptersFromHtml(raw);
    const document = new DOMParser().parseFromString(parsed.html, "text/html");
    if (resource.assetBase) {
      document.querySelectorAll<HTMLAnchorElement | HTMLImageElement>("a[href], img[src]").forEach((element) => {
        const attribute = element.tagName.toLowerCase() === "a" ? "href" : "src";
        const value = element.getAttribute(attribute);
        if (!value || /^(https?:|mailto:|#|data:)/i.test(value)) return;
        try {
          element.setAttribute(attribute, new URL(value, resource.assetBase!).toString());
        } catch {
          element.removeAttribute(attribute);
        }
      });
      document.querySelectorAll("a[href^='http']").forEach((link) => {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
    }
    const { default: DOMPurify } = await import("dompurify");
    const html = DOMPurify.sanitize(document.body.innerHTML, {
      FORBID_TAGS: ["script", "style", "iframe", "form", "object", "embed"],
      FORBID_ATTR: ["onerror", "onload", "style"],
    });
    return {
      type: "html", title: book.title, chapters: parsed.chapters, html,
      assetBase: resource.assetBase, sourceUrl: resource.sourceUrl,
      attribution: resource.attribution, license: resource.license,
    };
  }
}

export class PdfReaderProvider implements ReaderProvider {
  readonly name = "PdfReaderProvider";
  canRead(book: Book, path: string | null): boolean {
    return book.reading.available && book.reading.type === "pdf" && Boolean(path);
  }
  getReaderType(): ReaderType { return "pdf"; }
  async loadContent(book: Book, path: string, resource: Resource): Promise<ReaderContent> {
    const response = await fetch(publicPath(path), { method: "HEAD" });
    if (!response.ok) throw new Error(`Could not load PDF (${response.status})`);
    return {
      type: "pdf", title: book.title, chapters: [], pdfUrl: path,
      assetBase: resource.assetBase, sourceUrl: resource.sourceUrl,
      attribution: resource.attribution, license: resource.license,
    };
  }
}

export class ExternalReaderProvider implements ReaderProvider {
  readonly name = "ExternalReaderProvider";
  canRead(): boolean { return false; }
  getReaderType(): ReaderType { return "external"; }
  async loadContent(book: Book, _path: string, resource: Resource): Promise<ReaderContent> {
    return {
      type: "external", title: book.title, chapters: [], assetBase: null,
      sourceUrl: resource?.sourceUrl ?? book.url, attribution: resource?.attribution ?? book.source.repository,
      license: resource?.license ?? book.license,
    };
  }
}

export const providers = {
  markdown: new MarkdownReaderProvider(),
  html: new HtmlReaderProvider(),
  pdf: new PdfReaderProvider(),
  external: new ExternalReaderProvider(),
};

export function selectProvider(book: Book, path: string | null, type: ReaderType | null): ReaderProvider {
  if (!path || !type || type === "external") return providers.external;
  const provider = providers[type];
  return provider?.canRead(book, path) ? provider : providers.external;
}
