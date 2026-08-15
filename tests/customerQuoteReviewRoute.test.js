import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCustomerQuoteConversationReturnRoute,
  buildCustomerQuoteReviewRoute,
  parseCustomerQuoteReviewRoute,
} from "../src/utils/customerQuoteReviewRoute.js";
import { translations } from "../src/utils/language.js";

const QUOTE_ID = "decf3f61-acd2-4756-b5fa-8d610eb9b8d0";
const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";

test("customer review route carries exact Quote, Job, and Conversation identity", () => {
  const route = buildCustomerQuoteReviewRoute({ quoteId: QUOTE_ID, jobId: JOB_ID, conversationId: 17 });
  const parsed = parseCustomerQuoteReviewRoute(route);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.quoteId, QUOTE_ID);
  assert.equal(parsed.jobId, JOB_ID);
  assert.equal(parsed.conversationId, 17);
  assert.equal(parseCustomerQuoteReviewRoute(`${route}&customerName=Liam`).valid, false);
  assert.equal(buildCustomerQuoteReviewRoute({ quoteId: QUOTE_ID, jobId: JOB_ID }), "");
});

test("return route preserves exact canonical Conversation and adaptive shell", () => {
  const route = buildCustomerQuoteConversationReturnRoute(17);
  assert.match(route, /^conversationThread\?/);
  assert.match(route, /conversationId=17/);
  assert.match(route, /shell=communicationCenter/);
});

test("direct review page uses authenticated canonical adapters without browser authority", () => {
  const source = readFileSync("src/pages/CustomerQuoteReviewRoute.jsx", "utf8");
  assert.match(source, /fetchCustomerJobQuotes\(\{ jobId: route\.jobId/);
  assert.match(source, /fetchCustomerQuoteDetail\(\{[\s\S]*quoteId: route\.quoteId[\s\S]*jobId: route\.jobId/);
  assert.match(source, /quote\.quoteId === route\.quoteId && quote\.jobId === route\.jobId/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|customerName|title.*match/i);
});

test("Quote delivery and card language is complete in every active locale", () => {
  const keys = [
    "quoteDeliverySendInMeetro",
    "quoteDeliveryShareQuote",
    "quoteDeliverySent",
    "quoteDeliveryViewConversation",
    "quoteDeliverySystemShare",
    "quoteDeliveryEmail",
    "quoteDeliveryCopyDetails",
    "quoteDeliveryBackToConversation",
    "quoteDeliveryShareTitle",
    "quoteDeliveryShareFrom",
    "quoteDeliveryShareTotal",
    "quoteDeliveryShareLineage",
    "quoteDeliveryShareScope",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) assert.ok(translations[language][key], `${language}.${key}`);
  }
});

test("delivery actions and Quote card retain responsive 44px controls", () => {
  const actions = readFileSync("src/components/QuoteDeliveryActions.jsx", "utf8");
  const card = readFileSync("src/components/ConversationQuoteCard.jsx", "utf8");
  assert.ok((actions.match(/minHeight: 44/g) || []).length >= 4);
  assert.match(actions, /gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 180px\), 1fr\)\)"/);
  assert.match(card, /minHeight: 44/);
  assert.match(card, /width: "min\(100%, 360px\)"/);
  assert.doesNotMatch(`${actions}\n${card}`, /fontSize: [^,]*vw/);
});
