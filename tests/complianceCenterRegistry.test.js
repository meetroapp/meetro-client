import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPLIANCE_CENTER_MESSAGE,
  COMPLIANCE_OBLIGATION_REGISTRY,
  getComplianceCenterModel,
  getComplianceCenterReport,
  getComplianceObligation,
  getComplianceObligations,
} from "../src/utils/complianceCenterRegistry.js";

test("exports read-only MVP compliance obligation types", () => {
  const report = getComplianceCenterReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.obligations, [
    "permit_closure",
    "inspection_passed",
    "customer_signoff",
    "tenant_confirmation",
    "property_manager_approval",
    "warranty_registration",
    "required_photos",
    "completion_report",
    "certificate_documentation",
  ]);
  assert.equal(report.obligationCount, 9);
});

test("describes the compliance obligation lifecycle through closure allowance", () => {
  const model = getComplianceCenterModel();

  assert.deepEqual(model.lifecycle, [
    "Obligation Identified",
    "Required Evidence Collected",
    "Reviewed",
    "Satisfied",
    "Job Closure Allowed",
  ]);
  assert.equal(model.lifecycle.at(-1), "Job Closure Allowed");
});

test("separates compliance records and closure dependencies", () => {
  const model = getComplianceCenterModel();

  assert.deepEqual(model.complianceRecordFields, [
    "Obligation type",
    "Status",
    "Required evidence",
    "Responsible party",
  ]);
  assert.deepEqual(model.closureDependencies, [
    "Permit must be closed",
    "Inspection must pass",
    "Customer must sign off",
    "Required photos must be attached",
  ]);
  assert.equal(model.complianceMessage, COMPLIANCE_CENTER_MESSAGE);
});

test("normalizes obligation lookups and fails safely for unknown obligations", () => {
  assert.equal(getComplianceObligation("Customer Signoff").id, "customer_signoff");
  assert.equal(getComplianceObligation("unknown_obligation"), null);
  assert.deepEqual(getComplianceObligations({ id: "unknown_obligation" }), []);
});

test("registry definitions and model helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      COMPLIANCE_OBLIGATION_REGISTRY.permit_closure.name = "mutated";
    },
    {
      name: "TypeError",
    }
  );

  const model = getComplianceCenterModel();
  model.lifecycle.push("caller mutation");
  model.obligations[0].name = "caller mutation";

  assert.ok(!getComplianceCenterModel().lifecycle.includes("caller mutation"));
  assert.equal(getComplianceObligation("permit_closure").name, "Permit Closure");
});
