import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const workCenterSource = readFileSync(new URL("../src/pages/MyRequests.jsx", import.meta.url), "utf8");
const messagesSource = readFileSync(new URL("../src/pages/MessagesInbox.jsx", import.meta.url), "utf8");
const responseReviewSource = readFileSync(
  new URL("../src/components/HomeownerProfessionalResponseReview.jsx", import.meta.url),
  "utf8"
);
const languageSource = readFileSync(new URL("../src/utils/language.js", import.meta.url), "utf8");

test("Home and Work Center consume the same canonical presentation derivation", () => {
  for (const source of [homeSource, workCenterSource]) {
    assert.match(source, /deriveRequestPresentationState/);
    assert.match(source, /getRequesterResponseInbox/);
    assert.match(source, /canonicalRequesterResponses/);
    assert.match(source, /canonicalPresentation\?\.statusLabel/);
    assert.match(source, /canonicalPresentation\?\.ctaLabel/);
  }
});

test("Request Details removes the ambiguous selected-request badge and promotes selected business", () => {
  assert.doesNotMatch(workCenterSource, /Selected request|Solicitud seleccionada/);
  assert.match(workCenterSource, /canonicalPresentation\?\.businessName/);
  assert.match(workCenterSource, /selectedBusinessName/);
  assert.match(workCenterSource, /onReviewResponse/);
  assert.match(workCenterSource, /professional-responses-/);
});

test("Communication Center surfaces unresolved canonical Responses without creating a Conversation", () => {
  assert.match(messagesSource, /getRequesterResponseInbox/);
  assert.match(messagesSource, /response\.unresolved === true/);
  assert.match(messagesSource, /request-response-inbox-title/);
  assert.match(messagesSource, /reviewRequesterResponse\(response\)/);

  const responseInboxBlock = messagesSource.slice(
    messagesSource.indexOf("function reviewRequesterResponse"),
    messagesSource.indexOf("function getRelationshipPreviewText")
  );
  assert.doesNotMatch(
    responseInboxBlock,
    /createConversation|conversation_participant|selectHomeownerProfessionalResponse|POST|PUT|PATCH|DELETE/
  );
});

test("selected Responses leave the unresolved inbox while canonical Conversations remain the message source", () => {
  assert.match(messagesSource, /response\.unresolved === true/);
  assert.match(messagesSource, /normalizeRequestConversations/);
  assert.match(messagesSource, /renderConversationRow\(quote/);
  assert.match(messagesSource, /conversationReady: "Conversation ready"/);
  assert.match(messagesSource, /openConversation: "Open Conversation"/);
  assert.match(messagesSource, /isRequesterRequestConversation/);
  assert.doesNotMatch(messagesSource, /requestResponses\.map\([^)]*renderConversationRow/);
});

test("selection stays explicit and reports transient confirmation and confirmed refresh", () => {
  assert.match(responseReviewSource, /setConfirmResponseId\(response\.id\)/);
  assert.match(responseReviewSource, /onSelectionStateChange\?\.\(String\(response\.id\)\)/);
  assert.match(responseReviewSource, /Confirm Selection/);
  assert.match(responseReviewSource, /Keep Reviewing/);
  assert.match(responseReviewSource, /onSelectionConfirmed\?\.\(result\)/);
});

test("shared requester workflow language no longer assumes a homeowner account", () => {
  assert.doesNotMatch(languageSource, /homeWorkflowLabel: "Homeowner workflow"/);
  assert.doesNotMatch(languageSource, /myRequestsPerspectiveEyebrow: "Homeowner perspective"/);
  assert.doesNotMatch(languageSource, /professionalResponsePendingReview: "Pending homeowner review\."/);
  assert.doesNotMatch(languageSource, /Messaging is not available before homeowner selection/);
  assert.match(languageSource, /professionalResponsePendingReview: "Waiting for requester review\."/);
});
