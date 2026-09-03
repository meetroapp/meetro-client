import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateBusinessDocumentDraft,
} from "../src/utils/businessDocumentDraftApi.js";
import {
  normalizeBusinessDocumentTab,
} from "../src/utils/businessDocumentWorkspace.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const REQUIREMENT_ID = "22222222-2222-4222-8222-222222222222";

function draft(overrides = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    documentType: "DEPOSIT_REQUEST",
    status: "WORKING_DRAFT",
    reference: "WDR-ABCDEF12",
    documentNumber: null,
    jobId: JOB_ID,
    paymentRequirementId: REQUIREMENT_ID,
    depositRequestAuthority: {
      paymentRequirementId: REQUIREMENT_ID,
      jobId: JOB_ID,
      relationshipId: 341,
      quoteId: "44444444-4444-4444-8444-444444444444",
      issuedQuoteVersion: 13,
      customerDecisionId: "55555555-5555-4555-8555-555555555555",
      state: "DUE",
      currency: "USD",
      quoteTotalMinor: 68000,
      requiredMinor: 51000,
      appliedMinor: 0,
      remainingMinor: 51000,
      latestVersion: 1,
      quoteReference: "Q-0000001",
      depositRule: { type: "PERCENT", percentBasisPoints: 7500, fixedMinor: null },
    },
    version: 1,
    createdAt: "2026-08-29T12:00:00.000Z",
    updatedAt: "2026-08-29T12:00:00.000Z",
    content: { customerName: "Customer Example", projectTitle: "Cabinet repair" },
    customerParty: null,
    customerDisplayName: "Customer Example",
    workspace: {
      activeDocument: "DEPOSIT_REQUEST",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    ...overrides,
  };
}

test("Deposit Request is a distinct workspace purpose with exact authority hydration", () => {
  assert.equal(normalizeBusinessDocumentTab("depositRequest"), "depositRequest");
  assert.equal(normalizeBusinessDocumentTab("DEPOSIT_REQUEST"), "depositRequest");
  const normalized = validateBusinessDocumentDraft(draft());
  assert.equal(normalized.paymentRequirementId, REQUIREMENT_ID);
  assert.equal(normalized.documentNumber, null);
  assert.equal(normalized.depositRequestAuthority.quoteTotalMinor, 68000);
  assert.equal(normalized.depositRequestAuthority.requiredMinor, 51000);
});

test("Deposit Request projections fail closed for numbering, mixed requirement, or satisfied authority", () => {
  assert.equal(validateBusinessDocumentDraft(draft({ documentNumber: "INV-0000001" })), null);
  assert.equal(validateBusinessDocumentDraft(draft({ paymentRequirementId: "66666666-6666-4666-8666-666666666666" })), null);
  assert.equal(validateBusinessDocumentDraft(draft({
    depositRequestAuthority: {
      ...draft().depositRequestAuthority,
      state: "SATISFIED",
      appliedMinor: 51000,
      remainingMinor: 0,
    },
  })), null);
});

test("workspace exposes explicit prepare, review, send, retry, resend, history, and zero-payment language", () => {
  const source = readFileSync(new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url), "utf8");
  assert.match(source, /Prepare Deposit Request/);
  assert.match(source, /Review Deposit Request delivery/);
  assert.match(source, /Send Deposit Request/);
  assert.match(source, /Retry Send/);
  assert.match(source, /Resend Deposit Request/);
  assert.match(source, /Delivery history/);
  assert.match(source, /does not record payment or satisfy the deposit/);
  assert.match(source, /Project total/);
  assert.match(source, /Deposit requested/);
  assert.match(source, /Amount remaining after deposit/);
  assert.match(source, /Preparation is available now/);
  assert.match(source, /Send is disabled until an approved Quote creates an unpaid canonical deposit requirement/);
  assert.match(source, /Choose existing customer/);
  assert.match(source, /Create external customer/);
  assert.match(source, /customerParty: customerParty \|\| null/);
  assert.match(source, /disabled=\{!eligible \|\| busy/);
});

test("accepted unpaid Work Center exposes preparation while confirmed payment remains separate", () => {
  const source = readFileSync(new URL("../src/components/ProfessionalDepositCard.jsx", import.meta.url), "utf8");
  assert.match(source, /Prepare Deposit Request/);
  assert.match(source, /Confirm Deposit Received/);
  assert.match(source, /depositRequestBuilder\?jobId=/);
});
