"use client";
/* eslint-disable @next/next/no-img-element -- Book content images come from the source and are intentionally served unoptimized. */

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/reader/code-block";

function resolveAsset(value: string | undefined, assetBase: string | null): string | undefined {
  if (!value) return undefined;
  if (/^(https?:|mailto:|#|data:)/i.test(value) || !assetBase) return value;
  try { return new URL(value, assetBase).toString(); } catch { return value; }
}

function languageOf(children: ReactNode): string | undefined {
  if (!isValidElement(children)) return undefined;
  const props = children.props as { className?: string };
  const match = props.className?.match(/language-([\w+#-]+)/);
  return match?.[1];
}

export function MarkdownContent({ markdown, assetBase }: { markdown: string; assetBase: string | null }) {
  const components: Components = {
    a({ href, children, ...props }) {
      const link = typeof href === "string" ? href : undefined;
      return <a href={resolveAsset(link, assetBase)} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
    img({ src, alt }) {
      const image = typeof src === "string" ? src : undefined;
      return <img src={resolveAsset(image, assetBase)} alt={alt ?? ""} loading="lazy" />;
    },
    pre({ children }) {
      return <CodeBlock language={languageOf(children)}>{children}</CodeBlock>;
    },
  };
  return (
    <div className="prose-reader pb-28">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, rehypeHighlight]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
