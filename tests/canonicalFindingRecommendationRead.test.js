import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateCanonicalFindingProjection,
  validateCanonicalFindings,
  validateCanonicalRecommendationProjection,
  validateCanonicalRecommendations,
} from "../src/utils/canonicalFindingRecommendation.js";
import {
  CanonicalLifecycleReadError,
  confirmCanonicalFinding,
  createCanonicalRecommendation,
  listCanonicalFindingsForEvaluation,
  listCanonicalRecommendationsForFinding,
  submitCanonicalFinding,
  updateCanonicalFinding,
  updateCanonicalRecommendation,
} from "../src/utils/findingRecommendationApi.js";
import {
  loadCanonicalFindingsForEvaluation,
  loadCanonicalRecommendationsForFinding,
} from "../src/utils/findingRecommendationReadController.js";
import { ordinaryCanonicalEvaluationFixture } from "./canonicalEvaluation.test.js";

const ids = Object.freeze({
  evaluation: "11111111-1111-4111-8111-111111111111",
  job: "66666666-6666-4666-8666-666666666666",
  finding: "77777777-7777-4777-8777-777777777777",
  participant: "88888888-8888-4888-8888-888888888888",
  concernLink: "99999999-9999-4999-8999-999999999999",
  concern: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  evidence: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  primary: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  alternative: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  constraint: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  disposition: "ffffffff-ffff-4fff-8fff-ffffffffffff",
});

const createdAt = "2026-08-11T16:00:00.000Z";
const updatedAt = "2026-08-11T16:05:00.000Z";

function findingVersion(overrides = {}) {
  return {
    version: 1,
    evaluationVersion: 2,
    statement: "Water damage is visible at the cabinet base.",
    confirmationState: "PROPOSED",
    resolutionState: "OPEN",
    customerVisible: false,
    createdByParticipantId: ids.participant,
    integrity: {
      algorithm: "sha256",
      hash: "a".repeat(64),
      version: 1,
    },
    createdAt,
    ...overrides,
  };
}

function canonicalFindingFixture(overrides = {}) {
  const versions = overrides.versions || [findingVersion()];
  const current = versions.at(-1);
  return {
    authoritySource: "canonical-commercial-authority",
    id: ids.finding,
    evaluationId: ids.evaluation,
    jobId: ids.job,
    requestId: 41,
    relationshipId: 72,
    authorParticipantId: ids.participant,
    currentVersion: current.version,
    statement: current.statement,
    confirmationState: current.confirmationState,
    resolutionState: current.resolutionState,
    customerVisible: current.customerVisible,
    evaluationVersion: current.evaluationVersion,
    createdAt,
    concernLinks: [
      {
        id: ids.concernLink,
        concernId: ids.concern,
        relationshipType: "EXPLAINS",
        createdByParticipantId: ids.participant,
        createdAt,
      },
    ],
    evidenceReferences: [
      {
        id: ids.evidence,
        findingVersion: current.version,
        evidenceType: "PROFESSIONAL_OBSERVATION",
        referenceNamespace: "evaluation.observation",
        referenceId: "observation-1",
        recordedByParticipantId: ids.participant,
        createdAt,
      },
    ],
    ...overrides,
    versions,
  };
}

function recommendationVersion(overrides = {}) {
  return {
    version: 1,
    evaluationVersion: 2,
    statement: "Replace the water-damaged cabinet base.",
    status: "ACTIVE",
    customerVisible: false,
    createdAt,
    ...overrides,
  };
}

function recommendationFixture(overrides = {}) {
  const versions = overrides.versions || [recommendationVersion()];
  const current = versions.at(-1);
  return {
    id: ids.primary,
    jobId: ids.job,
    findingId: ids.finding,
    evaluationId: ids.evaluation,
    kind: "PRIMARY",
    primaryRecommendationId: null,
    currentVersion: current.version,
    evaluationVersion: current.evaluationVersion,
    statement: current.statement,
    status: current.status,
    customerVisible: current.customerVisible,
    createdAt,
    versionCreatedAt: current.createdAt,
    constraints: [],
    dispositions: [],
    ...overrides,
    versions,
  };
}

function installBrowser(responses) {
  const calls = [];
  const prior = {
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  globalThis.localStorage = {
    getItem(key) {
      return key === "token" ? "test-token" : null;
    },
    setItem() {
      throw new Error("canonical read attempted browser-local authority");
    },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      async json() {
        return next.body;
      },
    };
  };
  return {
    calls,
    restore() {
      Object.assign(globalThis, prior);
    },
  };
}

test("canonical Finding preserves confirmation and resolution as independent truth", () => {
  const confirmedOpen = canonicalFindingFixture({
    versions: [
      findingVersion(),
      findingVersion({
        version: 2,
        confirmationState: "CONFIRMED",
        createdAt: updatedAt,
        integrity: {
          algorithm: "sha256",
          hash: "b".repeat(64),
          version: 1,
        },
      }),
    ],
  });
  const canonical = validateCanonicalFindingProjection(confirmedOpen);
  assert.equal(canonical.confirmationState, "CONFIRMED");
  assert.equal(canonical.resolutionState, "OPEN");
  assert.equal(canonical.currentVersion, 2);
  assert.equal(canonical.evidenceReferences[0].evidenceType, "PROFESSIONAL_OBSERVATION");
  assert.equal(canonical.concernLinks[0].relationshipType, "EXPLAINS");

  assert.equal(
    validateCanonicalFindingProjection({
      ...confirmedOpen,
      resolutionState: "ACTIVITY_DONE",
    }),
    null
  );
  assert.equal(validateCanonicalFindingProjection({ id: "local-finding" }), null);
});

test("canonical Recommendation preserves primary/alternative lineage, state, and constraint evidence", () => {
  const finding = canonicalFindingFixture();
  const deferredVersions = [
    recommendationVersion(),
    recommendationVersion({ version: 2, status: "DEFERRED", createdAt: updatedAt }),
  ];
  const primary = recommendationFixture({
    versions: deferredVersions,
    constraints: [
      {
        id: ids.constraint,
        type: "BUDGET",
        statement: "Replacement is not financially feasible now.",
        evidenceClassification: "professional_recorded_customer_constraint",
        createdAt: updatedAt,
      },
    ],
    dispositions: [
      {
        id: ids.disposition,
        previousVersion: 1,
        version: 2,
        previousStatus: "ACTIVE",
        disposition: "DEFERRED",
        authorityClassification: "PROFESSIONAL_RECORDED_CUSTOMER_DECISION",
        decisionEvidenceNote: "Customer stated a budget limitation.",
        replacementRecommendationId: null,
        createdAt: updatedAt,
      },
    ],
  });
  const alternative = recommendationFixture({
    id: ids.alternative,
    kind: "ALTERNATIVE",
    primaryRecommendationId: ids.primary,
    statement: "Repair only the cabinet base panel.",
    versions: [
      recommendationVersion({ statement: "Repair only the cabinet base panel." }),
    ],
  });
  const recommendations = validateCanonicalRecommendations(
    [primary, alternative],
    { finding }
  );
  assert.equal(recommendations[0].kind, "PRIMARY");
  assert.equal(recommendations[0].status, "DEFERRED");
  assert.equal(recommendations[0].constraints[0].type, "BUDGET");
  assert.equal(recommendations[1].kind, "ALTERNATIVE");
  assert.equal(recommendations[1].primaryRecommendationId, ids.primary);
  assert.equal(Object.hasOwn(recommendations[0].constraints[0], "approved"), false);

  assert.equal(
    validateCanonicalRecommendations(
      [{ ...alternative, primaryRecommendationId: ids.alternative }],
      { finding }
    ),
    null
  );
  assert.equal(validateCanonicalRecommendationProjection({ id: "local" }), null);
});

test("canonical read APIs use only exact Findings and Recommendations GET routes", async () => {
  const finding = canonicalFindingFixture();
  const primary = recommendationFixture();
  const browser = installBrowser([
    { status: 200, body: { success: true, findings: [finding] } },
    { status: 200, body: { success: true, recommendations: [primary] } },
  ]);
  try {
    const findings = await listCanonicalFindingsForEvaluation({
      evaluationId: ids.evaluation,
    });
    const recommendations = await listCanonicalRecommendationsForFinding({
      finding: findings[0],
    });
    assert.equal(findings.length, 1);
    assert.equal(recommendations.length, 1);
    assert.deepEqual(
      browser.calls.map((call) => [call.options.method, call.url]),
      [
        ["GET", `https://athletic-rebirth-staging.up.railway.app/evaluations/${ids.evaluation}/findings`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/findings/${ids.finding}/recommendations`],
      ]
    );
    assert.ok(browser.calls.every((call) => call.options.body === undefined));
  } finally {
    browser.restore();
  }
});

test("canonical EFR commands preserve exact identity, versions, and idempotency", async () => {
  const proposed = canonicalFindingFixture({
    versions: [findingVersion({ customerVisible: true })],
  });
  const updated = canonicalFindingFixture({
    versions: [
      findingVersion({ customerVisible: true }),
      findingVersion({
        version: 2,
        statement: "Updated drainage observation.",
        customerVisible: true,
        createdAt: updatedAt,
        integrity: { algorithm: "sha256", hash: "b".repeat(64), version: 1 },
      }),
    ],
  });
  const confirmed = canonicalFindingFixture({
    versions: [
      ...updated.versions,
      findingVersion({
        version: 3,
        statement: "Updated drainage observation.",
        confirmationState: "CONFIRMED",
        customerVisible: true,
        createdAt: "2026-08-11T16:10:00.000Z",
        integrity: { algorithm: "sha256", hash: "c".repeat(64), version: 1 },
      }),
    ],
  });
  const recommendation = recommendationFixture({
    customerVisible: true,
    versions: [recommendationVersion({ customerVisible: true })],
  });
  const changedRecommendation = recommendationFixture({
    customerVisible: true,
    versions: [
      recommendationVersion({ customerVisible: true }),
      recommendationVersion({
        version: 2,
        statement: "Replace the cabinet base and inspect adjacent framing.",
        customerVisible: true,
        createdAt: updatedAt,
      }),
    ],
  });
  const browser = installBrowser([
    { status: 201, body: { success: true, finding: proposed } },
    { status: 200, body: { success: true, finding: updated } },
    { status: 200, body: { success: true, finding: confirmed } },
    { status: 201, body: { success: true, recommendation } },
    { status: 200, body: { success: true, recommendation: changedRecommendation } },
  ]);
  try {
    await submitCanonicalFinding({
      evaluationId: ids.evaluation,
      statement: proposed.statement,
      customerVisible: true,
      idempotencyKey: "finding-create-key",
    });
    await updateCanonicalFinding({
      findingId: ids.finding,
      expectedVersion: 1,
      statement: updated.statement,
      customerVisible: true,
      idempotencyKey: "finding-update-key",
    });
    await confirmCanonicalFinding({
      findingId: ids.finding,
      expectedVersion: 2,
      idempotencyKey: "finding-confirm-key",
    });
    await createCanonicalRecommendation({
      findingId: ids.finding,
      statement: recommendation.statement,
      customerVisible: true,
      idempotencyKey: "recommendation-create-key",
    });
    await updateCanonicalRecommendation({
      recommendationId: ids.primary,
      expectedVersion: 1,
      statement: changedRecommendation.statement,
      customerVisible: true,
      idempotencyKey: "recommendation-update-key",
    });
    assert.deepEqual(
      browser.calls.map(({ url, options }) => ({
        url,
        method: options.method,
        key: options.headers["Idempotency-Key"],
        body: JSON.parse(options.body),
      })),
      [
        {
          url: `https://athletic-rebirth-staging.up.railway.app/evaluations/${ids.evaluation}/findings`,
          method: "POST",
          key: "finding-create-key",
          body: { statement: proposed.statement, customerVisible: true },
        },
        {
          url: `https://athletic-rebirth-staging.up.railway.app/findings/${ids.finding}`,
          method: "PATCH",
          key: "finding-update-key",
          body: { expectedVersion: 1, statement: updated.statement, customerVisible: true },
        },
        {
          url: `https://athletic-rebirth-staging.up.railway.app/findings/${ids.finding}/confirm`,
          method: "POST",
          key: "finding-confirm-key",
          body: { expectedVersion: 2 },
        },
        {
          url: `https://athletic-rebirth-staging.up.railway.app/findings/${ids.finding}/recommendations`,
          method: "POST",
          key: "recommendation-create-key",
          body: { kind: "PRIMARY", statement: recommendation.statement, customerVisible: true },
        },
        {
          url: `https://athletic-rebirth-staging.up.railway.app/recommendations/${ids.primary}`,
          method: "PATCH",
          key: "recommendation-update-key",
          body: { expectedVersion: 1, statement: changedRecommendation.statement, customerVisible: true },
        },
      ]
    );
  } finally {
    browser.restore();
  }
});

test("no Evaluation or legacy Evaluation produces no Finding request", async () => {
  const browser = installBrowser([]);
  try {
    assert.equal(
      await loadCanonicalFindingsForEvaluation({ evaluation: null }),
      null
    );
    assert.equal(
      await loadCanonicalFindingsForEvaluation({
        evaluation: {
          evaluation: { id: ids.evaluation },
          findings: [canonicalFindingFixture()],
        },
      }),
      null
    );
    assert.equal(browser.calls.length, 0);
  } finally {
    browser.restore();
  }
});

test("read authority errors fail closed and a Recommendation failure does not mutate its Finding", async () => {
  const statuses = [401, 403, 404, 503];
  for (const status of statuses) {
    const browser = installBrowser([
      {
        status,
        body: {
          success: false,
          code: status === 403 ? "FINDING_AUTHORITY_REQUIRED" : "FINDING_UNAVAILABLE",
          message: "Canonical lifecycle read unavailable.",
        },
      },
    ]);
    try {
      await assert.rejects(
        listCanonicalFindingsForEvaluation({ evaluationId: ids.evaluation }),
        (error) =>
          error instanceof CanonicalLifecycleReadError && error.status === status
      );
    } finally {
      browser.restore();
    }
  }

  const finding = Object.freeze(canonicalFindingFixture());
  const before = JSON.stringify(finding);
  const browser = installBrowser([
    {
      status: 503,
      body: {
        success: false,
        code: "RECOMMENDATION_READ_FAILED",
        message: "Recommendations unavailable.",
      },
    },
  ]);
  try {
    await assert.rejects(
      loadCanonicalRecommendationsForFinding({ finding }),
      (error) => error.status === 503
    );
    assert.equal(JSON.stringify(finding), before);
  } finally {
    browser.restore();
  }
});

test("ordinary canonical Evaluation is the only source for the Finding read chain", async () => {
  const evaluation = ordinaryCanonicalEvaluationFixture();
  const finding = canonicalFindingFixture();
  const browser = installBrowser([
    { status: 200, body: { success: true, findings: [finding] } },
  ]);
  try {
    const findings = await loadCanonicalFindingsForEvaluation({ evaluation });
    assert.equal(findings[0].evaluationId, evaluation.evaluation.id);
    assert.equal(browser.calls.length, 1);
  } finally {
    browser.restore();
  }
});

test("bounded panels expose canonical commands without browser-local authority", () => {
  const findingPanel = readFileSync(
    new URL("../src/components/CanonicalFindingsPanel.jsx", import.meta.url),
    "utf8"
  );
  const recommendationPanel = readFileSync(
    new URL("../src/components/CanonicalRecommendationsPanel.jsx", import.meta.url),
    "utf8"
  );
  const evaluationPanel = readFileSync(
    new URL("../src/components/CanonicalJobEvaluation.jsx", import.meta.url),
    "utf8"
  );
  const apiSource = readFileSync(
    new URL("../src/utils/findingRecommendationApi.js", import.meta.url),
    "utf8"
  );

  assert.match(findingPanel, /submitCanonicalFinding/);
  assert.match(findingPanel, /updateCanonicalFinding/);
  assert.match(findingPanel, /confirmCanonicalFinding/);
  assert.match(recommendationPanel, /createCanonicalRecommendation/);
  assert.match(recommendationPanel, /updateCanonicalRecommendation/);
  assert.match(evaluationPanel, /CanonicalFindingsPanel/);
  assert.match(evaluationPanel, /completeCanonicalEvaluationDraft/);
  assert.match(apiSource, /Idempotency-Key/);
  assert.doesNotMatch(
    `${findingPanel}\n${recommendationPanel}\n${apiSource}`,
    /localStorage|sessionStorage|resolveFinding|createWorkstream|createActivity|createObligation|createQuote|scheduleWork|completeWork|Job Update|Change Order/
  );
});

test("malformed canonical arrays fail closed instead of falling back to local data", () => {
  const finding = canonicalFindingFixture();
  assert.equal(
    validateCanonicalFindings([{ ...finding, authoritySource: "browser-local" }], {
      evaluationId: ids.evaluation,
    }),
    null
  );
  assert.equal(
    validateCanonicalRecommendations(
      [recommendationFixture({ status: "REJECTED" })],
      { finding }
    ),
    null
  );
});
