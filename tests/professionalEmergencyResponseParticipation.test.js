import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  resolveProfessionalEmergencyResponsePresentation,
} from "../src/utils/professionalEmergencyParticipation.js";

const readSource = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("an Emergency opportunity without participation remains actionable", () => {
  assert.deepEqual(
    resolveProfessionalEmergencyResponsePresentation({
      participation: null,
    }),
    {
      actionDisabled: false,
      confirmed: false,
      labelKey: "emergencyRespond",
      pendingParticipation: false,
    }
  );
});

test("hydrated pending participation remains visible and non-actionable", () => {
  assert.deepEqual(
    resolveProfessionalEmergencyResponsePresentation({
      participation: { state: "pending" },
    }),
    {
      actionDisabled: true,
      confirmed: true,
      labelKey: "emergencyResponseSent",
      pendingParticipation: true,
    }
  );
});

test("immediate POST and hydrated GET use the same pending presentation", () => {
  const immediate = resolveProfessionalEmergencyResponsePresentation({
    participation: null,
    localState: {
      phase: "ready",
      created: true,
      participationState: "pending",
    },
  });
  const reloaded = resolveProfessionalEmergencyResponsePresentation({
    participation: { state: "pending" },
    localState: {},
  });

  assert.deepEqual(immediate, reloaded);
  assert.equal(reloaded.actionDisabled, true);
  assert.equal(reloaded.pendingParticipation, true);
});

test("every existing non-pending or unknown participation state fails closed", () => {
  for (const state of [
    "active",
    "declined",
    "withdrawn",
    "closed",
    "unknown",
  ]) {
    const presentation = resolveProfessionalEmergencyResponsePresentation({
      participation: { state },
    });

    assert.equal(presentation.actionDisabled, true, state);
    assert.equal(presentation.confirmed, true, state);
    assert.equal(
      presentation.labelKey,
      "emergencyResponseAlreadySent",
      state
    );
    assert.equal(presentation.pendingParticipation, false, state);
  }
});

test("in-flight, error, and idempotent POST presentation remain truthful", () => {
  assert.equal(
    resolveProfessionalEmergencyResponsePresentation({
      localState: { phase: "loading" },
    }).labelKey,
    "emergencyResponding"
  );
  assert.equal(
    resolveProfessionalEmergencyResponsePresentation({
      localState: { phase: "loading" },
    }).actionDisabled,
    true
  );
  assert.equal(
    resolveProfessionalEmergencyResponsePresentation({
      localState: { phase: "error" },
    }).actionDisabled,
    false
  );
  assert.equal(
    resolveProfessionalEmergencyResponsePresentation({
      localState: {
        phase: "ready",
        created: false,
        participationState: "pending",
      },
    }).labelKey,
    "emergencyResponseAlreadySent"
  );
});

test("reload reconstruction and professional isolation require only each GET payload", () => {
  const beforeResponse = resolveProfessionalEmergencyResponsePresentation({
    participation: null,
  });
  const afterPost = resolveProfessionalEmergencyResponsePresentation({
    localState: {
      phase: "ready",
      created: true,
      participationState: "pending",
    },
  });
  const professionalAReload =
    resolveProfessionalEmergencyResponsePresentation({
      participation: { state: "pending" },
    });
  const professionalBReload =
    resolveProfessionalEmergencyResponsePresentation({
      participation: null,
    });

  assert.equal(beforeResponse.actionDisabled, false);
  assert.equal(afterPost.actionDisabled, true);
  assert.equal(professionalAReload.actionDisabled, true);
  assert.equal(professionalBReload.actionDisabled, false);
});

test("participation presentation introduces no browser authority or request side effects", () => {
  const helperSource = readSource(
    "src/utils/professionalEmergencyParticipation.js"
  );
  const leadsSource = readSource("src/pages/BusinessLeads.jsx");

  assert.doesNotMatch(
    helperSource,
    /localStorage|sessionStorage|CustomEvent|fetch|authFetch|setInterval/
  );
  assert.match(
    leadsSource,
    /participation: opportunity\.participation/
  );
  assert.match(
    leadsSource,
    /emergencyOpportunities\.map\(\(opportunity\)/
  );
  assert.equal(
    (leadsSource.match(/await respondToEmergencyOpportunity\(/g) || [])
      .length,
    1
  );
});

test("ordinary opportunity coordination remains separate from Emergency hydration", () => {
  const coordinatorSource = readSource(
    "src/utils/professionalOpportunityCoordinator.js"
  );
  const helperSource = readSource(
    "src/utils/professionalEmergencyParticipation.js"
  );

  assert.match(
    coordinatorSource,
    /"\/professional-request-opportunities"/
  );
  assert.doesNotMatch(
    coordinatorSource,
    /professional-emergency-opportunities/
  );
  assert.doesNotMatch(
    helperSource,
    /professionalOpportunityCoordinator|requestProfessionalOpportunities/
  );
});
