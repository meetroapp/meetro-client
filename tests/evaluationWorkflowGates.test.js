import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVisitEvaluationPayload,
  canCreateProposal,
  canScheduleWork,
  getEvaluationRecommendationLineage,
  getEvaluationPayloadReadiness,
  hasSavedEvaluation,
} from "../src/utils/evaluationWorkflowGates.js";

function visitConfirmedJob(customerName) {
  const prefix = customerName.toLowerCase();
  return {
    customerName,
    schedule: {
      id: `qa-${prefix}-visit`,
      scheduleId: `qa-${prefix}-visit`,
      visitId: `qa-${prefix}-visit`,
      customerId: `qa-${prefix}-customer`,
      status: "visit_confirmed",
      customerConfirmationStatus: "confirmed",
    },
  };
}

function savedEvaluation(customerName, overrides = {}) {
  const prefix = customerName.toLowerCase();
  const visitId = overrides.visitId || `qa-${prefix}-visit`;
  const customerId = overrides.customerId || `qa-${prefix}-customer`;
  return {
    id: `evaluation-${prefix}`,
    evaluationId: `evaluation-${prefix}`,
    type: "evaluation",
    visitId,
    scheduleId: visitId,
    appointmentId: visitId,
    customerId,
    serviceType: overrides.serviceType || "door_repair",
    context: overrides.context || "homeowner",
    evaluationTemplate: overrides.evaluationTemplate || "door_repair_homeowner",
    evaluationTemplateMatched: true,
    templateRequirements: overrides.templateRequirements || [
      "Door issue",
      "Photos",
    ],
	    notes: `${customerName} evaluation notes only.`,
	    findings: overrides.findings || [],
	    serviceRecommendations: overrides.serviceRecommendations || [],
	    workItems: [
      {
        title: `${customerName} work item`,
        measurements: [{ label: `${customerName} measurement`, value: "24" }],
        materials: [{ name: `${customerName} material`, quantity: "1" }],
        photos: [{ id: `${customerName.toLowerCase()}-photo` }],
      },
    ],
    savedAt: "2026-06-19T14:00:00.000Z",
  };
}

test("Sarah cannot create a proposal until Evaluation is saved", () => {
  const job = visitConfirmedJob("Sarah");

  assert.equal(hasSavedEvaluation(job.schedule), false);
  assert.equal(canCreateProposal({ schedule: job.schedule }), false);
  assert.equal(
    canCreateProposal({
      schedule: {
        ...job.schedule,
        evaluationNotes: "Loose visit note should not unlock proposal.",
      },
    }),
    false
  );

  const evaluation = savedEvaluation("Sarah");
  const updatedSchedule = {
    ...job.schedule,
    evaluation,
    evaluationStatus: "saved",
    evaluationSavedAt: evaluation.savedAt,
    evaluationNotes: evaluation.notes,
  };

  assert.equal(hasSavedEvaluation(updatedSchedule), true);
  assert.equal(canCreateProposal({ schedule: updatedSchedule }), true);
  assert.deepEqual(getEvaluationPayloadReadiness(evaluation), {
    ready: true,
    missingFields: [],
  });
});

test("William cannot create a proposal until his own Evaluation is saved", () => {
  const sarahEvaluation = savedEvaluation("Sarah");
  const williamJob = visitConfirmedJob("William");

  assert.equal(canCreateProposal({ schedule: williamJob.schedule }), false);
  assert.equal(williamJob.schedule.evaluation, undefined);

  const williamEvaluation = savedEvaluation("William", {
    serviceType: "door_replacement",
    context: "property_management",
    evaluationTemplate: "door_replacement_property_management",
    templateRequirements: ["Door width", "Unit number"],
  });
  const williamSchedule = {
    ...williamJob.schedule,
    evaluation: williamEvaluation,
    evaluationStatus: "saved",
    evaluationSavedAt: williamEvaluation.savedAt,
  };

  assert.equal(canCreateProposal({ schedule: williamSchedule }), true);
  assert.equal(sarahEvaluation.context, "homeowner");
  assert.equal(williamEvaluation.context, "property_management");
  assert.notDeepEqual(
    sarahEvaluation.templateRequirements,
    williamEvaluation.templateRequirements
  );

  assert.equal(
    canCreateProposal({
      schedule: {
        ...williamJob.schedule,
        evaluation: sarahEvaluation,
        evaluationStatus: "saved",
        evaluationSavedAt: sarahEvaluation.savedAt,
      },
    }),
    false
  );
});

test("Schedule Work requires approved proposal plus payment or deposit evidence", () => {
  assert.equal(canScheduleWork({ quote: {} }), false);
  assert.equal(
    canScheduleWork({
      quote: {
        status: "accepted",
      },
    }),
    false
  );
  assert.equal(
    canScheduleWork({
      quote: {
        status: "accepted",
        paymentStatus: "deposit_received",
      },
    }),
    true
  );
  assert.equal(
    canScheduleWork({
      quote: {
        quoteStatus: "quote_approved",
        paymentReceivedAt: "2026-06-19T14:00:00.000Z",
      },
    }),
    true
  );
});

test("Completion cannot substitute for Evaluation payload readiness", () => {
  const completionOnly = {
    type: "completion",
    notes: "Final work completed.",
    templateRequirements: [],
  };

  assert.deepEqual(getEvaluationPayloadReadiness(completionOnly), {
    ready: false,
    missingFields: [
      "serviceType",
      "context",
	      "evaluationTemplateMatched",
	      "findings",
	      "serviceRecommendations",
	    ],
	  });
  assert.equal(canCreateProposal({ schedule: { completion: completionOnly } }), false);
});

test("Evaluation payload remains attached to the saved visit", () => {
  const job = visitConfirmedJob("Sarah");
  const payload = buildVisitEvaluationPayload({
    schedule: job.schedule,
    evaluation: savedEvaluation("Sarah", {
      findings: [
        {
          id: "finding-water-damage",
          title: "Water Damage Present",
          recommendedServices: ["cabinet_replacement"],
        },
      ],
      serviceRecommendations: [
        {
          id: "cabinet_replacement",
          title: "Cabinet Replacement",
        },
      ],
    }),
  });

  assert.equal(payload.evaluationId, "evaluation-sarah");
  assert.equal(payload.visitId, "qa-sarah-visit");
  assert.equal(payload.customerId, "qa-sarah-customer");
  assert.deepEqual(payload.observations, ["Sarah evaluation notes only."]);
  assert.equal(payload.measurements[0].workItemTitle, "Sarah work item");
  assert.equal(payload.photos[0].workItemTitle, "Sarah work item");
  assert.equal(payload.recommendations[0].sourceFindingId, "finding-water-damage");
  assert.deepEqual(getEvaluationRecommendationLineage(payload), {
    ready: true,
    missingTrace: [],
  });
});

test("Recommended services must trace back to Findings", () => {
  const evaluation = savedEvaluation("Jack", {
    findings: [
      {
        id: "finding-door-misalignment",
        title: "Door Misalignment",
        recommendedServices: ["door_repair"],
      },
    ],
    serviceRecommendations: [
      {
        id: "door_repair",
        title: "Door Repair",
      },
      {
        id: "painting",
        title: "Painting",
      },
    ],
  });

  const payload = buildVisitEvaluationPayload({
    schedule: visitConfirmedJob("Jack").schedule,
    evaluation,
  });

  const lineage = getEvaluationRecommendationLineage(payload);
  assert.equal(lineage.ready, false);
  assert.deepEqual(
    lineage.missingTrace.map((recommendation) => recommendation.id),
    ["painting"]
  );
});
