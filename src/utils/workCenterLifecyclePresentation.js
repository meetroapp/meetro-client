export const WORK_CENTER_JOB_LIFECYCLE = Object.freeze([
  Object.freeze({ key: "evaluation", label: "Evaluation", icon: "evaluationNotes" }),
  Object.freeze({ key: "quote", label: "Quote", icon: "quote" }),
  Object.freeze({ key: "deposit", label: "Deposit", icon: "payment" }),
  Object.freeze({ key: "schedule", label: "Schedule", icon: "schedule" }),
  Object.freeze({ key: "workPlan", label: "Work Plan", icon: "workCenter" }),
  Object.freeze({ key: "completeJob", label: "Complete Job", icon: "completion" }),
  Object.freeze({ key: "invoice", label: "Invoice", icon: "payment" }),
]);

const EVALUATION_STAGES = new Set([
  "EVALUATION_NEEDED",
  "EVALUATION_IN_PROGRESS",
  "FINDINGS_REVIEW_NEEDED",
  "FINDINGS_NEEDED",
  "RECOMMENDATIONS_NEEDED",
]);

const QUOTE_STAGES = new Set([
  "QUOTE_NEEDED",
  "QUOTE_DRAFT",
  "QUOTE_DELIVERY_PENDING",
  "WAITING_FOR_CUSTOMER_DECISION",
  "QUOTE_DECLINED",
]);

const WORK_PLAN_STAGES = new Set([
  "WORK_READY",
  "WORK_IN_PROGRESS",
  "WORK_BLOCKED",
  "WORK_REVIEW_NEEDED",
]);

const INVOICE_ACTIONS = new Set([
  "READY_TO_INVOICE",
  "REVIEW_DRAFT_INVOICE",
  "WAIT_FOR_PAYMENT",
  "REVIEW_BALANCE_DUE",
  "REVIEW_PAID_INVOICE",
]);

function normalized(value) {
  return typeof value === "string" ? value.trim() : "";
}

function depositRequiresAction(deposit) {
  const state = normalized(deposit?.state || deposit?.status).toUpperCase();
  return Boolean(
    state &&
      !["SATISFIED", "NOT_REQUIRED", "PAID", "WAIVED", "COMPLETE", "COMPLETED"].includes(state)
  );
}

function resolveCurrentStageIndex(liveJob) {
  const stageCode = normalized(liveJob?.stage?.code);
  const actionCode = normalized(liveJob?.nextAction?.code);
  const actionLabel = normalized(liveJob?.nextAction?.label);

  if (stageCode === "JOB_COMPLETED") return 6;

  // Invoice actions cannot unlock Invoice without canonical Job completion.
  if (INVOICE_ACTIONS.has(actionCode)) return 5;
  if (
    actionCode === "REVIEW_WORKSTREAM_COMPLETION" ||
    ["WORKSTREAMS_COMPLETE_PENDING_JOB_COMPLETION", "WORK_COMPLETED"].includes(stageCode)
  ) {
    return 5;
  }

  if (EVALUATION_STAGES.has(stageCode)) return 0;
  if (QUOTE_STAGES.has(stageCode)) return 1;

  if (stageCode === "QUOTE_APPROVED_DEPOSIT_DUE") return 2;
  if (stageCode === "QUOTE_APPROVED") {
    return depositRequiresAction(liveJob?.deposit) ? 2 : 3;
  }

  if (WORK_PLAN_STAGES.has(stageCode)) {
    if (
      stageCode === "WORK_READY" &&
      (actionCode === "REVIEW_APPROVED_QUOTE_TERMS" || /schedule|visit/i.test(actionLabel))
    ) {
      return 3;
    }
    return 4;
  }

  return 0;
}

export function resolveWorkCenterLifecyclePresentation({ liveJob, invoice, sourceType } = {}) {
  if (sourceType === 'emergency_request' && !liveJob) return {sourceType,authoritySource:'UNAVAILABLE',currentStageKey:'',completedCount:0,canonicalJobCompleted:false,invoiceUnlocked:false,statusLabel:'Current status unavailable',nextActionLabel:'Open the Job to refresh its next step',responsibilityLabel:'Unavailable',stages:[]};
  if (liveJob?.sourceType === 'emergency_request') {
    const groups = [
      ['dispatch','Dispatch',['ASSIGNED','ON_THE_WAY','EMERGENCY_REVIEW_REQUIRED']],
      ['evaluation','Evaluation',['EVALUATION_NEEDED','EVALUATION_IN_PROGRESS']],
      ['quote','Quote',['QUOTE_NEEDED','QUOTE_DRAFT','WAITING_FOR_CUSTOMER_DECISION','QUOTE_DECLINED']],
      ['deposit','Deposit',['QUOTE_APPROVED_DEPOSIT_DUE']],
      ['work','Work',['WORK_READY','WORK_IN_PROGRESS']],
      ['invoice','Invoice',['JOB_COMPLETED','FINAL_INVOICE','PARTIALLY_PAID']],
      ['paid','Paid',['PAID']],
    ];
    const current=groups.findIndex(g=>g[2].includes(liveJob.stage.code));
    const stages=groups.map(([key,label],index)=>({key,label,index,state:index<current?'complete':index===current?'current':'locked',currentAction:index===current?liveJob.nextAction.label:''}));
    return {authoritySource:'CANONICAL_LIVE_JOB_READ',sourceType:liveJob.sourceType,currentStageKey:groups[current]?.[0]||'',completedCount:Math.max(0,current),canonicalJobCompleted:['JOB_COMPLETED','FINAL_INVOICE','PARTIALLY_PAID','PAID'].includes(liveJob.stage.code),invoiceUnlocked:['JOB_COMPLETED','FINAL_INVOICE','PARTIALLY_PAID','PAID'].includes(liveJob.stage.code),statusLabel:liveJob.stage.label,nextActionLabel:liveJob.nextAction.label,responsibilityLabel:liveJob.responsibility.label,stages};
  }
  const ready = Boolean(liveJob?.stage?.code && liveJob?.nextAction?.code);
  const currentIndex = ready ? resolveCurrentStageIndex(liveJob) : 0;
  const canonicalJobCompleted = liveJob?.stage?.code === "JOB_COMPLETED";
  const canonicalInvoicePaid =
    canonicalJobCompleted &&
    normalized(liveJob?.nextAction?.code).toUpperCase() === "REVIEW_PAID_INVOICE";
  const lifecycleComplete = ready && canonicalInvoicePaid;

  const stages = WORK_CENTER_JOB_LIFECYCLE.map((stage, index) => {
    const state = lifecycleComplete
      ? "complete"
      : ready
        ? index < currentIndex
          ? "complete"
          : index === currentIndex
            ? "current"
            : "locked"
        : index === 0
          ? "current"
          : "locked";

    return Object.freeze({
      ...stage,
      index,
      state,
      currentAction:
        state === "current" ? normalized(liveJob?.nextAction?.label) : "",
    });
  });

  return Object.freeze({
    authoritySource: ready ? "CANONICAL_LIVE_JOB_READ" : "UNAVAILABLE",
    currentStageKey: lifecycleComplete ? "" : stages[currentIndex].key,
    completedCount: stages.filter((stage) => stage.state === "complete").length,
    canonicalJobCompleted,
    invoiceUnlocked: canonicalJobCompleted,
    // Invoice data is intentionally excluded from Job-completion projection.
    invoiceStatusObserved: normalized(invoice?.status),
    statusLabel: normalized(liveJob?.stage?.label) || "Current status unavailable",
    nextActionLabel: normalized(liveJob?.nextAction?.label) || "Open the Job to refresh its next step",
    responsibilityLabel: normalized(liveJob?.responsibility?.label) || "Unavailable",
    stages: Object.freeze(stages),
  });
}

export function getWorkCenterLifecycleStage(presentation, key) {
  return presentation?.stages?.find((stage) => stage.key === key) || null;
}
