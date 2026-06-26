import test from "node:test";
import assert from "node:assert/strict";

import {
  getPermitCenterModel,
  getPermitCenterReport,
  getPermitType,
  getPermitTypes,
  PERMIT_CENTER_MESSAGE,
  PERMIT_TYPE_REGISTRY,
} from "../src/utils/permitCenterRegistry.js";

test("exports read-only MVP permit types", () => {
  const report = getPermitCenterReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.permitTypes, [
    "building_permit",
    "electrical_permit",
    "plumbing_permit",
    "mechanical_permit",
    "roofing_permit",
    "solar_permit",
  ]);
  assert.equal(report.permitTypeCount, 6);
});

test("describes the permit lifecycle through job closure", () => {
  const model = getPermitCenterModel();

  assert.deepEqual(model.lifecycle, [
    "Permit Required",
    "Permit Submitted",
    "Permit Approved",
    "Work Performed",
    "Inspection Scheduled",
    "Inspection Passed",
    "Permit Closed",
    "Job Closure",
  ]);
  assert.equal(model.lifecycle.at(-1), "Job Closure");
});

test("separates permit records, inspection records, and closure dependencies", () => {
  const model = getPermitCenterModel();

  assert.deepEqual(model.permitRecordFields, [
    "Permit Number",
    "Permit Type",
    "Municipality",
    "Status",
  ]);
  assert.deepEqual(model.inspectionRecordFields, [
    "Scheduled",
    "Passed",
    "Failed",
  ]);
  assert.deepEqual(model.closureDependencies, [
    "Permit Closed",
    "Inspection Passed",
    "Documentation Complete",
  ]);
  assert.equal(model.complianceMessage, PERMIT_CENTER_MESSAGE);
});

test("normalizes permit lookups and fails safely for unknown permit types", () => {
  assert.equal(getPermitType("Electrical Permit").id, "electrical_permit");
  assert.equal(getPermitType("unknown_permit"), null);
  assert.deepEqual(getPermitTypes({ id: "unknown_permit" }), []);
});

test("registry definitions and model helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      PERMIT_TYPE_REGISTRY.building_permit.name = "mutated";
    },
    {
      name: "TypeError",
    }
  );

  const model = getPermitCenterModel();
  model.lifecycle.push("caller mutation");
  model.permitTypes[0].name = "caller mutation";

  assert.ok(!getPermitCenterModel().lifecycle.includes("caller mutation"));
  assert.equal(getPermitType("building_permit").name, "Building Permit");
});
