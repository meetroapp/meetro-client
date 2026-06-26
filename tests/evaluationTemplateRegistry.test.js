import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTEXT_IDS,
  CONTEXT_REGISTRY,
  EVALUATION_TEMPLATE_REGISTRY,
  getContexts,
  getEvaluationRegistryReport,
  getServiceEvaluationCatalog,
  getEvaluationTemplate,
  getEvaluationTemplates,
  getServiceTypes,
  getUniversalWorkflowPhases,
  resolveEvaluationTemplate,
  SERVICE_TYPE_IDS,
  SERVICE_TYPE_REGISTRY,
} from "../src/utils/evaluationTemplateRegistry.js";

test("preserves the universal workflow and mandatory Evaluation phase", () => {
  assert.deepEqual(getUniversalWorkflowPhases(), [
    "request",
    "evaluation",
    "recommendation",
    "approval",
    "execution",
    "completion",
    "closure",
    "history",
  ]);

  const report = getEvaluationRegistryReport();

  assert.equal(report.workflowModel.universal, true);
  assert.equal(report.workflowModel.mandatoryPhase, "evaluation");
});

test("exports the Handyman MVP Service Type registry", () => {
  const handymanServiceTypes = getServiceTypes({
    industry: "handyman",
    businessType: "handyman",
  }).map((serviceType) => serviceType.id);

  assert.deepEqual(handymanServiceTypes, [
    "general_handyman",
    "door_repair",
    "door_replacement",
    "drywall_repair",
    "painting",
    "cabinet_repair",
    "window_repair",
    "tile_repair",
    "fence_repair",
    "appliance_installation",
    "general_maintenance",
  ]);
});

test("exports the MVP Context registry for Handyman", () => {
  const handymanContexts = getContexts({ industry: "handyman" }).map(
    (context) => context.id
  );

  assert.deepEqual(handymanContexts, [
    "homeowner",
    "property_management",
    "commercial",
    "insurance",
    "warranty",
  ]);
});

test("resolves Door Replacement and Property Management to the seeded template", () => {
  const resolution = resolveEvaluationTemplate({
    serviceType: "door_replacement",
    context: "property_management",
  });

  assert.deepEqual(
    {
      serviceType: resolution.serviceType,
      context: resolution.context,
      evaluationTemplate: resolution.evaluationTemplate,
    },
    {
      serviceType: "door_replacement",
      context: "property_management",
      evaluationTemplate: "door_replacement_property_management",
    }
  );
  assert.equal(resolution.found, true);
  assert.deepEqual(resolution.template.requirementRefs, [
    "door_measurements",
    "frame_condition",
    "photos",
    "unit_number",
    "tenant_access_notes",
    "property_manager_approval_notes",
  ]);
  assert.deepEqual(resolution.template.requirements, [
    "Door width",
    "Door height",
    "Door type",
    "Frame condition",
    "Hardware condition",
    "Unit number",
    "Tenant access notes",
    "Before photos",
    "Materials needed",
    "Recommended solution",
    "Property manager approval notes",
  ]);
});

test("keeps context-specific evaluation requirements separate for the same service", () => {
  const homeowner = resolveEvaluationTemplate({
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.HOMEOWNER,
  });
  const propertyManagement = resolveEvaluationTemplate({
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.PROPERTY_MANAGEMENT,
  });

  assert.equal(homeowner.evaluationTemplate, "door_replacement_homeowner");
  assert.equal(
    propertyManagement.evaluationTemplate,
    "door_replacement_property_management"
  );
  assert.ok(!homeowner.template.requirementRefs.includes("unit_number"));
  assert.ok(propertyManagement.template.requirementRefs.includes("unit_number"));
  assert.ok(!homeowner.template.requirements.includes("Unit number"));
  assert.ok(propertyManagement.template.requirements.includes("Unit number"));
});

test("exports seeded preview requirements for Handyman templates", () => {
  assert.deepEqual(
    resolveEvaluationTemplate({
      serviceType: "general_handyman",
      context: "homeowner",
    }).template.requirements,
    [
      "Customer concern",
      "Existing condition",
      "Photos",
      "Measurements if needed",
      "Materials needed",
      "Recommended next step",
    ]
  );
  assert.deepEqual(
    resolveEvaluationTemplate({
      serviceType: "drywall_repair",
      context: "property_management",
    }).template.requirements,
    [
      "Unit number",
      "Damage location",
      "Damage size",
      "Moisture present",
      "Texture type",
      "Paint match needed",
      "Before photos",
      "Materials needed",
      "Tenant access notes",
    ]
  );
});

test("includes cross-industry examples without creating separate workflows", () => {
  assert.equal(
    resolveEvaluationTemplate({
      serviceType: "brake_service",
      context: "retail_customer",
    }).evaluationTemplate,
    "brake_service_retail_customer"
  );
  assert.equal(
    resolveEvaluationTemplate({
      serviceType: "patient_intake",
      context: "healthcare",
    }).evaluationTemplate,
    "patient_intake_healthcare"
  );
  assert.deepEqual(
    getEvaluationRegistryReport().workflowModel.phases,
    getUniversalWorkflowPhases()
  );
});

test("returns an explicit miss instead of inventing an evaluation template", () => {
  const resolution = resolveEvaluationTemplate({
    serviceType: "painting",
    context: "insurance",
  });

  assert.deepEqual(resolution, {
    found: false,
    serviceType: "painting",
    context: "insurance",
    evaluationTemplate: null,
    reason: "No evaluation template is registered for this service/context pair.",
  });
});

test("all templates reference registered service types and contexts", () => {
  Object.values(EVALUATION_TEMPLATE_REGISTRY).forEach((template) => {
    assert.ok(
      SERVICE_TYPE_REGISTRY[template.serviceType],
      `${template.id} references missing Service Type ${template.serviceType}`
    );
    assert.ok(
      CONTEXT_REGISTRY[template.context],
      `${template.id} references missing Context ${template.context}`
    );
    assert.equal(template.workflowPhase, "evaluation");
  });
});

test("read helpers return clones so callers cannot mutate registry definitions", () => {
  const template = getEvaluationTemplate(
    "door_replacement_property_management"
  );
  template.requirementRefs.push("caller_mutation");

  assert.ok(
    !getEvaluationTemplate(
      "door_replacement_property_management"
    ).requirementRefs.includes("caller_mutation")
  );

  const templates = getEvaluationTemplates({ serviceType: "door_replacement" });
  templates[0].serviceType = "mutated";

  assert.equal(
    getEvaluationTemplates({ serviceType: "door_replacement" })[0].serviceType,
    SERVICE_TYPE_IDS.DOOR_REPLACEMENT
  );
});

test("builds a read-only Service Types and Evaluations catalog for Business Tools", () => {
  const catalog = getServiceEvaluationCatalog({
    industry: "handyman",
    businessType: "handyman",
  });
  const handyman = catalog.find((group) => group.industry === "handyman");
  const doorReplacement = handyman.services.find(
    (service) => service.id === "door_replacement"
  );
  const propertyManagementTemplate = doorReplacement.templates.find(
    (template) => template.context === "property_management"
  );

  assert.equal(handyman.label, "Handyman");
  assert.ok(
    doorReplacement.supportedContexts.some(
      (context) => context.label === "Homeowner"
    )
  );
  assert.ok(
    doorReplacement.supportedContexts.some(
      (context) => context.label === "Property Management"
    )
  );
  assert.equal(
    propertyManagementTemplate.key,
    "door_replacement_property_management"
  );
  assert.deepEqual(propertyManagementTemplate.requirements, [
    "Door width",
    "Door height",
    "Door type",
    "Frame condition",
    "Hardware condition",
    "Unit number",
    "Tenant access notes",
    "Before photos",
    "Materials needed",
    "Recommended solution",
    "Property manager approval notes",
  ]);

  propertyManagementTemplate.requirements.push("caller mutation");

  assert.ok(
    !getServiceEvaluationCatalog({
      industry: "handyman",
      businessType: "handyman",
    })[0].services
      .find((service) => service.id === "door_replacement")
      .templates.find((template) => template.context === "property_management")
      .requirements.includes("caller mutation")
  );
});
