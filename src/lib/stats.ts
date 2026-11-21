export interface ReadingSession {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  activeMs: number;
}

export function streakFromDays(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return 0;
  let streak = 1;
  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const current = new Date(`${sorted[index]}T00:00:00Z`).getTime();
    const previous = new Date(`${sorted[index - 1]}T00:00:00Z`).getTime();
    if (current - previous === 86_400_000) streak += 1;
    else break;
  }
  return streak;
}

export function aggregateSessions(sessions: ReadingSession[]) {
  const heatmap = new Map<string, number>();
  for (const session of sessions) {
    const day = session.date.slice(0, 10);
    heatmap.set(day, (heatmap.get(day) ?? 0) + Math.round(session.activeMs / 60_000));
  }
  const days = [...heatmap.keys()].sort();
  const last = days.length ? new Date(`${days.at(-1)!}T00:00:00Z`).getTime() : 0;
  const weeklyMinutes = days
    .filter((day) => (last - new Date(`${day}T00:00:00Z`).getTime()) < 7 * 86_400_000)
    .reduce((sum, day) => sum + (heatmap.get(day) ?? 0), 0);
  return {
    weeklyMinutes,
    currentStreak: streakFromDays(days),
    longestStreak: days.reduce((best, _day, index) => Math.max(best, streakFromDays(days.slice(0, index + 1))), 0),
    heatmap,
  };
}
