"use client";

import { useEffect, useState } from "react";
import { applySyncEntry, getPreferenceValue, getV2Entries, setPreferenceValue } from "@/lib/db/operations";
import { mergeEntries, type SyncEntry } from "@/lib/gist-sync";
import { encryptSecret } from "@/lib/gist-crypto";

const GIST_NAME = "devshelf.json";

export function GistSyncPanel() {
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [conflicts, setConflicts] = useState<SyncEntry[]>([]);

  useEffect(() => {
    void Promise.all([
      getPreferenceValue<boolean>("gistSyncEnabled"),
      getPreferenceValue<string>("gistSyncId"),
    ]).then(([on, id]) => { setEnabled(Boolean(on)); if (id) setMessage(`Connected to gist ${id}.`); });
  }, []);

  const entries = async (): Promise<SyncEntry[]> => (await getV2Entries()).map((item) => ({
    id: item.bookId,
    updatedAt: item.startedAt ?? item.addedAt,
    status: item.status,
  }));

  const showPreview = async () => {
    const local = await entries();
    setPreview(JSON.stringify({ version: 1, syncedAt: new Date().toISOString(), entries: local }, null, 2));
  };

  const sync = async () => {
    if (!token || !passphrase) { setMessage("Enter a GitHub token and passphrase first."); return; }
    try {
      const encrypted = await encryptSecret(token, passphrase);
      await setPreferenceValue("gistTokenEncrypted", encrypted);
      const local = await entries();
      const payload = JSON.stringify({ version: 1, syncedAt: new Date().toISOString(), entries: local }, null, 2);
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const gistId = await getPreferenceValue<string>("gistSyncId");
      const response = gistId
        ? await fetch(`https://api.github.com/gists/${gistId}`, { method: "PATCH", headers, body: JSON.stringify({ files: { [GIST_NAME]: { content: payload } } }) })
        : await fetch("https://api.github.com/gists", { method: "POST", headers, body: JSON.stringify({ description: "DevShelf reading-list sync", public: false, files: { [GIST_NAME]: { content: payload } } }) });
      if (!response.ok) { setMessage(`GitHub returned ${response.status}.`); return; }
      const result = await response.json() as { id: string; files: Record<string, { content?: string }> };
      await setPreferenceValue("gistSyncId", result.id);
      const remoteText = result.files[GIST_NAME]?.content ?? "";
      if (remoteText) {
        const remote = (JSON.parse(remoteText) as { entries?: SyncEntry[] }).entries ?? [];
        const merged = mergeEntries(local, remote);
        setConflicts(merged.conflicts);
        for (const item of merged.merged) await applySyncEntry(item.id, item.status, item.updatedAt);
      }
      setMessage(`Synced ${local.length} entries to secret gist ${result.id}. Notes and highlights were not uploaded.`);
      setToken("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed.");
    }
  };

  const disconnect = async () => {
    await Promise.all(["gistSyncId", "gistTokenEncrypted", "gistSyncEnabled"].map((key) => setPreferenceValue(key, null)));
    setEnabled(false); setMessage("Disconnected. The gist itself remains in your GitHub account."); setConflicts([]);
  };

  return (
    <section className="rounded-[16px] border border-line bg-card p-5" aria-label="Optional GitHub Gist sync">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-medium">Sync reading list to a private gist</h2>
          <p className="mt-1 max-w-xl text-[12px] text-muted">Off by default. When enabled, clicking Sync sends only book IDs, statuses and timestamps to a secret gist in your own GitHub account. Notes, highlights, bookmarks and settings never leave this browser.</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-[12px]">
          <input type="checkbox" checked={enabled} onChange={(event) => { const value = event.target.checked; setEnabled(value); void setPreferenceValue("gistSyncEnabled", value); }} className="accent-lime" aria-label="Enable gist sync" />
          Enable
        </label>
      </div>
      {enabled && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] text-muted">GitHub token (fine-grained, gist scope)
              <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-[10px] border border-line bg-background px-3 py-2 text-[12px] text-ink" />
            </label>
            <label className="text-[11px] text-muted">Passphrase to encrypt the token locally
              <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-[10px] border border-line bg-background px-3 py-2 text-[12px] text-ink" />
            </label>
          </div>
          <p className="text-[11px] text-muted">The token is stored only in IndexedDB as AES-GCM ciphertext. It is excluded from exports. You can decrypt it here with the same passphrase; there is no password recovery.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void showPreview()} className="rounded-[12px] border border-line px-3 py-2 text-[12px] hover:border-lime">Preview upload</button>
            <button type="button" onClick={() => void sync()} className="rounded-[12px] bg-lime px-3 py-2 text-[12px] font-medium text-on-lime">Sync now</button>
            <button type="button" onClick={() => void disconnect()} className="rounded-[12px] border border-line px-3 py-2 text-[12px] hover:border-lime">Disconnect</button>
          </div>
          {preview && <pre className="max-h-48 overflow-auto rounded-[12px] border border-line bg-background p-3 font-mono text-[10px] text-muted">{preview}</pre>}
          {conflicts.length > 0 && <p className="text-[12px] text-muted">{conflicts.length} status conflicts resolved in favour of the newer timestamp.</p>}
          {message && <p className="text-[12px] text-lime-text" role="status">{message}</p>}
        </div>
      )}
    </section>
  );
}
