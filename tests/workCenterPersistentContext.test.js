import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("Work Center job workspace includes a persistent context region above dynamic focus", () => {
  assert.match(contractorDashboardSource, /jobPersistentContextRegion/);
  assert.match(contractorDashboardSource, /Persistent work context/);
  assert.match(contractorDashboardSource, /Next Responsibility/);
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
    /Persistent work context[\s\S]{0,1000}setPage\("contractorDashboard"\)/
  );
});
