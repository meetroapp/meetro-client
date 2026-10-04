import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WORK_CENTER_LIFECYCLE_UNAVAILABLE_REASONS,
  fetchWorkCenterLifecycleProjection,
  getWorkCenterLifecycleProjectionTarget,
  normalizeWorkCenterLifecycleProjection,
} from "../src/utils/workCenterLifecycleProjection.js";

function lifecyclePayload(overrides = {}) {
  return {
    success: true,
    lifecycle: {
      requestId: 41,
      contractVersion: 2,
      legacy: false,
      job: { id: "11111111-1111-4111-8111-111111111111", requestRelationshipId: 72 },
      reportedConcerns: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          originalText: "Water is pooling under the kitchen sink.",
          reportedAt: "2026-08-09T12:00:00.000Z",
          sequence: 1,
          clarifications: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              semantics: "CLARIFIES",
              text: "Leak appears worse when the disposal runs.",
            },
          ],
        },
      ],
      participants: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          displayName: "Sarah Customer",
          roles: [{ role: "CUSTOMER_REPRESENTATIVE", active: true }],
        },
        {
          id: "55555555-5555-4555-8555-555555555555",
          displayName: "Pat Professional",
          roles: [{ role: "PRIMARY_PROFESSIONAL", active: true }],
        },
      ],
      ...overrides,
    },
  };
}

function liveJobPayload(overrides = {}) {
  return {
    success: true,
    liveJob: {
      jobId: "11111111-1111-4111-8111-111111111111",
      requestId: 41,
      relationshipId: 72,
      contractVersion: 1,
      stage: { code: "EVALUATION_NEEDED", label: "Evaluation needed" },
      responsibility: { code: "PROFESSIONAL", label: "Professional" },
      blocker: {
        code: "EVALUATION_NOT_RECORDED",
        label: "An evaluation has not been recorded yet.",
      },
      nextAction: {
        code: "START_OR_CONTINUE_EVALUATION",
        label: "Review or continue the evaluation",
        description: "Record what you observed before moving forward.",
      },
      availableActions: [
        { code: "VIEW_CONCERN", label: "View customer concern" },
        { code: "MESSAGE_CUSTOMER", label: "Message customer" },
        { code: "START_EVALUATION", label: "Start evaluation" },
      ],
      reasonCodes: ["NO_EVALUATION_PRESENT"],
      deposit: {
        obligationId: null,
        materialized: false,
        state: "NOT_REQUIRED",
        currency: null,
        requiredMinor: 0,
        appliedMinor: 0,
        remainingMinor: 0,
        latestVersion: null,
        schedulingLocked: false,
      },
      freshness: {
        derivedAt: "2026-08-12T12:00:00.000Z",
        jobCreatedAt: "2026-08-10T12:00:00.000Z",
        evaluationVersion: 0,
        findingVersion: 0,
        recommendationVersion: 0,
        quoteVersion: 0,
        workstreamVersion: 0,
        activityVersion: 0,
        obligationVersion: 0,
        approvedWorkExecutionVersion: 0,
        depositVersion: 0,
        invoiceVersion: 0,
        evaluationCount: 0,
        findingCount: 0,
        recommendationCount: 0,
        quoteCount: 0,
        workstreamCount: 0,
        activityCount: 0,
        obligationCount: 0,
      },
      ...overrides,
    },
  };
}

test("adapter calls the exact lifecycle endpoint and normalizes job, concern, and participants", async () => {
  const calls = [];
  const result = await fetchWorkCenterLifecycleProjection({
    record: { lifecycleContractVersion: 2, requestId: 41 },
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (endpoint.includes("/live-state")) {
        return {
          response: { ok: true, status: 200 },
          data: liveJobPayload(),
        };
      }
      return {
        response: { ok: true, status: 200 },
        data: lifecyclePayload(),
      };
    },
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(
    calls.map((call) => call.endpoint),
    [
      "/posts/41/lifecycle",
      "/jobs/11111111-1111-4111-8111-111111111111/live-state",
    ]
  );
  assert.equal(calls.every((call) => call.options.cache === "no-store"), true);
  assert.equal(result.projection.authoritySource, "CANONICAL_BACKEND_READ");
  assert.equal(result.projection.job.present, true);
  assert.equal(result.projection.job.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(result.projection.job.requestRelationshipId, 72);
  assert.equal(
    result.projection.customerConcern.originalText,
    "Water is pooling under the kitchen sink."
  );
  assert.deepEqual(
    result.projection.participants.map((participant) => participant.roles[0].labelKey),
    ["lifecycleRoleCustomerRepresentative", "lifecycleRolePrimaryProfessional"]
  );
  assert.equal(result.projection.liveJob.stage.code, "EVALUATION_NEEDED");
  assert.equal(result.projection.liveJob.nextAction.code, "START_OR_CONTINUE_EVALUATION");
});

test("live Job authorization or validation failure removes the full live projection", async () => {
  const result = await fetchWorkCenterLifecycleProjection({
    record: { lifecycleContractVersion: 2, requestId: 41 },
    authFetchImpl: async (endpoint) => {
      if (endpoint === "/posts/41/lifecycle") {
        return { response: { ok: true, status: 200 }, data: lifecyclePayload() };
      }
      return {
        response: { ok: false, status: 403 },
        data: { code: "LIVE_JOB_READ_AUTHORITY_REQUIRED" },
      };
    },
  });

  assert.equal(result.status, "error");
  assert.equal(result.httpStatus, 403);
  assert.equal(result.reason, "LIVE_JOB_READ_AUTHORITY_REQUIRED");
  assert.equal(result.projection, null);
});

test("adapter propagates auth and backend errors without local fallback truth", async () => {
  const result = await fetchWorkCenterLifecycleProjection({
    record: { lifecycleContractVersion: 2, postId: 41 },
    authFetchImpl: async () => ({
      response: { ok: false, status: 403 },
      data: {
        code: "PARTICIPANT_READ_AUTHORITY_REQUIRED",
        message: "Participant authority is required.",
      },
    }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.httpStatus, 403);
  assert.equal(result.reason, "PARTICIPANT_READ_AUTHORITY_REQUIRED");
  assert.equal(result.projection, null);
});

test("unsupported or missing post identity never fabricates canonical truth", async () => {
  assert.deepEqual(
    getWorkCenterLifecycleProjectionTarget({ requestId: 41 }),
    {
      available: false,
      reason: WORK_CENTER_LIFECYCLE_UNAVAILABLE_REASONS.LEGACY,
      postId: null,
    }
  );
  assert.deepEqual(
    getWorkCenterLifecycleProjectionTarget({
      lifecycleContractVersion: 2,
      id: "Sarah-Customer-Sink",
    }),
    {
      available: false,
      reason: WORK_CENTER_LIFECYCLE_UNAVAILABLE_REASONS.MISSING_POST_ID,
      postId: null,
    }
  );

  const result = await fetchWorkCenterLifecycleProjection({
    record: { lifecycleContractVersion: 2, id: "display-title-only" },
    authFetchImpl: async () => {
      throw new Error("fetch should not run without a canonical post id");
    },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.projection, null);
});

test("normalization fails closed for legacy or malformed lifecycle responses", () => {
  assert.equal(
    normalizeWorkCenterLifecycleProjection(lifecyclePayload({ contractVersion: 1, legacy: true })),
    null
  );
  assert.equal(normalizeWorkCenterLifecycleProjection({ lifecycle: null }), null);
});

test("canonical concern wins over conflicting browser-local job fields in Work Center projection", () => {
  const projection = normalizeWorkCenterLifecycleProjection(lifecyclePayload());
  const localRecord = {
    lifecycleContractVersion: 2,
    requestId: 41,
    title: "Professional interpretation",
    customerNeeds: "Browser-local conflicting concern.",
    description: "Local description should not replace canonical concern.",
  };

  assert.equal(getWorkCenterLifecycleProjectionTarget(localRecord).postId, 41);
  assert.equal(
    projection.customerConcern.originalText,
    "Water is pooling under the kitchen sink."
  );
  assert.notEqual(projection.customerConcern.originalText, localRecord.customerNeeds);
});

test("ContractorDashboard wires a read-only canonical lifecycle section without new commands", () => {
  const source = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /fetchWorkCenterLifecycleProjection/);
  assert.match(source, /canonicalLiveJob\?\.stage\.label/);
  assert.match(source, /canonicalLiveJob\?\.nextAction\.label/);
  assert.match(source, /canonicalLiveJob\?\.responsibility\.label/);
  assert.match(source, /hasCanonicalLiveJobAction/);
  assert.match(source, /workCenterCanonicalLifecycleSection/);
  assert.match(source, /reportedConcernHistory/);
  assert.match(source, /knownJobParticipants/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Job details/);
  assert.match(source, /Job record connected/);
  assert.doesNotMatch(source, /Canonical backend read/);
  assert.doesNotMatch(
    source,
    /reported-concerns[^"'`]*\/(?:update|delete)|assign-role|create-grant|\/quotes\/\$\{[^}]+}\/issue/
  );
});

test("Professional Work Center uses business-facing category and participant language", () => {
  const language = readFileSync(
    new URL("../src/utils/language.js", import.meta.url),
    "utf8"
  );
  const workflowLanguage = readFileSync(
    new URL("../src/utils/dailyWorkflowLanguage.js", import.meta.url),
    "utf8"
  );

  assert.match(language, /workCenterCurrentJobsTitle: "Current Jobs"/);
  assert.match(language, /lifecycleRoleCustomerRepresentative: "Customer"/);
  assert.match(language, /lifecycleRolePrimaryProfessional: "Lead Professional"/);
  assert.match(workflowLanguage, /\["workCenterCurrentJob", "Job Overview"/);
  assert.match(workflowLanguage, /\["workCenterBackToJobs", "Back to Current Jobs"/);
});
