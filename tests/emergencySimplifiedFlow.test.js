import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  askMeetroRecordRoute,
  captureAskMeetroContext,
  planAskMeetroActions,
} from "../src/utils/askMeetro.js";
import { askConversationRecord } from "../src/utils/askMeetroConversation.js";
import { getSimplifiedEmergencyProgressStage } from "../src/utils/emergencySummary.js";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const entrySource = source("../src/pages/Emergency.jsx");
const requestSource = source("../src/pages/EmergencyRequest.jsx");
const summarySource = source("../src/utils/emergencySummary.js");
const relationshipSource = source(
  "../src/components/EmergencyRelationshipDetail.jsx"
);

test("homeowner Emergency presents the four simplified stages without a landing or draft language", () => {
  for (const label of [
    "What’s happening?",
    "Safety Check",
    "Find Help",
    "Connected",
  ]) {
    assert.match(requestSource, new RegExp(label.replace("?", "\\?")));
  }
  assert.match(entrySource, /setPage\("emergencyRequest"\)/);
  assert.doesNotMatch(entrySource, /EMERGENCY_SERVICE_OPTIONS|Start Emergency/);
  assert.doesNotMatch(
    `${entrySource}\n${requestSource}\n${summarySource}`,
    /"[^"]*(?:Emergency Draft|Borrador)[^"]*"/
  );
});

test("What’s happening preserves all five canonical services, description, and general area", () => {
  for (const label of [
    "Emergency Plumbing",
    "Emergency Electrical",
    "Roof Leak Repair",
    "Emergency Lockout",
    "Other Urgent Property Issue",
    "General service area",
    "City, area, or ZIP",
    "Continue to Safety Check",
  ]) assert.match(requestSource, new RegExp(label.replace("/", "\\/")));

  for (const forbiddenControl of [
    'id="emergency-title"',
    'id="emergency-unit"',
    'id="emergency-access"',
  ]) assert.equal(requestSource.includes(forbiddenControl), false);

  assert.match(requestSource, /title: buildEmergencyRequestTitle\(/);
  assert.match(requestSource, /unitNumber: ""/);
  assert.match(requestSource, /accessNotes: ""/);
  assert.doesNotMatch(requestSource, /formatPersonalAddress|resolveDefaultPersonalAddress/);
});

test("Ask Meetro is the default Emergency entry and manual intake remains secondary", () => {
  assert.match(requestSource, /useState\(\(\) =>\s*emergencyRoute\.hasRequestId \? "manual" : "ask"/);
  assert.match(requestSource, /const \[askStage, setAskStage\] = useState\("describe"\)/);
  assert.match(requestSource, /copy\.fillManually/);
  assert.match(requestSource, /copy\.returnToAskMeetro/);
  assert.match(requestSource, /intakeMode === "ask"/);
  assert.match(requestSource, /intakeMode === "manual"/);
  assert.match(requestSource, /requestEmergencyRequestInterpretation/);
  assert.match(requestSource, /confirmEmergencyRequestInterpretation/);
});

test("Ask Meetro intake preserves the explicit consent boundary before location", () => {
  const submitBlock = requestSource.slice(
    requestSource.indexOf("async function submitAskMeetroIntake"),
    requestSource.indexOf("function acceptAskMeetroFindHelp")
  );
  const consentBlock = requestSource.slice(
    requestSource.indexOf("function acceptAskMeetroFindHelp"),
    requestSource.indexOf("async function confirmAskMeetroIntake")
  );

  assert.match(submitBlock, /stage: interpretationStage/);
  assert.match(submitBlock, /setAskStage\("consent"\)/);
  assert.doesNotMatch(submitBlock, /setAskStage\("location"\)/);
  assert.match(consentBlock, /askStage !== "consent"/);
  assert.match(consentBlock, /setAskStage\("location"\)/);
  assert.match(consentBlock, /copy\.askLocationPrompt/);
  assert.match(requestSource, /setAskStage\("review"\)/);
  assert.match(requestSource, /askStage === "review" && askIntakeReady/);
});

test("Ask Meetro review creates one canonical draft and then enters the certified Safety Check", () => {
  const handler = requestSource.slice(
    requestSource.indexOf("async function confirmAskMeetroIntake"),
    requestSource.indexOf("async function submitDetails")
  );
  assert.equal((handler.match(/createEmergencyDraft\(/g) || []).length, 1);
  assert.match(handler, /unitNumber: ""/);
  assert.match(handler, /accessNotes: ""/);
  assert.match(handler, /synchronizeCreatedEmergencyRequest/);
  assert.match(handler, /setPhase\("safety"\)/);
  assert.doesNotMatch(handler, /saveEmergencySafetyAssessment|prepareEmergencyRequest|selectHomeowner/);
});

test("Emergency Ask copy remains truthful and available in English and Spanish", () => {
  for (const phrase of [
    "Ask Meetro Emergency Help",
    "Fill manually",
    "Return to Ask Meetro",
    "Would you like me to help you find available professionals serving your area?",
    "Yes, find help",
    "What city or ZIP code should I use to find professionals serving your area?",
    "Ayuda de Emergencia con Meetro",
    "Completar manualmente",
    "Volver a Preguntar a Meetro",
    "Sí, buscar ayuda",
    "ciudad o código postal",
  ]) assert.match(requestSource, new RegExp(phrase));
  assert.doesNotMatch(requestSource, /closest|nearest|fastest|best/i);
});

test("Ask Meetro renders controlled homeowner copy instead of raw provider summaries", () => {
  assert.match(
    requestSource,
    /function buildAskMeetroDisplayMessage/
  );

  assert.match(
    requestSource,
    /This sounds like a \$\{serviceLabel\} emergency\./
  );

  assert.doesNotMatch(
    requestSource,
    /text:\s*result\.interpretation\.summary/
  );
});

test("new Emergency intake hides cancellation until canonical identity exists and keeps one real Home destination", () => {
  assert.match(
    requestSource,
    /if \(!getRequestId\(record\)\) return false/
  );

  for (const status of [
    "draft",
    "ready_for_distribution",
    "active",
    "selection_pending",
  ]) {
    assert.match(
      requestSource,
      new RegExp(`"${status}"`)
    );
  }

  assert.doesNotMatch(
    requestSource,
    /onClick=\{\(\) => setPage\("emergency"\)\}/
  );

  assert.match(
    requestSource,
    /onClick=\{\(\) => setPage\("home"\)\}/
  );
});

test("canonical draft creation remains backend owned", () => {
  assert.match(requestSource, /createEmergencyDraft\(payload/);
  assert.match(requestSource, /updateEmergencyDraft\(requestId, payload/);
  assert.match(requestSource, /replaceEmergencyRequestRoute/);
  assert.doesNotMatch(
    requestSource,
    /localStorage\.setItem|sessionStorage\.setItem|activeEmergencyRecord/
  );
});

test("Safety Continue saves first, consumes backend permission, then prepares", () => {
  const handler = requestSource.slice(
    requestSource.indexOf("async function submitSafety"),
    requestSource.indexOf("function editDetails")
  );
  const saveIndex = handler.indexOf("saveEmergencySafetyAssessment(");
  const permissionIndex = handler.indexOf(
    "hasBackendSafetyPermissionToPrepare"
  );
  const prepareIndex = handler.indexOf("prepareEmergencyRequest(");
  assert.ok(saveIndex >= 0);
  assert.ok(permissionIndex > saveIndex);
  assert.ok(prepareIndex > permissionIndex);
  assert.match(
    handler,
    /if \(!hasBackendSafetyPermissionToPrepare[\s\S]*setPhase\("lifecycle"\);[\s\S]*return;/
  );
  assert.match(
    handler,
    /getRequestStatus\(prepareResult\.emergencyRequest\)[\s\S]*"ready_for_distribution"/
  );
  assert.doesNotMatch(requestSource, /submissionConfirmationOpen|requestSubmission|confirmSubmission/);
  assert.doesNotMatch(requestSource, /noneApply|noHazardsApply/);
});

test("Find Help retains Available Now, separate responses, waiting, and canonical selection", () => {
  assert.match(requestSource, /<EmergencyAvailableNow/);
  assert.match(requestSource, /<EmergencyRelationshipDetail/);
  assert.match(requestSource, /selectHomeownerAvailableEmergencyProfessional/);
  assert.match(requestSource, /selectHomeownerEmergencyResponse/);
  assert.match(requestSource, /onKeepWaiting/);
  assert.match(requestSource, /buildCanonicalConversationRoute/);
  assert.match(relationshipSource, /Professional responses/);
});

test("Connected uses canonical relationship and conversation language", () => {
  assert.match(relationshipSource, /Professional Connected/);
  assert.match(relationshipSource, /Message Professional/);
  assert.match(relationshipSource, /View Emergency Status/);
});

test("Ask Meetro accepts bounded Emergency context without mutation ownership", () => {
  assert.deepEqual(captureAskMeetroContext("emergencyRequest"), {
    page: "emergencyRequest",
    label: "",
  });
  const context = captureAskMeetroContext(
    "emergencyRequest?requestId=41"
  );
  assert.deepEqual(context, { page: "emergencyRequest", label: "" });
  assert.deepEqual(
    askConversationRecord({
      page: "emergencyRequest",
      requestId: "41",
    }),
    {}
  );
  for (const kind of ["JOB", "SCHEDULE", "PHOTOS"]) {
    assert.equal(
      askMeetroRecordRoute(
        { page: "emergencyRequest", requestId: "41" },
        kind,
        "personal"
      ),
      ""
    );
  }
  for (const instruction of [
    "Complete this job",
    "Schedule this job Friday",
    "Upload photos",
  ]) {
    assert.deepEqual(
      planAskMeetroActions(instruction, {
        context,
        role: "personal",
      }),
      []
    );
  }
  assert.match(requestSource, /<ContextualAskMeetro/);
  assert.match(requestSource, /context=\{\{ page: "emergencyRequest" \}\}/);
  assert.doesNotMatch(
    requestSource,
    /ContextualAskMeetro[\s\S]{0,200}requestId/
  );
  assert.doesNotMatch(
    source("../src/utils/askMeetro.js"),
    /createEmergencyDraft|saveEmergencySafetyAssessment|prepareEmergencyRequest|selectHomeownerEmergency/
  );
});

test("simplified progress hides terminal and failed recovery outcomes", () => {
  for (const status of ["cancelled", "expired", "unable_to_match"]) {
    assert.equal(getSimplifiedEmergencyProgressStage(status), null);
  }
  for (const recoveryState of ["loading", "failed"]) {
    assert.equal(
      getSimplifiedEmergencyProgressStage("draft", { recoveryState }),
      null
    );
  }
  assert.equal(
    getSimplifiedEmergencyProgressStage("safety_blocked"),
    "safety"
  );
  for (const status of [
    "ready_for_distribution",
    "active",
    "selection_pending",
  ]) {
    assert.equal(getSimplifiedEmergencyProgressStage(status), "find");
  }
  for (const status of [
    "assigned",
    "professional_en_route",
    "professional_arrived",
    "in_service",
    "work_in_progress",
    "completed",
    "resolved",
  ]) {
    assert.equal(
      getSimplifiedEmergencyProgressStage(status),
      "connected"
    );
  }
  assert.match(requestSource, /\{simplifiedStage && \(/);
});

test("legacy Emergency pages stay redirected and no browser authority returns", () => {
  const routes = source("../src/utils/emergencyRoutes.js");
  for (const route of [
    "emergencyBusinessSelection",
    "emergencyStatus",
    "emergencyDispatch",
    "emergencyChat",
  ]) assert.match(routes, new RegExp(route));
  assert.doesNotMatch(requestSource, /setPage\("(?:emergencyBusinessSelection|emergencyStatus|emergencyDispatch|emergencyChat)"\)/);
});
