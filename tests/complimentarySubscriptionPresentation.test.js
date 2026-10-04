import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getBusinessPlanPresentation,
} from "../src/utils/subscriptionPresentation.js";

const pageSource = readFileSync(
  new URL(
    "../src/pages/ProfessionalSubscription.jsx",
    import.meta.url
  ),
  "utf8"
);

function starterState(overrides = {}) {
  return {
    applicable: true,
    subscriptionEnforcementMode: "ENFORCED",
    businessAccessActive: true,
    entitled: true,
    paidEntitlementActive: false,
    complimentaryEntitlementActive: true,
    complimentaryAccess: {
      source: "MEETRO_COMPLIMENTARY",
      status: "ACTIVE",
      grantType: "TESTFLIGHT_STARTER",
      plan: "COMMUNITY_2_USER_MONTHLY",
      seatLimit: 2,
      grantReason: "TESTFLIGHT_TESTER",
      permanent: false,
      entitled: true,
    },
    businessTrial: {
      source: "MEETRO_SERVER",
      status: "EXPIRED",
    },
    subscription: null,
    ...overrides,
  };
}

function fullState(overrides = {}) {
  return starterState({
    complimentaryAccess: {
      source: "MEETRO_COMPLIMENTARY",
      status: "ACTIVE",
      grantType: "FULL_COMPLIMENTARY",
      plan: "COMMUNITY_10_USER_MONTHLY",
      seatLimit: 10,
      grantReason: "BGONE_PERMANENT",
      permanent: true,
      entitled: true,
    },
    ...overrides,
  });
}

test(
  "TestFlight Starter is presented as active $0 complimentary access with exactly 2 seats",
  () => {
    const presentation =
      getBusinessPlanPresentation(starterState());

    assert.deepEqual(presentation, {
      kind: "complimentary",
      eyebrow: "Business Plan",
      planName: "Complimentary Starter",
      statusLabel: "Active · $0",
      seatLabel: "2 professional seats included",
      billingLabel:
        "Complimentary tester access. No subscription payment is required while this access is active.",
      manageLabel: "Plan & Subscription",
    });
  }
);

test(
  "BGone Full Complimentary is presented as permanent $0 access with exactly 10 seats",
  () => {
    const presentation =
      getBusinessPlanPresentation(fullState());

    assert.equal(
      presentation.planName,
      "Full Complimentary Access"
    );
    assert.equal(
      presentation.statusLabel,
      "Active · $0"
    );
    assert.equal(
      presentation.seatLabel,
      "10 professional seats included"
    );
    assert.match(
      presentation.billingLabel,
      /Permanent complimentary access/
    );
    assert.match(
      presentation.billingLabel,
      /No subscription payment is required/
    );
  }
);

test(
  "complimentary authority outranks an underlying active Meetro trial in presentation",
  () => {
    const state = starterState({
      businessTrial: {
        source: "MEETRO_SERVER",
        status: "ACTIVE",
        daysRemaining: 8,
        endsAt: "2026-09-27T12:00:00.000Z",
      },
    });

    const presentation =
      getBusinessPlanPresentation(state);

    assert.equal(
      presentation.kind,
      "complimentary"
    );
    assert.equal(
      presentation.planName,
      "Complimentary Starter"
    );
  }
);

test(
  "verified Apple or Stripe paid subscription retains presentation precedence",
  () => {
    for (const provider of [
      "APPLE_APP_STORE",
      "STRIPE",
    ]) {
      const state = fullState({
        paidEntitlementActive: true,
        subscription: {
          provider,
          plan: "COMMUNITY_5_USER_MONTHLY",
          status: "ACTIVE",
          seatLimit: 5,
        },
        catalog: [
          {
            code: "COMMUNITY_5_USER_MONTHLY",
            name: "Growth",
            seatLimit: 5,
          },
        ],
      });

      const presentation =
        getBusinessPlanPresentation(state);

      assert.equal(
        presentation.kind,
        "subscription"
      );
      assert.equal(
        presentation.planName,
        "Growth"
      );
    }
  }
);

test(
  "Plan & Subscription shows complimentary truth without trial or provider-management prompts",
  () => {
    assert.match(
      pageSource,
      /aria-label="Complimentary business access"/
    );

    assert.match(
      pageSource,
      /<strong>\$0 complimentary<\/strong>/
    );

    assert.match(
      pageSource,
      /businessTrial && !subscription && !complimentaryActive/
    );

    assert.match(
      pageSource,
      /businessTrialActive && !complimentaryActive/
    );

    assert.match(
      pageSource,
      /Your complimentary access is active\. Paid plans are shown for comparison\./
    );

    assert.match(
      pageSource,
      /nativeIos && !nonBlockingAcceptanceActive && !complimentaryActive/
    );

    assert.match(
      pageSource,
      /Complimentary access is server-owned and does not create Apple or Stripe billing/
    );
  }
);
