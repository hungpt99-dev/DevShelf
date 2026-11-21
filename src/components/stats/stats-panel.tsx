"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { deleteStats, getPreferenceValue, getSessions, setPreferenceValue } from "@/lib/db/operations";
import { aggregateSessions } from "@/lib/stats";

const Heatmap = dynamic(() => import("@/components/stats/heatmap"), { ssr: false, loading: () => <p className="text-[12px] text-muted">Loading chart...</p> });

export function StatsPanel() {
  const sessions = useLiveQuery(() => getSessions(), []);
  const [goal, setGoal] = useState(150);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void getPreferenceValue<number>("weeklyGoal").then((value) => { if (value) setGoal(value); });
  }, []);

  const stats = aggregateSessions(sessions ?? []);
  const days = [...stats.heatmap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-56);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[[`${stats.weeklyMinutes} min`, "this week"], [`${stats.currentStreak} days`, "current streak"], [`${stats.longestStreak} days`, "longest streak"]].map(([value, label]) => (
          <div key={label} className="rounded-[16px] border border-line bg-card p-5">
            <p className="text-[22px] font-medium tracking-tight">{value}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <section className="rounded-[16px] border border-line bg-card p-5">
        <h2 className="text-[14px] font-medium">Weekly goal</h2>
        <p className="mt-1 text-[12px] text-muted">{stats.weeklyMinutes} / {goal} minutes</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, Math.round((stats.weeklyMinutes / goal) * 100))}%` }} role="progressbar" aria-valuenow={stats.weeklyMinutes} aria-valuemin={0} aria-valuemax={goal} aria-label="Weekly reading goal" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-[12px] text-muted">
          Goal (minutes)
          <input type="number" min={10} max={2000} value={goal} onChange={(event) => { const value = Number(event.target.value); setGoal(value); void setPreferenceValue("weeklyGoal", value); }} className="rounded-[10px] border border-line bg-background px-2 py-1" />
        </label>
      </section>
      <section className="rounded-[16px] border border-line bg-card p-5">
        <h2 className="text-[14px] font-medium">Activity</h2>
        <div className="mt-4"><Heatmap heatmap={days} /></div>
      </section>
      <button type="button" onClick={async () => { await deleteStats(); setMessage("Reading stats deleted."); }} className="rounded-[12px] border border-line px-4 py-2 text-[12px] hover:border-lime">Delete my stats</button>
      {message && <p className="text-[12px] text-lime-text" role="status">{message}</p>}
    </div>
  );
}
