import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSET_CENTER_REGISTRY,
  ASSET_CENTER_STATUSES,
  getAssetById,
  getAssetCenterReport,
  getAssetsByCustomerId,
  getAssetStatusLabel,
  groupFindingsByAsset,
  sortAssetTimeline,
  validateAssetLineage,
} from "../src/utils/assetCenterRegistry.js";

test("exports read-only Asset Center fixtures with allowed statuses", () => {
  const report = getAssetCenterReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.assets, [
    "asset_sarah_kitchen_sink_cabinet",
    "asset_william_front_entry_door",
    "asset_jack_hvac_system",
  ]);
  assert.deepEqual(Object.values(ASSET_CENTER_STATUSES), [
    "active",
    "needs_attention",
    "repaired",
    "replaced",
    "retired",
    "unknown",
  ]);
  assert.equal(getAssetStatusLabel("needs_attention"), "Needs Attention");
  assert.equal(report.validLineage, true);
});

test("keeps Sarah, William, and Jack assets customer-scoped", () => {
  assert.deepEqual(
    getAssetsByCustomerId("customer_sarah").map((asset) => asset.assetName),
    ["Kitchen Sink Cabinet"]
  );
  assert.deepEqual(
    getAssetsByCustomerId("customer_william").map((asset) => asset.assetName),
    ["Front Entry Door"]
  );
  assert.deepEqual(
    getAssetsByCustomerId("customer_jack_lindstrom").map(
      (asset) => asset.assetName
    ),
    ["HVAC System"]
  );
  assert.equal(
    getAssetsByCustomerId("customer_sarah").some(
      (asset) => asset.customerId === "customer_william"
    ),
    false
  );
});

test("sorts asset timelines chronologically", () => {
  const sorted = sortAssetTimeline([
    { id: "third", label: "Service completed", date: "2026-06-20" },
    { id: "first", label: "Evaluation recorded", date: "2026-06-18" },
    { id: "second", label: "Finding identified", date: "2026-06-19" },
  ]);

  assert.deepEqual(
    sorted.map((event) => event.id),
    ["first", "second", "third"]
  );
});

test("groups findings by asset and preserves recommendation lineage", () => {
  const sarah = getAssetById("asset_sarah_kitchen_sink_cabinet");
  const findingsByAsset = groupFindingsByAsset([sarah]);

  assert.deepEqual(
    findingsByAsset.asset_sarah_kitchen_sink_cabinet.findings.map(
      (finding) => finding.name
    ),
    [
      "Water Damage Present",
      "Mold Present",
      "Cabinet Base Deteriorated",
    ]
  );
  assert.ok(validateAssetLineage(sarah).valid);
  assert.ok(
    sarah.recommendations.some(
      (recommendation) =>
        recommendation.sourceFindingId ===
        "finding_sarah_cabinet_base_deteriorated"
    )
  );
});

test("documents and photos are view-only historical records", () => {
  const william = getAssetById("asset_william_front_entry_door");

  assert.ok(william.documents.every((document) => document.viewOnly === true));
  assert.ok(william.photos.every((photo) => photo.viewOnly === true));
  assert.ok(
    william.documents.some((document) => document.name === "Permit Report")
  );
  assert.ok(
    william.photos.some((photo) => photo.name === "Completion Photos")
  );
});

test("unknown assets fail safely and registry reads cannot mutate source data", () => {
  assert.equal(getAssetById("unknown_asset"), null);

  assert.throws(
    () => {
      ASSET_CENTER_REGISTRY.asset_sarah_kitchen_sink_cabinet.findings.push({
        id: "mutated",
      });
    },
    {
      name: "TypeError",
    }
  );

  const sarah = getAssetById("asset_sarah_kitchen_sink_cabinet");
  sarah.findings.push({ id: "caller_mutation" });

  assert.ok(
    !getAssetById("asset_sarah_kitchen_sink_cabinet").findings.some(
      (finding) => finding.id === "caller_mutation"
    )
  );
});
