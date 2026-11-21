import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBook, getSyncHistory } from "@/lib/data";

export const metadata: Metadata = { title: "New books", description: "Recently added catalog resources grouped by week." };

function weekKey(date: string): string {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value.toISOString().slice(0, 10);
}

export default function NewPage() {
  const history = getSyncHistory();
  const latest = history.at(-1);
  const groups = new Map<string, string[]>();

  if (latest && !latest.initial) {
    for (const id of latest.added) {
      const key = weekKey(latest.syncedAt);
      groups.set(key, [...(groups.get(key) ?? []), id]);
    }
  }
  for (const entry of history.slice(-8)) {
    for (const id of entry.added) {
      const key = weekKey(entry.syncedAt);
      groups.set(key, [...new Set([...(groups.get(key) ?? []), id])]);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Changelog</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight sm:text-[36px]">New books</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">Recently added resources grouped by week. Dates come from the real sync history.</p>
        </header>
        {latest?.initial && (
          <p className="mt-6 rounded-[16px] border border-line bg-card p-4 text-[13px] text-muted">This dataset starts from a full snapshot, so there is no earlier baseline. Weekly additions will appear after the next upstream change.</p>
        )}
        {[...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([week, ids]) => (
          <section key={week} className="mt-10">
            <h2 className="text-[18px] font-medium">Week of {week}</h2>
            <ul className="mt-4 space-y-2">
              {ids.slice(0, 40).map((id) => {
                const book = getBook(id);
                if (!book) return null;
                return (
                  <li key={id}>
                    <Link href={`/books/${id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-line bg-card p-4 hover:border-lime">
                      <span className="text-[13px] font-medium">{book.title}</span>
                      <span className="font-mono text-[10px] text-muted">{book.language} · {book.format}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {groups.size === 0 && !latest?.initial && <p className="mt-10 text-[13px] text-muted">No new resources in the recent sync history.</p>}
        <p className="mt-10"><Link href="/changelog" className="text-[13px] link-lime">View full changelog</Link></p>
      </div>
      <SiteFooter />
    </>
  );
}
