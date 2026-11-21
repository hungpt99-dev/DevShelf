export interface SyncEntry {
  id: string;
  updatedAt: string;
  status: "saved" | "reading" | "completed";
}

export interface MergeResult {
  merged: SyncEntry[];
  conflicts: SyncEntry[];
}

export function mergeEntries(local: SyncEntry[], remote: SyncEntry[]): MergeResult {
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const localById = new Map(local.map((item) => [item.id, item]));
  const conflicts: SyncEntry[] = [];
  const merged: SyncEntry[] = [];

  for (const item of local) {
    const other = remoteById.get(item.id);
    if (!other) { merged.push(item); continue; }
    const winner = other.updatedAt > item.updatedAt ? other : item;
    merged.push(winner);
    if (other.status !== item.status) conflicts.push(winner);
  }
  for (const item of remote) if (!localById.has(item.id)) merged.push(item);
  return { merged, conflicts };
}
