import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildProfessionalWorkCenterRoute,
  parseProfessionalWorkCenterRoute,
} from "../src/utils/professionalWorkCenterRoute.js";
import { t } from "../src/utils/language.js";

const JOB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const QUOTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VISIT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conversationSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const dashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("Communication Center contains no Emergency lifecycle mutation authority", () => {
  for (const forbidden of [
    "transitionEmergencyDispatch",
    "transitionEmergencyStatus",
    "EMERGENCY_DISPATCH_ACTIONS",
    "advanceEmergencyFromChat",
    "completionService",
    "completionSource",
  ]) {
    assert.equal(conversationSource.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(conversationSource, /setPage\("completionSheet"\)/);
});

test("professional canonical Emergency navigation uses only normalized relationship jobId", () => {
  const routeStart = conversationSource.indexOf(
    "const canonicalEmergencyWorkCenterRoute"
  );
  const routeEnd = conversationSource.indexOf("useEffect", routeStart);
  const routeBlock = conversationSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0);
  assert.match(routeBlock, /isCanonicalEmergencyThread && currentViewerRole === "business"/);
  assert.match(routeBlock, /jobId: canonicalConversationDetail\?\.relationship\?\.jobId/);
  assert.match(routeBlock, /returnPage: "messagesInbox"/);
  assert.doesNotMatch(routeBlock, /emergencyRequestId|conversationId|relationship\.id|localStorage/);

  const actionStart = conversationSource.indexOf(
    '{currentViewerRole === "business" &&\n                canonicalEmergencyWorkCenterRoute'
  );
  const actionEnd = conversationSource.indexOf(
    "{emergencyPanelExpanded",
    actionStart
  );
  const actionBlock = conversationSource.slice(actionStart, actionEnd);
  assert.ok(actionStart >= 0);
  assert.match(actionBlock, /wc52openInWorkCenter/);
  assert.match(actionBlock, /setPage\(canonicalEmergencyWorkCenterRoute\)/);
});

test("Emergency status, timeline, location, and messaging remain readable", () => {
  assert.match(conversationSource, /const emergencyStatusSubtitle/);
  assert.match(conversationSource, /const emergencyStepIndex/);
  assert.match(conversationSource, /emergencyStepDotActive/);
  assert.match(conversationSource, /canonicalEmergencyLocationCard/);
  assert.match(conversationSource, /const sendCanonicalMessage = async/);
  assert.match(conversationSource, /canonicalComposerNoticeKey/);
});

test("Job-only Work Center routes round-trip exact canonical UUID", () => {
  const route = buildProfessionalWorkCenterRoute({ jobId: JOB });
  assert.equal(route, `workCenter?jobId=${JOB}`);
  assert.deepEqual(parseProfessionalWorkCenterRoute(route), {
    jobId: JOB,
    quoteId: null,
    visitId: null,
    returnPage: "",
  });
  assert.equal(buildProfessionalWorkCenterRoute({ jobId: "not-a-job" }), null);
});

test("messagesInbox is governed while existing Work Center route forms remain valid", () => {
  const route = buildProfessionalWorkCenterRoute({
    jobId: JOB,
    returnPage: "messagesInbox",
  });
  assert.equal(route, `workCenter?jobId=${JOB}&returnPage=messagesInbox`);
  assert.equal(parseProfessionalWorkCenterRoute(route).returnPage, "messagesInbox");

  assert.equal(
    parseProfessionalWorkCenterRoute(`workCenter?jobId=${JOB}&returnPage=invented`).returnPage,
    ""
  );
  assert.equal(
    parseProfessionalWorkCenterRoute(`workCenter?jobId=${JOB}&unknown=1`),
    null
  );
  assert.equal(
    buildProfessionalWorkCenterRoute({ jobId: JOB, quoteId: QUOTE }),
    `workCenter?jobId=${JOB}&quoteId=${QUOTE}`
  );
  assert.equal(
    parseProfessionalWorkCenterRoute(
      buildProfessionalWorkCenterRoute({ jobId: JOB, visitId: VISIT, stage: "work" })
    ).stage,
    "work"
  );
});

test("Work Center returns messagesInbox with localized Communication Center copy", () => {
  assert.match(
    dashboardSource,
    /\["notifications", "customerRelationshipsCenter", "messagesInbox"\]\.includes\(workCenterJobReturnSurface\)/
  );
  assert.match(dashboardSource, /setPage\(workCenterJobReturnSurface\)/);
  assert.match(
    dashboardSource,
    /workCenterJobReturnSurface === "messagesInbox"[\s\S]*wc52backToCommunicationCenter/
  );

  const expected = {
    en: "Back to Communication Center",
    es: "Volver al Centro de Comunicación",
    fr: "Retour au centre de communication",
    "pt-BR": "Voltar ao Centro de Comunicação",
  };
  for (const [language, label] of Object.entries(expected)) {
    assert.equal(t("wc52backToCommunicationCenter", language), label);
  }
});
