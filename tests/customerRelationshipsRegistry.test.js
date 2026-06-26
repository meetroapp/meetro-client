import test from "node:test";
import assert from "node:assert/strict";

import {
  CUSTOMER_RELATIONSHIP_REGISTRY,
  getCustomerRelationship,
  getCustomerRelationships,
  getCustomerRelationshipsCenterModel,
  getCustomerRelationshipsReport,
} from "../src/utils/customerRelationshipsRegistry.js";

test("exports read-only MVP customer relationships", () => {
  const report = getCustomerRelationshipsReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.customers, ["sarah", "william", "jack_lindstrom"]);
  assert.equal(report.relationshipCount, 3);
  assert.equal(report.activeJobsCount, 2);
  assert.equal(report.closedJobsCount, 2);
});

test("describes the relationship principle separate from jobs", () => {
  const model = getCustomerRelationshipsCenterModel();

  assert.deepEqual(model.principle, [
    "Relationships",
    "Communication",
    "Understanding",
    "Decisions",
    "Work",
    "History",
    "Relationships",
  ]);
  assert.deepEqual(model.futureSections, [
    "Properties",
    "Assets",
    "Referrals",
    "Customer Insights",
  ]);
});

test("lists customer relationship, communication, work, and timeline summaries", () => {
  const sarah = getCustomerRelationship("sarah");

  assert.equal(sarah.name, "Sarah");
  assert.equal(sarah.relationshipStatus, "Active customer");
  assert.equal(sarah.communicationSummary.conversations, 2);
  assert.equal(sarah.workSummary.totalProjects, 2);
  assert.ok(sarah.timeline.includes("Evaluation completed"));
  assert.ok(sarah.timeline.includes("Work completed"));

  const jack = getCustomerRelationship("jack_lindstrom");
  assert.equal(jack.name, "Jack Lindstrom");
  assert.equal(jack.relationshipStatus, "Prospective relationship");
  assert.equal(jack.activeJobsCount, 0);
});

test("normalizes relationship lookups and fails safely for unknown customers", () => {
  assert.equal(getCustomerRelationship("Jack Lindstrom").id, "jack_lindstrom");
  assert.equal(getCustomerRelationship("unknown_customer"), null);
  assert.deepEqual(getCustomerRelationships({ id: "unknown_customer" }), []);
});

test("registry definitions and model helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      CUSTOMER_RELATIONSHIP_REGISTRY.sarah.timeline.push("mutated");
    },
    {
      name: "TypeError",
    }
  );

  const model = getCustomerRelationshipsCenterModel();
  model.relationships[0].name = "caller mutation";
  model.principle.push("caller mutation");

  assert.equal(getCustomerRelationship("sarah").name, "Sarah");
  assert.ok(
    !getCustomerRelationshipsCenterModel().principle.includes("caller mutation")
  );
});
