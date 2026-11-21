"use client";

import { useEffect, useState } from "react";
import { publicPath } from "@/lib/utils";

export default function OfflineRegistrar() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker.register(publicPath("/sw.js"), { scope: publicPath("/") })
      .then((registration) => {
        if (cancelled) return;
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setMessage("A new version is ready. Reload to update.");
          });
        });
      })
      .catch(() => { if (!cancelled) setMessage("Offline registration failed."); });
    return () => { cancelled = true; };
  }, []);

  const clearOffline = async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("devshelf-")).map((key) => caches.delete(key)));
    setMessage("Offline data cleared.");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void clearOffline()} className="rounded-[12px] border border-line px-3 py-2 text-[12px] hover:border-lime">Clear offline data</button>
      {message && <p className="text-[12px] text-lime-text" role="status">{message}</p>}
    </div>
  );
}
