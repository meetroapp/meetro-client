import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("same-Job lifecycle refresh preserves the confirmed projection instead of unmounting Evaluation", () => {
  assert.match(
    dashboard,
    /setWorkCenterLifecycleProjection\(\(current\) => \{[\s\S]*const sameConfirmedJob =[\s\S]*current\?\.projection[\s\S]*String\(current\.postId \|\| ""\) === String\(target\.postId \|\| ""\)/
  );

  assert.match(
    dashboard,
    /if \(sameConfirmedJob\) \{[\s\S]*\.\.\.current,[\s\S]*status: "ready"/
  );

  assert.match(
    dashboard,
    /return \{[\s\S]*status: "loading",[\s\S]*postId: target\.postId,[\s\S]*projection: null/
  );
});

test("different Job lifecycle refresh still clears stale Job truth", () => {
  assert.match(
    dashboard,
    /sameConfirmedJob[\s\S]*return \{[\s\S]*status: "loading"[\s\S]*projection: null/
  );
});

test("same-Job transient network refresh failure preserves last confirmed projection", () => {
  assert.match(
    dashboard,
    /reason: "NETWORK_REFRESH_FAILED"/
  );

  assert.match(
    dashboard,
    /sameConfirmedJob[\s\S]*status: "ready"[\s\S]*reason: "NETWORK_REFRESH_FAILED"/
  );

  assert.match(
    dashboard,
    /status: "error"[\s\S]*reason: "NETWORK_ERROR"[\s\S]*projection: null/
  );
});

test("Evaluation remains mounted from confirmed parent lifecycle truth", () => {
  assert.match(
    dashboard,
    /workCenterLifecycleProjection\.status === "ready"[\s\S]*workCenterLifecycleProjection\.projection[\s\S]*<CanonicalJobEvaluation/
  );

  assert.match(
    dashboard,
    /onCanonicalChange=\{\(\) => setWorkCenterLifecycleRefreshKey/
  );
});
