import assert from "node:assert/strict";
import test from "node:test";
import { isEditableTarget } from "../../src/lib/keyboard";

test("slash shortcut ignores editable targets", () => {
  assert.equal(isEditableTarget({ tagName: "INPUT" }), true);
  assert.equal(isEditableTarget({ tagName: "textarea" }), true);
  assert.equal(isEditableTarget({ tagName: "SELECT" }), true);
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: "BODY" }), false);
  assert.equal(isEditableTarget(null), false);
});
