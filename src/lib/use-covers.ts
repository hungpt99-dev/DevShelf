"use client";

import { useEffect, useState } from "react";
import { publicPath } from "@/lib/utils";

type CoverMap = Record<string, string>;

let coversPromise: Promise<CoverMap> | null = null;

/** One same-origin fetch per page load. Failure is a normal empty map. */
export function fetchCovers(): Promise<CoverMap> {
  coversPromise ??= fetch(publicPath("/data/covers.json"))
    .then((response) => (response.ok ? response.json() as Promise<unknown> : Promise.resolve({})))
    .then((value): CoverMap => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return {};
      const result: CoverMap = {};
      for (const [id, url] of Object.entries(value as Record<string, unknown>)) {
        if (typeof url === "string" && /^https:\/\//.test(url)) result[id] = url;
      }
      return result;
    })
    .catch(() => ({}));
  return coversPromise;
}

export function useCovers(): CoverMap {
  const [covers, setCovers] = useState<CoverMap>({});
  useEffect(() => {
    let active = true;
    void fetchCovers().then((value) => { if (active) setCovers(value); });
    return () => { active = false; };
  }, []);
  return covers;
}

export function useCoverUrl(bookId: string): string | undefined {
  return useCovers()[bookId];
}
