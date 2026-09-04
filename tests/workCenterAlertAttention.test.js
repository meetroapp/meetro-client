import assert from "node:assert/strict";
import test from "node:test";

import {
  getAlertWorkCenterStage,
  getBusinessWorkCenterPanelId,
  getHomeownerWorkCenterSection,
  getWorkCenterGroupedStageUnread,
  getWorkCenterJobAttention,
  getWorkCenterRequestAttention,
  getWorkCenterStageUnread,
  getWorkCenterTotalUnread,
} from "../src/utils/workCenterAlertAttention.js";

import {
  buildProfessionalWorkCenterRoute,
  parseProfessionalWorkCenterRoute,
} from "../src/utils/professionalWorkCenterRoute.js";

import {
  buildHomeownerWorkCenterAlertRoute,
  parseHomeownerRequestAlertRoute,
} from "../src/utils/alertWorkflowRoutes.js";

import {
  getAlertDestinationActionTarget,
} from "../src/utils/alertPresentation.js";

const JOB =
  "072c8736-5d97-4253-ba3e-dd1bce281a20";
const QUOTE =
  "172c8736-5d97-4253-ba3e-dd1bce281a21";
const VISIT =
  "272c8736-5d97-4253-ba3e-dd1bce281a22";

function snapshot() {
  return {
    identity: "7",
    response: {
      counts: {
        workCenter: {
          unread: 4,
          byJob: [
            {
              jobId: JOB,
              requestId: 41,
              unread: 4,
              stages: [
                {
                  stage: "evaluation",
                  unread: 1,
                },
                {
                  stage: "deposit",
                  unread: 3,
                },
              ],
            },
          ],
        },
      },
    },
  };
}

test("Work Center attention preserves exact total Job and stage counts", () => {
  const state = snapshot();

  assert.equal(
    getWorkCenterTotalUnread(state, "7"),
    4
  );

  const job =
    getWorkCenterJobAttention(
      state,
      "7",
      JOB
    );

  assert.equal(job.requestId, 41);
  assert.equal(job.unread, 4);
  assert.equal(
    getWorkCenterStageUnread(
      job,
      "evaluation"
    ),
    1
  );
  assert.equal(
    getWorkCenterStageUnread(
      job,
      "deposit"
    ),
    3
  );

  assert.equal(
    getWorkCenterTotalUnread(state, "8"),
    null
  );
});

test("semantic stages map to exact Business and Customer panels", () => {
  assert.equal(
    getBusinessWorkCenterPanelId("evaluation"),
    "canonical-job-evaluation"
  );
  assert.equal(
    getBusinessWorkCenterPanelId("quote"),
    "canonical-job-quotes"
  );
  assert.equal(
    getBusinessWorkCenterPanelId("deposit"),
    "canonical-job-deposit-scheduling"
  );
  assert.equal(
    getBusinessWorkCenterPanelId("schedule"),
    "canonical-job-deposit-scheduling"
  );
  assert.equal(
    getBusinessWorkCenterPanelId("work"),
    "canonical-job-work-plan"
  );
  assert.equal(
    getBusinessWorkCenterPanelId("invoice"),
    "canonical-job-completion-invoice"
  );

  assert.equal(
    getHomeownerWorkCenterSection("deposit"),
    "payment"
  );
  assert.equal(
    getHomeownerWorkCenterSection("schedule"),
    "schedule"
  );
});

test("professional Work Center route supports semantic stage without fabricating authority", () => {
  const route =
    buildProfessionalWorkCenterRoute({
      jobId: JOB,
      stage: "deposit",
      returnPage: "notifications",
    });

  assert.equal(
    route,
    `workCenter?jobId=${JOB}&stage=deposit&returnPage=notifications`
  );

  assert.deepEqual(
    parseProfessionalWorkCenterRoute(route),
    {
      jobId: JOB,
      quoteId: null,
      visitId: null,
      returnPage: "notifications",
      stage: "deposit",
    }
  );

  assert.equal(
    buildProfessionalWorkCenterRoute({
      jobId: JOB,
      stage: "invented",
    }),
    null
  );
});

test("homeowner Work Center route preserves exact Job and semantic stage", () => {
  const route =
    buildHomeownerWorkCenterAlertRoute({
      jobId: JOB,
      quoteId: QUOTE,
      stage: "quote",
      returnPage: "notifications",
    });

  assert.equal(
    route,
    `homeownerRequestDetails?jobId=${JOB}&quoteId=${QUOTE}&stage=quote&returnPage=notifications`
  );

  assert.deepEqual(
    parseHomeownerRequestAlertRoute(route),
    {
      requestId: null,
      jobId: JOB,
      quoteId: QUOTE,
      visitId: null,
      stage: "quote",
      returnPage: "notifications",
    }
  );
});

test("new lifecycle Alerts route to exact role-specific Work Center context", () => {
  assert.equal(
    getAlertWorkCenterStage({
      payload: {
        workCenterStage: "deposit",
      },
    }),
    "deposit"
  );

  assert.equal(
    getAlertDestinationActionTarget(
      {
        type: "conversation",
        conversationId: 91,
        jobId: JOB,
        quoteId: QUOTE,
      },
      {
        professional: true,
        workCenterStage: "deposit",
      }
    ).route,
    `workCenter?jobId=${JOB}&quoteId=${QUOTE}&stage=deposit&returnPage=notifications`
  );

  assert.equal(
    getAlertDestinationActionTarget(
      {
        type: "visit",
        conversationId: 91,
        requestId: 41,
        jobId: JOB,
        visitId: VISIT,
      },
      {
        professional: false,
        workCenterStage: "evaluation",
      }
    ).route,
    `homeownerRequestDetails?requestId=41&jobId=${JOB}&visitId=${VISIT}&stage=evaluation&returnPage=notifications`
  );

  assert.equal(
    getAlertDestinationActionTarget(
      {
        type: "quote",
        jobId: JOB,
        quoteId: QUOTE,
      },
      {
        professional: false,
        workCenterStage: "deposit",
      }
    ).route,
    `homeownerRequestDetails?jobId=${JOB}&quoteId=${QUOTE}&stage=deposit&returnPage=notifications`
  );
});


test("customer Quote and Deposit Alert can recover the exact request from canonical Work Center attention", () => {
  const state = snapshot();

  const target =
    getAlertDestinationActionTarget(
      {
        type: "quote",
        jobId: JOB,
        quoteId: QUOTE,
      },
      {
        professional: false,
        workCenterStage: "deposit",
        homeownerRequestId: 41,
      }
    );

  assert.equal(
    target.route,
    `homeownerRequestDetails?requestId=41&jobId=${JOB}&quoteId=${QUOTE}&stage=deposit&returnPage=notifications`
  );
});


test("Business combined panels total only their owned semantic stages", () => {
  const state = snapshot();

  const job =
    getWorkCenterJobAttention(
      state,
      "7",
      JOB
    );

  assert.equal(
    getWorkCenterGroupedStageUnread(
      job,
      ["evaluation"]
    ),
    1
  );

  assert.equal(
    getWorkCenterGroupedStageUnread(
      job,
      ["deposit", "schedule"]
    ),
    3
  );

  assert.equal(
    getWorkCenterGroupedStageUnread(
      job,
      ["invoice", "completion", "review"]
    ),
    0
  );
});


test("Customer Work Center resolves Alert attention from exact canonical request identity", () => {
  const state = snapshot();

  const request =
    getWorkCenterRequestAttention(
      state,
      "7",
      41
    );

  assert.ok(request);
  assert.equal(request.jobId, JOB);
  assert.equal(request.requestId, 41);
  assert.equal(request.unread, 4);

  assert.equal(
    getWorkCenterRequestAttention(
      state,
      "7",
      999
    ),
    null
  );
});


test("Work Completed Job Alert opens exact role-specific Completion context", () => {
  const homeowner =
    getAlertDestinationActionTarget(
      {
        type: "job",
        jobId: JOB,
      },
      {
        professional: false,
        workCenterStage: "completion",
        homeownerRequestId: 41,
      }
    );

  assert.equal(
    homeowner.route,
    `homeownerRequestDetails?requestId=41&jobId=${JOB}&stage=completion&returnPage=notifications`
  );

  const professional =
    getAlertDestinationActionTarget(
      {
        type: "job",
        jobId: JOB,
      },
      {
        professional: true,
        workCenterStage: "completion",
      }
    );

  assert.equal(
    professional.route,
    `workCenter?jobId=${JOB}&stage=completion&returnPage=notifications`
  );
});

test("Field Employee Job Alert without semantic Work Center stage keeps employee route", () => {
  const target =
    getAlertDestinationActionTarget(
      {
        type: "job",
        jobId: JOB,
      },
      {
        professional: true,
      }
    );

  assert.equal(
    target.route,
    `employeeJobs?jobId=${JOB}&returnPage=notifications`
  );
});
