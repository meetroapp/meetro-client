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
