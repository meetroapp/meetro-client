import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const docsRoot = "docs";
const guidePath = path.join(docsRoot, "FOUNDER_ARCHIVE_GUIDE.md");

test("Founder Archive guide exists", () => {
  assert.ok(fs.existsSync(guidePath), "FOUNDER_ARCHIVE_GUIDE.md should exist");
});

test("Founder Archive guide includes required language and order", () => {
  const doc = fs.readFileSync(guidePath, "utf8");

  assert.match(doc, /Vault/);
  assert.match(doc, /Founder Archive/);
  assert.match(doc, /amended by discovery, never by preference/);
  assert.match(
    doc,
    /The professional never stopped working on the current work/
  );
  assert.match(
    doc,
    /Vault → Constitution → KnowledgeBase → Architecture → Stewardship → Execution → Code/
  );
});

