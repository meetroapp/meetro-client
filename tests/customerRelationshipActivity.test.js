import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getBusinessCustomerRelationshipActivity } from "../src/utils/businessCustomerRelationshipsApi.js";
import {
  CUSTOMER_RELATIONSHIP_NAVIGATION_KEY,
  readCustomerRelationshipNavigationContext,
} from "../src/utils/customerRelationshipsWorkspace.js";

const RELATIONSHIP_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const pageSource = readFileSync(new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url), "utf8");
const messagesSource = readFileSync(new URL("../src/pages/MessagesInbox.jsx", import.meta.url), "utf8");

function activity(overrides = {}) {
  return {
    contractVersion: 1,
    relationship: { id: RELATIONSHIP_ID, businessContactId: CONTACT_ID },
    work: [{ jobId: "job-1", title: "Fan replacement", status: null, createdAt: "2026-08-24T10:00:00.000Z" }],
    quotes: [{ quoteId: "quote-1", documentNumber: "Q-0000001", status: "ISSUED", customerDecision: null, currency: "USD", totalMinor: 26999 }],
    invoices: [{ invoiceId: "invoice-1", invoiceNumber: "INV-0000001", status: "ISSUED", currency: "USD", totalMinor: 26999, paidMinor: 10000, balanceMinor: 16999 }],
    ...overrides,
  };
}

test("relationship activity reads the canonical endpoint by stable relationship ID", async () => {
  const calls = [];
  const result = await getBusinessCustomerRelationshipActivity({
    relationshipId: RELATIONSHIP_ID,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: { success: true, activity: activity() } };
    },
  });
  assert.equal(result.work[0].title, "Fan replacement");
  assert.equal(result.quotes[0].documentNumber, "Q-0000001");
  assert.equal(result.invoices[0].balanceMinor, 16999);
  assert.deepEqual(calls, [{
    endpoint: `/business-customer-relationships/${RELATIONSHIP_ID}/activity`,
    options: { method: "GET", cache: "no-store" },
  }]);
});

test("invalid supplied activity fails closed without browser history fallback", async () => {
  await assert.rejects(
    getBusinessCustomerRelationshipActivity({
      relationshipId: RELATIONSHIP_ID,
      fetcher: async () => ({
        response: { ok: true, status: 200 },
        data: { success: true, activity: activity({ invoices: null }) },
      }),
    }),
    (error) => error.code === "BUSINESS_CUSTOMER_RELATIONSHIP_ACTIVITY_RESPONSE_INVALID"
  );
  assert.doesNotMatch(pageSource, /localHistory|browserHistory|request_relationship/);
});

test("relationship detail renders canonical work, Quote, and Invoice fields without financial inference", () => {
  assert.match(pageSource, /activity\.work/);
  assert.match(pageSource, /item\.title/);
  assert.match(pageSource, /item\.status/);
  assert.match(pageSource, /activity\.quotes/);
  assert.match(pageSource, /item\.documentNumber/);
  assert.match(pageSource, /item\.customerDecision/);
  assert.match(pageSource, /activity\.invoices/);
  assert.match(pageSource, /item\.paidMinor/);
  assert.match(pageSource, /item\.balanceMinor/);
  assert.doesNotMatch(pageSource, /balanceMinor\s*=|totalMinor\s*-\s*paidMinor|customerDecision\s*=|status\s*=\s*["'](?:PAID|APPROVED|DECLINED)/);
});

test("activity empty, loading, failure, and retry states preserve relationship identity", () => {
  assert.match(pageSource, /copy\.noWork/);
  assert.match(pageSource, /copy\.noQuotes/);
  assert.match(pageSource, /copy\.noInvoices/);
  assert.match(pageSource, /activityState\.status === "loading"/);
  assert.match(pageSource, /activityState\.status === "error"/);
  assert.match(pageSource, /loadActivity\(relationship\.id\)/);
  assert.match(pageSource, /customer-relationship-detail-title/);
});

test("relationship detail is activity-first and keeps Contact management in Communication Center", () => {
  assert.match(pageSource, /copy\.customerSince/);
  assert.match(pageSource, /copy\.relationshipActivity/);
  assert.match(pageSource, /copy\.viewContact/);
  assert.doesNotMatch(pageSource, /<ContactFact|copy\.currentContact/);
  assert.match(pageSource, /writeCustomerRelationshipContactReturn/);
});

test("Contact history actions navigate to Work, Invoices, or relationship overview", () => {
  assert.match(messagesSource, /historyType === "invoice"[\s\S]*?"invoices"/);
  assert.match(messagesSource, /historyType === "work"[\s\S]*?"work"[\s\S]*?"overview"/);
  assert.match(messagesSource, /openRelationshipHistory\(relationship, "work"\)/);
  assert.match(messagesSource, /openRelationshipHistory\(relationship, "invoice"\)/);
  assert.match(messagesSource, /openRelationshipHistory\(relationship, "relationship"\)/);
});

test("navigation focus is presentation-only stable Contact context", () => {
  const values = new Map([[CUSTOMER_RELATIONSHIP_NAVIGATION_KEY, JSON.stringify({
    businessContactId: CONTACT_ID,
    focus: "invoices",
    returnPage: "messagesInbox",
  })]]);
  const context = readCustomerRelationshipNavigationContext({ getItem: (key) => values.get(key) || null });
  assert.deepEqual(context, { businessContactId: CONTACT_ID, focus: "invoices", returnPage: "messagesInbox" });
});

test("no-relationship, archived, and external Contact truth remain non-mutating", () => {
  assert.match(pageSource, /detail && !relationship/);
  assert.match(pageSource, /copy\.noRelationshipText/);
  assert.match(pageSource, /contact\.status === "ARCHIVED"/);
  assert.match(pageSource, /copy\.externalContact/);
  assert.doesNotMatch(pageSource, /establishBusinessCustomerRelationship|method:\s*["']POST["']/);
});

test("documents, private Contact Notes, and Relationship Memory remain outside activity authority", () => {
  assert.match(messagesSource, /messagesDocumentsPhotos/);
  assert.match(messagesSource, /items:\s*record\.privateNote/);
  assert.match(messagesSource, /messagesRelationshipMemoryLater/);
  assert.doesNotMatch(pageSource, /documents|photos|privateNote|relationshipMemory/i);
});

test("activity workspace contains no CRM scoring, pipeline, or follow-up projection", () => {
  assert.doesNotMatch(pageSource, /customerHealth|lifetimeValue|leadStage|salesStage|conversionProbability|followUpUrgency|engagementScore/);
});
