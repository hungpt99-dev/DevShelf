import assert from "node:assert/strict";
import test from "node:test";
import { estimateMinutes, remainingMinutes } from "../../src/lib/reading-time";

test("estimateMinutes rounds up at 225 words per minute", () => {
  assert.equal(estimateMinutes(225), 1);
  assert.equal(estimateMinutes(226), 2);
  assert.equal(estimateMinutes(0), 0);
});

test("remainingMinutes uses total and consumed word counts", () => {
  assert.equal(remainingMinutes(900, 450), 2);
  assert.equal(remainingMinutes(100, 200), 0);
});
