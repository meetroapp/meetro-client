import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateJobHistoryDetail,
} from "../src/utils/jobCompletionApi.js";

const JOB_ID =
  "11111111-1111-4111-8111-111111111111";

const QUOTE_ID =
  "22222222-2222-4222-8222-222222222222";

const FINDING_ID =
  "44444444-4444-4444-8444-444444444444";

const RECOMMENDATION_ID =
  "55555555-5555-4555-8555-555555555555";

const validRecords = {
  deposits: [{
    quoteId: QUOTE_ID,
    state: "SATISFIED",
    currency: "USD",
    requiredMinor: 5000,
    appliedMinor: 5000,
    remainingMinor: 0,
    payments: [{
      grossAmountMinor: 5000,
      appliedMinor: 5000,
      currency: "USD",
      method: "Card",
      receivedAt:
        "2026-09-20T16:00:00.000Z",
    }],
  }],

  media: [],

  visits: [],

  emergencyAssessment: {
    evaluation: {
      status: "COMPLETE",
      completedAt:
        "2026-09-20T15:00:00.000Z",
      startedAt:
        "2026-09-20T13:00:00.000Z",
      updatedAt:
        "2026-09-20T15:00:00.000Z",
    },

    findings: [{
      id: FINDING_ID,
      statement:
        "Valve is leaking",
      state: "RESOLVED",
      createdAt:
        "2026-09-20T13:10:00.000Z",
      updatedAt:
        "2026-09-20T14:00:00.000Z",
    }],

    recommendations: [{
      id: RECOMMENDATION_ID,
      findingId: FINDING_ID,
      statement:
        "Replace shut-off valve",
      state: "RECOMMENDED",
      createdAt:
        "2026-09-20T13:20:00.000Z",
      updatedAt:
        "2026-09-20T14:10:00.000Z",
    }],
  },
};

function emergencyHistory(
  records = validRecords
) {
  return {
    contractVersion: 1,
    jobId: JOB_ID,
    sourceType:
      "emergency_request",
    sourceLabel: "Emergency",
    requestId: null,
    relationshipId: 37,
    conversationId: 354,
    customerName: "Liam Molina",
    professionalName: "BGone",
    serviceTitle:
      "Emergency Plumbing",
    status: "COMPLETED",
    completedAt:
      "2026-09-20T18:00:00.000Z",

    approvedQuote: {
      totalMinor: 35000,
      currency: "USD",
    },

    completionSummary: {
      workstreamCount: 0,
      workItemCount: 0,
      customerUpdateCount: 0,
    },

    nextAction: {
      code: "READY_TO_INVOICE",
      label: "Ready to Invoice",
    },

    audience: "customer",
    originalRequest: null,

    preservedRecords: {
      evaluation: true,
      findings: true,
      recommendations: true,
      approvedQuotes: true,
      visits: false,
      workPlan: false,
    },

    historyRecords: records,

    actions: {
      canMessageProfessional: true,
    },
  };
}

test(
  "Emergency customer History accepts exact preserved records",
  () => {
    const result =
      validateJobHistoryDetail(
        emergencyHistory(),
        {
          jobId: JOB_ID,
          audience: "customer",
        }
      );

    assert.ok(result);

    assert.equal(
      result.historyRecords
        .deposits[0]
        .payments[0]
        .grossAmountMinor,
      5000
    );

    assert.equal(
      result.historyRecords
        .emergencyAssessment
        .findings[0]
        .statement,
      "Valve is leaking"
    );
  }
);

test(
  "Emergency History rejects fabricated Visit records",
  () => {
    const invalid =
      structuredClone(
        validRecords
      );

    invalid.visits = [{
      visitId:
        "33333333-3333-4333-8333-333333333333",
      purpose: "EVALUATION",
      state: "COMPLETED",
      scheduledStartAt: null,
      scheduledEndAt: null,
      timeZone: null,
      locationMode: null,
      completedAt: null,
      createdAt:
        "2026-09-20T12:00:00.000Z",
    }];

    assert.equal(
      validateJobHistoryDetail(
        emergencyHistory(invalid),
        {
          jobId: JOB_ID,
          audience: "customer",
        }
      ),
      null
    );
  }
);

test(
  "History rejects unsafe media URLs and extra private fields",
  () => {
    const unsafe =
      structuredClone(
        validRecords
      );

    unsafe.media = [{
      mediaId: "photo",
      secureUrl:
        "javascript:alert(1)",
      format: "jpg",
      uploadedAt:
        "2026-09-20T12:00:00.000Z",
      category: "REQUEST_PHOTO",
    }];

    assert.equal(
      validateJobHistoryDetail(
        emergencyHistory(unsafe),
        {
          jobId: JOB_ID,
          audience: "customer",
        }
      ),
      null
    );

    assert.equal(
      validateJobHistoryDetail(
        emergencyHistory({
          ...validRecords,
          privateNotes: "secret",
        }),
        {
          jobId: JOB_ID,
          audience: "customer",
        }
      ),
      null
    );
  }
);

test(
  "B2 UI renders deposits, Visits, media and Emergency assessment fallback",
  () => {
    const source =
      readFileSync(
        new URL(
          "../src/components/CustomerCompletionHistory.jsx",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /historyRecords\.deposits/
    );

    assert.match(
      source,
      /historyRecords\.media/
    );

    assert.match(
      source,
      /historyRecords\.visits/
    );

    assert.match(
      source,
      /historyRecords\.emergencyAssessment/
    );

    assert.match(
      source,
      /historyCopy\.deposits/
    );

    assert.match(
      source,
      /historyCopy\.visits/
    );

    assert.match(
      source,
      /historyMediaGrid/
    );

    assert.match(
      source,
      /rel="noopener noreferrer"/
    );
  }
);
