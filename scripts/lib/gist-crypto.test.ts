import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret } from "../../src/lib/gist-crypto";

test("encrypted token round-trips with the right passphrase", async () => {
  const encrypted = await encryptSecret("ghp_secret", "correct horse");
  assert.match(encrypted, /^v1\./);
  assert.notEqual(encrypted, "ghp_secret");
  assert.equal(await decryptSecret(encrypted, "correct horse"), "ghp_secret");
});

test("wrong passphrase cannot decrypt the token", async () => {
  const encrypted = await encryptSecret("ghp_secret", "right");
  await assert.rejects(decryptSecret(encrypted, "wrong"));
});
