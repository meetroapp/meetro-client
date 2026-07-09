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

test("Home communication action truthfully opens the existing messages route", () => {
  assert.match(homeSource, /onClick=\{\(\) => setPage\("messagesInbox"\)\}/);
  assert.match(homeSource, /t\("homeOpenMessages"\)/);
  assert.equal(t("homeOpenMessages", "en"), "Open Communication Center");
});

test("Home emergency action routes to emergency progress or completion review", () => {
  assert.match(homeSource, /function openActiveEmergencyFromHome\(isCompletedReview = false\)/);
  assert.match(homeSource, /setPage\("emergencyComplete"\)/);
  assert.match(homeSource, /openActiveEmergencyConversation\(setPage, "home"\)/);
  assert.match(homeSource, /setPage\("emergencyStatus"\)/);
});

test("completed job Continue Conversation opens the project conversation", () => {
  assert.match(completedJobDetailsSource, /Continue Conversation/);
  assert.match(completedJobDetailsSource, /onClick=\{\(\) => openProjectConversation\("completion_review"\)\}/);
  assert.doesNotMatch(
    completedJobDetailsSource,
    /Continue Conversation[\s\S]{0,220}setPage\("messagesInbox"\)/
  );
});

test("completion review actions stay tappable and do not treat reviews as closure approval", () => {
  assert.match(completedJobDetailsSource, /const confirmCompletion = \(\) =>/);
  assert.match(completedJobDetailsSource, /onClick=\{confirmCompletion\}/);
  assert.match(completedJobDetailsSource, /const openResolveTogether = \(\) =>/);
  assert.match(completedJobDetailsSource, /onClick=\{openResolveTogether\}/);
  assert.match(completedJobDetailsSource, /id="completion-concern-flow"/);
  assert.match(completedJobDetailsSource, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(completedJobDetailsSource, /zIndex: 10001/);
  assert.match(completedJobDetailsSource, /touchAction:"manipulation"/);
  assert.doesNotMatch(
    completedJobDetailsSource,
    /completedProject\?\.completionApproved \|\|\s*completedProject\?\.homeownerCompletionApproved \|\|\s*completedProject\?\.reviewSubmitted/
  );
});

test("completed job details guards malformed stored project data before rendering", () => {
  assert.match(completedJobDetailsSource, /function safeJsonParse\(value, fallback = null\)/);
  assert.match(completedJobDetailsSource, /function safeArray\(value\)/);
  assert.doesNotMatch(completedJobDetailsSource, /JSON\.parse\(\s*localStorage\.getItem\("lastCompletedProject"\)/);
  assert.match(completedJobDetailsSource, /safeArray\(completedProject\?\.completionPhotos\)/);
  assert.match(completedJobDetailsSource, /safeArray\(safeJsonParse\(localStorage\.getItem\("completedJobPhotos"\), \[\]\)\)/);
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

test("Work Center landing copy stays responsibility-first and avoids duplicate count summaries", () => {
  assert.equal(
    t("workCenterPurposeStatement", "en"),
    "See what needs attention, what happens next, and where each customer relationship moves forward."
  );
  assert.equal(
    t("workCenterPurposeStatement", "es"),
    "Ve qué necesita atención, qué ocurre después y cómo avanza cada relación con clientes."
  );
  assert.match(contractorDashboardSource, /workCenterProfessionalPerspectiveLine/);
  assert.match(contractorDashboardSource, /New requests that need a decision\./);
  assert.match(contractorDashboardSource, /Accepted work that still needs action\./);
  assert.match(contractorDashboardSource, /Upcoming visits and appointments\./);
  assert.match(contractorDashboardSource, /Proposals that need review or response\./);
  assert.match(contractorDashboardSource, /On-site work that needs an update\./);
  assert.match(contractorDashboardSource, /Closed jobs and saved records\./);
  assert.match(contractorDashboardSource, /Payments, balances, and closed jobs\./);
  assert.doesNotMatch(
    contractorDashboardSource,
    /workCenterDashboardSummary[\s\S]{0,260}newOpportunity/
  );
});
