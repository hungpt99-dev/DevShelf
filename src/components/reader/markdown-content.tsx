"use client";
/* eslint-disable @next/next/no-img-element -- Book content images come from the source and are intentionally served unoptimized. */

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

function resolveAsset(value: string | undefined, assetBase: string | null): string | undefined {
  if (!value) return undefined;
  if (/^(https?:|mailto:|#|data:)/i.test(value) || !assetBase) return value;
  try { return new URL(value, assetBase).toString(); } catch { return value; }
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
  };
  return (
    <div className="prose-reader pb-24">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
