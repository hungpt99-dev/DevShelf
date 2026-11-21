import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page is not on the shelf</h1>
      <p className="mt-4 text-sm text-muted-foreground">The resource may have been removed in a newer catalog sync.</p>
      <Link href="/books" className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Browse the library</Link>
    </div>
  );
}
