import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  hydrateSavedJobLinkedQuotePresentation,
} from "../src/utils/savedJobLinkedQuoteHydration.js";
import { quoteCustomerPricingProjection } from "../src/utils/quotePricingPresentation.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const RELATIONSHIP_ID = "22222222-2222-4222-8222-222222222222";

const commercialContent = Object.freeze({
  customerName: "",
  projectTitle: "",
  projectDescription: "",
  recommendedSolution: "",
  totalOverride: "680",
  depositMode: "PERCENT",
  depositPercent: "75",
});

const job = Object.freeze({
  id: JOB_ID,
  customerLinkedFromJob: true,
  customerName: "Antony Guzman",
  title: "Inspect damaged cabinet door and trim",
  customerConcern: "The cabinet door and surrounding trim are damaged.",
  evaluation: Object.freeze({
    observations: "Three damaged trim pieces were observed.",
    diagnosisSummary: "Replace the damaged trim and inspect the exposed area.",
    scopeRecommendations: Object.freeze([]),
  }),
  recommendations: Object.freeze([]),
});

test("saved Job-linked Quote hydrates one authoritative customer, project, and scope presentation", () => {
  const projection = hydrateSavedJobLinkedQuotePresentation({
    content: commercialContent,
    documentJobId: JOB_ID,
    customerParty: {
      businessContactId: CONTACT_ID,
      customerRelationshipId: RELATIONSHIP_ID,
    },
    linkedContact: { id: CONTACT_ID, displayName: "Antony Guzman" },
    job,
  });

  assert.equal(projection.customerName, "Antony Guzman");
  assert.equal(projection.projectTitle, "Inspect damaged cabinet door and trim");
  assert.equal(
    projection.recommendedSolution,
    "Replace the damaged trim and inspect the exposed area.\nThree damaged trim pieces were observed.\nThe cabinet door and surrounding trim are damaged."
  );
  assert.equal(projection.totalOverride, "680");
  assert.equal(projection.depositMode, "PERCENT");
  assert.equal(projection.depositPercent, "75");
  assert.deepEqual(
    {
      total: quoteCustomerPricingProjection(projection).total,
      depositDue: quoteCustomerPricingProjection(projection).deposit.due,
      remainingBalance: quoteCustomerPricingProjection(projection).deposit.remaining,
    },
    { total: 680, depositDue: 510, remainingBalance: 170 }
  );
  assert.equal(commercialContent.customerName, "");
  assert.equal(commercialContent.projectTitle, "");
});

test("saved presentation uses only the exact Contact and exact Job identity", () => {
  const projection = hydrateSavedJobLinkedQuotePresentation({
    content: commercialContent,
    documentJobId: JOB_ID,
    customerParty: {
      businessContactId: CONTACT_ID,
      customerRelationshipId: RELATIONSHIP_ID,
    },
    linkedContact: {
      id: "33333333-3333-4333-8333-333333333333",
      displayName: "Wrong Contact",
    },
    job,
  });
  assert.equal(projection.customerName, "Antony Guzman");
  assert.notEqual(projection.customerName, "Wrong Contact");

  const wrongJob = hydrateSavedJobLinkedQuotePresentation({
    content: commercialContent,
    documentJobId: "44444444-4444-4444-8444-444444444444",
    customerParty: { businessContactId: CONTACT_ID, customerRelationshipId: RELATIONSHIP_ID },
    linkedContact: { id: CONTACT_ID, displayName: "Antony Guzman" },
    job,
  });
  assert.equal(wrongJob.customerName, "");
  assert.equal(wrongJob.projectTitle, "");
});

test("workspace routes saved Quotes through authoritative hydration for header, control, and preview", () => {
  const workspace = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const builder = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  assert.match(workspace, /hydrateSavedJobLinkedQuotePresentation/);
  assert.match(workspace, /QuotePreview quote=\{activeContent\}/);
  assert.match(workspace, /CustomerPartyControl[^>]+content=\{activeContent\}/);
  assert.match(workspace, /document\.customerDisplayName \|\| document\.content\.customerName/);
  assert.doesNotMatch(
    builder,
    /isUnifiedInvoiceEntry \|\| !routeCanonicalJobId \|\| routeSavedDocumentId \|\| !savedQuoteRoute\.valid/
  );
  assert.match(
    builder,
    /\["ready", "protected"\]\.includes\(jobLinkedQuoteContext\.status\)/
  );
});
