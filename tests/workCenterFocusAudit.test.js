import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workCenterFocusAuditPath =
  "docs/KnowledgeBase/WORK_CENTER_FOCUS_AUDIT.md";

test("Work Center focus audit document exists and defines attention hierarchy", () => {
  assert.ok(fs.existsSync(workCenterFocusAuditPath));

  const doc = fs.readFileSync(workCenterFocusAuditPath, "utf8");

  assert.match(doc, /# Work Center Focus Audit/);
  assert.match(doc, /Immediate Attention/);
  assert.match(doc, /Today's Attention/);
  assert.match(doc, /Reference Attention/);
  assert.match(doc, /The interface should not organize screens\./);
  assert.match(doc, /It should organize attention\./);
});
