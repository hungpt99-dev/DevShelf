import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PathDetail } from "@/components/paths/path-detail";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBook, getPath, getPaths } from "@/lib/data";

export function generateStaticParams() {
  return getPaths().map((path) => ({ id: path.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const path = getPath(id);
  return { title: path?.title ?? "Learning path", description: path?.description };
}

export default async function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = getPath(id);
  if (!path) notFound();
  const books = path.books.map((item) => getBook(item.id)).filter((book): book is NonNullable<typeof book> => Boolean(book));
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <PathDetail path={path} books={books} />
      </div>
      <SiteFooter />
    </>
  );
}
