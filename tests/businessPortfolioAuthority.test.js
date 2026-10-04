import assert from "node:assert/strict";
import test from "node:test";

import {
  createExpectedVersionPayload,
  createPortfolioPrivacyConfirmation,
  createPortfolioReorderPayload,
  getCanonicalPortfolioCounts,
  getPortfolioStatePresentation,
  getReorderablePortfolioProjects,
  isPortfolioActionAllowed,
  isPortfolioVersionConflict,
  movePortfolioProject,
  PORTFOLIO_PRIVACY_CONFIRMATION_VERSION,
  PORTFOLIO_PUBLICATION_STATE,
} from "../src/utils/businessPortfolioAuthority.js";

function project(overrides = {}) {
  return {
    id: 10,
    version: 3,
    publication_state: PORTFOLIO_PUBLICATION_STATE.DRAFT,
    migration_review_required: false,
    display_order: 0,
    is_featured: false,
    actions: {
      canAdoptAsDraft: false,
      canEdit: true,
      canPublish: true,
      canArchive: true,
      canFeature: false,
      canUnfeature: false,
      canReorder: true,
    },
    ...overrides,
  };
}

test("owner actions are granted only by exact server action booleans", () => {
  const source = project();
  assert.equal(isPortfolioActionAllowed(source, "canEdit"), true);
  assert.equal(isPortfolioActionAllowed(source, "canFeature"), false);
  assert.equal(isPortfolioActionAllowed({ ...source, canEdit: true }, "canEdit"), true);
  assert.equal(isPortfolioActionAllowed({ ...source, actions: {} }, "canEdit"), false);
  assert.equal(isPortfolioActionAllowed(source, "unknownAction"), false);
});

test("professional state labels explain project status in owner language", () => {
  assert.equal(
    getPortfolioStatePresentation(project({
      publication_state: null,
      migration_review_required: true,
    })).label,
    "Previous Portfolio Project"
  );
  assert.equal(getPortfolioStatePresentation(project()).label, "Draft");
  assert.equal(
    getPortfolioStatePresentation(project({ publication_state: "PUBLISHED" })).label,
    "Published"
  );
  assert.equal(
    getPortfolioStatePresentation(project({ publication_state: "ARCHIVED" })).label,
    "Archived"
  );
});

test("privacy command uses the certified server contract", () => {
  assert.equal(PORTFOLIO_PRIVACY_CONFIRMATION_VERSION, "portfolio-publication-v1");
  assert.deepEqual(createPortfolioPrivacyConfirmation(), {
    version: "portfolio-publication-v1",
    confirmed: true,
  });
});

test("existing-project commands require a positive canonical version", () => {
  assert.deepEqual(createExpectedVersionPayload(project()), { expected_version: 3 });
  assert.equal(createExpectedVersionPayload(project({ version: 0 })), null);
  assert.equal(createExpectedVersionPayload(project({ version: "local" })), null);
});

test("reorder membership is derived exclusively from canReorder authority", () => {
  const projects = [
    project({ id: 1, version: 2 }),
    project({ id: 2, version: 4 }),
    project({
      id: 3,
      version: 7,
      publication_state: "ARCHIVED",
      actions: { canReorder: false },
    }),
  ];
  assert.deepEqual(getReorderablePortfolioProjects(projects).map(({ id }) => id), [1, 2]);
  assert.deepEqual(movePortfolioProject(projects, 2, "earlier").map(({ id }) => id), [2, 1]);
  assert.equal(movePortfolioProject(projects, 1, "earlier"), null);
  assert.equal(movePortfolioProject(projects, 3, "later"), null);
});

test("reorder payload carries complete server-authorized membership and expected versions", () => {
  assert.deepEqual(
    createPortfolioReorderPayload(8, [
      project({ id: 2, version: 4 }),
      project({ id: 1, version: 2 }),
    ]),
    {
      contractor_id: 8,
      projects: [
        { id: 2, expected_version: 4 },
        { id: 1, expected_version: 2 },
      ],
    }
  );
  assert.equal(createPortfolioReorderPayload("local", [project()]), null);
  assert.equal(createPortfolioReorderPayload(8, []), null);
});

test("version conflict detection is exact and does not treat other rejection as conflict", () => {
  assert.equal(
    isPortfolioVersionConflict({
      response: { status: 409 },
      data: { code: "PORTFOLIO_VERSION_CONFLICT" },
    }),
    true
  );
  assert.equal(
    isPortfolioVersionConflict({
      response: { status: 409 },
      data: { code: "PORTFOLIO_PROJECT_IMMUTABLE" },
    }),
    false
  );
});

test("canonical workspace counts do not fabricate public or rating state", () => {
  const counts = getCanonicalPortfolioCounts([
    project({ id: 1, publication_state: null, migration_review_required: true }),
    project({ id: 2 }),
    project({ id: 3, publication_state: "PUBLISHED", is_featured: true }),
    project({ id: 4, publication_state: "ARCHIVED", actions: {} }),
  ]);
  assert.deepEqual(counts, {
    total: 4,
    draft: 1,
    published: 1,
    archived: 1,
    legacy: 1,
    featured: 1,
  });
});
