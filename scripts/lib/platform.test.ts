import assert from "node:assert/strict";
import test from "node:test";
import { isApplePlatform, shortcutHint } from "../../src/lib/platform";

test("shortcut hint matches the platform", () => {
  assert.equal(isApplePlatform("MacIntel"), true);
  assert.equal(isApplePlatform("iPhone"), true);
  assert.equal(isApplePlatform("Linux x86_64"), false);
  assert.equal(isApplePlatform("Win32"), false);
  assert.equal(shortcutHint(true), "⌘K");
  assert.equal(shortcutHint(false), "Ctrl K");
});
