import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getParticipantRoleLabelKey,
  normalizeRequestLifecycleFoundation,
} from "../src/utils/requestLifecycleFoundation.js";
import { t } from "../src/utils/language.js";

test("v2 lifecycle response preserves original concern, clarifications, and active roles", () => {
  const normalized = normalizeRequestLifecycleFoundation({
    lifecycle: {
      requestId: 41,
      contractVersion: 2,
      legacy: false,
      job: { id: "job-1" },
      reportedConcerns: [{
        id: "concern-1",
        originalText: "dishwasher issue",
        reportedAt: "2026-08-09T12:00:00.000Z",
        sequence: 1,
        clarifications: [{
          id: "clarification-1",
          semantics: "CORRECTS_INTERPRETATION",
          text: "Current understanding is a disposal and drainage fault.",
        }],
      }],
      participants: [{
        id: "participant-1",
        displayName: "Homeowner QA",
        roles: [
          { role: "CUSTOMER_REPRESENTATIVE", active: true },
          { role: "SITE_OCCUPANT", active: false },
        ],
      }],
    },
  });

  assert.equal(normalized.legacy, false);
  assert.equal(normalized.reportedConcerns[0].originalText, "dishwasher issue");
  assert.equal(normalized.reportedConcerns[0].clarifications.length, 1);
  assert.deepEqual(normalized.participants[0].roles, ["CUSTOMER_REPRESENTATIVE"]);
  assert.equal(
    getParticipantRoleLabelKey("CUSTOMER_REPRESENTATIVE"),
    "lifecycleRoleCustomerRepresentative"
  );
});

test("malformed lifecycle data fails closed without inventing concern or participant truth", () => {
  assert.equal(normalizeRequestLifecycleFoundation(null), null);
  assert.equal(normalizeRequestLifecycleFoundation({}), null);
  const normalized = normalizeRequestLifecycleFoundation({
    lifecycle: {
      contractVersion: 2,
      reportedConcerns: [{ id: "concern-without-text" }, null],
      participants: [{ id: "participant", roles: [{ role: "SPECIALIST", active: false }] }],
    },
  });
  assert.deepEqual(normalized.reportedConcerns, []);
  assert.deepEqual(normalized.participants[0].roles, []);
});

test("My Requests loads lifecycle only for backend-declared v2 and exposes no mutation controls", () => {
  const source = readFileSync(
    new URL("../src/pages/MyRequests.jsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /contractVersion !== 2/);
  assert.match(source, /\/posts\/\$\{encodeURIComponent\(requestId\)\}\/lifecycle/);
  assert.match(source, /reportedConcernHistory/);
  assert.match(source, /knownJobParticipants/);
  assert.doesNotMatch(source, /reported-concerns[^"'`]*\/(?:update|delete)|assign-role|create-grant/i);
});

test("Slice 001 lifecycle copy is complete in active languages", () => {
  const keys = [
    "reportedConcernHistory",
    "originallyReported",
    "concernClarifications",
    "knownJobParticipants",
    "lifecycleParticipant",
    "lifecycleHistoryUnavailable",
    "lifecycleRoleCustomerRepresentative",
    "lifecycleRoleSiteOccupant",
    "lifecycleRolePrimaryProfessional",
    "lifecycleRoleSpecialist",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      const value = t(key, language);
      assert.equal(typeof value, "string");
      assert.notEqual(value, key);
      assert.ok(value.trim().length > 0);
    }
  }
});
