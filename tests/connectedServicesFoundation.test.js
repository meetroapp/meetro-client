import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isRecognizedApplicationHash } from "../src/utils/appEntryRouting.js";

const readSource = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const registrySource = readSource("src/utils/connectedServicesRegistry.js");
const workspaceSource = readSource("src/pages/ConnectedServices.jsx");
const appSource = readSource("src/App.jsx");
const profileSource = readSource("src/pages/Profile.jsx");
const sessionSource = readSource("src/utils/session.js");
const appEntrySource = readSource("src/utils/appEntryRouting.js");
const ownershipSource = readSource("src/utils/primaryNavigationOwnership.js");

test("Connected Services uses a provider-neutral status and capability contract", () => {
  for (const marker of [
    "COMING_SOON",
    "NOT_CONNECTED",
    "CONNECTED",
    "NEEDS_ATTENTION",
    "UNAVAILABLE",
    "PAYMENTS",
    "ACCOUNTING",
    "CALENDAR",
    "STRIPE_PAYMENTS",
    "QUICKBOOKS",
    "GOOGLE_CALENDAR",
    "MICROSOFT_OUTLOOK_CALENDAR",
  ]) {
    assert.match(registrySource, new RegExp(`\\b${marker}\\b`), marker);
  }

  const comingSoonCount =
    registrySource.match(/\bCOMING_SOON\b/g)?.length || 0;
  assert.ok(
    comingSoonCount >= 5,
    "COMING_SOON must exist as a state and initialize all four R1 providers"
  );
});

test("Stripe Payments remains separate from Meetro subscription billing", () => {
  assert.match(registrySource, /\bSTRIPE_PAYMENTS\b/);
  const connectedServicesSource = `${registrySource}\n${workspaceSource}`;
  assert.match(connectedServicesSource, /Stripe Payments/);
  assert.match(
    connectedServicesSource,
    /subscription[\s\S]{0,180}separate|separate[\s\S]{0,180}subscription/i
  );

  assert.doesNotMatch(
    connectedServicesSource,
    /stripe_customer_id|stripeSubscriptionProvider|subscriptionService/
  );
});

test("Connected Services R1 is presentation-only and owns no provider authority", () => {
  const connectedServicesSource = `${registrySource}\n${workspaceSource}`;

  for (const provider of [
    "Stripe Payments",
    "QuickBooks",
    "Google Calendar",
    "Microsoft Outlook Calendar",
  ]) {
    assert.match(registrySource, new RegExp(provider));
  }

  assert.match(workspaceSource, /getConnectedServiceProviders/);
  assert.match(
    workspaceSource,
    /const providers = getConnectedServiceProviders\(\);/
  );
  assert.match(workspaceSource, /providers\.map\(\(provider\) =>/);
  assert.match(workspaceSource, /\{provider\.name\}/);
  assert.match(
    workspaceSource,
    /data-connected-service-provider=\{provider\.provider\}/
  );
  assert.match(
    workspaceSource,
    /data-connected-service-status=\{provider\.status\}/
  );
  assert.match(workspaceSource, /aria-disabled="true"/);
  assert.match(connectedServicesSource, /Coming Soon/i);

  assert.doesNotMatch(
    connectedServicesSource,
    /authFetch|fetch\s*\(|axios|\/api\/|access_token|refresh_token|client_secret/
  );
});

test("connectedServices is a guarded professional Business-mode route", () => {
  const routeIndex = appSource.indexOf('page === "connectedServices"');
  assert.ok(routeIndex >= 0, "connectedServices route exists");

  const routeWindow = appSource.slice(
    routeIndex,
    Math.min(appSource.length, routeIndex + 700)
  );
  assert.match(routeWindow, /withAssistantAccessOnly/);
  assert.match(appSource, /ConnectedServices/);

  assert.match(sessionSource, /connectedServices/);
  assert.match(appEntrySource, /"connectedServices"/);
  assert.equal(
    isRecognizedApplicationHash("#connectedServices"),
    true,
    "#connectedServices must enter the authenticated application shell"
  );

  const ownershipIndex = ownershipSource.indexOf("connectedServices");
  assert.ok(ownershipIndex >= 0, "connectedServices navigation ownership exists");
  const ownershipWindow = ownershipSource.slice(
    Math.max(0, ownershipIndex - 220),
    Math.min(ownershipSource.length, ownershipIndex + 320)
  );
  assert.match(ownershipWindow, /profile/i);
});

test("Profile opens Connected Services Preview instead of disabled Future", () => {
  const labelIndex = profileSource.indexOf('label={t("connectedServices")}');
  assert.ok(labelIndex >= 0, "Connected services Profile row exists");

  const rowWindow = profileSource.slice(
    Math.max(0, labelIndex - 220),
    Math.min(profileSource.length, labelIndex + 520)
  );

  assert.match(rowWindow, /preview/i);
  assert.match(
    rowWindow,
    /openProfessionalPage\("connectedServices"\)/
  );
  assert.doesNotMatch(rowWindow, /value=\{t\("future"\)\}/);
  assert.doesNotMatch(rowWindow, /\bdisabled\b/);
});
