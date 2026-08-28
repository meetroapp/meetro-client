import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCanonicalCurrentJobIdentityKey,
  getCurrentJobListPresentation,
  hydrateCurrentJobListEntries,
  prepareCurrentJobListHydration,
  replaceCurrentJobListEntry,
} from "../src/utils/workCenterCurrentJobListHydration.js";

const dashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

const JOB_A = "11111111-1111-4111-8111-111111111111";
const JOB_B = "22222222-2222-4222-8222-222222222222";

function canonicalEntry({ requestId, relationshipId, title = "Duplicate title" }) {
  return {
    id: `canonical-request-${requestId}`,
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    requestId,
    postId: requestId,
    relationshipId,
    conversationId: requestId + 100,
    customer: "Duplicate customer",
    title,
  };
}

function lifecyclePayload({ requestId, relationshipId, jobId }) {
  return {
    success: true,
    lifecycle: {
      requestId,
      contractVersion: 2,
      legacy: false,
      job: { id: jobId, requestRelationshipId: relationshipId },
      reportedConcerns: [],
      participants: [],
    },
  };
}

function liveJobPayload({
  requestId,
  relationshipId,
  jobId,
  stageCode,
  stageLabel,
  nextActionCode,
  nextActionLabel,
  blocker = null,
}) {
  return {
    success: true,
    liveJob: {
      jobId,
      requestId,
      relationshipId,
      contractVersion: 1,
      stage: { code: stageCode, label: stageLabel },
      responsibility: { code: "PROFESSIONAL", label: "Professional" },
      blocker,
      nextAction: {
        code: nextActionCode,
        label: nextActionLabel,
        description: "Continue from the canonical Job state.",
      },
      availableActions: [
        { code: "VIEW_CONCERN", label: "View customer concern" },
        { code: "MESSAGE_CUSTOMER", label: "Message customer" },
      ],
      reasonCodes: [],
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
        derivedAt: "2026-08-13T12:00:00.000Z",
        jobCreatedAt: "2026-08-10T12:00:00.000Z",
        evaluationVersion: 0,
        findingVersion: 0,
        recommendationVersion: 0,
        quoteVersion: 0,
        workstreamVersion: 0,
        activityVersion: 0,
        obligationVersion: 0,
        depositVersion: 0,
        evaluationCount: 0,
        findingCount: 0,
        recommendationCount: 0,
        quoteCount: 0,
        workstreamCount: 0,
        activityCount: 0,
        obligationCount: 0,
      },
    },
  };
}

function createAuthFetch({ failRequestId = null, delayJobId = null } = {}) {
  let releaseDelayedLiveState = null;
  const delayedLiveState = new Promise((resolve) => {
    releaseDelayedLiveState = resolve;
  });

  const authFetchImpl = async (endpoint, options) => {
    assert.equal(options.cache, "no-store");
    const lifecycleMatch = endpoint.match(/^\/posts\/(\d+)\/lifecycle$/);
    if (lifecycleMatch) {
      const requestId = Number(lifecycleMatch[1]);
      if (requestId === failRequestId) {
        return {
          response: { ok: false, status: 404 },
          data: { code: "LIFECYCLE_NOT_FOUND" },
        };
      }
      const isJobA = requestId === 41;
      return {
        response: { ok: true, status: 200 },
        data: lifecyclePayload({
          requestId,
          relationshipId: isJobA ? 72 : 73,
          jobId: isJobA ? JOB_A : JOB_B,
        }),
      };
    }

    const jobId = endpoint.split("/")[2];
    if (jobId === delayJobId) await delayedLiveState;
    const isJobA = jobId === JOB_A;
    return {
      response: { ok: true, status: 200 },
      data: liveJobPayload(
        isJobA
          ? {
              requestId: 41,
              relationshipId: 72,
              jobId: JOB_A,
              stageCode: "QUOTE_DRAFT",
              stageLabel: "Proposal in progress",
              nextActionCode: "REVIEW_DRAFT_QUOTE",
              nextActionLabel: "Review the draft proposal",
              blocker: {
                code: "QUOTE_NOT_ISSUED",
                label: "The proposal is still being prepared.",
              },
            }
          : {
              requestId: 42,
              relationshipId: 73,
              jobId: JOB_B,
              stageCode: "WORK_READY",
              stageLabel: "Work ready",
              nextActionCode: "REVIEW_ACTIVE_WORK",
              nextActionLabel: "Review active work",
            }
      ),
    };
  };

  return { authFetchImpl, releaseDelayedLiveState };
}

test("initial canonical cards use loading language distinct from unavailable", () => {
  const [loading] = prepareCurrentJobListHydration([
    canonicalEntry({ requestId: 41, relationshipId: 72 }),
  ]);

  assert.equal(loading.liveJobStatus, "loading");
  assert.deepEqual(getCurrentJobListPresentation(loading), {
    statusLabel: "Loading current status…",
    nextStepLabel: "Loading the next step…",
    responsibilityLabel: "",
    blockerLabel: "",
    state: "loading",
  });
});

test("two canonical cards independently receive different live-state projections", async () => {
  const entries = [
    canonicalEntry({ requestId: 41, relationshipId: 72 }),
    canonicalEntry({ requestId: 42, relationshipId: 73 }),
  ];
  const { authFetchImpl } = createAuthFetch();
  const hydrated = await hydrateCurrentJobListEntries({ entries, authFetchImpl });

  assert.equal(hydrated[0].jobId, JOB_A);
  assert.equal(hydrated[0].liveJob.stage.label, "Proposal in progress");
  assert.equal(hydrated[1].jobId, JOB_B);
  assert.equal(hydrated[1].liveJob.stage.label, "Work ready");
  assert.equal(
    getCanonicalCurrentJobIdentityKey(hydrated[0]),
    "request:41:relationship:72"
  );
  assert.equal(
    getCurrentJobListPresentation(hydrated[0]).blockerLabel,
    "The proposal is still being prepared."
  );
});

test("one failed card stays unavailable without changing its successful neighbor", async () => {
  const entries = [
    canonicalEntry({ requestId: 41, relationshipId: 72 }),
    canonicalEntry({ requestId: 42, relationshipId: 73 }),
  ];
  const { authFetchImpl } = createAuthFetch({ failRequestId: 42 });
  const hydrated = await hydrateCurrentJobListEntries({ entries, authFetchImpl });

  assert.equal(hydrated[0].liveJobStatus, "ready");
  assert.equal(hydrated[0].liveJob.stage.label, "Proposal in progress");
  assert.equal(hydrated[1].liveJobStatus, "error");
  assert.equal(hydrated[1].liveJob, null);
  assert.equal(getCurrentJobListPresentation(hydrated[1]).state, "unavailable");
});

test("delayed responses and reordering cannot transfer state between canonical IDs", async () => {
  const entries = [
    canonicalEntry({ requestId: 41, relationshipId: 72 }),
    canonicalEntry({ requestId: 42, relationshipId: 73 }),
  ];
  const { authFetchImpl, releaseDelayedLiveState } = createAuthFetch({
    delayJobId: JOB_A,
  });
  const completionOrder = [];
  const hydration = hydrateCurrentJobListEntries({
    entries,
    authFetchImpl,
    onEntryHydrated(entry) {
      completionOrder.push(getCanonicalCurrentJobIdentityKey(entry));
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(completionOrder, ["request:42:relationship:73"]);
  releaseDelayedLiveState();
  const hydrated = await hydration;

  const reordered = [hydrated[1], hydrated[0]];
  assert.equal(reordered[0].liveJob.jobId, JOB_B);
  assert.equal(reordered[1].liveJob.jobId, JOB_A);
  assert.deepEqual(completionOrder, [
    "request:42:relationship:73",
    "request:41:relationship:72",
  ]);
});

test("duplicate display text cannot collide and replacement is identity-keyed", () => {
  const first = canonicalEntry({ requestId: 41, relationshipId: 72 });
  const second = canonicalEntry({ requestId: 42, relationshipId: 73 });
  const replacement = {
    ...second,
    liveJobStatus: "ready",
    liveJob: { jobId: JOB_B },
  };
  const next = replaceCurrentJobListEntry([first, second], replacement);

  assert.equal(next[0], first);
  assert.equal(next[1], replacement);
  assert.equal(next[0].title, next[1].title);
  assert.equal(next[0].customer, next[1].customer);
});

test("Current Jobs renders hydrated truth without selection or browser-local fallback", () => {
  assert.match(dashboardSource, /prepareCurrentJobListHydration\(result\.entries\)/);
  assert.match(dashboardSource, /hydrateCurrentJobListEntries\(\{/);
  assert.match(dashboardSource, /replaceCurrentJobListEntry\(/);
  assert.match(dashboardSource, /getCurrentJobListPresentation\(job\)/);
  assert.match(dashboardSource, /getCanonicalCurrentJobIdentityKey\(job\) \|\| job\.id/);
  assert.doesNotMatch(
    dashboardSource.slice(
      dashboardSource.indexOf("getCurrentJobListPresentation(job)"),
      dashboardSource.indexOf("getCurrentJobListPresentation(job)") + 2600
    ),
    /localStorage|getWorkCenterJobStage|workflowState/
  );
});
