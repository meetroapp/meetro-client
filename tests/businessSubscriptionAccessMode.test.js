import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  hasCanonicalBusinessAccess,
  shouldBlockProfessionalAccess,
} from "../src/utils/subscriptionAccess.js";
import { getSubscriptionPlanAction } from "../src/utils/subscriptionPlanPresentation.js";
import { getBusinessPlanPresentation } from "../src/utils/subscriptionPresentation.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("acceptance fixture keeps the full Business application available without billing authority", () => {
  const state = {
    applicable: true,
    subscriptionEnforcementMode: "NON_BLOCKING_ACCEPTANCE",
    businessAccessActive: true,
    paidEntitlementActive: false,
    purchaseAvailable: false,
    businessTrial: null,
    subscription: null,
  };
  assert.equal(hasCanonicalBusinessAccess(state), true);
  assert.equal(shouldBlockProfessionalAccess({ status: "ready", businessAccessActive: true }), false);
  assert.deepEqual(getBusinessPlanPresentation(state), {
    kind: "access",
    eyebrow: "Business Plan",
    planName: "Business access",
    statusLabel: "Active",
    seatLabel: "Professional access is available.",
    billingLabel: "Choose a business plan when you are ready.",
    manageLabel: "View Plans",
  });
  assert.deepEqual(getSubscriptionPlanAction({
    subscriptionEnforcementMode: state.subscriptionEnforcementMode,
    businessAccessActive: state.businessAccessActive,
    providerReady: false,
  }), {
    kind: "informational",
    label: "View plan options",
    enabled: false,
  });

  const canonicalGuard = appSource.lastIndexOf("shouldBlockProfessionalAccess(subscriptionGate)");
  assert.ok(canonicalGuard >= 0);
  for (const route of [
    'page === "profile"',
    'page === "meetroMoments"',
    'page === "businessDashboard"',
    'page === "professionalSubscription"',
    'page === "contractorDashboard" || page === "workCenter"',
    'page === "messagesInbox"',
  ]) {
    assert.ok(appSource.indexOf(route, canonicalGuard) > canonicalGuard, `${route} remains available after the canonical access guard`);
  }
  assert.doesNotMatch(appSource, /provider.*shouldBlockProfessionalAccess|shouldBlockProfessionalAccess.*provider/is);
});

test("ENFORCED active server trial grants access and retains truthful trial presentation", () => {
  const state = {
    applicable: true,
    subscriptionEnforcementMode: "ENFORCED",
    businessAccessActive: true,
    paidEntitlementActive: false,
    businessTrial: {
      source: "MEETRO_SERVER",
      status: "ACTIVE",
      daysRemaining: 8,
      endsAt: "2026-09-09T12:00:00.000Z",
    },
    subscription: null,
  };
  assert.equal(hasCanonicalBusinessAccess(state), true);
  assert.equal(shouldBlockProfessionalAccess({ status: "ready", businessAccessActive: true }), false);
  const presentation = getBusinessPlanPresentation(state);
  assert.equal(presentation.kind, "trial");
  assert.equal(presentation.statusLabel, "8 days remaining");
});

test("ENFORCED expired trial remains blocked without a verified paid entitlement", () => {
  const state = {
    applicable: true,
    subscriptionEnforcementMode: "ENFORCED",
    businessAccessActive: false,
    entitled: false,
    paidEntitlementActive: false,
    businessTrial: { source: "MEETRO_SERVER", status: "EXPIRED" },
    subscription: null,
  };
  assert.equal(hasCanonicalBusinessAccess(state), false);
  assert.equal(shouldBlockProfessionalAccess({ status: "ready", businessAccessActive: false }), true);
  assert.equal(getBusinessPlanPresentation(state).kind, "required");
});

test("ENFORCED canonical paid access is provider-neutral at the application gate", () => {
  for (const provider of ["APPLE_APP_STORE", "STRIPE"]) {
    const state = {
      subscriptionEnforcementMode: "ENFORCED",
      businessAccessActive: true,
      paidEntitlementActive: true,
      subscription: {
        provider,
        plan: "GROWTH",
        status: "ACTIVE",
        seatLimit: 5,
      },
      catalog: [{ code: "GROWTH", name: "Growth", seatLimit: 5 }],
    };
    assert.equal(hasCanonicalBusinessAccess(state), true);
    assert.equal(getBusinessPlanPresentation(state).planName, "Growth");
  }
});

test("missing or invalid canonical Business authority fails closed", () => {
  assert.equal(hasCanonicalBusinessAccess({ businessAccessActive: false }), false);
  assert.equal(shouldBlockProfessionalAccess({ status: "ready", businessAccessActive: false }), true);
  assert.equal(hasCanonicalBusinessAccess({}), false);
});
