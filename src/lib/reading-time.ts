const WORDS_PER_MINUTE = 225;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function estimateMinutes(words: number, wordsPerMinute = WORDS_PER_MINUTE): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function remainingMinutes(totalWords: number, consumedWords: number, wordsPerMinute = WORDS_PER_MINUTE): number {
  return estimateMinutes(Math.max(0, totalWords - consumedWords), wordsPerMinute);
}
