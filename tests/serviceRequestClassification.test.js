import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyServiceRequest,
  SERVICE_REQUEST_CLASSIFICATIONS,
} from "../src/utils/serviceRequestClassification.js";

function candidateTypes(report) {
  return report.classificationCandidates.map(
    (candidate) => candidate.classification
  );
}

test("classifies an airport ride as TransportationService, not Project", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-airport-1",
    category: "privateTransportation",
    intent: { outcome: "Arrive at the airport for a scheduled flight" },
    information: {
      transportation: {
        pickupLocation: "Home",
        destination: "Airport",
        scheduledAt: "2026-06-15T08:00:00.000Z",
        passengerCount: 2,
      },
    },
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.TRANSPORTATION_SERVICE
  );
  assert.equal(
    candidateTypes(report).includes(SERVICE_REQUEST_CLASSIFICATIONS.PROJECT),
    false
  );
  assert.equal(report.confidence, "HIGH");
  assert.equal(report.requiresClassificationReview, false);
  assert.ok(
    report.informationWarnings.some(
      (warning) => warning.code === "category-not-classification-evidence"
    )
  );
});

test("classifies weekly cleaning from recurrence evidence", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-cleaning-1",
    category: "cleaning",
    intent: { outcome: "Keep the home cleaned every week" },
    information: {
      recurrence: {
        isRecurring: true,
        frequency: "weekly",
      },
      scope: {
        defined: true,
        complexity: "routine",
      },
    },
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.RECURRING_SERVICE
  );
  assert.equal(report.confidence, "HIGH");
});

test("keeps hoarder cleanup as multiple candidates requiring review", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-cleanup-1",
    intent: { outcome: "Restore a severely cluttered home to safe condition" },
    information: {
      scope: {
        defined: false,
        complexity: "high",
        multiPhase: true,
      },
      condition: {
        biohazard: true,
        habitabilityRisk: true,
      },
      consultation: {
        assessmentRequired: true,
        reason: "On-site condition and disposal requirements are unknown",
      },
    },
  });

  assert.deepEqual(candidateTypes(report), [
    SERVICE_REQUEST_CLASSIFICATIONS.PROJECT,
    SERVICE_REQUEST_CLASSIFICATIONS.CONSULTATION,
  ]);
  assert.equal(report.requiresClassificationReview, true);
  assert.ok(
    report.informationWarnings.some(
      (warning) => warning.code === "hazard-evidence-requires-review"
    )
  );
});

test("classifies a defined kitchen remodel as Project", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-remodel-1",
    intent: { outcome: "Remodel the kitchen" },
    information: {
      scope: {
        defined: true,
        complexity: "high",
        multiPhase: true,
        structuralChange: true,
        requiresPermits: true,
      },
    },
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.PROJECT
  );
  assert.equal(report.confidence, "HIGH");
  assert.equal(report.requiresClassificationReview, false);
});

test("returns MaintenanceRequest and Emergency candidates for an urgent tenant leak", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-tenant-leak-1",
    intent: { outcome: "Stop an active leak in the tenant unit" },
    information: {
      urgency: {
        level: "urgent",
        activeDamage: true,
        reportedAt: "2026-06-14T09:00:00.000Z",
      },
      location: "Unit 3B",
      property: {
        isManagedProperty: true,
        reportedByRole: "tenant",
        assetOrUnit: "Unit 3B",
        maintenanceResponsibility: "propertyManager",
      },
    },
  });

  assert.deepEqual(candidateTypes(report), [
    SERVICE_REQUEST_CLASSIFICATIONS.MAINTENANCE_REQUEST,
    SERVICE_REQUEST_CLASSIFICATIONS.EMERGENCY,
  ]);
  assert.equal(report.requiresClassificationReview, true);
});

test("classifies emergency plumbing evidence and always requires review", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-plumbing-1",
    intent: { outcome: "Stop water flooding the home" },
    information: {
      location: "Kitchen",
      urgency: {
        level: "emergency",
        immediateSafetyRisk: true,
        activeDamage: true,
        reportedAt: "2026-06-14T10:00:00.000Z",
      },
    },
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.EMERGENCY
  );
  assert.equal(report.confidence, "HIGH");
  assert.equal(report.requiresClassificationReview, true);
});

test("classifies an explicit consultation request", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-consultation-1",
    intent: { outcome: "Understand options before choosing work" },
    information: {
      consultation: {
        requested: true,
        reason: "Customer wants professional options and feasibility advice",
      },
    },
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.CONSULTATION
  );
  assert.equal(report.confidence, "HIGH");
  assert.equal(report.requiresClassificationReview, false);
});

test("preserves Unknown for an insufficient-information request", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-unknown-1",
    category: "cleaning",
    intent: { outcome: "I need help" },
    information: {},
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.UNKNOWN
  );
  assert.equal(report.confidence, "LOW");
  assert.equal(report.requiresClassificationReview, true);
  assert.deepEqual(report.missingInformation, [
    "information.recurrence.isRecurring",
    "information.scope.defined",
    "information.urgency.level",
  ]);
});

test("uses structured scope evidence for WorkOrder", () => {
  const report = classifyServiceRequest({
    serviceRequestId: "request-work-order-1",
    intent: { outcome: "Replace one broken interior door handle" },
    information: {
      scope: {
        defined: true,
        complexity: "low",
        singleTask: true,
      },
      recurrence: {
        isRecurring: false,
      },
    },
  });

  assert.equal(
    report.classificationCandidates[0].classification,
    SERVICE_REQUEST_CLASSIFICATIONS.WORK_ORDER
  );
  assert.equal(report.confidence, "HIGH");
});

test("does not mutate input and produces deterministic output", () => {
  const input = {
    serviceRequestId: "request-deterministic-1",
    intent: { outcome: "Repair a tenant leak" },
    information: {
      urgency: {
        level: "routine",
        immediateSafetyRisk: true,
      },
      property: {
        reportedByRole: "tenant",
      },
    },
  };
  const original = structuredClone(input);
  const first = classifyServiceRequest(input);
  const second = classifyServiceRequest(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, original);
  assert.equal(first.requiresClassificationReview, true);
  assert.ok(
    first.informationWarnings.some(
      (warning) => warning.code === "conflicting-urgency-evidence"
    )
  );
});

