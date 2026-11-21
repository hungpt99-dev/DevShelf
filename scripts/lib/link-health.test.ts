import assert from "node:assert/strict";
import test from "node:test";
import { updateLinkHealth } from "./link-health";

test("a link is broken only after two consecutive failures", () => {
  const first = updateLinkHealth(undefined, { ok: false, httpStatus: 500, redirected: false });
  assert.equal(first.status, "unknown");
  assert.equal(first.consecutiveFailures, 1);
  const second = updateLinkHealth(first, { ok: false, httpStatus: 500, redirected: false });
  assert.equal(second.status, "broken");
  assert.equal(second.consecutiveFailures, 2);
});

test("success resets failures and redirects are recorded", () => {
  const failed = updateLinkHealth(undefined, { ok: false, httpStatus: 500, redirected: false });
  const ok = updateLinkHealth(failed, { ok: true, httpStatus: 200, redirected: false });
  assert.equal(ok.status, "ok");
  assert.equal(ok.consecutiveFailures, 0);
  const redirected = updateLinkHealth(ok, { ok: true, httpStatus: 301, redirected: true });
  assert.equal(redirected.status, "redirected");
});
