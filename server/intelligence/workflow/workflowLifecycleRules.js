export const MEETRO_WORKFLOW_STAGES = [
  "relationship",
  "communication",
  "schedule",
  "evaluation",
  "quote",
  "approval",
  "work",
  "completion",
  "closure",
  "history",
];

export const WORKFLOW_LIFECYCLE_RULES = {
  relationship: {
    summary: "A relationship must exist before trusted work communication can become meaningful.",
    nextSafeAction: "Establish who is involved and why the relationship matters before moving work forward.",
  },
  communication: {
    summary: "Communication clarifies need, scope, urgency, and expectations.",
    nextSafeAction: "Clarify the need, scope, urgency, and expectations before scheduling or quoting.",
  },
  schedule: {
    summary: "A visit or appointment should happen before evaluation when physical inspection is needed.",
    nextSafeAction: "Schedule or confirm the visit needed to evaluate the work safely.",
  },
  evaluation: {
    summary: "Evaluation collects findings, photos, measurements, materials, and safety notes.",
    nextSafeAction: "Collect the findings needed before a quote or proposal is treated as ready.",
  },
  quote: {
    summary: "A quote or proposal should be based on evaluation findings.",
    nextSafeAction: "Prepare or review the quote from verified evaluation findings.",
  },
  approval: {
    summary: "Customer approval should happen before work begins.",
    nextSafeAction: "Wait for or confirm customer approval before work begins.",
  },
  work: {
    summary: "Work is where the professional guides status, starts work, and documents progress.",
    nextSafeAction: "Continue the work while documenting progress and keeping the relationship clear.",
  },
  completion: {
    summary: "Completion records that work was performed.",
    nextSafeAction: "Confirm what was completed and gather the records needed for closure.",
  },
  closure: {
    summary:
      "Closure confirms remaining obligations are satisfied: payment, receipt, warranty, permits, inspection, documentation, and unresolved issues.",
    nextSafeAction: "Resolve remaining closure obligations before treating the work as history.",
  },
  history: {
    summary: "Closed work becomes service history and relationship history.",
    nextSafeAction: "Preserve the completed record so the relationship history remains useful later.",
  },
};

