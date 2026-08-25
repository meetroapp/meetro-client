import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  deriveRequestPresentationState,
  REQUEST_PRESENTATION_STATES,
} from "../src/utils/requestPresentationState.js";

const request = {
  id: 22,
  requestId: 22,
  status: "open",
  title: "Repair cracked wall section by front entry",
  account_type: "professional",
};
const pendingResponse = {
  responseId: "900719925474099312345",
  requestId: 22,
  relationshipId: 344,
  responseStatus: "submitted",
  relationshipStatus: "pending",
  unresolved: true,
  selected: false,
  businessName: "All Handyman Services",
  introductionText: "I can help.",
};
const selectedResponse = {
  ...pendingResponse,
  responseStatus: "selected",
  relationshipStatus: "active",
  unresolved: false,
  selected: true,
};
const conversation = {
  id: 341,
  request_id: 22,
  conversation_id: 341,
  conversation_available: true,
  threadType: "canonical_conversation",
  conversation_type: "canonical_conversation",
  businessName: "All Handyman Services",
};

function state(overrides = {}) {
  return deriveRequestPresentationState({ request, ...overrides });
}

function primarySurfaceMatrix(presentation) {
  return {
    home: [presentation.statusLabel, presentation.ctaLabel, presentation.conversationId],
    workCenter: [presentation.statusLabel, presentation.ctaLabel, presentation.conversationId],
    requestDetails: [presentation.statusLabel, presentation.ctaLabel, presentation.conversationId],
    communicationCenter: presentation.key === REQUEST_PRESENTATION_STATES.RESPONSE_RECEIVED
      ? ["response", presentation.ctaLabel, null]
      : presentation.key === REQUEST_PRESENTATION_STATES.PROFESSIONAL_SELECTED
        ? ["conversation", "Open Conversation", presentation.conversationId]
        : ["none", null, null],
  };
}

test("state matrix: submitted request is waiting everywhere with no false response or conversation", () => {
  const presentation = state();
  assert.equal(presentation.key, REQUEST_PRESENTATION_STATES.REQUEST_SUBMITTED);
  assert.equal(presentation.statusLabel, "Request submitted");
  assert.equal(presentation.nextActionLabel, "Waiting for professional responses");
  assert.equal(presentation.canOpenConversation, false);
  assert.deepEqual(primarySurfaceMatrix(presentation).communicationCenter, ["none", null, null]);
});

test("state matrix: response received agrees across primary surfaces and creates no conversation", () => {
  const presentation = state({ responses: [pendingResponse] });
  const matrix = primarySurfaceMatrix(presentation);
  assert.equal(presentation.key, REQUEST_PRESENTATION_STATES.RESPONSE_RECEIVED);
  assert.equal(presentation.ctaLabel, "Review Response");
  assert.equal(presentation.conversationId, null);
  assert.equal(matrix.home[0], matrix.workCenter[0]);
  assert.equal(matrix.workCenter[0], matrix.requestDetails[0]);
  assert.deepEqual(matrix.communicationCenter, ["response", "Review Response", null]);
});

test("state matrix: selection confirmation is transient and does not claim canonical selection", () => {
  const presentation = state({
    responses: [pendingResponse],
    confirmationResponseId: pendingResponse.responseId,
  });
  assert.equal(presentation.key, REQUEST_PRESENTATION_STATES.SELECTION_CONFIRMATION_PENDING);
  assert.equal(presentation.statusLabel, "Confirm professional");
  assert.equal(presentation.ctaLabel, "Confirm Selection");
  assert.equal(presentation.canOpenConversation, false);
  assert.equal(presentation.conversationId, null);
});

test("state matrix: selected professional exposes one canonical conversation identity everywhere", () => {
  const presentation = state({
    responses: [selectedResponse],
    conversations: [conversation],
  });
  const matrix = primarySurfaceMatrix(presentation);
  assert.equal(presentation.key, REQUEST_PRESENTATION_STATES.PROFESSIONAL_SELECTED);
  assert.equal(presentation.businessName, "All Handyman Services");
  assert.equal(presentation.ctaLabel, "Continue Conversation");
  assert.equal(presentation.conversationId, 341);
  assert.equal(matrix.home[2], 341);
  assert.equal(matrix.requestDetails[2], 341);
  assert.equal(matrix.communicationCenter[2], 341);
});

test("canonical requester conversation remains sufficient selected-state projection during response refresh", () => {
  const presentation = state({ conversations: [conversation] });
  assert.equal(presentation.key, REQUEST_PRESENTATION_STATES.PROFESSIONAL_SELECTED);
  assert.equal(presentation.businessName, "All Handyman Services");
  assert.equal(presentation.conversationId, 341);
});

test("homeowner and professional/business requesters receive identical requester-neutral semantics", () => {
  const homeowner = deriveRequestPresentationState({
    request: { ...request, account_type: "homeowner" },
    responses: [pendingResponse],
  });
  const professional = deriveRequestPresentationState({
    request: { ...request, account_type: "professional" },
    responses: [pendingResponse],
  });
  assert.deepEqual(professional, homeowner);
  assert.doesNotMatch(JSON.stringify(professional), /homeowner/i);
});

test("presentation state is privacy-minimized and has no lifecycle-write authority", () => {
  const presentation = state({
    responses: [{
      ...pendingResponse,
      streetAddress: "123 Private Street",
      unitNumber: "4B",
      accessNotes: "Gate code",
    }],
  });
  const serialized = JSON.stringify(presentation);
  assert.doesNotMatch(serialized, /Private Street|4B|Gate code|streetAddress|unitNumber|accessNotes/);

  const source = readFileSync(
    new URL("../src/utils/requestPresentationState.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /authFetch|fetch\s*\(|localStorage|sessionStorage|POST|PUT|PATCH|DELETE/);
  assert.doesNotMatch(
    source,
    /create(Evaluation|Quote|Schedule|Invoice)|advance(Lifecycle|Workflow)|submitPayment|completeWork|closeRequest/
  );
});

test("later lifecycle records remain owned by the existing lifecycle presentation", () => {
  const presentation = deriveRequestPresentationState({
    request: { ...request, status: "working", scheduledAt: "2026-08-26T12:00:00Z" },
    responses: [selectedResponse],
    conversations: [conversation],
  });
  assert.equal(presentation.applicable, false);
});
