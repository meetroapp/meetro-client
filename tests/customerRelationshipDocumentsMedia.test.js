import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getBusinessCustomerRelationshipActivity } from "../src/utils/businessCustomerRelationshipsApi.js";
import {
  CUSTOMER_RELATIONSHIP_NAVIGATION_KEY,
  readCustomerRelationshipNavigationContext,
} from "../src/utils/customerRelationshipsWorkspace.js";
import {
  CUSTOMER_RELATIONSHIPS_LANGUAGES,
  getCustomerRelationshipsCopy,
} from "../src/utils/customerRelationshipsLanguage.js";

const RELATIONSHIP_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const pageSource = readFileSync(
  new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url),
  "utf8"
);
const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);

function canonicalActivity(overrides = {}) {
  return {
    contractVersion: 1,
    relationship: {
      id: RELATIONSHIP_ID,
      businessContactId: CONTACT_ID,
      contactStatus: "ACTIVE",
    },
    work: [],
    quotes: [],
    invoices: [],
    documents: [{
      documentId: "44444444-4444-4444-8444-444444444444",
      documentType: "QUOTE",
      documentNumber: "Q-0001020",
      parentType: "JOB",
      parentId: JOB_ID,
      jobTitle: "Kitchen repair",
      status: "ISSUED",
      provenance: "CANONICAL_QUOTE",
      lastActivityAt: "2026-08-24T13:00:00.000Z",
    }],
    media: [{
      mediaId: "meetro/users/101/request-photos/kitchen",
      kind: "PHOTO",
      mediaType: "IMAGE",
      format: "jpg",
      secureUrl: "https://res.cloudinary.com/meetro/image/upload/v1/kitchen.jpg",
      parentType: "JOB",
      parentId: JOB_ID,
      jobTitle: "Kitchen repair",
      provenance: "JOB_REQUEST",
      category: "REQUEST_PHOTO",
      createdAt: "2026-08-21T11:00:00.000Z",
    }],
    ...overrides,
  };
}

test("activity API preserves canonical document and media arrays from one GET", async () => {
  const calls = [];
  const result = await getBusinessCustomerRelationshipActivity({
    relationshipId: RELATIONSHIP_ID,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return {
        response: { ok: true, status: 200 },
        data: { success: true, activity: canonicalActivity() },
      };
    },
  });
  assert.equal(result.documents[0].documentNumber, "Q-0001020");
  assert.equal(result.media[0].category, "REQUEST_PHOTO");
  assert.deepEqual(calls, [{
    endpoint: `/business-customer-relationships/${RELATIONSHIP_ID}/activity`,
    options: { method: "GET", cache: "no-store" },
  }]);
});

test("activity validation fails closed for missing arrays or unsafe media URLs", async () => {
  for (const activity of [
    canonicalActivity({ media: undefined }),
    canonicalActivity({ media: [{ ...canonicalActivity().media[0], secureUrl: "javascript:alert(1)" }] }),
  ]) {
    await assert.rejects(
      getBusinessCustomerRelationshipActivity({
        relationshipId: RELATIONSHIP_ID,
        fetcher: async () => ({
          response: { ok: true, status: 200 },
          data: { success: true, activity },
        }),
      }),
      (error) => error.code === "BUSINESS_CUSTOMER_RELATIONSHIP_ACTIVITY_RESPONSE_INVALID"
    );
  }
});

test("Documents / Photos view renders Job-grouped canonical documents and media", () => {
  assert.match(pageSource, /\["documents", copy\.documentsPhotos\]/);
  assert.match(pageSource, /function RelationshipDocumentsMedia/);
  assert.match(pageSource, /group\.jobTitle/);
  assert.match(pageSource, /item\.parentId/);
  assert.match(pageSource, /item\.documentId/);
  assert.match(pageSource, /item\.mediaId/);
});

test("canonical Quote and Invoice provenance is presented without document mutation controls", () => {
  assert.match(pageSource, /CANONICAL_QUOTE/);
  assert.match(pageSource, /copy\.canonicalQuote/);
  assert.match(pageSource, /copy\.canonicalInvoice/);
  assert.doesNotMatch(pageSource, /sendDocument|editDocument|deleteDocument|generatePdf/i);
});

test("REQUEST_PHOTO is truthful and no semantic photo category is invented", () => {
  assert.match(pageSource, /item\.category === "REQUEST_PHOTO"/);
  assert.match(pageSource, /copy\.requestPhoto/);
  assert.doesNotMatch(pageSource, /Before photo|Progress photo|Completion photo|After photo/);
});

test("empty and failed activity use server truth without browser media fallback", () => {
  assert.match(pageSource, /documents\.length === 0 && media\.length === 0/);
  assert.match(pageSource, /copy\.noDocumentsPhotos/);
  assert.match(pageSource, /activityState\.status === "error"/);
  assert.match(pageSource, /loadActivity\(relationship\.id\)/);
  assert.doesNotMatch(pageSource, /localMedia|browserMedia|photoRegistry|relationshipGallery/);
});

test("Contact Documents / Photos opens existing relationship activity with document focus", () => {
  assert.match(messagesSource, /openRelationshipHistory\(relationship, "documents"\)/);
  assert.match(messagesSource, /historyType === "documents"[\s\S]*?"documents"/);
  const values = new Map([[CUSTOMER_RELATIONSHIP_NAVIGATION_KEY, JSON.stringify({
    businessContactId: CONTACT_ID,
    focus: "documents",
    returnPage: "messagesInbox",
  })]]);
  assert.deepEqual(readCustomerRelationshipNavigationContext({
    getItem: (key) => values.get(key) || null,
  }), {
    businessContactId: CONTACT_ID,
    focus: "documents",
    returnPage: "messagesInbox",
  });
});

test("no-relationship, archived, and external Contact behavior remains read-only", () => {
  assert.match(pageSource, /detail && !relationship/);
  assert.match(pageSource, /contact\.status === "ARCHIVED"/);
  assert.match(pageSource, /copy\.externalContact/);
  assert.doesNotMatch(pageSource, /establishBusinessCustomerRelationship|createBusinessContact/);
});

test("Notes remain Contact authority and Relationship Memory remains deferred", () => {
  assert.match(messagesSource, /items:\s*record\.privateNote/);
  assert.match(messagesSource, /messagesRelationshipMemoryLater/);
  assert.doesNotMatch(pageSource, /privateNote|relationshipMemory/);
});

test("Documents / Photos history introduces no upload, delete, AI, or mutation authority", () => {
  assert.doesNotMatch(pageSource, /openai|photoAnalysis|analyzePhoto|uploadPhoto|deletePhoto/);
  assert.doesNotMatch(pageSource, /method:\s*["'](?:POST|PATCH|DELETE)["']/);
  assert.doesNotMatch(messagesSource, /openRelationshipHistory[\s\S]{0,900}method:\s*["'](?:POST|PATCH|DELETE)["']/);
});

test("Documents / Photos copy is complete in all supported languages", () => {
  for (const language of CUSTOMER_RELATIONSHIPS_LANGUAGES) {
    const copy = getCustomerRelationshipsCopy(language);
    for (const key of [
      "documentsPhotos",
      "noDocumentsPhotos",
      "linkedWork",
      "documentsLabel",
      "photosLabel",
      "canonicalQuote",
      "canonicalInvoice",
      "requestPhoto",
      "provenance",
      "openPhoto",
    ]) {
      assert.equal(typeof copy[key], "string");
      assert.notEqual(copy[key].trim(), "");
    }
  }
});

test("media presentation remains responsive, accessible, and safely openable", () => {
  assert.match(pageSource, /gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 190px\), 1fr\)\)"/);
  assert.match(pageSource, /maxWidth: "42%"/);
  assert.match(pageSource, /overflowWrap: "anywhere"/);
  assert.match(pageSource, /target="_blank"/);
  assert.match(pageSource, /rel="noreferrer"/);
  assert.match(pageSource, /aria-label=/);
  assert.match(pageSource, /loading="lazy"/);
});
