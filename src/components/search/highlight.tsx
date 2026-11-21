import { Fragment } from "react";

export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length >= 2);
  if (!terms.length) return <>{text}</>;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  const lower = new Set(terms.map((term) => term.toLowerCase()));
  return (
    <>
      {parts.map((part, index) =>
        lower.has(part.toLowerCase()) ? (
          <mark key={index} className="rounded-sm bg-primary/15 px-0.5 text-foreground">{part}</mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
