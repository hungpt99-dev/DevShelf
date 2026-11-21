import type { Book } from "@/types/book";
import { BookCard } from "@/components/books/book-card";

export function BookGrid({ books }: { books: Book[] }) {
  return (
    <div className="grid grid-cols-2 gap-[14px] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {books.map((book) => <BookCard key={book.id} book={book} />)}
    </div>
  );
}
