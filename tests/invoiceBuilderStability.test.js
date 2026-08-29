import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  findBusinessContactDuplicateCandidates,
} from "../src/utils/businessDocumentCustomerParty.js";
import { validateInvoiceWorkspace } from "../src/utils/invoicePaymentApi.js";
import { t } from "../src/utils/language.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";

function representativeWorkspace() {
  return {
    contractVersion: 1,
    summary: {
      readyToInvoice: 1,
      drafts: 0,
      waitingForPayment: 0,
      paid: 0,
      totalOutstandingMinor: 17000,
      currency: "USD",
    },
    readyJobs: [{
      jobId: JOB_ID,
      requestId: 23,
      relationshipId: 345,
      customerName: "Antony Guzman",
      serviceTitle: "Inspect damaged cabinet door and trim",
      completedAt: "2026-08-29T18:50:15.055Z",
      completionVersion: 1,
      approvedAmount: { currency: "USD", totalMinor: 68000 },
      paymentsReceivedMinor: 51000,
      amountStillDueMinor: 17000,
      approvedWork: [{
        description: "Approved cabinet repair",
        quantity: 1,
        unitAmountMinor: 68000,
        lineTotalMinor: 68000,
      }],
    }],
    invoices: [],
    limit: 50,
  };
}

test("completed-Job Invoice preparation has one stable route-scoped request", () => {
  const start = quoteBuilder.indexOf("const requestedCanonicalJobId");
  const end = quoteBuilder.indexOf("useEffect(() => {\n    if (!routeSavedDocumentId", start);
  const preparation = quoteBuilder.slice(start, end);

  assert.match(preparation, /existingRequest\?\.key === requestKey/);
  assert.match(preparation, /invoicePreparationRequestRef\.current = \{ key: requestKey, promise: request \}/);
  assert.match(preparation, /requestKey = `job:\$\{routeCanonicalJobId\}`/);
  assert.match(preparation, /fetchProfessionalInvoiceWorkspace/);
  assert.match(preparation, /listBusinessDocumentDrafts/);
  assert.match(preparation, /\[isUnifiedInvoiceEntry, routeCanonicalJobId, routeSavedDocumentId\]/);
  assert.doesNotMatch(preparation, /routeCanonicalJobId, routeSavedDocumentId, setPage/);
  assert.doesNotMatch(preparation, /createCanonicalInvoice|createReviewedInvoice|createBusinessDocumentDraft/);
});

test("representative server-owned prefill remains exact without creating an Invoice", () => {
  const validated = validateInvoiceWorkspace(representativeWorkspace());
  assert.ok(validated);
  assert.equal(validated.readyJobs.length, 1);
  assert.equal(validated.invoices.length, 0);
  assert.equal(validated.readyJobs[0].customerName, "Antony Guzman");
  assert.equal(validated.readyJobs[0].serviceTitle, "Inspect damaged cabinet door and trim");
  assert.equal(validated.readyJobs[0].approvedAmount.totalMinor, 68000);
  assert.equal(validated.readyJobs[0].paymentsReceivedMinor, 51000);
  assert.equal(validated.readyJobs[0].amountStillDueMinor, 17000);
});

test("Job prefill is applied once per Job and leaves professional-only edits outside its patch", () => {
  const start = workspace.indexOf("const invoicePreparationHydratedRef");
  const end = workspace.indexOf("const [customerControl", start);
  const hydration = workspace.slice(start, end);

  assert.match(hydration, /invoicePreparationHydratedRef\.current === invoicePreparation\.jobId/);
  assert.match(hydration, /invoicePreparationHydratedRef\.current = invoicePreparation\.jobId/);
  assert.match(hydration, /setInvoice\(\(current\) => \(\{[\s\S]*\.\.\.current/);
  assert.doesNotMatch(hydration, /extraWork|customerNotes|terms|dueDate/);
  assert.match(hydration, /existingLookup\?\.key === lookupKey/);
  assert.match(hydration, /savedJobCustomerLookupRef\.current = \{ key: lookupKey, promise: lookup \}/);
});

test("Job-linked saved-customer recognition is bounded, read-only, and suppresses duplicate save prompting", () => {
  const contacts = [{
    id: "11111111-1111-4111-8111-111111111111",
    status: "ACTIVE",
    displayName: "Antony Guzman",
    companyName: null,
    email: "antony@example.test",
    phone: "",
  }];
  assert.equal(
    findBusinessContactDuplicateCandidates(contacts, { customerName: "Antony Guzman" })[0].id,
    contacts[0].id
  );

  const lookupStart = workspace.indexOf("const savedJobCustomerLookupRef");
  const lookupEnd = workspace.indexOf("const [customerControl", lookupStart);
  const lookup = workspace.slice(lookupStart, lookupEnd);
  assert.match(lookup, /listBusinessContacts/);
  assert.match(lookup, /setLinkedCustomerContacts/);
  assert.doesNotMatch(lookup, /createBusinessContact|saveDocument|establishBusinessCustomerRelationship/);
  assert.match(workspace, /!durableContact \? <button[^>]+onClick=\{\(\) => onOpen\("save"\)\}/);
});

test("saved-customer empty states and customer language use the approved plain wording", () => {
  assert.equal(t("businessDocumentCustomerEmptyDirectory", "en"), "No saved customers yet.");
  assert.equal(t("businessDocumentCustomerNoMatches", "en"), "No saved customers match your search.");
  assert.equal(t("businessDocumentCustomerSave", "en"), "Save as Customer");
  assert.equal(t("businessDocumentCustomerSaveTitle", "en"), "Save Customer");
  assert.equal(t("businessDocumentCustomerSaveHelp", "en"), "Save this customer for future quotes and invoices.");
  assert.equal(t("businessDocumentCustomerPerson", "en"), "Individual");
  assert.equal(t("businessDocumentCustomerOrganization", "en"), "Business");
  assert.equal(t("businessDocumentCustomerSavedContact", "en"), "Saved customer");
  assert.match(workspace, /control\.contacts\.length && control\.search\.trim\(\)/);
});
