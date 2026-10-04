import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EMPTY_EMERGENCY_INTAKE,
  EMERGENCY_REQUEST_INTERPRET_PATCH_PATHS,
  EMERGENCY_REQUEST_INTERPRET_STAGE_PATCH_PATHS,
  EMERGENCY_REQUEST_INTERPRET_STAGES,
  applyEmergencyRequestInterpretation,
  buildEmergencyGeneralArea,
  buildEmergencyRequestInterpretRequest,
  confirmEmergencyRequestInterpretation,
  requestEmergencyRequestInterpretation,
  validateEmergencyRequestInterpretation,
} from "../src/utils/emergencyRequestInterpret.js";

function patch(overrides = {}) {
  return {
    path: "service.specialty",
    value: "roof_leak_repair",
    provenance: "assistant_suggested",
    confidence: 0.94,
    uncertainty: "assistant_suggested",
    requiresConfirmation: true,
    rationale: "The reported rain-related ceiling leak supports this service.",
    ...overrides,
  };
}

function interpretation(stage = "describe", overrides = {}) {
  const defaultFields = stage === "describe"
    ? [
        patch(),
        patch({
          path: "description",
          value: "Water is coming through the ceiling after the rain.",
        }),
      ]
    : [
        patch({ path: "location.city", value: "Cape Coral" }),
        patch({ path: "location.region", value: "FL" }),
        patch({ path: "location.postalCode", value: "33990" }),
      ];
  const fields = overrides.draftPatch?.fields ?? defaultFields;
  const clarifications = overrides.clarifications ?? [];
  const warnings = overrides.warnings ?? [];
  return {
    schemaVersion: 1,
    summary: stage === "describe"
      ? "This sounds like a Roof Leak Repair emergency."
      : "I can use Cape Coral, FL 33990 as the general service area.",
    ...overrides,
    draftPatch: { fields },
    clarifications,
    warnings,
    validation: {
      status: "accepted",
      taxonomy: "emergency_service",
      patchCount: fields.length,
      clarificationCount: clarifications.length,
      warningCount: warnings.length,
      ...(overrides.validation || {}),
    },
  };
}

test("Emergency interpretation request requires the bounded describe/location stage contract", () => {
  const request = buildEmergencyRequestInterpretRequest({
    text: "Water is coming through my ceiling after the rain.",
    stage: "describe",
  });
  assert.equal(request.operation, "emergency_request.interpret");
  assert.equal(request.capability, "emergency_request.interpret");
  assert.deepEqual(request.context, {
    stage: "describe",
    intake: EMPTY_EMERGENCY_INTAKE,
  });
  assert.deepEqual(EMERGENCY_REQUEST_INTERPRET_STAGES, ["describe", "location"]);
  assert.deepEqual(EMERGENCY_REQUEST_INTERPRET_STAGE_PATCH_PATHS, {
    describe: ["description", "service.specialty"],
    location: ["location.city", "location.region", "location.postalCode"],
  });
  assert.deepEqual(EMERGENCY_REQUEST_INTERPRET_PATCH_PATHS, [
    "description",
    "service.specialty",
    "location.city",
    "location.region",
    "location.postalCode",
  ]);
  assert.throws(
    () => buildEmergencyRequestInterpretRequest({ text: "Roof leak", stage: "review" }),
    /stage is not supported/
  );
  const serializedContext = JSON.stringify(request.context);
  for (const forbidden of [
    "requestId",
    "jobId",
    "conversationId",
    "streetAddress",
    "unitNumber",
    "accessNotes",
    "safetyAssessment",
    "professionalId",
  ]) assert.equal(serializedContext.includes(forbidden), false, forbidden);
});

test("pre-selection exact/private location and contact input fails before provider execution", async () => {
  for (const text of [
    "Water is entering at 123 Main Street in Cape Coral 33990.",
    "I am in unit 2.",
    "I am in unit B.",
    "The gate code is 1234.",
    "My email is homeowner@example.com.",
    "Call me at 239-555-1212.",
    "Call me at 2395551212.",
  ]) {
    assert.throws(
      () => buildEmergencyRequestInterpretRequest({ text, stage: "describe" }),
      /general service area/
    );
  }

  let called = false;
  await assert.rejects(
    requestEmergencyRequestInterpretation({
      text: "123 Main Street, Cape Coral",
      stage: "location",
      idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
      authFetchImpl: async () => {
        called = true;
        throw new Error("should not execute");
      },
    }),
    /general service area/
  );
  assert.equal(called, false);
});

test("describe accepts only description/service and location accepts only general-area proposals", () => {
  assert.equal(
    validateEmergencyRequestInterpretation(interpretation("describe"), { stage: "describe" })
      .draftPatch.fields.length,
    2
  );
  assert.equal(
    validateEmergencyRequestInterpretation(interpretation("location"), { stage: "location" })
      .draftPatch.fields.length,
    3
  );

  assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
    draftPatch: { fields: [patch({ path: "location.city", value: "Cape Coral" })] },
  }), { stage: "describe" }), null);

  assert.equal(validateEmergencyRequestInterpretation(interpretation("location", {
    draftPatch: { fields: [patch({ path: "service.specialty", value: "roof_leak_repair" })] },
  }), { stage: "location" }), null);

  assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
    clarifications: [{ question: "What city or ZIP code should I use?" }],
  }), { stage: "describe" }), null);
});

test("strict validation rejects unsupported authority and private provider output", () => {
  assert.equal(validateEmergencyRequestInterpretation({
    ...interpretation("describe"),
    action: { type: "CREATE_EMERGENCY" },
  }, { stage: "describe" }), null);
  assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
    draftPatch: { fields: [patch({ requiresConfirmation: false })] },
  }), { stage: "describe" }), null);

  for (const field of [
    patch({ value: "locksmith" }),
    patch({ path: "location.street", value: "123 Main Street" }),
    patch({ path: "safety.immediateDanger", value: "false" }),
    patch({ path: "professional.id", value: "15" }),
  ]) {
    assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
      draftPatch: { fields: [field] },
    }), { stage: "describe" }), null);
  }

  assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
    summary: "Help is needed at 123 Main Street.",
  }), { stage: "describe" }), null);
  assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
    summary: "Please provide your phone.",
  }), { stage: "describe" }), null);
  assert.equal(validateEmergencyRequestInterpretation(interpretation("describe", {
    clarifications: [{ question: "What is your email?" }],
  }), { stage: "describe" }), null);
  assert.equal(validateEmergencyRequestInterpretation(interpretation("location", {
    clarifications: [{ question: "What is your unit number?", fieldPath: "location.city" }],
  }), { stage: "location" }), null);
});

test("assistant proposals can be corrected before review while stages preserve unrelated values", () => {
  const current = {
    description: "Water is coming from a pipe near the ceiling.",
    service: { specialty: "emergency_plumbing" },
    location: { city: "", region: "", postalCode: "" },
  };
  const described = applyEmergencyRequestInterpretation(
    current,
    interpretation("describe"),
    { stage: "describe" }
  );
  assert.equal(described.intake.description, "Water is coming through the ceiling after the rain.");
  assert.equal(described.intake.service.specialty, "roof_leak_repair");
  assert.deepEqual(described.appliedFields, ["service.specialty", "description"]);

  const located = applyEmergencyRequestInterpretation(
    described.intake,
    interpretation("location"),
    { stage: "location" }
  );
  assert.equal(located.intake.description, described.intake.description);
  assert.equal(located.intake.service.specialty, described.intake.service.specialty);
  assert.deepEqual(located.intake.location, {
    city: "Cape Coral",
    region: "FL",
    postalCode: "33990",
  });
  assert.deepEqual(located.rejectedFields, []);
});

test("only reviewed general-area components become canonical location text", () => {
  assert.equal(
    buildEmergencyGeneralArea({ city: "Cape Coral", region: "FL", postalCode: "33990" }),
    "Cape Coral, FL 33990"
  );
  assert.deepEqual(confirmEmergencyRequestInterpretation({
    description: "Water is coming through my ceiling.",
    service: { specialty: "roof_leak_repair" },
    location: { city: "Cape Coral", region: "FL", postalCode: "33990" },
  }), {
    description: "Water is coming through my ceiling.",
    serviceSpecialty: "roof_leak_repair",
    locationText: "Cape Coral, FL 33990",
    unitNumber: "",
    accessNotes: "",
  });
});

test("request posts one stage-scoped proposal operation and accepts only that stage result", async () => {
  const calls = [];
  const result = await requestEmergencyRequestInterpretation({
    text: "Water is coming through my ceiling after the rain.",
    stage: "describe",
    idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
    authFetchImpl: async (...args) => {
      calls.push(args);
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "INTELLIGENCE_OPERATION_COMPLETED",
          operation: "emergency_request.interpret",
          operationId: "123e4567-e89b-42d3-a456-426614174001",
          correlationId: "123e4567-e89b-42d3-a456-426614174002",
          result: interpretation("describe"),
        },
      };
    },
  });
  assert.equal(result.interpretation.draftPatch.fields.length, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/companion/ask");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers["Idempotency-Key"], "123e4567-e89b-42d3-a456-426614174000");
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.operation, "emergency_request.interpret");
  assert.equal(body.context.stage, "describe");
  assert.deepEqual(body.context.intake, EMPTY_EMERGENCY_INTAKE);
});

test("Emergency intake code has no browser storage or generic prose-to-authority parser", () => {
  const utilitySource = readFileSync(
    new URL("../src/utils/emergencyRequestInterpret.js", import.meta.url),
    "utf8"
  );
  const pageSource = readFileSync(
    new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
    "utf8"
  );
  for (const forbidden of ["localStorage", "sessionStorage"]) {
    assert.equal(utilitySource.includes(forbidden), false);
    assert.equal(pageSource.includes(forbidden), false);
  }
  assert.doesNotMatch(utilitySource, /assistant.*match\(|summary.*match\(/i);
  assert.match(pageSource, /result\.interpretation/);
  assert.match(pageSource, /createEmergencyDraft\(payload/);
});
