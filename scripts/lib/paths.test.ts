import assert from "node:assert/strict";
import test from "node:test";
import { pathProgress, validatePath, type LearningPath } from "../../src/lib/paths";

const path: LearningPath = {
  id: "learn-rust", title: "Learn Rust", description: "A real path", level: "beginner",
  books: [{ id: "b-1", why: "Start here" }, { id: "b-2", why: "Go deeper" }], estimatedHours: 40,
};

test("validatePath rejects unknown ids and duplicate ordering", () => {
  assert.deepEqual(validatePath(path, ["b-1", "b-2"]), []);
  assert.ok(validatePath({ ...path, books: [{ id: "b-x", why: "?" }] }, ["b-1"]).length > 0);
  assert.ok(validatePath({ ...path, books: [path.books[0], path.books[0]] }, ["b-1"]).length > 0);
});

test("pathProgress is based on reading-list status only", () => {
  assert.deepEqual(pathProgress(path.books, { "b-1": "completed", "b-2": "reading" }), { completed: 1, reading: 1, total: 2, percentage: 50 });
  assert.deepEqual(pathProgress(path.books, {}), { completed: 0, reading: 0, total: 2, percentage: 0 });
});
