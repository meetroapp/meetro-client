import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const productCoherenceAuditPath = new URL(
  "../docs/KnowledgeBase/PRODUCT_COHERENCE_AUDIT.md",
  import.meta.url
);

const productCoherenceAuditSource = fs.readFileSync(productCoherenceAuditPath, "utf8");

test("Product Coherence Audit document exists", () => {
  assert.ok(fs.existsSync(productCoherenceAuditPath), "Product Coherence Audit should exist");
  assert.match(productCoherenceAuditSource, /# Product Coherence Audit/);
  assert.match(productCoherenceAuditSource, /Status: End-to-end experience validation/);
});

test("Product Coherence Audit preserves required journey sections", () => {
  [
    "Executive Summary",
    "Homeowner Journey",
    "Professional Journey",
    "Communication Journey",
    "Business Journey",
    "Companion Journey",
    "Desktop Journey",
    "Mobile Journey",
    "Terminology Review",
    "Guidance Review",
    "Emotional Continuity Review",
    "Architectural Drift",
    "Founder Assessment",
    "Product Readiness Decision",
  ].forEach((section) => {
    assert.match(productCoherenceAuditSource, new RegExp(`## .*${section}`));
  });
});

test("Product Coherence Audit protects guidance and emotional continuity contracts", () => {
  assert.match(productCoherenceAuditSource, /Does the next step feel obvious/);
  assert.match(productCoherenceAuditSource, /Users should understand what will happen before Meetro invokes a native operating system action/);
  assert.match(productCoherenceAuditSource, /Emotional continuity asks whether Meetro reduces uncertainty/);
  assert.match(productCoherenceAuditSource, /Where they are[\s\S]*Why they are there[\s\S]*What happens next/);
});

test("Product Coherence Audit reaches a product decision and separates drift categories", () => {
  assert.match(productCoherenceAuditSource, /Product Feels Cohesive/);
  assert.match(productCoherenceAuditSource, /### Resolved/);
  assert.match(productCoherenceAuditSource, /### Minor Refinement/);
  assert.match(productCoherenceAuditSource, /### Future Evolution/);
  assert.match(productCoherenceAuditSource, /Relationship -> Intent -> Conversation -> Understanding -> Decision -> Work -> History/);
});
