import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../src/pages/ProfessionalSubscription.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const storeKit = fs.readFileSync(new URL("../src/utils/storeKitSubscriptions.js", import.meta.url), "utf8");
const native = fs.readFileSync(new URL("../ios/App/App/StoreKitSubscriptions.swift", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../src/utils/businessToolsRegistry.js", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../src/utils/subscriptionApi.js", import.meta.url), "utf8");

test("professional subscription screen exposes the three approved paid plans", () => {
  assert.match(page, /Starter/);
  assert.match(page, /Growth/);
  assert.match(page, /Professional/);
  assert.match(page, /Up to \{plan\.seatLimit\} professional users/);
  assert.match(page, /14 days free/);
  assert.match(page, /amountMinor \/ 100/);
  assert.match(page, /Start 14-Day Free Trial/);
  assert.match(page, /Free for 14 days, then \$\{displayPrice\}\/month\. Cancel anytime\./);
  assert.doesNotMatch(page, /annual|per-lead|premium AI|priority leads/i);
});

test("all paid plans share the complete Meetro Business platform", () => {
  for (const feature of [
    "Work Center",
    "Customer Communication",
    "Evaluations & Scheduling",
    "Quotes & Approvals",
    "Deposit & Payment Tracking",
    "Invoicing",
    "Leads & Urgent/Emergency Opportunities",
    "Alerts",
    "Business Profile & Portfolio",
    "Web + iPhone access",
  ]) assert.match(page, new RegExp(feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(page, /Included with every Meetro Business plan/);
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

test("web purchase uses server-created Stripe Checkout while iOS uses StoreKit", () => {
  assert.match(page, /createStripeSubscriptionCheckout\(plan\.code/);
  assert.match(api, /"\/subscriptions\/stripe\/checkout"/);
  assert.match(api, /body: JSON\.stringify\(\{ planCode \}\)/);
  assert.match(storeKit, /Capacitor\.getPlatform\(\) === "ios"/);
  assert.doesNotMatch(page + storeKit + api, /STRIPE_SECRET_KEY|sk_(live|test)_|paypal/i);
});

test("provider redirect never sets entitlement and Stripe trial remains provider governed", () => {
  assert.match(page, /window\.location\.assign\(checkout\.url\)/);
  assert.match(page, /Stripe governs trial dates and billing status\. Access starts only after server verification/);
  assert.doesNotMatch(page + api, /setState\([^)]*entitled:\s*true|localStorage.*subscri/i);
});

test("one provider entitlement prevents a second platform purchase", () => {
  assert.match(page, /purchaseReady = providerReady && !state\?\.entitled && !state\?\.qaAccess/);
  assert.match(page, /subscription\?\.provider !== "STRIPE"/);
  assert.match(page, /Current access already active/);
});

test("Apple-on-web and Stripe-on-iPhone use the same platform-neutral entitlement gate", () => {
  assert.match(app, /entitled: result\.entitled === true/);
  assert.doesNotMatch(app, /provider === ["']APPLE_APP_STORE["']|provider === ["']STRIPE["']/);
  assert.match(page, /state\?\.entitled/);
  assert.match(page, /subscription\?\.provider !== "STRIPE"/);
});

test("management routing is server-owned and provider specific", () => {
  assert.match(api, /"\/subscriptions\/manage"/);
  assert.match(page, /result\.provider === "APPLE_APP_STORE" && nativeIos/);
  assert.match(page, /window\.location\.assign\(result\.url\)/);
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

test("normal no-entitlement access routes cleanly to plans without treating it as an operation error", () => {
  assert.match(app, /subscriptionGate\.status !== "ready"/);
  assert.match(app, /window\.location\.hash = "professionalSubscription"/);
  assert.match(app, /setPageState\("professionalSubscription"\)/);
  assert.doesNotMatch(page, /The subscription operation could not be completed/);
});

test("server-entitled staging professionals retain normal Job, Quote, Invoice, and Alert routes", () => {
  const gate = app.indexOf('subscriptionGate.entitled !== true');
  assert.ok(gate >= 0);
  assert.match(app, /fetchProfessionalSubscription\(setPageState\)[\s\S]*entitled: result\.entitled === true/);
  for (const route of [
    'page === "businessDashboard"',
    'page === "quoteBuilder"',
    'page === "invoiceBuilder"',
    'page === "contractorDashboard" || page === "workCenter"',
    'page === "notifications"',
  ]) {
    assert.ok(app.indexOf(route) > gate, `${route} must remain behind the normal centralized entitlement gate`);
  }
  assert.doesNotMatch(app, /SUBSCRIPTION_STAGING_QA_ACCESS|NODE_ENV\s*===\s*["']staging["']/);
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
