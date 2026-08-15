import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t } from "../src/utils/language.js";

const homeSource = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const completedJobDetailsSource = readFileSync(
  new URL("../src/pages/CompletedJobDetails.jsx", import.meta.url),
  "utf8"
);
const emergencyStatusSource = readFileSync(
  new URL("../src/pages/EmergencyStatus.jsx", import.meta.url),
  "utf8"
);
const emergencyDispatchSource = readFileSync(
  new URL("../src/pages/EmergencyDispatch.jsx", import.meta.url),
  "utf8"
);
const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const legacyWorkCenterSource = readFileSync(
  new URL("../src/components/LegacyWorkCenterReadOnlyPanel.jsx", import.meta.url),
  "utf8"
);

test("Home communication action truthfully opens the existing messages route", () => {
  assert.match(homeSource, /onClick=\{\(\) => setPage\("messagesInbox"\)\}/);
  assert.match(homeSource, /t\("homeOpenMessages"\)/);
  assert.equal(t("homeOpenMessages", "en"), "Open Communication Center");
});

test("Home legacy Emergency cards fall back to the canonical request directory", () => {
  assert.match(homeSource, /function openActiveEmergencyFromHome\(isCompletedReview = false\)/);
  assert.match(homeSource, /setPage\("myRequests"\)/);
  assert.match(homeSource, /openActiveEmergencyConversation\(setPage, "home"\)/);
  assert.doesNotMatch(homeSource, /setPage\("emergencyStatus"\)/);
  assert.doesNotMatch(homeSource, /setPage\("emergencyComplete"\)/);
});

test("completed job details exposes only truthful unavailable navigation", () => {
  assert.match(completedJobDetailsSource, /normalizeCompletedJobRecord\(completedRecord\)/);
  assert.match(completedJobDetailsSource, /completedJobDetailsUnavailable/);
  assert.match(completedJobDetailsSource, /completedHistoryNoMutationNotice/);
  assert.match(completedJobDetailsSource, /setPage\("contractorDashboard"\)/);
  assert.match(completedJobDetailsSource, /setPage\("home"\)/);
  assert.doesNotMatch(completedJobDetailsSource, /confirmCompletion|openResolveTogether|openProjectConversation/);
  assert.doesNotMatch(completedJobDetailsSource, /localStorage\.(?:getItem|setItem|removeItem)/);
});

test("emergency back and chat actions match their destination", () => {
  assert.match(emergencyStatusSource, /onClick=\{\(\) => setPage\("home"\)\}[\s\S]{0,80}\{t\.backHome\}/);
  assert.match(emergencyDispatchSource, /function openEmergencyChat\(\)/);
  assert.match(emergencyDispatchSource, /localStorage\.setItem\("activeConversationId", conversationId\)/);
  assert.match(emergencyDispatchSource, /setPage\("conversationThread"\)/);
});

test("Work Center opportunity and emergency labels match their handlers", () => {
  assert.match(contractorDashboardSource, /openBusinessLeadOpportunityDetail\(request\)[\s\S]{0,120}\{translate\("viewOpportunity"\)\}/);
  assert.match(contractorDashboardSource, /function acceptEmergencyRequest\(\)[\s\S]{0,120}openActiveEmergencyConversation\(setPage, "contractorDashboard"\)/);
  assert.match(contractorDashboardSource, /\{translate\("openEmergencyChat"\)\}/);
});

test("Work Center landing copy stays responsibility-first and labels legacy domains read-only", () => {
  assert.equal(
    t("workCenterPurposeStatement", "en"),
    "See what needs your attention and what to do next."
  );
  assert.equal(
    t("workCenterPurposeStatement", "es"),
    "Ve qué necesita tu atención y qué hacer después."
  );
  assert.match(
    contractorDashboardSource,
    /translate\("workCenterPurposeStatement", activeLanguage\)/
  );
  assert.match(contractorDashboardSource, /workCenterNewRequestsThatNeedADecision/);
  assert.match(contractorDashboardSource, /LegacyWorkCenterReadOnlyPanel/);
  assert.match(legacyWorkCenterSource, /Read-only/);
  assert.match(legacyWorkCenterSource, /Compatibility records/);
  assert.match(legacyWorkCenterSource, /Browser-stored references remain visible here/);
  assert.match(legacyWorkCenterSource, /cannot update or override canonical/);
  assert.doesNotMatch(
    contractorDashboardSource,
    /workCenterDashboardSummary[\s\S]{0,260}newOpportunity/
  );
});
