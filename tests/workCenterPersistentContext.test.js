import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const indexCssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);

test("Work Center job workspace includes a persistent context region above dynamic focus", () => {
  assert.match(contractorDashboardSource, /jobPersistentContextRegion/);
  assert.match(contractorDashboardSource, /meetro-job-persistent-context/);
  assert.match(contractorDashboardSource, /workCenterPersistentWorkContext/);
  assert.match(contractorDashboardSource, /workCenterNextResponsibility/);
  assert.match(contractorDashboardSource, /jobDynamicFocusArea/);
  assert.match(
    contractorDashboardSource,
    /jobPersistentContextRegion[\s\S]{0,1800}jobDynamicFocusArea/
  );
});

test("persistent context preserves current job identity and message action without routing changes", () => {
  assert.match(contractorDashboardSource, /persistentContextCustomer/);
  assert.match(contractorDashboardSource, /persistentContextService/);
  assert.match(contractorDashboardSource, /persistentContextAddress/);
  assert.match(contractorDashboardSource, /conversationReturnSection", "job"/);
  assert.doesNotMatch(
    contractorDashboardSource,
    /workCenterPersistentWorkContext[\s\S]{0,1000}setPage\("contractorDashboard"\)/
  );
});

test("persistent context stays viewport anchored on iPhone portrait only", () => {
  assert.match(indexCssSource, /@media \(max-width: 520px\) and \(orientation: portrait\)/);
  assert.match(indexCssSource, /\.meetro-job-persistent-context[\s\S]{0,240}position: sticky/);
  assert.match(indexCssSource, /\.meetro-job-persistent-context[\s\S]{0,240}safe-area-inset-top/);
});
