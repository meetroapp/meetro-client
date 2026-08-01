import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  readBusinessServiceProfile,
  writeBusinessServiceProfile,
} from "../src/utils/businessServiceProfile.js";

test("top-level app render is protected by an error boundary", () => {
  const mainSource = fs.readFileSync("src/main.jsx", "utf8");

  assert.match(mainSource, /RouteErrorBoundary/);
  assert.match(mainSource, /<RouteErrorBoundary resetKey="app">/);
  assert.match(mainSource, /<App \/>/);
});

test("major route groups render inside route error boundaries", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");

  assert.match(appSource, /function withRouteBoundary/);
  assert.match(appSource, /RouteErrorBoundary resetKey=\{currentPage\} currentPage=\{currentPage\}/);
  assert.match(appSource, /withAssistantLayer\(withSuspense\(<Home/);
  assert.match(appSource, /withAssistantLayer\(withSuspense\(<Discover/);
  assert.match(appSource, /withAssistantLayer\(withSuspense\(<Upload/);
  assert.match(appSource, /withAssistantLayer\(withSuspense\(<Profile/);
  assert.match(appSource, /withSuspense\(<BusinessDashboard/);
  assert.match(appSource, /withSuspense\(<BusinessLeads/);
  assert.match(appSource, /withSuspense\(<ConversationThread/);
  assert.match(appSource, /withSuspense\(<ProfessionalOnboarding/);
});

test("route error fallback respects professional account mode", () => {
  const source = fs.readFileSync("src/components/RouteErrorBoundary.jsx", "utf8");

  assert.match(source, /function getSafeReturnPage/);
  assert.match(source, /activeAccountMode/);
  assert.match(source, /currentPage === "businessDashboard"/);
  assert.match(source, /"professionalOnboarding"/);
  assert.match(source, /"businessDashboard"/);
});

test("business dashboard imports local lead visibility before using it", () => {
  const source = fs.readFileSync("src/pages/BusinessDashboard.jsx", "utf8");

  assert.match(source, /import \{ canProfessionalSeeLocalLead \} from "\.\.\/utils\/localLeadVisibility"/);
  assert.match(source, /canProfessionalSeeLocalLead\(/);
});

test("Business Profile is treated as a professional route", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");
  const sessionSource = fs.readFileSync("src/utils/session.js", "utf8");

  assert.match(appSource, /"contractorProfile"/);
  assert.match(sessionSource, /"contractorProfile"/);
});

test("startup repairs authenticated professional route state before redirecting home", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");
  const sessionSource = fs.readFileSync("src/utils/session.js", "utf8");

  assert.match(appSource, /coordinateAppStartup/);
  assert.match(appSource, /STARTUP_READINESS/);
  assert.match(appSource, /startupReadiness/);
  assert.match(appSource, /isStartupReady/);
  assert.match(appSource, /SESSION_HYDRATION/);
  assert.match(appSource, /status: SESSION_HYDRATION\.restoring/);
  assert.match(appSource, /"sessionRestoring"/);
  assert.match(appSource, /SessionRestoringScreen/);
  assert.match(appSource, /setPageState\(getInitialPage\(\)\)/);
  assert.match(
    appSource,
    /restoreAuthenticatedSessionFromStorage\([\s\S]{0,80}authoritativeTargetPage[\s\S]{0,20}\)/
  );
  assert.match(appSource, /restoreAuthenticatedSessionFromStorage\(routedHash\)/);
  assert.match(appSource, /restoreAuthenticatedSessionFromStorage\(hashPage\)/);
  assert.match(appSource, /restoreAuthenticatedSessionFromStorage\(currentHash\)/);
  assert.match(
    appSource,
    /sessionHydration\.status === SESSION_HYDRATION\.restoring \|\|\s*startupReadiness\.status === STARTUP_READINESS\.restoring/
  );
  assert.doesNotMatch(
    appSource,
    /isProfessionalOnlyPage\(targetPage\)[\s\S]{0,160}activeAccountMode[\s\S]{0,80}return "home"/
  );
  assert.match(sessionSource, /function restoreAuthenticatedSessionFromStorage/);
});

test("app startup coordinator blocks protected rendering and logs safe dev steps", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");
  const startupSource = fs.readFileSync("src/utils/appStartup.js", "utf8");

  assert.match(appSource, /needsBusinessProfile: isProfessionalOnlyPage\(routedHash\)/);
  assert.match(appSource, /readBusinessProfile: \(\) => readBusinessServiceProfile\(\)/);
  assert.match(appSource, /readLanguage: getLanguage/);
  assert.match(appSource, /companionEnabled: assistantEnabledPages\.has\(routedHash\)/);
  assert.match(appSource, /dev: import\.meta\.env\.DEV/);
  assert.match(appSource, /startupReadiness\.status === STARTUP_READINESS\.restoring/);
  assert.match(startupSource, /STARTUP_DIAGNOSTIC_STEPS/);
  assert.match(startupSource, /"session restored"/);
  assert.match(startupSource, /"user ready"/);
  assert.match(startupSource, /"business profile ready"/);
  assert.match(startupSource, /"language ready"/);
  assert.match(startupSource, /"companion ready"/);
  assert.match(startupSource, /"routes ready"/);
  assert.match(startupSource, /"app ready"/);
  assert.match(startupSource, /console\.info\(`\[Meetro startup\] \$\{step\}`\)/);
  assert.doesNotMatch(startupSource, /userEmail|businessName|API_KEY|full prompt/i);
});

test("update available notice is build-based and preserves session data", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");
  const startupSource = fs.readFileSync("src/utils/appStartup.js", "utf8");
  const viteSource = fs.readFileSync("vite.config.js", "utf8");

  assert.match(appSource, /function AppUpdateNotice/);
  assert.match(appSource, /t\("appUpdateAvailable", language\)/);
  assert.match(appSource, /t\("appUpdateAvailableBody", language\)/);
  assert.match(appSource, /t\("appUpdateNow", language\)/);
  assert.match(appSource, /t\("appUpdateLater", language\)/);
  assert.match(appSource, /detectAvailableAppUpdate/);
  assert.match(appSource, /applyAppUpdateNow/);
  assert.match(appSource, /dismissAppUpdateNotice/);
  assert.match(appSource, /withStartupChrome/);
  assert.match(startupSource, /APP_BUILD_STORAGE_KEY/);
  assert.match(startupSource, /APP_BUILD_DISMISSED_KEY/);
  assert.match(startupSource, /reloadCurrentBuild/);
  assert.match(appSource, /capacitor: Capacitor/);
  assert.match(appSource, /t\("appUpdating", language\)/);
  assert.match(appSource, /t\("appUpdateFailed", language\)/);
  assert.doesNotMatch(startupSource, /removeItem\("token"\)|clear\(\)/);
  assert.match(viteSource, /globalThis\.__MEETRO_BUILD_ID__/);
  assert.match(viteSource, /VITE_APP_BUILD_ID/);
  assert.match(viteSource, /VITE_APP_VERSION/);
});

test("startup avoids importing high-risk route modules eagerly", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");

  assert.match(appSource, /const Upload = lazy\(\(\) => import\("\.\/pages\/Upload"\)\)/);
  assert.match(appSource, /const Profile = lazy\(\(\) => import\("\.\/pages\/Profile"\)\)/);
  assert.match(appSource, /const ProfessionalOnboarding = lazy\(\(\) => import\("\.\/pages\/ProfessionalOnboarding"\)\)/);
  assert.match(appSource, /const BusinessLeads = lazy\(\(\) => import\("\.\/pages\/BusinessLeads"\)\)/);
  assert.doesNotMatch(appSource, /import BusinessLeads from "\.\/pages\/BusinessLeads"/);
});

test("business service profile helper does not touch storage in default parameters", () => {
  const source = fs.readFileSync("src/utils/businessServiceProfile.js", "utf8");

  assert.match(source, /function getBrowserStorage/);
  assert.doesNotMatch(source, /storage = globalThis\.localStorage/);
});

test("business service profile tolerates unavailable storage", () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage unavailable");
    },
  });

  try {
    assert.doesNotThrow(() => readBusinessServiceProfile());
    const written = writeBusinessServiceProfile({
      serviceSpecialties: ["painting"],
    });
    assert.deepEqual(written.serviceSpecialties, ["painting"]);
  } finally {
    if (storageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
