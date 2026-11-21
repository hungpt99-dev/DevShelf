import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">404</p>
      <h1 className="mt-3 text-[30px] font-medium tracking-tight">This book is not on the shelf</h1>
      <p className="mt-4 text-[13px] text-muted">It may have been removed in a newer catalog sync.</p>
      <Link href="/books" className="primary-action mt-8 inline-flex rounded-[12px] bg-button-bg px-5 py-2.5 text-[13px] font-medium text-button-fg hover:opacity-90">Browse the library</Link>
    </div>
  );
}
