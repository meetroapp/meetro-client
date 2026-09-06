import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildGenericNewQuoteRoute,
  buildJobLinkedNewQuoteRoute,
  eligibleExternalCustomerOptions,
  fetchProfessionalQuoteCustomerOptions,
  isGenericNewQuoteRoute,
  normalizeProfessionalQuoteCustomerOptions,
} from "../src/utils/newQuoteCustomerSetup.js";
import { buildNewBusinessDocumentDraftPayload } from "../src/utils/businessDocumentPersistence.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const dashboard = read("src/pages/BusinessDashboard.jsx");
const businessTools = read("src/pages/BusinessCommandCenter.jsx");
const bottomNav = read("src/components/BottomNav.jsx");
const workCenter = read("src/pages/ContractorDashboard.jsx");
const assistant = read("src/components/MeetroAssistant.jsx");
const app = read("src/App.jsx");

const JOB_ONE = "11111111-1111-4111-8111-111111111111";
const JOB_TWO = "22222222-2222-4222-8222-222222222222";
const DRAFT = "33333333-3333-4333-8333-333333333333";
const CONTACT = "44444444-4444-4444-8444-444444444444";
const RELATIONSHIP = "55555555-5555-4555-8555-555555555555";

function response() {
  return {
    success: true,
    code: "PROFESSIONAL_QUOTE_CUSTOMER_OPTIONS_LOADED",
    contractVersion: 1,
    customers: [{
      customerId: 71,
      displayName: "Jordan Lee",
      jobs: [{
        jobId: JOB_ONE,
        requestId: 91,
        relationshipId: 81,
        title: "Kitchen repair",
        city: "Cape Coral",
        serviceArea: null,
        customerName: "Jordan Lee",
        newQuoteEligible: true,
        existingQuote: null,
      }, {
        jobId: JOB_TWO,
        requestId: 92,
        relationshipId: 82,
        title: "Door repair",
        city: null,
        serviceArea: "Southwest Florida",
        customerName: "Jordan Lee",
        newQuoteEligible: false,
        existingQuote: { workingDraftId: DRAFT, canonicalQuoteId: null },
      }],
    }],
  };
}

test("explicit generic intent is exact and cannot inherit stale job or draft authority", () => {
  assert.equal(buildGenericNewQuoteRoute(), "quoteBuilder?new=1");
  assert.equal(isGenericNewQuoteRoute("#quoteBuilder?new=1"), true);
  assert.equal(isGenericNewQuoteRoute(`#quoteBuilder?new=1&jobId=${JOB_ONE}`), false);
  assert.equal(isGenericNewQuoteRoute(`#quoteBuilder?new=1&draftId=${DRAFT}`), false);
  assert.equal(isGenericNewQuoteRoute("#quoteBuilder"), false);
  assert.match(quoteBuilder, /isGenericNewQuoteIntent[\s\S]*isGenericNewQuoteRoute\(window\.location\.hash\)/);
  assert.match(quoteBuilder, /isUniversalQuickQuote \|\| isGenericNewQuoteIntent[\s\S]*selectedWorkCenterRequest/);
  assert.match(quoteBuilder, /genericNewQuoteIntent=\{isGenericNewQuoteIntent\}/);
});

test("Meetro customer options use only the authenticated server endpoint and validate the bounded contract", async () => {
  const calls = [];
  const customers = await fetchProfessionalQuoteCustomerOptions({
    setPage() {},
    authFetchImpl: async (...args) => {
      calls.push(args);
      return { response: { ok: true }, data: response() };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/professional/quote-customer-options");
  assert.deepEqual(calls[0][1], { method: "GET", cache: "no-store" });
  assert.equal(customers[0].jobs.length, 2);
  assert.equal(normalizeProfessionalQuoteCustomerOptions({ ...response(), extra: true }), null);
});

test("canonical job selection routes by exact job and opens an existing working Quote instead of duplicating it", () => {
  const [newJob, existingJob] = normalizeProfessionalQuoteCustomerOptions(response())[0].jobs;
  assert.equal(buildJobLinkedNewQuoteRoute(newJob), `quoteBuilder?jobId=${JOB_ONE}`);
  assert.equal(
    buildJobLinkedNewQuoteRoute(existingJob),
    `quoteBuilder?jobId=${JOB_TWO}&draftId=${DRAFT}`
  );
  assert.match(workspace, /job\.newQuoteEligible \? "Create Quote"[\s\S]*"Open Existing Quote"/);
  assert.match(app, /setQuoteRouteIdentity\(finalPage\)/);
  assert.match(app, /<QuoteBuilder key=\{quoteRouteIdentity\}/);
});

test("external picker requires active CUSTOMER role and durable Customer Relationship", () => {
  const relationship = { id: RELATIONSHIP, businessContactId: CONTACT };
  const customer = {
    id: CONTACT,
    status: "ACTIVE",
    roles: [{ role: "CUSTOMER", active: true }],
  };
  const vendor = {
    ...customer,
    id: "66666666-6666-4666-8666-666666666666",
    roles: [{ role: "PROFESSIONAL_VENDOR", active: true }],
  };
  assert.deepEqual(
    eligibleExternalCustomerOptions({ contacts: [customer, vendor], relationships: [relationship] }),
    [{ contact: customer, relationship }]
  );
  assert.deepEqual(eligibleExternalCustomerOptions({ contacts: [customer], relationships: [] }), []);
});

test("resolved external authority is persisted on the first Quote without marketplace authority", () => {
  const customerParty = {
    businessContactId: CONTACT,
    customerRelationshipId: RELATIONSHIP,
  };
  const payload = buildNewBusinessDocumentDraftPayload({
    documentType: "quote",
    documentDate: "2026-09-06",
    customerParty,
    customerSnapshot: { customerName: "Jordan Lee", customerEmail: "jordan@example.com" },
  });
  assert.deepEqual(payload.customerParty, customerParty);
  assert.equal(payload.jobId, null);
  assert.equal(payload.content.customerName, "Jordan Lee");
  assert.equal(payload.content.customerEmail, "jordan@example.com");
  assert.equal("requestId" in payload, false);
  assert.equal("relationshipId" in payload, false);
});

test("selector opening is side-effect free and save begins only after final authority selection", () => {
  const start = workspace.slice(
    workspace.indexOf("async function startNewDocument"),
    workspace.indexOf("function updateNewQuoteSetup")
  );
  assert.match(start, /type === "quote"[\s\S]*setNewQuoteSetup\(emptyNewQuoteSetup\(\{ open: true, target: "START_NEW" \}\)\)[\s\S]*return null/);
  assert.doesNotMatch(start.slice(0, start.indexOf("if (startNewInFlightRef.current)")), /saveDocument|createBusinessDocumentDraft|ensureCurrentDocumentSaved/);
  const resolved = workspace.slice(
    workspace.indexOf("async function continueResolvedNewQuote"),
    workspace.indexOf("async function createExternalQuoteCustomer")
  );
  assert.ok(resolved.indexOf("pendingNewQuoteDestinationRef.current = destination") < resolved.indexOf("await ensureCurrentDocumentSaved(\"quote\")"));
  assert.ok(resolved.indexOf("await ensureCurrentDocumentSaved(\"quote\")") < resolved.indexOf("await completeResolvedNewQuote(destination, previousDocument)"));
  assert.match(resolved, /customer selection is preserved/);
});

test("all audited generic producers use explicit new intent while contextual Quote routes remain exact", () => {
  assert.match(dashboard, /business_dashboard_new_quote[\s\S]*setPage\("quoteBuilder\?new=1"\)/);
  assert.match(businessTools, /business_tools_quick_quote[\s\S]*setPage\("quoteBuilder\?new=1"\)/);
  assert.match(bottomNav, /item\.shortcut === "quoteInvoice"[\s\S]*setPage\("quoteBuilder\?new=1"\)/);
  assert.equal((workCenter.match(/setPage\("quoteBuilder\?new=1"\)/g) || []).length, 2);
  assert.match(assistant, /quoteBuilder: "quoteBuilder\?new=1"/);
  assert.match(workCenter, /setPage\(`quoteBuilder\?jobId=\$\{encodeURIComponent\(quoteJobId\)\}`\)/);
});

test("selector navigation and error states preserve the current workspace", () => {
  assert.match(workspace, /CUSTOMER_TYPE[\s\S]*MEETRO_CUSTOMER_LIST[\s\S]*MEETRO_JOB_LIST/);
  assert.match(workspace, /EXTERNAL_CHOICE[\s\S]*EXTERNAL_EXISTING[\s\S]*EXTERNAL_ADD/);
  assert.match(workspace, /const initialEntry = newQuoteSetup\.target === "INITIAL"/);
  assert.match(workspace, /if \(initialEntry\) onBack\?\.\(\)/);
  assert.match(workspace, /API failure|Meetro customers could not be loaded|Saved external customers could not be loaded/);
  assert.match(workspace, /pendingContact: error\?\.contact/);
  assert.match(workspace, /completeBusinessDocumentCustomerWorkflow/);
});

test("New Quote inputs keep focus and controlled values through iPad keyboard viewport changes", () => {
  const dialog = workspace.slice(
    workspace.indexOf("function WorkspaceDialog"),
    workspace.indexOf("function NewQuoteCustomerSetupDialog")
  );
  const keyboardEffect = workspace.slice(
    workspace.indexOf("keyboardStateRef.current.baselineHeight"),
    workspace.indexOf("useEffect(() => {", workspace.indexOf("keyboardStateRef.current.baselineHeight") + 1)
  );
  assert.match(dialog, /const onCloseRef = useRef\(onClose\);[\s\S]*onCloseRef\.current = onClose;[\s\S]*}, \[onClose\]\);/);
  assert.match(dialog, /}, \[openAtTop, title\]\);/);
  assert.doesNotMatch(dialog, /}, \[onClose, openAtTop\]\);/);
  assert.match(dialog, /onCloseRef\.current\?\.\(\)/);
  assert.match(keyboardEffect, /visualViewport[\s\S]*addEventListener\("resize", updateKeyboardState\)/);
  assert.match(keyboardEffect, /window\.addEventListener\("resize", updateKeyboardState\)/);
  assert.match(keyboardEffect, /setKeyboardOpen\(open\)/);
  assert.doesNotMatch(keyboardEffect, /setNewQuoteSetup|setPage\(|createBusinessContact|createBusinessDocumentDraft/);
  const setupDialog = workspace.slice(
    workspace.indexOf("function NewQuoteCustomerSetupDialog"),
    workspace.indexOf("function WorkflowGuideStep")
  );
  assert.doesNotMatch(setupDialog, /onFocus=|onBlur=/);
  for (const field of ["displayName", "companyName", "email", "phone", "address"]) {
    assert.match(workspace, new RegExp(`value=\\{state\\.form\\.${field}\\}`));
  }
  assert.match(workspace, /onExternalForm=\{\(field, value\) => updateNewQuoteSetup\(\{[\s\S]*form: \{ \.\.\.newQuoteSetup\.form, \[field\]: value \}/);
});

test("explicit Start New owns modal authority over stale recovery without mutating customer or draft state", () => {
  const recoveryEffect = workspace.slice(
    workspace.indexOf("void loadBusinessDocumentRecovery"),
    workspace.indexOf("useEffect(() => {", workspace.indexOf("void loadBusinessDocumentRecovery") + 1)
  );
  const startNew = workspace.slice(
    workspace.indexOf("async function startNewDocument"),
    workspace.indexOf("function updateNewQuoteSetup")
  );
  assert.match(recoveryEffect, /!newQuoteSetupAuthorityRef\.current/);
  assert.match(startNew, /type === "quote"[\s\S]*newQuoteSetupAuthorityRef\.current = true;[\s\S]*setRecoveryRecord\(null\);[\s\S]*setNewQuoteSetup/);
  assert.doesNotMatch(startNew.slice(0, startNew.indexOf("if (startNewInFlightRef.current)")), /createBusinessContact|createBusinessDocumentDraft|setPage\(/);
  assert.match(workspace, /recoveryRecord && !newQuoteSetup\.open \? <WorkspaceDialog/);
});
