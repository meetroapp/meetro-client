import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildQuickQuoteEstimateInput,
  fetchAuthorizedProfessionalJobs,
  filterAuthorizedProfessionalJobs,
  findAuthorizedProfessionalJob,
  normalizeAuthorizedProfessionalJobs,
} from "../src/utils/professionalJobPicker.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const builder = readFileSync(
  new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
  "utf8"
);
const conversation = readFileSync(
  new URL("../src/components/QuickQuoteConversation.jsx", import.meta.url),
  "utf8"
);
const pickerSource = readFileSync(
  new URL("../src/utils/professionalJobPicker.js", import.meta.url),
  "utf8"
);

function payload(jobs = [
  {
    jobId: JOB_ID,
    title: "Repair interior wall",
    serviceDomain: "Home Services",
    serviceSpecialty: "Handyman",
    lifecycleStatus: "ACTIVE",
    customerLabel: "Paul Becker",
    city: "Orlando",
    serviceArea: "Orlando, FL",
    sourceLabel: "Job Request",
  },
]) {
  return {
    success: true,
    code: "PROFESSIONAL_JOBS_LOADED",
    jobs,
  };
}

test("authorized Job picker transport uses the governed server list and no browser Job authority", async () => {
  const calls = [];
  const jobs = await fetchAuthorizedProfessionalJobs({
    authFetchImpl: async (...args) => {
      calls.push(args);
      return {
        response: { ok: true, status: 200 },
        data: payload(),
      };
    },
  });

  assert.deepEqual(calls, [[
    "/professional/jobs",
    { method: "GET", cache: "no-store" },
    undefined,
  ]]);
  assert.equal(jobs[0].jobId, JOB_ID);
  assert.doesNotMatch(pickerSource, /localStorage|sessionStorage/);
});

test("picker response is a strict allowlist and rejects exact-address additions", () => {
  const valid = normalizeAuthorizedProfessionalJobs(payload());
  assert.equal(valid.length, 1);
  assert.equal(normalizeAuthorizedProfessionalJobs(payload([
    {
      ...payload().jobs[0],
      exactAddress: "1 Private Street",
    },
  ])), null);
});

test("compact Job filtering distinguishes title, customer, specialty, city, and area", () => {
  const jobs = normalizeAuthorizedProfessionalJobs(payload());
  for (const query of ["wall", "paul", "handyman", "orlando", "fl"]) {
    assert.equal(filterAuthorizedProfessionalJobs(jobs, query).length, 1, query);
  }
  assert.deepEqual(filterAuthorizedProfessionalJobs(jobs, "plumbing"), []);
});

test("exact authorized Job lookup binds review identity to one canonical Job", () => {
  const jobs = normalizeAuthorizedProfessionalJobs(payload());
  assert.deepEqual(findAuthorizedProfessionalJob(jobs, JOB_ID), jobs[0]);
  assert.equal(
    findAuthorizedProfessionalJob(
      jobs,
      "22222222-2222-4222-8222-222222222222"
    ),
    null
  );
  assert.equal(findAuthorizedProfessionalJob(jobs, "not-a-job"), null);
});

test("selected canonical Job builds the existing Estimate input with exact professional text", () => {
  const professionalInput = "  Repair wall. Materials total $40. Labor total $260.  ";
  assert.deepEqual(buildQuickQuoteEstimateInput({
    jobId: JOB_ID,
    professionalInput,
  }), {
    jobId: JOB_ID,
    intent: "PREPARE_QUOTE",
    professionalInstructions: professionalInput,
    measurements: [],
    costInputs: [],
    professionalCategoryCosts: [],
    sellingPriceMinor: null,
    retailerQuery: null,
  });
});

test("Continue with My Details opens explicit Job connection and selection invokes Estimate", () => {
  assert.match(builder, /setQuickQuoteJobConnection[\s\S]*decision/);
  assert.match(conversation, /copy\.readyToContinue/);
  assert.match(conversation, /copy\.attachExistingJob/);
  assert.match(conversation, /copy\.createJob/);
  assert.match(builder, /fetchAuthorizedProfessionalJobs/);
  assert.match(builder, /requestQuickQuoteInternalEstimate/);
  assert.match(builder, /buildQuickQuoteEstimateInput/);
  assert.match(builder, /requestWorkflowIntelligence/);
});

test("professional continuation does not accept or rewrite AI review decisions", () => {
  const start = builder.indexOf("async function requestQuickQuoteInternalEstimate");
  const end = builder.indexOf("async function continueQuickQuoteConversation", start);
  assert.ok(start >= 0 && end > start);
  const boundary = builder.slice(start, end);
  assert.doesNotMatch(boundary, /recordWorkflowReview|recordQuoteCompositionReview|ACCEPTED|EDITED|setQuickQuotePhotoAssistant/);
  assert.match(boundary, /professionalInput/);
});

test("empty eligible list, Cancel, Back, and unavailable Create Job are explicit", () => {
  assert.match(conversation, /copy\.noEligibleJobs/);
  assert.match(conversation, /onCancelJobConnection/);
  assert.match(conversation, /onBackToJobConnection/);
  assert.match(conversation, /copy\.createJobComingNext/);
});

test("Job connection cancel restores idle while picker Back keeps professional details active", () => {
  assert.match(
    builder,
    /onCancelJobConnection=\{\(\)\s*=>[\s\S]*stage:\s*"idle"/
  );
  assert.match(
    builder,
    /onBackToJobConnection=\{\(\)\s*=>[\s\S]*stage:\s*"decision"/
  );
  assert.match(
    conversation,
    /"decision",\s*"picker",\s*"costConfirmation"/
  );
});

test("direct Prepare Quote remains available and is not forced through Job Analysis", () => {
  assert.match(builder, /id:\s*"quote"[\s\S]*prepareQuote/);
  assert.match(builder, /onRequest=\{requestEstimateHelp\}/);
});
