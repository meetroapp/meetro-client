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

test("Quotes and Job History do not receive permanent default outlines", () => {
  assert.match(dashboardSource, /key: "quotes"/);
  assert.match(dashboardSource, /key: "history"/);
  assert.match(dashboardSource, /work-center-navigation-card/);
  assert.match(
    dashboardSource,
    /isWorkCenterSectionOpen && activeTab === card\.key/
  );
});

test("Work Center cards retain a visible keyboard focus state", () => {
  assert.match(
    globalStyles,
    /\.work-center-navigation-card:focus-visible\s*\{[^}]*outline: 3px solid/s
  );
  assert.match(globalStyles, /outline-offset: 3px/);
});

