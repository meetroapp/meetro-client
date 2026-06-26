import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTRACT_TEMPLATE_REGISTRY,
  getContractTemplate,
  getContractTemplateReport,
  getContractTemplates,
} from "../src/utils/contractTemplatesRegistry.js";

test("exports read-only MVP contract template categories", () => {
  const report = getContractTemplateReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.templates, [
    "handyman_agreement",
    "kitchen_remodel_agreement",
    "change_order",
    "warranty_agreement",
    "property_management_service_agreement",
    "emergency_service_authorization",
  ]);
  assert.equal(report.templateCount, 6);
  assert.ok(report.sectionCount > report.templateCount);
});

test("lists Kitchen Remodel Agreement purpose, use case, and sections", () => {
  const template = getContractTemplate("kitchen_remodel_agreement");

  assert.equal(template.name, "Kitchen Remodel Agreement");
  assert.equal(template.purpose, "Residential kitchen renovation projects.");
  assert.ok(template.typicalUseCase.includes("Kitchen remodels"));
  assert.deepEqual(template.sections, [
    "Scope of Work",
    "Materials",
    "Payment Terms",
    "Change Orders",
    "Completion Terms",
    "Signatures",
  ]);
});

test("lists property management and emergency agreement sections", () => {
  assert.ok(
    getContractTemplate("property_management_service_agreement").sections.includes(
      "Tenant Access"
    )
  );
  assert.ok(
    getContractTemplate("emergency_service_authorization").sections.includes(
      "Authorization to Inspect"
    )
  );
});

test("normalizes template lookups and fails safely for unknown templates", () => {
  assert.equal(
    getContractTemplate("Kitchen Remodel Agreement").id,
    "kitchen_remodel_agreement"
  );
  assert.equal(getContractTemplate("unknown_template"), null);
  assert.deepEqual(getContractTemplates({ id: "unknown_template" }), []);
});

test("registry definitions and read helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      CONTRACT_TEMPLATE_REGISTRY.kitchen_remodel_agreement.sections.push(
        "mutated"
      );
    },
    {
      name: "TypeError",
    }
  );

  const template = getContractTemplate("kitchen_remodel_agreement");
  template.sections.push("caller mutation");

  assert.ok(
    !getContractTemplate("kitchen_remodel_agreement").sections.includes(
      "caller mutation"
    )
  );
});
