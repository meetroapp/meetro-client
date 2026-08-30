import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../src/pages/ProfessionalSubscription.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const storeKit = fs.readFileSync(new URL("../src/utils/storeKitSubscriptions.js", import.meta.url), "utf8");
const native = fs.readFileSync(new URL("../ios/App/App/StoreKitSubscriptions.swift", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../src/utils/businessToolsRegistry.js", import.meta.url), "utf8");

test("professional subscription screen exposes exactly the approved plans", () => {
  assert.match(page, /PLAN A/);
  assert.match(page, /PLAN B/);
  assert.match(page, /Up to \{plan\.seatLimit\} users/);
  assert.match(page, /14 days free/);
  assert.match(page, /amountMinor \/ 100/);
  assert.doesNotMatch(page, /annual|per-lead|premium AI|priority leads/i);
});

test("trial promise requires provider eligibility and introductory offer", () => {
  assert.match(page, /storeProduct\?\.trialEligible === true/);
  assert.match(page, /Boolean\(storeProduct\?\.introductoryOffer\)/);
  assert.match(page, /Trial eligibility checked by Apple/);
  assert.doesNotMatch(page, /trialEligible\s*=\s*true/);
});

test("purchase only unlocks after server verification", () => {
  const purchase = page.indexOf("purchaseStoreKitSubscription");
  const verify = page.indexOf("verifyProfessionalSubscription(result");
  const refresh = page.indexOf("await refresh()", verify);
  assert.ok(purchase >= 0 && verify > purchase && refresh > verify);
  assert.doesNotMatch(page, /localStorage.*subscri|setState\([^)]*entitled:\s*true/i);
});

test("cancel, pending, failure, restore, and manage states are simple and safe", () => {
  for (const copy of [
    "Purchase canceled. No charge was made.",
    "Purchase pending. Access will update after Apple confirms it.",
    "Restore Purchases",
    "Manage Subscription",
  ]) assert.match(page, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(page, /restore: true/);
});

test("web purchase is not fabricated and iOS bridge is required", () => {
  assert.match(page, /Purchase in the Meetro iPhone app/);
  assert.match(storeKit, /Capacitor\.getPlatform\(\) === "ios"/);
  assert.doesNotMatch(page + storeKit, /stripe|paypal/i);
});

test("StoreKit bridge uses appAccountToken, verified JWS, restore, and Apple management", () => {
  assert.match(native, /\.appAccountToken\(token\)/);
  assert.match(native, /case \.verified\(let transaction\)/);
  assert.match(native, /transaction\.jwsRepresentation/);
  assert.match(native, /AppStore\.sync\(\)/);
  assert.match(native, /Transaction\.currentEntitlements/);
  assert.match(native, /apps\.apple\.com\/account\/subscriptions/);
});

test("central professional gate excludes the subscription surface and homeowners", () => {
  assert.match(app, /isProfessionalOnlyPage\(page\)[\s\S]*isProfessionalSession\(\)[\s\S]*subscriptionGate/);
  assert.match(app, /page !== "professionalSubscription"/);
  assert.match(app, /setSubscriptionGate\(\{ status: "not_applicable", entitled: true \}\)/);
});

test("subscription is a ready Business Tool with an exact route", () => {
  assert.match(registry, /id: "subscription"[\s\S]*status: BUSINESS_TOOL_STATUS\.READY[\s\S]*route: "professionalSubscription"/);
});

test("subscription UI is responsive without fixed horizontal dimensions", () => {
  assert.match(page, /repeat\(auto-fit, minmax\(min\(100%, 300px\), 1fr\)\)/);
  assert.match(page, /width: "100%"/);
  assert.doesNotMatch(page, /minWidth:\s*[4-9]\d{2}/);
});

test("subscription presentation does not touch Job billing or Alerts", () => {
  assert.doesNotMatch(page, /pre-work-deposit|canonical_invoices|invoice-payments|deposit-requests|\/alerts/);
});
