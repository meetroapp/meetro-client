import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath) {
  return readFileSync(
    new URL(`../${relativePath}`, import.meta.url),
    "utf8"
  );
}

const appSource = readSource("src/App.jsx");
const sessionSource = readSource("src/utils/session.js");
const notificationSource = readSource("src/utils/notificationCenter.js");
const lifecycleSource = readSource("src/utils/emergencyLifecycle.js");
const threadSource = readSource("src/pages/ConversationThread.jsx");
const businessDashboardSource = readSource(
  "src/pages/BusinessDashboard.jsx"
);
const contractorDashboardSource = readSource(
  "src/pages/ContractorDashboard.jsx"
);
const assistantSource = readSource("src/components/MeetroAssistant.jsx");

const legacyRoutes = [
  "emergencyBusinessSelection",
  "emergencyBusinessSettings",
  "emergencyStatus",
  "emergencyDispatch",
  "emergencyCompletionActions",
  "emergencyOperationsCenter",
  "emergencyChat",
  "emergencyComplete",
];

const legacyComponents = [
  "EmergencyBusinessSelection",
  "EmergencyBusinessSettings",
  "EmergencyStatus",
  "EmergencyDispatch",
  "EmergencyCompletionActions",
  "EmergencyOperationsCenter",
  "EmergencyChat",
  "EmergencyComplete",
];

test("legacy Emergency pages have no production route or bundle registration", () => {
  for (const component of legacyComponents) {
    assert.doesNotMatch(
      appSource,
      new RegExp(`(?:import|lazy\\().*${component}|<${component}`),
      component
    );
  }

  for (const route of legacyRoutes) {
    assert.doesNotMatch(
      appSource,
      new RegExp(`page\\s*===\\s*["']${route}["']`),
      route
    );
    assert.equal(
      sessionSource.includes(`"${route}"`),
      false,
      route
    );
    assert.equal(
      assistantSource.includes(`"${route}"`),
      false,
      route
    );
  }
});

test("legacy redirects run before authentication and role authorization", () => {
  const guardStart = appSource.indexOf(
    "const getGuardedPage = (targetPage = \"\") =>"
  );
  const guardEnd = appSource.indexOf(
    "const hasRequiredProfessionalSetupData",
    guardStart
  );
  const guardedSource = appSource.slice(guardStart, guardEnd);

  const redirectIndex = guardedSource.indexOf(
    "resolveLegacyEmergencyRoute(targetPage)"
  );
  const tokenIndex = guardedSource.indexOf(
    "safeGetStorageItem(\"token\")"
  );
  const roleIndex = guardedSource.indexOf(
    "isProfessionalOnlyPage(authoritativeTargetPage)"
  );

  assert.ok(guardStart >= 0);
  assert.ok(redirectIndex >= 0);
  assert.ok(tokenIndex > redirectIndex);
  assert.ok(roleIndex > tokenIndex);
  assert.match(appSource, /if \(!hasToken\) \{[\s\S]*?setPageState\("login"\)/);
  assert.match(
    guardedSource,
    /!restoredSession\.isProfessional[\s\S]*?return "home"/
  );
  assert.match(
    appSource,
    /resolveLegacyEmergencyRoute\(hashRoute\) !== hashRoute[\s\S]*?legacyRouteRedirected \|\| hashRoute === hashPage/
  );
  assert.match(
    appSource,
    /const initialRouteTimer = window\.setTimeout\([\s\S]*?handleHashChange,[\s\S]*?0[\s\S]*?\)/
  );
});

test("Emergency notification targets are canonical and never stage browser identity", () => {
  for (const route of legacyRoutes) {
    assert.equal(
      notificationSource.includes(`"${route}"`),
      false,
      route
    );
  }

  assert.match(notificationSource, /buildEmergencyRequestRoute/);
  assert.match(notificationSource, /buildCanonicalConversationRoute/);
  assert.doesNotMatch(notificationSource, /selectedEmergencyId/);
  assert.doesNotMatch(
    notificationSource,
    /meetroConversationType:\s*["']emergency["']/
  );
});

test("browser-authored Emergency lifecycle and conversation authority fail closed", () => {
  for (const signature of [
    "export function openActiveEmergencyConversation",
    "export function transitionEmergencyStatus",
  ]) {
    const start = lifecycleSource.indexOf(signature);
    const nextFunction = lifecycleSource.indexOf(
      "export function",
      start + signature.length
    );
    const body = lifecycleSource.slice(
      start,
      nextFunction >= 0 ? nextFunction : undefined
    );

    assert.ok(start >= 0);
    assert.ok(
      body.indexOf("if (!canReadLegacyWorkflowStorage())") >= 0
    );
    assert.ok(
      body.indexOf("if (!canReadLegacyWorkflowStorage())") <
        body.indexOf("localStorage")
    );
  }

  assert.match(
    threadSource,
    /rawStoredConversationType === "emergency"[\s\S]*?!legacyWorkflowStorageEnabled[\s\S]*?\? "standard"/
  );
  assert.match(
    threadSource,
    /const isLegacyEmergencyThread =[\s\S]*?legacyWorkflowStorageEnabled[\s\S]*?!isCanonicalThread[\s\S]*?conversationType === "emergency"/
  );
  assert.match(
    threadSource,
    /if \(isCanonicalEmergencyThread\) \{[\s\S]*?transitionEmergencyDispatch[\s\S]*?if \(!isLegacyEmergencyThread\) return;[\s\S]*?transitionEmergencyStatus/
  );
  assert.match(
    businessDashboardSource,
    /legacyEmergencyAuthorityEnabled &&[\s\S]*?canDashboardSeeEmergency/
  );
  assert.match(
    contractorDashboardSource,
    /const hasActiveEmergency =[\s\S]*?canReadLegacyWorkflowStorage\(\) &&/
  );
});
