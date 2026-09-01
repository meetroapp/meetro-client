import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getBusinessPlanPresentation } from "../src/utils/subscriptionPresentation.js";
import {
  getSubscriptionPlanAction,
  getSubscriptionPurchaseChannel,
} from "../src/utils/subscriptionPlanPresentation.js";

const profileSource = readFileSync(
  new URL("../src/pages/Profile.jsx", import.meta.url),
  "utf8"
);
const dashboardSource = readFileSync(
  new URL("../src/pages/BusinessDashboard.jsx", import.meta.url),
  "utf8"
);
const cardSource = readFileSync(
  new URL("../src/components/BusinessPlanStatusCard.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);
const loginSource = readFileSync(
  new URL("../src/pages/Login.jsx", import.meta.url),
  "utf8"
);
const subscriptionPageSource = readFileSync(
  new URL("../src/pages/ProfessionalSubscription.jsx", import.meta.url),
  "utf8"
);

const catalog = [
  { code: "STARTER", name: "Starter", amountMinor: 3499, currency: "USD", seatLimit: 2 },
  { code: "GROWTH", name: "Growth", amountMinor: 6999, currency: "USD", seatLimit: 5 },
  { code: "PROFESSIONAL", name: "Professional", amountMinor: 12999, currency: "USD", seatLimit: 10 },
];

function presentation(plan, status = "ACTIVE", usedProfessionalSeats = 1) {
  const catalogPlan = catalog.find((item) => item.code === plan);
  return getBusinessPlanPresentation({
    applicable: true,
    entitled: true,
    usedProfessionalSeats,
    catalog,
    subscription: {
      plan,
      status,
      seatLimit: catalogPlan.seatLimit,
    },
  });
}

test("Profile and Business Dashboard replace the legacy Meetro Pro upsells", () => {
  assert.match(profileSource, /<BusinessPlanStatusCard/);
  assert.match(dashboardSource, /<BusinessPlanStatusCard/);
  assert.doesNotMatch(profileSource + dashboardSource, /Meetro Pro|Grow with Meetro|Founding Pro|premium visibility|unlimited leads|emergency priority/i);
});

test("the three approved plan identities, prices, and seat limits derive from entitlement state", () => {
  const starter = presentation("STARTER");
  const growth = presentation("GROWTH", "ACTIVE", 2);
  const professional = presentation("PROFESSIONAL", "ACTIVE", 6);

  assert.deepEqual(
    [starter.planName, starter.seatLabel],
    ["Starter", "1 of 2 professional seats used"]
  );
  assert.deepEqual(
    [growth.planName, growth.seatLabel],
    ["Growth", "2 of 5 professional seats used"]
  );
  assert.deepEqual(
    [professional.planName, professional.seatLabel],
    ["Professional", "6 of 10 professional seats used"]
  );

  assert.equal(presentation("STARTER", "TRIAL").billingLabel, "");
  assert.equal(presentation("GROWTH", "TRIAL").billingLabel, "");
  assert.equal(presentation("PROFESSIONAL", "TRIAL").billingLabel, "");
});

test("plan status and management remain server-owned and use the existing route", () => {
  assert.equal(presentation("GROWTH").statusLabel, "Active");
  assert.equal(presentation("GROWTH", "TRIAL").planName, "Growth");
  assert.match(cardSource, /fetchProfessionalSubscription\(setPage\)/);
  assert.match(cardSource, /setPage\("professionalSubscription"\)/);
  assert.doesNotMatch(cardSource, /APPLE_APP_STORE|STRIPE|localStorage|setTimeout|setInterval/);
});

test("internal QA entitlement is presented with provider-neutral user copy", () => {
  const qa = getBusinessPlanPresentation({ qaAccess: true, entitled: true });
  assert.equal(qa.planName, "Business access");
  assert.equal(qa.statusLabel, "Active");
  assert.equal(qa.billingLabel, "Choose a business plan when you are ready.");
  assert.equal(qa.seatLabel, "Professional access is available.");
});

test("the server-owned Meetro Business Trial is plan-neutral and uses server dates", () => {
  const trial = getBusinessPlanPresentation({
    applicable: true,
    entitled: true,
    businessTrial: {
      source: "MEETRO_SERVER",
      status: "ACTIVE",
      daysRemaining: 9,
      endsAt: "2026-09-08T12:00:00.000Z",
    },
  });
  assert.equal(trial.kind, "trial");
  assert.equal(trial.planName, "Meetro Business Trial");
  assert.equal(trial.statusLabel, "9 days remaining");
  assert.match(trial.billingLabel, /Trial ends Sep 8, 2026/);
  assert.doesNotMatch(JSON.stringify(trial), /Apple|Stripe|Starter|Growth|Professional/);
});

test("QA entitlement keeps internal behavior but uses neutral plan actions", () => {
  const action = getSubscriptionPlanAction({
    qaAccess: true,
    entitled: true,
    planCode: "STARTER",
    providerReady: false,
  });
  assert.deepEqual(action, {
    kind: "informational",
    label: "View plan options",
    enabled: false,
  });
  assert.match(subscriptionPageSource, /state\?\.qaAccess && !subscription/);
  assert.match(subscriptionPageSource, /aria-label="Business access"/);
  assert.doesNotMatch(subscriptionPageSource, /Current access already active/);
  assert.match(subscriptionPageSource, /\{subscription && <button[^>]+>Manage Subscription<\/button>\}/);
});

test("normal subscription and Profile surfaces expose no QA or provider diagnostics", () => {
  const userFacingSources = [
    profileSource,
    dashboardSource,
    cardSource,
    subscriptionPageSource,
    readFileSync(new URL("../src/utils/subscriptionPresentation.js", import.meta.url), "utf8"),
    readFileSync(new URL("../src/utils/subscriptionPlanPresentation.js", import.meta.url), "utf8"),
  ].join("\n");
  for (const prohibited of [
    "QA · no accidental provider trial",
    "No Apple or Stripe subscription active",
    "No Apple or Stripe subscription is active",
    "Apple status confirmed",
    "Stripe status confirmed",
    "Staging QA Access",
    "Testing access",
    "Provider verification required",
    "Apple product configuration is required",
    "Stripe TEST checkout is not configured in staging",
    "becomes billing authority",
    "governs paid billing status after server verification",
  ]) {
    assert.equal(userFacingSources.includes(prohibited), false, prohibited);
  }
});

test("web uses Stripe presentation and native iOS continues to use Apple", () => {
  const web = getSubscriptionPurchaseChannel({
    nativeIos: false,
    plan: { providers: { STRIPE: { configured: false } } },
  });
  assert.equal(web.providerName, "Stripe");
  assert.equal(web.eligibilityLabel, "Paid monthly plan");
  assert.equal(web.unavailableLabel, "Subscription purchasing is currently unavailable.");

  const ios = getSubscriptionPurchaseChannel({
    nativeIos: true,
    plan: { providers: { APPLE_APP_STORE: { configured: true } } },
    storeProduct: {},
  });
  assert.equal(ios.providerName, "Apple");
  assert.equal(ios.eligibilityLabel, "Paid monthly plan");
  assert.doesNotMatch(subscriptionPageSource, /Trial eligibility checked by Apple|Trial eligibility determined by|Web subscription checkout is unavailable/);
});

test("real Apple and Stripe subscriptions win over QA bypass and remain provider-managed", () => {
  for (const provider of ["APPLE_APP_STORE", "STRIPE"]) {
    const subscription = { provider, plan: "GROWTH", status: "ACTIVE", seatLimit: 5 };
    const current = getSubscriptionPlanAction({
      qaAccess: true,
      entitled: true,
      subscription,
      planCode: "GROWTH",
    });
    assert.equal(current.label, "Current plan");
    assert.equal(getBusinessPlanPresentation({
      qaAccess: true,
      entitled: true,
      catalog,
      subscription,
    }).planName, "Growth");
  }
  assert.match(subscriptionPageSource, /subscription\.provider === "STRIPE" \? "Web \/ Stripe" : "Apple App Store"/);
  assert.match(subscriptionPageSource, /result\.provider === "APPLE_APP_STORE" && nativeIos/);
});

test("a normal no-entitlement professional retains provider-appropriate purchase actions", () => {
  const action = getSubscriptionPlanAction({
    providerReady: true,
    nativeIos: false,
  });
  assert.deepEqual(action, {
    kind: "purchase",
    label: "Continue with Stripe",
    enabled: true,
  });

  const trialConversion = getSubscriptionPlanAction({
    entitled: true,
    businessTrialActive: true,
    providerReady: true,
    nativeIos: true,
  });
  assert.equal(trialConversion.label, "Continue with Apple");
  assert.equal(trialConversion.enabled, true);
});

test("Business Dashboard suppresses only the loaded staging QA status card", () => {
  assert.match(dashboardSource, /<BusinessPlanStatusCard[\s\S]*hideQa/);
  assert.match(cardSource, /hideQa && \(loading \|\| presentation\.kind === "qa"\)/);
});

test("Homeowner Profile stays free and Business activation enters the trial-backed business flow", () => {
  const personalBranchStart = profileSource.indexOf("if (!isBusinessMode)");
  const businessBranchStart = profileSource.indexOf(
    "\n  }\n\n  return (\n    <div className={profileShellClassName}",
    personalBranchStart
  );
  const personalBranch = profileSource.slice(personalBranchStart, businessBranchStart);
  assert.ok(personalBranchStart >= 0 && businessBranchStart > personalBranchStart);
  assert.doesNotMatch(personalBranch, /BusinessPlanStatusCard|professionalSubscription/);
  assert.match(profileSource, /!hasBusinessAccess[\s\S]*Set Up Business Account[\s\S]*setPage\("contractorProfile"\)/);
  assert.match(appSource, /isProfessionalOnlyPage\(page\)[\s\S]*subscriptionGate\.entitled !== true/);
  assert.doesNotMatch(loginSource, /if \(isFirstLogin\)[\s\S]{0,260}professionalSubscription/);
});

test("the replacement presentation does not add Billing, Alerts, premium leads, or Employee Team behavior", () => {
  const authoredPresentation = cardSource + readFileSync(
    new URL("../src/utils/subscriptionPresentation.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(authoredPresentation, /invoice|deposit request|payment record|\/alerts|premium leads|emergency priority|teamMembers|setPage\("team|authFetch\("\/(employees|team)/i);
});
