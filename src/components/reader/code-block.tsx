"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ children, language }: { children: ReactNode; language?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.querySelector("pre")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div ref={ref} className="code-block">
      <div className="code-block-bar">
        <span>{language || "code"}</span>
        <button type="button" className="code-block-copy inline-flex items-center gap-1" onClick={() => void copy()} aria-label="Copy code">
          {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}
