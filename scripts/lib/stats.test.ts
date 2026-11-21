import assert from "node:assert/strict";
import test from "node:test";
import { aggregateSessions, streakFromDays } from "../../src/lib/stats";

const day = (offset: number) => new Date(Date.UTC(2026, 0, 5 + offset)).toISOString();

test("aggregateSessions sums minutes by local date", () => {
  const result = aggregateSessions([
    { id: "1", date: day(0), startedAt: day(0), endedAt: day(0), activeMs: 25 * 60_000 },
    { id: "2", date: day(0), startedAt: day(0), endedAt: day(0), activeMs: 10 * 60_000 },
    { id: "3", date: day(1), startedAt: day(1), endedAt: day(1), activeMs: 5 * 60_000 },
  ]);
  assert.equal(result.weeklyMinutes, 40);
  assert.equal(result.heatmap.get(day(0).slice(0, 10)), 35);
});

test("streaks count consecutive active days", () => {
  assert.equal(streakFromDays(["2026-01-01", "2026-01-02", "2026-01-03"]), 3);
  assert.equal(streakFromDays(["2026-01-01", "2026-01-03"]), 1);
  assert.equal(streakFromDays([]), 0);
});
