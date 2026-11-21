import {
  BookOpen, Box, Brain, Coffee, Database, FileCode, GitBranch, Globe,
  Network, Shield, SquareTerminal, Terminal, type LucideIcon,
} from "lucide-react";
import type { Book } from "../types/book";
import { normalizeCoverText } from "./cover-text";

/** FNV-1a 32-bit hash. Stable across runs and never depends on locale. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const TOPIC_RULES: { pattern: RegExp; icon: LucideIcon }[] = [
  // Specific topics first; \bjava\b never matches JavaScript.
  { pattern: /\b(ai|artificial intelligence|machine learning|deep learning|neural|tensorflow|pytorch|llm|gpt)\b/i, icon: Brain },
  { pattern: /\bjava\b|\bj2ee\b|java ee/i, icon: Coffee },
  { pattern: /\b(javascript|node|nodejs|react|typescript|jsx|npm)\b/i, icon: FileCode },
  { pattern: /\b(python|django|flask)\b/i, icon: Terminal },
  { pattern: /\b(algorithm|algorithms|data structure|data structures)\b/i, icon: Network },
  { pattern: /\b(database|databases|sql|mysql|postgres|postgresql|sqlite|mongodb)\b/i, icon: Database },
  { pattern: /\b(3d|game|games|graphics|webgl|opengl|animation)\b/i, icon: Box },
  { pattern: /\b(linux|unix|shell|bash|zsh|command line)\b/i, icon: SquareTerminal },
  { pattern: /\b(git|github|devops|docker|kubernetes|k8s|ci|cd|deployment)\b/i, icon: GitBranch },
  { pattern: /\b(security|cryptography|pentest|authentication|secure)\b/i, icon: Shield },
  { pattern: /\b(web|html|css|browser|http|frontend|front end)\b/i, icon: Globe },
];

export function pickTopic(title: string, category: string | string[] = []): LucideIcon {
  const categories = Array.isArray(category) ? category : [category];
  const text = normalizeCoverText(`${title} ${categories.join(" ")}`).replace(/3d/g, " 3d ");
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) return rule.icon;
  }
  return BookOpen;
}

export const COVER_SKINS = ["dark", "lime", "paper", "ink"] as const;
export const COVER_PATTERNS = ["dots", "grid", "rings", "diagonal"] as const;
export type CoverSkin = (typeof COVER_SKINS)[number];
export type CoverPattern = (typeof COVER_PATTERNS)[number];

export interface CoverSpec {
  skin: CoverSkin;
  pattern: CoverPattern;
  topic: LucideIcon;
}

export function getCoverSpec(book: Pick<Book, "id" | "title" | "categories">): CoverSpec {
  const seed = hashString(book.id || book.title || "devshelf");
  return {
    skin: COVER_SKINS[seed % COVER_SKINS.length],
    pattern: COVER_PATTERNS[(seed >>> 3) % COVER_PATTERNS.length],
    topic: pickTopic(book.title, book.categories),
  };
}
