"use client";

import { useState } from "react";
import Link from "next/link";

export function CategoryChips({ categories }: { categories: string[] }) {
  const [selected, setSelected] = useState("");
  const chips = ["All", ...categories];

  return (
    <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Browse categories">
      {chips.map((chip) => {
        const active = selected === chip || (chip === "All" && !selected);
        return (
          <Link
            key={chip}
            href={chip === "All" ? "/books" : `/books?category=${encodeURIComponent(chip)}`}
            onClick={() => setSelected(chip === "All" ? "" : chip)}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full border border-white bg-white px-3 py-1.5 text-[12px] font-medium text-black"
                : "rounded-full border border-line bg-card px-3 py-1.5 text-[12px] text-muted hover:border-lime"
            }
          >
            {chip}
          </Link>
        );
      })}
    </div>
  );
}
