import test from "node:test";
import assert from "node:assert/strict";

import {
  buildClosureRecord,
  buildCompletionRecord,
  evaluateWorkCenterClosureReadiness,
  getWorkCenterClosureObligations,
  WORK_CENTER_OBLIGATION_STATUSES,
} from "../src/utils/completionClosureValidation.js";

function createClosedReadyJob(customerName, overrides = {}) {
  const prefix = customerName.toLowerCase();
  return {
    id: `job-${prefix}`,
    customer: customerName,
    conversationId: `conversation-${prefix}`,
    schedule: {
      id: `schedule-${prefix}`,
      scheduleId: `schedule-${prefix}`,
      requestId: `request-${prefix}`,
      customerName,
      conversationId: `conversation-${prefix}`,
      status: "completed",
      workStatus: "completed",
      jobStage: "completed",
      completedAt: "2026-06-19T14:00:00.000Z",
      completionId: `completion-${prefix}`,
      completionNotes: `${customerName} completion notes.`,
      completionSummary: `${customerName} completion summary.`,
      completionPhotos: [{ id: `photo-${prefix}` }],
      completionRecord: {
        completionId: `completion-${prefix}`,
        customerId: `conversation-${prefix}`,
        completedAt: "2026-06-19T14:00:00.000Z",
        completionNotes: `${customerName} completion notes.`,
        completionSummary: `${customerName} completion summary.`,
        completionPhotos: [{ id: `photo-${prefix}` }],
      },
      paymentStatus: "deposit_received",
      paymentReceivedAt: "2026-06-19T14:00:00.000Z",
      ...(overrides.schedule || {}),
    },
    quote: {
      id: `quote-${prefix}`,
      quoteId: `quote-${prefix}`,
      paymentStatus: "deposit_received",
      paymentReceivedAt: "2026-06-19T14:00:00.000Z",
      ...(overrides.quote || {}),
    },
    ...overrides.job,
  };
}

test("Completion record preserves job, customer, date, notes, summary, and photos", () => {
  const completion = buildCompletionRecord({
    job: createClosedReadyJob("Sarah"),
    completion: {
      notes: "Door adjusted and tested.",
      summary: "Work performed and area cleaned.",
      photos: [{ id: "after-photo" }],
    },
    completedAt: "2026-06-19T15:00:00.000Z",
  });

  assert.equal(completion.jobId, "job-Sarah".toLowerCase());
  assert.equal(completion.customerId, "conversation-sarah");
  assert.equal(completion.completedAt, "2026-06-19T15:00:00.000Z");
  assert.equal(completion.completionNotes, "Door adjusted and tested.");
  assert.equal(completion.completionSummary, "Work performed and area cleaned.");
  assert.deepEqual(completion.completionPhotos, [{ id: "after-photo" }]);
});

test("Closure is blocked when required obligations remain open", () => {
  const readiness = evaluateWorkCenterClosureReadiness(
    createClosedReadyJob("Sarah", {
      schedule: {
        closureObligations: [
          {
            id: "customer-signoff",
            type: "CustomerConfirmation",
            title: "Customer Signoff",
            status: "identified",
            required: true,
          },
        ],
      },
    })
  );

  assert.equal(readiness.closureReady, false);
  assert.equal(readiness.closureEligibility, "blocked");
  assert.deepEqual(
    readiness.outstandingObligations.map((obligation) => obligation.id),
    ["customer-signoff"]
  );
});

test("Closure is allowed when required obligations are satisfied", () => {
  const job = createClosedReadyJob("William", {
    schedule: {
      closureObligations: [
        {
          id: "customer-signoff",
          type: "CustomerConfirmation",
          title: "Customer Signoff",
          status: "satisfied",
          required: true,
        },
      ],
    },
  });
  const readiness = evaluateWorkCenterClosureReadiness(job);
  const closure = buildClosureRecord({ job });

  assert.equal(readiness.closureReady, true);
  assert.equal(readiness.closureEligibility, "eligible");
  assert.equal(closure.closureAuthorized, true);
  assert.equal(closure.completionId, "completion-william");
  assert.equal(closure.customerId, "conversation-william");
});

test("Permit and inspection obligations preserve the Permit Center closure model", () => {
  const blocked = evaluateWorkCenterClosureReadiness(
    createClosedReadyJob("Jack", {
      schedule: {
        permitRequired: true,
        inspectionRequired: true,
        permitRecords: [{ status: "approved" }],
        inspectionRecords: [{ status: "scheduled" }],
      },
    })
  );

  assert.equal(blocked.closureReady, false);
  assert.deepEqual(
    blocked.outstandingObligations.map((obligation) => obligation.id),
    ["permit-closure", "inspection-passed"]
  );

  const ready = evaluateWorkCenterClosureReadiness(
    createClosedReadyJob("Jack", {
      schedule: {
        permitRequired: true,
        inspectionRequired: true,
        permitRecords: [{ status: "permit_closed" }],
        inspectionRecords: [{ status: "inspection_passed" }],
      },
    })
  );

  assert.equal(ready.closureReady, true);
});

test("Required completion photos block closure until uploaded", () => {
  const readiness = evaluateWorkCenterClosureReadiness(
    createClosedReadyJob("Sarah", {
      schedule: {
        requiredCompletionPhotos: true,
        completionPhotos: [],
        completionRecord: {
          completionId: "completion-sarah",
          completedAt: "2026-06-19T14:00:00.000Z",
          completionPhotos: [],
        },
      },
    })
  );

  assert.equal(readiness.closureReady, false);
  assert.ok(
    readiness.outstandingObligations.some(
      (obligation) => obligation.id === "required-completion-photos"
    )
  );
});

test("Sarah, William, and Jack closure records stay customer-scoped", () => {
  const sarah = buildClosureRecord({ job: createClosedReadyJob("Sarah") });
  const william = buildClosureRecord({ job: createClosedReadyJob("William") });
  const jack = buildClosureRecord({ job: createClosedReadyJob("Jack") });

  assert.equal(sarah.customerId, "conversation-sarah");
  assert.equal(william.customerId, "conversation-william");
  assert.equal(jack.customerId, "conversation-jack");
  assert.notEqual(sarah.customerId, william.customerId);
  assert.notEqual(william.customerId, jack.customerId);
});

test("Obligation status model supports lifecycle statuses", () => {
  const obligations = getWorkCenterClosureObligations(
    createClosedReadyJob("Sarah", {
      schedule: {
        closureObligations: [
          { id: "identified", status: "identified" },
          { id: "evidence", status: "evidence_collected" },
          { id: "reviewed", status: "reviewed" },
          { id: "satisfied", status: "satisfied" },
        ],
      },
    })
  );

  assert.ok(
    obligations.some(
      (obligation) =>
        obligation.id === "satisfied" &&
        obligation.status === WORK_CENTER_OBLIGATION_STATUSES.SATISFIED
    )
  );
  assert.ok(
    obligations.some(
      (obligation) =>
        obligation.id === "reviewed" &&
        obligation.status === WORK_CENTER_OBLIGATION_STATUSES.REVIEWED
    )
  );
});
