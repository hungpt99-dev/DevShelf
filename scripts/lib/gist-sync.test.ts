import assert from "node:assert/strict";
import test from "node:test";
import { mergeEntries, type SyncEntry } from "../../src/lib/gist-sync";

const entry = (id: string, updatedAt: string, status: "reading" | "completed"): SyncEntry => ({ id, updatedAt, status });

test("mergeEntries keeps newer local and remote values and flags conflicts", () => {
  const local = [entry("a", "2026-01-02", "completed"), entry("b", "2026-01-01", "reading")];
  const remote = [entry("a", "2026-01-01", "reading"), entry("b", "2026-01-02", "completed")];
  const result = mergeEntries(local, remote);
  assert.deepEqual(result.merged.map((item) => [item.id, item.status]), [["a", "completed"], ["b", "completed"]]);
  assert.equal(result.conflicts.length, 2);
});

test("mergeEntries adds remote-only entries without conflict", () => {
  const result = mergeEntries([entry("a", "2026-01-01", "reading")], [entry("b", "2026-01-01", "reading")]);
  assert.equal(result.merged.length, 2);
  assert.equal(result.conflicts.length, 0);
});
