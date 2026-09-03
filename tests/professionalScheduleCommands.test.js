import assert from "node:assert/strict";
import test from "node:test";

import { prepareProfessionalSchedulingOpportunity } from "../src/utils/professionalScheduleCommands.js";

const opportunity = Object.freeze({
  jobId: "10000000-0000-4000-8000-000000000001",
  purpose: "EVALUATION",
  evaluationId: "20000000-0000-4000-8000-000000000002",
  authority: Object.freeze({ state: "AVAILABLE" }),
});

test("AVAILABLE authority activates, refetches, and verifies ACTIVE before scheduling", async () => {
  const events = [];
  const active = { ...opportunity, authority: { state: "ACTIVE" } };
  const result = await prepareProfessionalSchedulingOpportunity({
    opportunity,
    activate: async () => events.push("activate"),
    readActive: async () => {
      events.push("read");
      return { opportunities: [active] };
    },
  });
  assert.deepEqual(events, ["activate", "read"]);
  assert.equal(result, active);
});

test("ACTIVE authority never reactivates and a failed activation gate remains closed", async () => {
  let activations = 0;
  const active = { ...opportunity, authority: { state: "ACTIVE" } };
  assert.equal(await prepareProfessionalSchedulingOpportunity({
    opportunity: active,
    activate: async () => { activations += 1; },
    readActive: async () => ({ opportunities: [] }),
  }), active);
  assert.equal(activations, 0);

  assert.equal(await prepareProfessionalSchedulingOpportunity({
    opportunity,
    activate: async () => { activations += 1; },
    readActive: async () => ({ opportunities: [] }),
  }), null);
  assert.equal(activations, 1);
});

test("external Approved Work opportunity refresh binds by common Quote approval", async () => {
  const external = {
    jobId: opportunity.jobId,
    purpose: "APPROVED_WORK",
    quoteId: "30000000-0000-4000-8000-000000000003",
    approvedQuoteDecisionId: null,
    quoteApprovalId: "40000000-0000-4000-8000-000000000004",
    approvalSource: "EXTERNAL_EVIDENCE",
    authority: { state: "AVAILABLE" },
  };

  const collision = {
    ...external,
    quoteApprovalId: "50000000-0000-4000-8000-000000000005",
    authority: { state: "ACTIVE" },
  };

  const active = {
    ...external,
    authority: { state: "ACTIVE" },
  };

  const result = await prepareProfessionalSchedulingOpportunity({
    opportunity: external,
    activate: async () => {},
    readActive: async () => ({
      opportunities: [collision, active],
    }),
  });

  assert.equal(result, active);
  assert.equal(result.quoteApprovalId, external.quoteApprovalId);
});

test("canonical subject identity prevents a refreshed opportunity collision", async () => {
  const collision = {
    ...opportunity,
    jobId: "10000000-0000-4000-8000-000000000099",
    authority: { state: "ACTIVE" },
  };
  assert.equal(await prepareProfessionalSchedulingOpportunity({
    opportunity,
    activate: async () => {},
    readActive: async () => ({ opportunities: [collision] }),
  }), null);
});
