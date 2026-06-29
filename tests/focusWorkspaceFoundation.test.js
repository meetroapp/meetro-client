import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const focusWorkspacePath =
  "docs/KnowledgeBase/FOCUS_WORKSPACE_FOUNDATION.md";

test("Focus Workspace foundation document exists and preserves continuity language", () => {
  assert.ok(fs.existsSync(focusWorkspacePath));

  const doc = fs.readFileSync(focusWorkspacePath, "utf8");

  assert.match(doc, /# Focus Workspace Foundation/);
  assert.match(doc, /People don't navigate their work\./);
  assert.match(doc, /The current work is the anchor\./);
  assert.match(doc, /The Law of Continuity/);
  assert.match(doc, /The Law of Focus/);
  assert.match(doc, /The Companion protects awareness\./);
  assert.match(doc, /Focus Workspace protects context\./);
});
