import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboardSource = fs.readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const globalStyles = fs.readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);

test("all Work Center navigation cards share one resting border and elevation", () => {
  assert.match(dashboardSource, /const workCenterPrimaryNavCard = \{/);
  assert.match(
    dashboardSource,
    /border: "1px solid var\(--meetro-color-line\)"/
  );
  assert.match(dashboardSource, /boxShadow: "var\(--meetro-shadow-soft\)"/);
  assert.doesNotMatch(dashboardSource, /borderColor: card\.alert \? "#fb923c" :/);
  assert.doesNotMatch(dashboardSource, /`\$\{card\.accent\}24`/);
});

test("active Jobs use one horizontal card and open through the canonical Job control", () => {
  assert.match(dashboardSource, /className="work-center-job-card meetro-visual-surface"/);
  assert.match(dashboardSource, /className="work-center-job-card__identity"/);
  assert.match(dashboardSource, /className="work-center-job-card__state"/);
  assert.match(dashboardSource, /className="work-center-job-card__lifecycle"/);
  assert.match(dashboardSource, /setSelectedWorkCenterJob\(job\)/);
});

test("Work Center cards retain a visible keyboard focus state", () => {
  assert.match(
    globalStyles,
    /\.work-center-job-card:focus-visible\s*\{[^}]*outline: 3px solid/s
  );
  assert.match(globalStyles, /outline-offset: 2px/);
});
