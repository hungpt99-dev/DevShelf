"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

export function HeroSearch({ count }: { count: number }) {
  const [value, setValue] = useState("");
  const { setSearchOpen, setSearchQuery } = useUIStore();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchQuery(value);
    setSearchOpen(true);
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-2xl gap-2" role="search">
      <label htmlFor="hero-search" className="sr-only">Search the library</label>
      <input
        id="hero-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Search ${count.toLocaleString()} books, authors...`}
        className="h-13 min-w-0 flex-1 rounded-[12px] border border-line-strong bg-card px-4 text-[14px] outline-none placeholder:text-muted hover:border-lime focus:border-lime"
      />
      <button type="submit" className="primary-action flex h-13 shrink-0 items-center gap-2 rounded-[12px] bg-button-bg px-5 text-[13px] font-medium text-button-fg hover:opacity-90" aria-label="Search books">
        <Search className="size-4" aria-hidden /> <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
