import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getBusinessPlanPresentation } from "../src/utils/subscriptionPresentation.js";
import { getSubscriptionPurchaseChannel } from "../src/utils/subscriptionPlanPresentation.js";

const page = fs.readFileSync(new URL("../src/pages/ProfessionalSubscription.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const storeKit = fs.readFileSync(new URL("../src/utils/storeKitSubscriptions.js", import.meta.url), "utf8");
const native = fs.readFileSync(new URL("../ios/App/App/StoreKitSubscriptions.swift", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../src/utils/businessToolsRegistry.js", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../src/utils/subscriptionApi.js", import.meta.url), "utf8");
const login = fs.readFileSync(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
const contractorProfile = fs.readFileSync(new URL("../src/pages/ContractorProfile.jsx", import.meta.url), "utf8");
const planPresentation = fs.readFileSync(new URL("../src/utils/subscriptionPlanPresentation.js", import.meta.url), "utf8");
const purchaseFlow = fs.readFileSync(new URL("../src/utils/subscriptionPurchaseFlow.js", import.meta.url), "utf8");

test("professional subscription screen exposes the three approved paid plans", () => {
  assert.match(page, /Starter/);
  assert.match(page, /Growth/);
  assert.match(page, /Professional/);
  assert.match(page, /Up to \{plan\.seatLimit\} professional users/);
  assert.match(page, /amountMinor \/ 100/);
  assert.match(planPresentation, /Paid monthly plan/);
  assert.match(planPresentation, /Continue with Stripe/);
  assert.match(page, /Meetro Business Trial/);
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

test("the initial trial is presented as Meetro-owned rather than provider-owned", () => {
  assert.match(page, /Meetro governs the one-time 14-day Business Trial/);
  const trial = getBusinessPlanPresentation({
    applicable: true,
    entitled: true,
    businessTrial: {
      source: "MEETRO_SERVER",
      status: "ACTIVE",
      daysRemaining: 14,
      endsAt: "2026-09-15T12:00:00.000Z",
    },
  });
  assert.equal(trial.kind, "trial");
  assert.equal(trial.planName, "Meetro Business Trial");
  assert.equal(trial.statusLabel, "14 days remaining");
  assert.doesNotMatch(page + planPresentation, /Trial eligibility determined by|Start 14-Day Free Trial|introductoryOffer|trialEligible/);
});

test("purchase only unlocks after server verification", () => {
  assert.match(page, /completeStoreKitPurchase/);
  const verify = purchaseFlow.indexOf("await verify(evidence)");
  const refresh = purchaseFlow.indexOf("await refresh()", verify);
  assert.ok(verify >= 0 && refresh > verify);
  assert.doesNotMatch(page + purchaseFlow, /localStorage.*subscri|setState\([^)]*entitled:\s*true/i);
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

test("provider redirect never sets entitlement and paid status remains provider governed", () => {
  assert.match(page, /window\.location\.assign\(checkout\.url\)/);
  const channel = getSubscriptionPurchaseChannel({
    nativeIos: false,
    plan: { providers: { STRIPE: { configured: true } } },
  });
  assert.equal(channel.providerReady, true);
  assert.match(channel.governanceLabel, /managed securely after purchase/);
  assert.match(api, /"\/subscriptions\/stripe\/checkout"/);
  assert.match(api, /"\/subscriptions\/apple\/verify"/);
  assert.doesNotMatch(page + api, /setState\([^)]*entitled:\s*true|localStorage.*subscri/i);
});

test("one provider entitlement prevents a second platform purchase while an active Meetro trial permits paid conversion", () => {
  assert.match(planPresentation, /if \(subscription \|\| \(canonicalAccessActive && !businessTrialActive\)\)/);
  assert.match(page, /subscription\?\.provider !== "STRIPE"/);
  assert.doesNotMatch(page, /Current access already active/);
  assert.match(planPresentation, /subscription\?\.plan === planCode \? "Current plan" : "Plan comparison"/);
});

test("Apple-on-web and Stripe-on-iPhone use the same platform-neutral entitlement gate", () => {
  assert.match(app, /businessAccessActive: hasCanonicalBusinessAccess\(result\)/);
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
  assert.match(native, /"signedTransactionInfo": verification\.jwsRepresentation/);
  assert.match(native, /"signedTransactionInfo": result\.jwsRepresentation/);
  assert.match(native, /case \.unverified:[\s\S]*call\.reject/);
  assert.match(native, /AppStore\.sync\(\)/);
  assert.match(native, /Transaction\.currentEntitlements/);
  assert.match(native, /apps\.apple\.com\/account\/subscriptions/);
});

test("central professional gate excludes the subscription surface and homeowners", () => {
  assert.match(app, /isProfessionalOnlyPage\(page\)[\s\S]*isProfessionalSession\(\)[\s\S]*subscriptionGate/);
  assert.match(app, /page !== "professionalSubscription"/);
  assert.match(app, /setSubscriptionGate\(\{ status: "not_applicable", businessAccessActive: true \}\)/);
});

test("normal no-entitlement access routes cleanly to plans without treating it as an operation error", () => {
  assert.match(app, /subscriptionGate\.status !== "ready"/);
  assert.match(app, /window\.location\.hash = "professionalSubscription"/);
  assert.match(app, /setPageState\("professionalSubscription"\)/);
  assert.doesNotMatch(page, /The subscription operation could not be completed/);
});

test("new professional account creation enters Meetro after verification without a provider plan gate", () => {
  const firstLoginBlock = login.slice(
    login.indexOf("if (isFirstLogin) {", login.indexOf("const sessionResult")),
    login.indexOf("routeUser(sessionResult)")
  );
  const welcomeRoute = firstLoginBlock.indexOf('setPage("welcome")');
  assert.ok(welcomeRoute >= 0);
  assert.doesNotMatch(firstLoginBlock, /professionalSubscription/);
  assert.match(firstLoginBlock, /localStorage\.removeItem\("firstLogin"\)/);
});

test("Personal to Business activation enters professional onboarding after durable trial-backed profile creation", () => {
  const createStart = contractorProfile.indexOf("async function handleCreateProfile()");
  const createEnd = contractorProfile.indexOf("async function handleUpdateProfile()", createStart);
  const createBlock = contractorProfile.slice(createStart, createEnd);
  const confirmedProfile = createBlock.indexOf("getConfirmedBusinessProfile(result)");
  const projectedProfile = createBlock.indexOf("projectConfirmedBusinessProfile(savedProfile)");
  const businessRoute = createBlock.indexOf('setPage("businessDashboard")');
  assert.ok(confirmedProfile >= 0 && projectedProfile > confirmedProfile && businessRoute > projectedProfile);
  assert.doesNotMatch(createBlock, /setPage\("professionalSubscription"\)/);
});

test("the centralized entitlement gate refreshes on authenticated identity and verified subscription state", () => {
  assert.match(app, /subscribeAuthenticatedIdentity\(setAuthenticatedIdentity\)/);
  assert.match(app, /authenticatedIdentity\.status !== "authenticated"/);
  assert.match(app, /authenticatedIdentity\.sessionGeneration/);
  assert.match(page, /onSubscriptionState\?\.\(loaded\)/);
  assert.match(app, /onSubscriptionState=\{updateSubscriptionGate\}/);
});

test("server-entitled staging professionals retain normal Job, Quote, Invoice, and Alert routes", () => {
  const gate = app.indexOf('shouldBlockProfessionalAccess(subscriptionGate)');
  assert.ok(gate >= 0);
  assert.match(app, /fetchProfessionalSubscription\(setPageState\)[\s\S]*updateSubscriptionGate\(result\)/);
  assert.match(app, /businessAccessActive: hasCanonicalBusinessAccess\(result\)/);
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
