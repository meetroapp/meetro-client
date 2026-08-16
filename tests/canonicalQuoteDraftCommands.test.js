import assert from "node:assert/strict";
import test from "node:test";

import { applyConfirmedQuoteComposition } from "../src/utils/canonicalQuoteDraftCommands.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  quote: "22222222-2222-4222-8222-222222222222",
  participant: "33333333-3333-4333-8333-333333333333",
  scope: "44444444-4444-4444-8444-444444444444",
  proposal: "55555555-5555-4555-8555-555555555555",
  createKey: "66666666-6666-4666-8666-666666666666",
  scopeKey: "77777777-7777-4777-8777-777777777777",
});
const timestamp = "2026-08-16T00:00:00.000Z";

function source() {
  return { type: "MANUAL_PROFESSIONAL", version: null, findingId: null, recommendationId: null, workstreamId: null, activityId: null, obligationId: null };
}

function version(number, scopeItems = []) {
  const totalMinor = scopeItems.reduce((sum, item) => sum + (item.includedInTotal ? item.lineTotalMinor : 0), 0);
  return {
    version: number, status: "DRAFT", currency: "USD",
    materialsSubtotalMinor: 0, laborServiceSubtotalMinor: totalMinor, totalMinor,
    scopeItemCount: scopeItems.length, conditions: [], exclusions: [], issuedAt: null,
    integrityHash: String(number).repeat(64), createdAt: timestamp,
  };
}

function quote(scopeItems = []) {
  return {
    id: ids.quote, jobId: ids.job, requestId: 1, relationshipId: 2,
    issuerParticipantId: ids.participant, parentQuoteId: null, lineageType: null,
    lineageReasonCategory: null, status: "DRAFT", issuedAt: null, currency: "USD",
    currentVersion: scopeItems.length + 1, materialsSubtotalMinor: 0,
    laborServiceSubtotalMinor: scopeItems.reduce((sum, item) => sum + item.lineTotalMinor, 0),
    totalMinor: scopeItems.reduce((sum, item) => sum + item.lineTotalMinor, 0),
    scopeItemCount: scopeItems.length, conditions: [], exclusions: [], scopeItems,
    versions: Array.from({ length: scopeItems.length + 1 }, (_, index) => version(index + 1, scopeItems.slice(0, index))),
    createdAt: timestamp, updatedAt: timestamp, decisionState: null,
    decisionVersion: null, decidedAt: null,
  };
}

test("reviewed composition creates a Draft Quote then adds exact scope without issuing", async () => {
  const candidate = {
    classification: "LABOR_SERVICE", scopeSemantic: "FUTURE_WORK",
    materialResponsibility: "NOT_APPLICABLE", description: "Rebuild knee wall",
    quantity: 1, unitAmountMinor: 265000, source: { type: "MANUAL_PROFESSIONAL" },
  };
  const scopeItem = {
    scopeItemId: ids.scope, scopeItemRevision: 1, sequence: 1,
    ...candidate, lineTotalMinor: 265000, includedInTotal: true,
    source: source(), createdAt: timestamp,
  };
  const calls = [];
  const responses = [
    { quotes: [] },
    { quote: quote() },
    { quote: quote([scopeItem]) },
  ];
  const result = await applyConfirmedQuoteComposition({
    jobId: ids.job,
    proposal: {
      proposalId: ids.proposal, jobId: ids.job,
      humanToCanonicalBoundary: { directMutationAllowed: false },
      proposedScopeItems: [{ id: "wall_scope", canonicalCandidate: candidate }],
    },
    createKey: ids.createKey,
    scopeKeys: [ids.scopeKey],
    authFetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { response: { ok: true, status: options.method === "GET" ? 200 : 201 }, data: { success: true, ...responses.shift() } };
    },
  });
  assert.equal(result.status, "DRAFT");
  assert.equal(result.currentVersion, 2);
  assert.deepEqual(calls.map((call) => [call.options.method, call.url]), [
    ["GET", `/jobs/${ids.job}/quotes`],
    ["POST", `/jobs/${ids.job}/quotes`],
    ["POST", `/quotes/${ids.quote}/scope-items`],
  ]);
  assert.equal(JSON.parse(calls[2].options.body).expectedVersion, 1);
  assert.equal(calls.some((call) => /issue|approve|decline/.test(call.url)), false);
});
