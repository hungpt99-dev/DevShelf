export interface PathBook {
  id: string;
  why: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  books: PathBook[];
  estimatedHours?: number;
}

export function validatePath(path: LearningPath, validIds: string[]): string[] {
  const errors: string[] = [];
  const ids = path.books.map((book) => book.id);
  if (new Set(ids).size !== ids.length) errors.push(`${path.id}: duplicate book id in ordering`);
  for (const id of ids) if (!validIds.includes(id)) errors.push(`${path.id}: unknown book id ${id}`);
  if (path.books.some((book) => !book.why.trim())) errors.push(`${path.id}: every book needs a why note`);
  return errors;
}

export function pathProgress(
  books: PathBook[],
  statuses: Record<string, "saved" | "reading" | "completed">,
): { completed: number; reading: number; total: number; percentage: number } {
  const completed = books.filter((book) => statuses[book.id] === "completed").length;
  const reading = books.filter((book) => statuses[book.id] === "reading").length;
  const total = books.length;
  return { completed, reading, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
