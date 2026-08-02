import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_COMMERCIAL_AGGREGATE_TYPES,
  CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
  CANONICAL_COMMERCIAL_EVIDENCE_TYPES,
  CANONICAL_COMMERCIAL_OWNING_ENGINE,
  COMMERCIAL_CAPABILITIES,
  getConfirmedCanonicalCommercialAuthority,
  isCanonicalCommercialEvidence,
  isCommercialCapabilityAvailable,
  validateCanonicalCommercialAuthorityProjection,
} from "../src/utils/canonicalCommercialAuthority.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function validProjection(overrides = {}) {
  return {
    success: true,
    confirmed: true,
    authoritySource: CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
    aggregate: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      type: "quote",
      owningEngine: CANONICAL_COMMERCIAL_OWNING_ENGINE,
      version: 1,
      sourceContext: {
        type: "ordinary_request",
        requestId: 41,
        relationshipId: 52,
      },
    },
    ...overrides,
  };
}

test("canonical projection requires identity, type, version, engine, source, and confirmation", () => {
  const projection = validProjection();
  const validation = validateCanonicalCommercialAuthorityProjection(projection);
  assert.equal(validation.ok, true);
  assert.deepEqual(
    getConfirmedCanonicalCommercialAuthority(projection),
    validation.value
  );

  [
    validProjection({ authoritySource: "workflow-events" }),
    validProjection({ confirmed: false }),
    validProjection({ aggregate: { ...projection.aggregate, id: "41" } }),
    validProjection({ aggregate: { ...projection.aggregate, type: "custom" } }),
    validProjection({
      aggregate: { ...projection.aggregate, owningEngine: "history_engine" },
    }),
    validProjection({ aggregate: { ...projection.aggregate, version: 0 } }),
    validProjection({
      aggregate: {
        ...projection.aggregate,
        sourceContext: {
          type: "ordinary_request",
          requestId: 41,
          emergencyRequestId: 42,
        },
      },
    }),
  ].forEach((value) => {
    assert.equal(validateCanonicalCommercialAuthorityProjection(value).ok, false);
    assert.equal(getConfirmedCanonicalCommercialAuthority(value), null);
  });
});

test("client cannot mark a command confirmed before explicit backend success", () => {
  const projection = validProjection({ success: false });
  assert.equal(
    validateCanonicalCommercialAuthorityProjection(projection).ok,
    true
  );
  assert.equal(getConfirmedCanonicalCommercialAuthority(projection), null);
  assert.equal(
    getConfirmedCanonicalCommercialAuthority(
      validProjection({ success: undefined })
    ),
    null
  );
});

test("legacy workflow events never satisfy canonical commercial evidence", () => {
  const legacyRecords = [
    {
      id: 17,
      workflow_type: "quote",
      workflow_status: "accepted",
      workflow_payload: { version: 1 },
    },
    {
      id: "legacy-event",
      eventType: "WORKFLOW_QUOTE_ACCEPTED",
      actor: "homeowner",
      recordedAt: "2026-08-01T12:00:00.000Z",
      payload: {},
    },
  ];

  legacyRecords.forEach((record) => {
    assert.equal(isCanonicalCommercialEvidence(record), false);
    assert.equal(getConfirmedCanonicalCommercialAuthority(record), null);
  });

  assert.equal(
    isCanonicalCommercialEvidence({
      authoritySource: CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
      evidence: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        aggregateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        aggregateType: "quote",
        owningEngine: CANONICAL_COMMERCIAL_OWNING_ENGINE,
        type: "commercial.aggregate.created",
        actorRole: "homeowner",
        previousVersion: 0,
        resultingVersion: 1,
        payload: { schemaVersion: 1 },
        sourceCommand: "commercial.aggregate.create",
        traceability: {
          governingCharterId: "MC-WORKFLOW-001C",
          governingProgramId: "MC-WORKFLOW-001D",
          implementationMilestoneId: "MC-WORKFLOW-002A",
          certificationTarget: "MC-WORKFLOW-002R",
        },
      },
    }),
    true
  );
  assert.deepEqual(CANONICAL_COMMERCIAL_EVIDENCE_TYPES, [
    "commercial.aggregate.created",
    "commercial.aggregate.version_advanced",
    "evaluation_created",
    "evaluation_draft_updated",
    "evaluation_completed",
  ]);
  assert.equal(
    isCanonicalCommercialEvidence({
      authoritySource: CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
      evidence: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        aggregateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        aggregateType: "quote",
        owningEngine: CANONICAL_COMMERCIAL_OWNING_ENGINE,
        type: "commercial.free_form",
        actorRole: "homeowner",
        previousVersion: 0,
        resultingVersion: 1,
        payload: {},
        sourceCommand: "free.form",
        traceability: {},
      },
    }),
    false
  );
});

test("all future commercial capabilities remain unavailable", () => {
  assert.deepEqual(CANONICAL_COMMERCIAL_AGGREGATE_TYPES, [
    "evaluation",
    "quote",
    "customer_decision",
    "authorization",
    "change_order",
    "invoice",
    "payment",
    "receipt",
    "commercial_completion",
  ]);
  COMMERCIAL_CAPABILITIES.forEach((capability) => {
    assert.equal(isCommercialCapabilityAvailable(capability), false, capability);
  });
  assert.equal(isCommercialCapabilityAvailable("unregistered"), false);
});

test("production source contains no canonical commercial browser writer or API enablement", () => {
  const sourceFiles = [];
  const visit = (directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:js|jsx)$/.test(entry.name)) sourceFiles.push(absolute);
    });
  };
  visit(path.join(repositoryRoot, "src"));

  sourceFiles.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:localStorage|sessionStorage)\.setItem\(\s*["'](?:canonicalCommercialAuthority|commercialAuthorityAggregates|commercialAuthorityEvidence|commercialCommandResults)/,
      path.relative(repositoryRoot, file)
    );
  });

  const utility = fs.readFileSync(
    path.join(repositoryRoot, "src/utils/canonicalCommercialAuthority.js"),
    "utf8"
  );
  assert.doesNotMatch(utility, /\bfetch\s*\(|\baxios\b|localStorage|sessionStorage/);
  assert.doesNotMatch(
    utility,
    /(?:enable|available)\s*:\s*true|return\s+true/
  );
});
