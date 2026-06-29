import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workCenterAttentionHierarchyPath =
  "docs/KnowledgeBase/WORK_CENTER_ATTENTION_HIERARCHY.md";

test("Work Center attention hierarchy document exists and defines architectural timing", () => {
  assert.ok(fs.existsSync(workCenterAttentionHierarchyPath));

  const doc = fs.readFileSync(workCenterAttentionHierarchyPath, "utf8");

  assert.match(doc, /# Work Center Attention Hierarchy/);
  assert.match(doc, /Immediate Attention/);
  assert.match(doc, /Today's Attention/);
  assert.match(doc, /Reference Attention/);
  assert.match(doc, /Time Flow/);
  assert.match(doc, /Focus Transition/);
  assert.match(doc, /Attention should follow the work\./);
  assert.match(doc, /The work remains the anchor\./);
});
