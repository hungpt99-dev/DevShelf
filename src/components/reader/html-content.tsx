"use client";

import { useEffect, useRef } from "react";

export function HtmlContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    import("highlight.js/lib/common").then(({ default: hljs }) => {
      if (!active || !ref.current) return;
      ref.current.querySelectorAll("pre code").forEach((block) => {
        try { hljs.highlightElement(block as HTMLElement); } catch { /* keep unhighlighted code readable */ }
      });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [html]);

  return <div ref={ref} className="prose-reader pb-24" dangerouslySetInnerHTML={{ __html: html }} />;
}
