import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cardSource = readFileSync(
  new URL("../src/components/GuidedWorkspaceCard.jsx", import.meta.url),
  "utf8"
);
const uploadSource = readFileSync(
  new URL("../src/pages/Upload.jsx", import.meta.url),
  "utf8"
);
const docSource = readFileSync(
  new URL("../docs/Architecture/MC_PLATFORM_UX_001_GUIDED_WORKSPACE_CARD_SYSTEM.md", import.meta.url),
  "utf8"
);

test("GuidedWorkspaceCard is a reusable presentation primitive", () => {
  assert.match(cardSource, /function GuidedWorkspaceCard\(\{/);
  assert.match(cardSource, /state = "upcoming"/);
  assert.match(cardSource, /guided-workspace-card--\$\{state\}/);
  assert.match(cardSource, /aria-labelledby=\{headingId\}/);
  assert.match(cardSource, /aria-expanded=\{isActive\}/);
  assert.match(cardSource, /aria-controls=\{contentId\}/);
  assert.match(cardSource, /className="guided-workspace-card__summary"/);
  assert.match(cardSource, /className="guided-workspace-card__content"/);
  assert.match(cardSource, /<button[\s\S]*type="button"[\s\S]*onClick=\{onEdit\}/);
  assert.doesNotMatch(cardSource, /localStorage|sessionStorage|fetch\(|authFetch|\/posts/);
});

test("Job Request uses the five guided workspace cards in sequence", () => {
  const cardIds = [
    "job-request-work-card",
    "job-request-location-card",
    "job-request-photos-card",
    "job-request-timing-card",
    "job-request-review-card",
  ];

  for (const id of cardIds) {
    assert.match(uploadSource, new RegExp(`id="${id}"`));
  }
  assert.ok(
    cardIds.every((id, index) =>
      index === 0 || uploadSource.indexOf(`id="${cardIds[index - 1]}"`) < uploadSource.indexOf(`id="${id}"`)
    )
  );
});

test("Guided Workspace Card System documentation records authority and adoption rules", () => {
  assert.match(docSource, /Guided Workspace Card System/);
  assert.match(docSource, /Cards organize presentation only/);
  assert.match(docSource, /workDetailsDraft, locationDraft, photoDraft, or timingDraft/);
  assert.match(docSource, /exact street address, unit, access notes, photo URLs\/content/);
  assert.match(docSource, /Submit Job Request/);
  assert.match(docSource, /Anti-Patterns/);
  assert.match(docSource, /Future Adoption Targets/);
});
