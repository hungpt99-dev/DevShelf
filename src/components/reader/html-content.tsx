"use client";

import { useEffect, useRef } from "react";

export function HtmlContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    import("highlight.js/lib/common").then(({ default: hljs }) => {
      if (!active || !ref.current) return;
      ref.current.querySelectorAll("pre code").forEach((block) => {
        try { hljs.highlightElement(block as HTMLElement); } catch { /* keep code readable */ }
      });

      ref.current?.querySelectorAll("pre").forEach((pre) => {
        if (pre.parentElement?.classList.contains("code-block")) return;
        const wrapper = document.createElement("div");
        wrapper.className = "code-block";
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const bar = document.createElement("div");
        bar.className = "code-block-bar";
        const code = pre.querySelector("code");
        const match = code?.className.match(/language-([\w+#-]+)/);
        const label = document.createElement("span");
        label.textContent = match?.[1] ?? "code";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "code-block-copy";
        button.setAttribute("aria-label", "Copy code");
        button.textContent = "Copy";
        button.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(pre.textContent ?? "");
            button.textContent = "Copied";
            window.setTimeout(() => { button.textContent = "Copy"; }, 1200);
          } catch { /* clipboard unavailable */ }
        });
        bar.append(label, button);
        wrapper.insertBefore(bar, pre);
      });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [html]);

  return <div ref={ref} className="prose-reader pb-28" dangerouslySetInnerHTML={{ __html: html }} />;
}
