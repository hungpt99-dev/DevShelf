import { Binary, Boxes, Braces, Code2, Database, Globe2, Layers3, Server, Terminal, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/book";

const SKINS = [
  { bg: "#f4f4f0", fg: "#111111", border: "#e7e7e2" },
  { bg: "#c8f542", fg: "#1a2200", border: "#c8f542" },
  { bg: "#202020", fg: "#f4f4f0", border: "#4a4a4a" },
  { bg: "#0e0e0e", fg: "#f4f4f0", border: "#3a3a3a" },
] as const;

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  java: Braces, javascript: Braces, typescript: Braces, python: Code2, go: Terminal,
  rust: Binary, "c++": Code2, database: Database, databases: Database, devops: Server,
  "machine learning": Boxes, "software architecture": Layers3, web: Globe2,
};

function hash(value: string): number {
  return [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

export function BookCover({ book, large = false, className }: { book: Book; large?: boolean; className?: string }) {
  const skin = SKINS[hash(book.id) % SKINS.length];
  const category = book.categories[0]?.toLowerCase() ?? "";
  const Icon = CATEGORY_ICONS[category] ?? BookOpen;

  return (
    <div
      className={cn("relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-[12px] border p-3", className)}
      style={{ backgroundColor: skin.bg, color: skin.fg, borderColor: skin.border }}
      aria-hidden
    >
      <div className="flex size-8 items-center justify-center rounded-[10px] border opacity-70" style={{ borderColor: skin.fg }}>
        <Icon className="size-4" />
      </div>
      <div className="min-h-0">
        <p
          className={cn(
            "line-clamp-4 font-medium leading-[1.15] tracking-[-0.03em]",
            large ? "text-[24px]" : "text-[17px]",
          )}
        >
          {book.title}
        </p>
        <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.12em] opacity-60">
          {book.language}
        </p>
      </div>
    </div>
  );
}
