import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/pages/AssetCenter.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const navSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const businessToolsSource = readFileSync(
  new URL("../src/pages/BusinessCommandCenter.jsx", import.meta.url),
  "utf8"
);

test("Asset Center production route has no fixture registry or fallback", () => {
  assert.equal(existsSync("src/utils/assetCenterRegistry.js"), false);
  assert.doesNotMatch(pageSource, /assetCenterRegistry/);
  assert.doesNotMatch(pageSource, /getAssetCenterModel|getAssetCenterAssets/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage|authFetch|fetch\(/);
});

test("Asset Center renders a truthful unavailable state", () => {
  assert.match(pageSource, /Asset records are not available yet\./);
  assert.match(pageSource, /connected to production data/);
  assert.doesNotMatch(pageSource, /No assets yet|You have no assets|No customer equipment found/i);
  assert.doesNotMatch(pageSource, /Asset Overview|Recent Asset Activity|Recent Findings/);
});

test("Asset Center source contains no former production fixtures", () => {
  assert.doesNotMatch(pageSource, /Sarah Johnson|William|Jack Lindstrom/);
  assert.doesNotMatch(pageSource, /Kitchen Sink Cabinet|Front Entry Door|HVAC System/);
  assert.doesNotMatch(pageSource, /Asset Timeline|Completed Services|Evaluation Report/);
  assert.doesNotMatch(pageSource, /findings|recommendations|documents|photos|lastActivityAt/);
});

test("Asset Center direct route and professional navigation remain safe", () => {
  assert.match(appSource, /if \(page === "assetCenter"\) \{/);
  assert.match(appSource, /const professionalOnlyPages = \[[\s\S]*"assetCenter"/);
  assert.match(navSource, /page: "assetCenter"/);
  assert.match(businessToolsSource, /setPage\("assetCenter"\)/);
  assert.match(pageSource, /setPage\("businessCommandCenter"\)/);
  assert.match(
    pageSource,
    /<BottomNav setPage=\{setPage\} currentPage="assetCenter" \/>/
  );
});

test("Asset Center unavailable state remains viewport contained", () => {
  assert.match(pageSource, /className="app-page meetro-responsive-page"/);
  assert.match(pageSource, /maxWidth: "100%"/);
  assert.match(pageSource, /minWidth: 0/);
  assert.match(pageSource, /overflowX: "hidden"/);
  assert.match(pageSource, /env\(safe-area-inset-right/);
  assert.match(pageSource, /env\(safe-area-inset-bottom/);
  assert.match(pageSource, /minHeight: "48px"/);
});
