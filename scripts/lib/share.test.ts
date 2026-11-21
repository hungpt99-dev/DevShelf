import assert from "node:assert/strict";
import test from "node:test";
import { decodeShare, encodeShare, SHARE_LIMIT, type SharePayload } from "../../src/lib/share";

const payload: SharePayload = { v: 1, kind: "shelf" as const, title: "Learning", items: [{ id: "b-1", status: "reading" }] };

test("share payload round-trips through compression and base64url", async () => {
  const encoded = await encodeShare(payload);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeShare(`#s=${encoded}`), payload);
});

test("share rejects bad version, hash and oversize payloads", async () => {
  assert.equal(await decodeShare("#s=not-base64!"), null);
  assert.equal(await decodeShare("#s=" + Buffer.from(JSON.stringify({ v: 2 })).toString("base64url")), null);
  assert.ok(SHARE_LIMIT > 100);
  await assert.rejects(() => encodeShare({ ...payload, items: Array.from({ length: 2000 }, (_, i) => ({ id: `b-${i}` })) }), /too large/);
});
