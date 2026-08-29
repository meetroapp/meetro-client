import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildJobLinkedQuoteContext,
  buildJobLinkedQuotePrefill,
  fetchJobLinkedQuoteContext,
  jobLinkedQuoteHasExistingContent,
  normalizeJobLinkedQuoteRouteJobId,
  resolveJobLinkedSavedQuoteResume,
} from "../src/utils/jobLinkedQuoteContext.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const OTHER_JOB_ID = "11111111-1111-4111-8111-111111111111";
const EVALUATION_ID = "70b7dd0a-f532-405e-bdac-3f2c63f70686";
const FINDING_ID = "22222222-2222-4222-8222-222222222222";
const RECOMMENDATION_ID = "33333333-3333-4333-8333-333333333333";

const concern =
  "A cabinet door and the surrounding trim are damaged. Please inspect the cabinet and trim on site before recommending the repair.";
const observations =
  "Water damage inside cabinet holding door, all 3 trims are also damage";
const diagnosisSummary =
  "Replacement of all water damage area and inspect for mold and drywall repair as needed";

function job(overrides = {}) {
  return {
    jobId: JOB_ID,
    title: "Cabinet and trim repair",
    serviceDomain: "Home Services",
    serviceSpecialty: "structural_repairs",
    lifecycleStatus: "ACTIVE",
    customerLabel: "Meetro Stage B",
    city: "Cape Coral",
    serviceArea: "Cape Coral, FL 33904, US",
    sourceLabel: "Job Request",
    ...overrides,
  };
}

function liveJob(overrides = {}) {
  return { jobId: JOB_ID, requestId: 23, relationshipId: 345, ...overrides };
}

function lifecycle(overrides = {}) {
  return {
    requestId: 23,
    contractVersion: 2,
    legacy: false,
    job: { id: JOB_ID, requestRelationshipId: 345 },
    reportedConcerns: [{ id: "concern-23", originalText: concern }],
    participants: [
      {
        id: "customer-participant-23",
        displayName: "Meetro Stage B",
        roles: ["CUSTOMER_REPRESENTATIVE"],
      },
      {
        id: "professional-participant-23",
        displayName: "All Handyman Services",
        roles: ["PRIMARY_PROFESSIONAL"],
      },
    ],
    ...overrides,
  };
}

function evaluation(status = "draft") {
  return {
    aggregate: {
      version: 1,
      sourceContext: {
        type: "ordinary_job",
        jobId: JOB_ID,
        requestId: 23,
        relationshipId: 345,
      },
    },
    evaluation: {
      id: EVALUATION_ID,
      status,
      content: {
        observations,
        diagnosisSummary,
        scopeRecommendations: [],
      },
    },
  };
}

function finding(overrides = {}) {
  return {
    id: FINDING_ID,
    jobId: JOB_ID,
    evaluationId: EVALUATION_ID,
    requestId: 23,
    relationshipId: 345,
    statement: observations,
    confirmationState: "CONFIRMED",
    ...overrides,
  };
}

function recommendation(overrides = {}) {
  return {
    id: RECOMMENDATION_ID,
    findingId: FINDING_ID,
    jobId: JOB_ID,
    evaluationId: EVALUATION_ID,
    statement: diagnosisSummary,
    status: "ACTIVE",
    ...overrides,
  };
}

function contextInput(overrides = {}) {
  return {
    job: job(),
    liveJob: liveJob(),
    lifecycle: lifecycle(),
    evaluations: [evaluation()],
    findings: [finding()],
    recommendations: [recommendation()],
    savedDocuments: [],
    canonicalQuotes: [],
    ...overrides,
  };
}

test("valid canonical Job route identity is preserved and invalid identity fails closed", () => {
  assert.equal(normalizeJobLinkedQuoteRouteJobId(JOB_ID.toUpperCase()), JOB_ID);
  assert.equal(normalizeJobLinkedQuoteRouteJobId("23"), "");
  assert.equal(normalizeJobLinkedQuoteRouteJobId("javascript:alert(1)"), "");
});

test("Job-linked Quote context preserves exact Job, request, Relationship, customer, and service-area identity", () => {
  const context = buildJobLinkedQuoteContext(contextInput());
  assert.equal(context.job.jobId, JOB_ID);
  assert.equal(context.job.requestId, 23);
  assert.equal(context.job.relationshipId, 345);
  assert.equal(context.customer.participantId, "customer-participant-23");
  assert.equal(context.customer.displayName, "Meetro Stage B");
  assert.equal(context.customer.email, null);
  assert.equal(context.customer.phone, null);
  assert.equal(context.job.city, "Cape Coral");
  assert.equal(context.job.serviceArea, "Cape Coral, FL 33904, US");
  assert.deepEqual(context.privacy, {
    exactAddressIncluded: false,
    communicationIncluded: false,
    serviceAreaOnly: true,
  });
  assert.doesNotMatch(JSON.stringify(context), /street|unit|access note/i);
});

test("draft Evaluation and customer concern hydrate distinct editable Quote context", () => {
  const context = buildJobLinkedQuoteContext(contextInput());
  const prefill = buildJobLinkedQuotePrefill(context);
  assert.equal(context.project.customerConcern, concern);
  assert.equal(context.evaluation.status, "draft");
  assert.equal(context.evaluation.observations, observations);
  assert.equal(context.evaluation.diagnosisSummary, diagnosisSummary);
  assert.equal(prefill.customerName, "Meetro Stage B");
  assert.equal(prefill.projectDescription, concern);
  assert.equal(prefill.professionalAssessment, observations);
  assert.equal(prefill.recommendedSolution, diagnosisSummary);
  assert.equal(prefill.customerLocation, "Cape Coral, FL 33904, US");
  assert.equal(Object.hasOwn(prefill, "total"), false);
  assert.equal(Object.hasOwn(prefill, "price"), false);
});

test("completed Evaluation works and structured records enrich without duplicating identical narrative", () => {
  const context = buildJobLinkedQuoteContext(
    contextInput({ evaluations: [evaluation("completed")] })
  );
  const prefill = buildJobLinkedQuotePrefill(context);
  assert.equal(context.evaluation.status, "completed");
  assert.equal(prefill.recommendedSolution, diagnosisSummary);
  assert.equal(prefill.professionalAssessment, observations);
  assert.equal(prefill.recommendedSolution.split(diagnosisSummary).length - 1, 1);
  assert.equal(prefill.professionalAssessment.split(observations).length - 1, 1);
});

test("absent Evaluation still carries authorized customer/project context without fabricated assessment", () => {
  const context = buildJobLinkedQuoteContext(
    contextInput({ evaluations: [], findings: [], recommendations: [] })
  );
  const prefill = buildJobLinkedQuotePrefill(context);
  assert.equal(context.evaluation, null);
  assert.equal(prefill.customerName, "Meetro Stage B");
  assert.equal(prefill.projectDescription, concern);
  assert.equal(prefill.professionalAssessment, "");
  assert.equal(prefill.recommendedSolution, "");
});

test("unrelated or mismatched Job identity cannot hydrate customer or Evaluation context", () => {
  assert.equal(
    buildJobLinkedQuoteContext(
      contextInput({ liveJob: liveJob({ jobId: OTHER_JOB_ID }) })
    ),
    null
  );
  assert.equal(
    buildJobLinkedQuoteContext(
      contextInput({
        lifecycle: lifecycle({
          job: { id: JOB_ID, requestRelationshipId: 999 },
        }),
      })
    ),
    null
  );
});

test("saved working or canonical Quote state prevents fresh Evaluation prefill", () => {
  const working = buildJobLinkedQuoteContext(
    contextInput({
      savedDocuments: [{
        id: "44444444-4444-4444-8444-444444444444",
        documentType: "QUOTE",
        status: "WORKING_DRAFT",
        jobId: JOB_ID,
      }],
    })
  );
  assert.equal(jobLinkedQuoteHasExistingContent(working), true);
  assert.equal(working.existingQuote.workingDocumentId, "44444444-4444-4444-8444-444444444444");

  const canonical = buildJobLinkedQuoteContext(
    contextInput({ canonicalQuotes: [{ id: "55555555-5555-4555-8555-555555555555", jobId: JOB_ID }] })
  );
  assert.equal(jobLinkedQuoteHasExistingContent(canonical), true);
  assert.deepEqual(canonical.existingQuote.canonicalQuoteIds, [
    "55555555-5555-4555-8555-555555555555",
  ]);
});

test("exact saved Quote resume requires the same canonical Job authority and customer", () => {
  const context = buildJobLinkedQuoteContext(
    contextInput({
      savedDocuments: [{
        id: "44444444-4444-4444-8444-444444444444",
        documentType: "QUOTE",
        status: "WORKING_DRAFT",
        jobId: JOB_ID,
      }],
    })
  );
  assert.deepEqual(resolveJobLinkedSavedQuoteResume(context), {
    jobId: JOB_ID,
    documentId: "44444444-4444-4444-8444-444444444444",
    customerName: "Meetro Stage B",
  });
  assert.equal(resolveJobLinkedSavedQuoteResume({ ...context, authoritySource: "BROWSER_DRAFT" }), null);
  assert.equal(resolveJobLinkedSavedQuoteResume({ ...context, customer: { displayName: "" } }), null);
  assert.equal(resolveJobLinkedSavedQuoteResume({ ...context, existingQuote: { workingDocumentId: null } }), null);
});

test("unauthorized Job stops before lifecycle, Evaluation, saved document, or Quote reads", async () => {
  let downstreamReads = 0;
  const result = await fetchJobLinkedQuoteContext({
    jobId: JOB_ID,
    fetchJobsImpl: async () => [],
    fetchLiveJobImpl: async () => ({
      status: "unavailable",
      reason: "LIVE_JOB_UNAVAILABLE",
      projection: null,
    }),
    authFetchImpl: async () => {
      downstreamReads += 1;
      throw new Error("must not read");
    },
    listEvaluationsImpl: async () => {
      downstreamReads += 1;
      return [];
    },
    listSavedDocumentsImpl: async () => {
      downstreamReads += 1;
      return [];
    },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.context, null);
  assert.equal(downstreamReads, 0);
});

test("authorized hydration performs GET/read operations only and preserves exact route identity", async () => {
  const calls = [];
  const result = await fetchJobLinkedQuoteContext({
    jobId: JOB_ID,
    fetchJobsImpl: async () => [job()],
    fetchLiveJobImpl: async () => ({ status: "ready", projection: liveJob() }),
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (endpoint === "/posts/23/lifecycle") {
        return {
          response: { ok: true, status: 200 },
          data: {
            lifecycle: {
              requestId: 23,
              contractVersion: 2,
              legacy: false,
              job: { id: JOB_ID, requestRelationshipId: 345 },
              reportedConcerns: [{
                id: "concern-23",
                originalText: concern,
                sequence: 1,
                clarifications: [],
              }],
              participants: [{
                id: "customer-participant-23",
                displayName: "Meetro Stage B",
                roles: [{ role: "CUSTOMER_REPRESENTATIVE", active: true }],
              }],
            },
          },
        };
      }
      if (endpoint === `/jobs/${JOB_ID}/quotes`) {
        return {
          response: { ok: true, status: 200 },
          data: { success: true, quotes: [] },
        };
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    },
    listEvaluationsImpl: async ({ jobId }) => {
      assert.equal(jobId, JOB_ID);
      return [];
    },
    listSavedDocumentsImpl: async ({ type }) => {
      assert.equal(type, "QUOTE");
      return [];
    },
  });
  assert.equal(result.status, "ready");
  assert.equal(result.context.job.jobId, JOB_ID);
  assert.equal(result.context.job.requestId, 23);
  assert.equal(result.context.job.relationshipId, 345);
  assert.ok(calls.every((call) => call.options.method === "GET"));
  assert.doesNotMatch(JSON.stringify(calls), /POST|PATCH|PUT|DELETE/);
});

test("workspace presents Job-linked customer and source context without requiring saved Contacts", () => {
  const quoteBuilder = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  const workspace = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );
  assert.match(quoteBuilder, /fetchJobLinkedQuoteContext/);
  assert.match(quoteBuilder, /request = routeCanonicalJobId \|\| routeSavedDocumentId \|\| isUniversalQuickQuote/);
  assert.match(quoteBuilder, /existingQuoteProtected/);
  assert.match(quoteBuilder, /setRecommendedSolution\(prefill\.recommendedSolution\)/);
  assert.match(workspace, /Linked from Job/);
  assert.match(workspace, /Customer concern/);
  assert.match(workspace, /Professional observations/);
  assert.match(workspace, /Professional recommendation/);
  assert.match(workspace, /!jobLinked \? <button[^>]+onClick=\{\(\) => onOpen\("choose"\)\}/);
  assert.match(workspace, /Save as Customer Contact|businessDocumentCustomerSave/);
  assert.match(
    workspace,
    /activeDirty && !\(job\.customerLinkedFromJob && !activeSaved\) \? "Unsaved changes" : "Not saved"/
  );
});

test("opening a Job-linked Quote does not call save, issue, Invoice, payment, or lifecycle mutations", () => {
  const quoteBuilder = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  const hydrationEffect = quoteBuilder.slice(
    quoteBuilder.indexOf("fetchJobLinkedQuoteContext({ jobId: routeCanonicalJobId"),
    quoteBuilder.indexOf("function inputKey")
  );
  assert.doesNotMatch(
    hydrationEffect,
    /saveDocument|createBusinessDocumentDraft|issueCanonicalInvoice|createCanonicalInvoice|recordCanonicalPayment|send/i
  );
  assert.match(hydrationEffect, /setCustomerName/);
  assert.match(hydrationEffect, /setProjectDescription/);
  assert.match(hydrationEffect, /setRecommendedSolution/);
});

test("hard-refresh protection opens the exact saved Quote instead of routing to the same page", () => {
  const quoteBuilder = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  const workspace = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const protection = quoteBuilder.slice(
    quoteBuilder.indexOf("if (!routeSavedDocumentId && routeCanonicalJobId && jobLinkedQuoteContext.existingQuoteProtected)"),
    quoteBuilder.indexOf("return (\n      <>\n        <input")
  );
  assert.match(protection, /resolveJobLinkedSavedQuoteResume/);
  assert.match(protection, /Open Saved Quote/);
  assert.match(protection, /onClick=\{openProtectedJobLinkedQuote\}/);
  assert.doesNotMatch(protection, /setPage\("quoteBuilder"\)/);
  assert.match(quoteBuilder, /routeSavedDocumentId\s*\|\|\s*jobLinkedQuoteContext\.reopenDocumentId/);
  assert.match(workspace, /await getBusinessDocumentDraft\(\{ draftId, setPage \}\)/);
  assert.match(workspace, /expectedJobId: job\.id/);
  assert.match(workspace, /expectedDocumentType: "QUOTE"/);
  assert.match(workspace, /document\?\.status !== "WORKING_DRAFT"/);
  const directReopenEffect = workspace.slice(
    workspace.indexOf("const documentId = String(initialSavedDocumentId"),
    workspace.indexOf("function connectionRestored")
  );
  assert.doesNotMatch(
    directReopenEffect,
    /saveDocument\(|createBusinessDocumentDraft|updateBusinessDocumentDraft|issueAndSendWorkingQuote|initializeBusinessDocumentNumbering/
  );
});

test("Job customer remains presentation authority while CRM persistence stays optional", () => {
  const workspace = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );
  assert.match(workspace, /const linkedName = jobLinked[\s\S]*\? content\.customerName/);
  assert.match(workspace, /!jobLinked \? <button[^>]+onClick=\{\(\) => onOpen\("choose"\)\}/);
  assert.match(workspace, /Save as Customer Contact|businessDocumentCustomerSave/);
  assert.match(workspace, /lockedCustomerName=\{activeDocument === "quote" \|\| invoicePreparation \? jobLinkedCustomerName : ""\}/);
  assert.match(workspace, /job\.customerLinkedFromJob &&[\s\S]*key === "customerName"/);
  assert.match(workspace, /if \(job\.customerLinkedFromJob\) delete durablePatch\.customerName/);
  assert.doesNotMatch(
    workspace.slice(
      workspace.indexOf("useEffect(() => {\n    const documentId = String(initialSavedDocumentId"),
      workspace.indexOf("function connectionRestored")
    ),
    /createBusinessContact|createBusinessCustomerRelationship/
  );
});
