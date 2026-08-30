import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseBusinessLeadAlertRoute,
  parseHomeownerRequestAlertRoute,
} from "../src/utils/alertWorkflowRoutes.js";
import {
  buildCanonicalConversationRoute,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";
import {
  buildEmergencyRequestRoute,
  parseEmergencyRequestRoute,
} from "../src/utils/emergencyRoutes.js";
import {
  buildProfessionalWorkCenterRoute,
  parseProfessionalWorkCenterRoute,
} from "../src/utils/professionalWorkCenterRoute.js";
import { t } from "../src/utils/language.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const VISIT_ID = "f08a4f3b-8a21-4da8-a6b0-4258f5a8df9b";

test("Lead and Emergency Alert detail routes retain exact identity and Alert return authority", () => {
  assert.deepEqual(
    parseBusinessLeadAlertRoute("#businessLeads?requestId=41&returnPage=notifications"),
    { requestId: 41, emergencyRequestId: null, returnPage: "notifications" }
  );
  assert.deepEqual(
    parseBusinessLeadAlertRoute("#businessLeads?emergencyRequestId=51&returnPage=notifications"),
    { requestId: null, emergencyRequestId: 51, returnPage: "notifications" }
  );
  assert.deepEqual(
    parseHomeownerRequestAlertRoute("#homeownerRequestDetails?requestId=41&returnPage=notifications"),
    { requestId: 41, returnPage: "notifications" }
  );
  const emergency = buildEmergencyRequestRoute(51, { returnPage: "notifications" });
  assert.equal(emergency, "emergencyRequest?requestId=51&returnPage=notifications");
  assert.equal(parseEmergencyRequestRoute(emergency).requestId, 51);
  assert.equal(parseEmergencyRequestRoute(emergency).returnPage, "notifications");
});

test("Visit Alert routes retain the exact Visit across professional and customer workspaces", () => {
  const professional = buildProfessionalWorkCenterRoute({
    jobId: JOB_ID,
    visitId: VISIT_ID,
    returnPage: "notifications",
  });
  assert.deepEqual(parseProfessionalWorkCenterRoute(professional), {
    jobId: JOB_ID,
    quoteId: null,
    visitId: VISIT_ID,
    returnPage: "notifications",
  });

  const customer = buildCanonicalConversationRoute(91, "notifications", {
    shell: "communicationCenter",
    visitId: VISIT_ID,
  });
  assert.equal(parseCanonicalConversationRoute(customer).conversationId, 91);
  assert.equal(parseCanonicalConversationRoute(customer).visitId, VISIT_ID);
  assert.equal(parseCanonicalConversationRoute(customer).returnPage, "notifications");
});

test("all TestFlight Alert families have simple language in every supported locale", () => {
  const keys = [
    "alerts.request.newLead.title",
    "alerts.communication.newMessage.title",
    "alerts.emergency.request.title",
    "alerts.emergency.response.title",
    "alerts.schedule.visitProposed.title",
    "alerts.schedule.visitScheduleProposed.title",
    "alerts.schedule.visitChangeRequested.title",
    "alerts.schedule.visitConfirmed.title",
    "alerts.schedule.visitCancelled.title",
    "alertCenterOpenDetails",
    "alertCenterBack",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) assert.notEqual(t(key, language), "", `${language}:${key}`);
  }
});

test("exact workflow cards expose focus identities without adding another workspace", () => {
  const leads = readFileSync(new URL("../src/pages/BusinessLeads.jsx", import.meta.url), "utf8");
  const notifications = readFileSync(new URL("../src/pages/Notifications.jsx", import.meta.url), "utf8");
  const jobVisits = readFileSync(new URL("../src/components/CanonicalJobVisits.jsx", import.meta.url), "utf8");
  const conversationVisit = readFileSync(new URL("../src/components/CanonicalConversationVisitCard.jsx", import.meta.url), "utf8");
  assert.match(leads, /data-lead-request-id=\{requestId\}/);
  assert.match(leads, /data-emergency-request-id=\{opportunity\.id\}/);
  assert.match(notifications, /getAlertDestinationActionTarget/);
  assert.match(jobVisits, /data-canonical-visit-card-id=\{visit\.id\}/);
  assert.match(conversationVisit, /fetchCanonicalVisitByIdentity/);
});
