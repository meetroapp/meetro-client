import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("Work Center mounts one compact Current Job context above the Job workspace", () => {
  const headers =
    contractorDashboardSource.match(/<CompactCurrentJobHeader/g) || [];

  assert.equal(headers.length, 1);

  assert.doesNotMatch(
    contractorDashboardSource,
    /className="meetro-job-persistent-context"/
  );

  const headerIndex =
    contractorDashboardSource.indexOf("<CompactCurrentJobHeader");

  const laterWorkspaceIndex =
    contractorDashboardSource.indexOf(
      "jobDynamicFocusArea",
      headerIndex
    );

  assert.ok(headerIndex >= 0);
  assert.ok(laterWorkspaceIndex > headerIndex);
});

test("compact Current Job context preserves identity, state, and message action", () => {
  assert.match(
    contractorDashboardSource,
    /customer=\{persistentContextCustomer\}/
  );

  assert.match(
    contractorDashboardSource,
    /service=\{persistentContextService\}/
  );

  assert.match(
    contractorDashboardSource,
    /address=\{persistentContextAddress\}/
  );

  assert.match(
    contractorDashboardSource,
    /status=\{jobDisplayStatus\}/
  );

  assert.match(
    contractorDashboardSource,
    /nextStep=\{jobDisplayNextStep\}/
  );

  assert.match(
    contractorDashboardSource,
    /responsibility=\{jobDisplayResponsibility\}/
  );

  assert.match(
    contractorDashboardSource,
    /openCanonicalWorkCenterConversation/
  );
});

test("legacy sticky Current Job presentation cannot overlap the compact header", () => {
  assert.doesNotMatch(
    contractorDashboardSource,
    /meetro-job-persistent-context/
  );

  assert.match(
    contractorDashboardSource,
    /<CompactCurrentJobHeader/
  );
});
