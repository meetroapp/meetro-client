import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeCanonicalMessage } from "../src/utils/canonicalConversationMessaging.js";

const QUOTE_ID = "decf3f61-acd2-4756-b5fa-8d610eb9b8d0";
const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";

function message() {
  return {
    id: 71,
    sender: { isViewer: false },
    content: { type: "quote_shared", text: "Handyman LLC shared a Quote.", imageUrl: null },
    workflow: {
      type: "QUOTE_SHARED",
      status: "SENT",
      payload: {
        schemaVersion: 1,
        quoteId: QUOTE_ID,
        jobId: JOB_ID,
        lineageLabel: "Original",
        businessStatus: "APPROVED",
        totalMinor: 92000,
        currency: "USD",
        scopeItems: [{ description: "Replace disposal", quantity: 1, amountMinor: 92000 }],
        conditions: [],
        exclusions: [],
        issuedAt: "2026-08-14T14:00:00.000Z",
        decidedAt: "2026-08-14T16:00:00.000Z",
        business: { displayName: "Handyman LLC" },
        job: { title: "Kitchen repair", service: "handyman" },
      },
    },
    reference: { type: "quote", quoteId: QUOTE_ID, jobId: JOB_ID },
    createdAt: "2026-08-15T12:00:00.000Z",
  };
}

test("canonical Quote message requires exact structured identity and safe snapshot", () => {
  const normalized = normalizeCanonicalMessage(message(), "homeowner");
  assert.equal(normalized.backendId, 71);
  assert.equal(normalized.type, "quote_shared");
  assert.equal(normalized.reference.quoteId, QUOTE_ID);
  assert.equal(normalized.reference.jobId, JOB_ID);
  assert.equal(normalized.quoteShare.businessStatus, "APPROVED");

  const mismatched = message();
  mismatched.reference.jobId = crypto.randomUUID();
  assert.equal(normalizeCanonicalMessage(mismatched, "homeowner"), null);
  const leaking = message();
  leaking.workflow.payload.internalNotes = "private";
  assert.equal(normalizeCanonicalMessage(leaking, "homeowner"), null);
});

test("ordinary canonical text message shape remains unchanged", () => {
  assert.deepEqual(normalizeCanonicalMessage({
    id: 72,
    sender: { isViewer: true },
    content: { type: "text", text: "Ordinary message", imageUrl: null },
    workflow: { type: null, status: null, payload: {} },
    createdAt: "2026-08-15T12:00:00.000Z",
  }, "homeowner"), {
    id: "canonical-message-72",
    backendId: 72,
    type: "text",
    sender: "me",
    senderRole: "homeowner",
    text: "Ordinary message",
    imageUrl: null,
    workflowType: "",
    workflowStatus: "",
    workflowPayload: {},
    status: "delivered",
    createdAt: "2026-08-15T12:00:00.000Z",
    time: "2026-08-15T12:00:00.000Z",
    unsent: false,
  });
});

test("Conversation card routes by structured Quote and Job identity only", () => {
  const thread = readFileSync("src/pages/ConversationThread.jsx", "utf8");
  const card = readFileSync("src/components/ConversationQuoteCard.jsx", "utf8");
  assert.match(thread, /msg\.type === "quote_shared" && msg\.quoteShare/);
  assert.match(thread, /quoteId: msg\.reference\?\.quoteId/);
  assert.match(thread, /jobId: msg\.reference\?\.jobId/);
  assert.match(thread, /conversationId: canonicalConversationId/);
  assert.match(card, /data-quote-business-status/);
  assert.match(thread, /currentViewerRole === "homeowner"/);
  assert.doesNotMatch(card, /title matching|customerName|localStorage|workflow_quote_sent/);
});
