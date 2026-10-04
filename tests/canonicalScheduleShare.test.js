import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalScheduleEmailUrl,
  buildCanonicalScheduleSharePresentation,
  isCanonicalScheduleShareable,
  resolveCanonicalScheduleConversationTarget,
  sendCanonicalScheduleInMeetro,
  shareCanonicalScheduleExternally,
} from "../src/utils/canonicalScheduleShare.js";
import { getCanonicalWorkCenterConversationActionTarget } from "../src/utils/conversationActionRouting.js";

const JOB_ID = "10000000-0000-4000-8000-000000000001";

function visit(overrides = {}) {
  return {
    kind: "visit",
    id: "20000000-0000-4000-8000-000000000002",
    jobId: JOB_ID,
    currentVersion: 3,
    state: "SCHEDULED",
    purpose: "APPROVED_WORK",
    scheduledStartAt: "2026-08-20T14:00:00.000Z",
    scheduledEndAt: "2026-08-20T16:00:00.000Z",
    timeZone: "America/New_York",
    location: {
      mode: "JOB_SERVICE_LOCATION",
      address: {
        line1: "123 QA Lane",
        city: "Brooklyn",
        region: "NY",
        postalCode: "11201",
      },
    },
    internalNotes: "never expose",
    authority: { state: "ACTIVE" },
    grants: ["visit.complete"],
    idempotencyKey: "private-key",
    ...overrides,
  };
}

function canonicalJob(overrides = {}) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    jobId: JOB_ID,
    conversationId: 340,
    conversationCanSend: true,
    ...overrides,
  };
}

test("only confirmed upcoming canonical Visit truth is shareable", () => {
  assert.equal(isCanonicalScheduleShareable(visit()), true);
  assert.equal(isCanonicalScheduleShareable(visit({ state: "PROPOSED" })), true);
  assert.equal(isCanonicalScheduleShareable(visit({ kind: "opportunity" })), false);
  assert.equal(isCanonicalScheduleShareable(visit({ currentVersion: null })), false);
  assert.equal(isCanonicalScheduleShareable(visit({ state: "CANCELLED" })), false);
  assert.equal(isCanonicalScheduleShareable(visit({ state: "COMPLETED" })), false);
  assert.equal(
    isCanonicalScheduleShareable(visit({ scheduledEndAt: "2026-08-20T13:00:00.000Z" })),
    false
  );
});

test("customer presentation is privacy-safe and contains no internal Visit fields", () => {
  const presentation = buildCanonicalScheduleSharePresentation(visit());
  assert.match(presentation.title, /Approved Work/);
  assert.match(presentation.text, /Aug 20, 2026/);
  assert.match(presentation.text, /123 QA Lane, Brooklyn, NY, 11201/);
  assert.doesNotMatch(
    `${presentation.title}\n${presentation.text}`,
    /20000000|currentVersion|version|authority|grant|private-key|never expose|idempotency/i
  );
});

test("Evaluation share truth remains valid without an invented end time", () => {
  const presentation = buildCanonicalScheduleSharePresentation(visit({
    purpose: "EVALUATION",
    scheduledEndAt: null,
    arrivalNote: "Expected arrival between 9:00 and 9:30 AM",
  }));
  assert.match(presentation.text, /Evaluation Visit/);
  assert.doesNotMatch(presentation.text, /–/);
  assert.doesNotMatch(presentation.text, /Expected arrival/);
});

test("Meetro target requires one exact canonical Job conversation and never fabricates one", () => {
  assert.deepEqual(resolveCanonicalScheduleConversationTarget(visit(), [canonicalJob()]), {
    jobId: JOB_ID,
    conversationId: 340,
    canSendMessages: true,
  });
  assert.equal(resolveCanonicalScheduleConversationTarget(visit(), []), null);
  assert.equal(resolveCanonicalScheduleConversationTarget(visit(), [canonicalJob({ conversationId: null })]), null);
  assert.equal(resolveCanonicalScheduleConversationTarget(visit(), [canonicalJob({ conversationCanSend: false })]), null);
  assert.equal(resolveCanonicalScheduleConversationTarget(visit(), [canonicalJob(), canonicalJob({ conversationId: 341 })]), null);
  assert.equal(resolveCanonicalScheduleConversationTarget(visit(), [canonicalJob({ jobId: "another-job" })]), null);
});

test("Schedule sharing and Job Overview routing retain the same conversation identity", () => {
  const confirmed = visit();
  const conversationTarget = resolveCanonicalScheduleConversationTarget(
    confirmed,
    [canonicalJob()]
  );
  const routingTarget = getCanonicalWorkCenterConversationActionTarget(
    conversationTarget
  );

  assert.equal(conversationTarget.conversationId, 340);
  assert.equal(routingTarget.conversationId, 340);
  assert.match(routingTarget.route, /returnPage=workCenter/);
  assert.match(routingTarget.route, /shell=communicationCenter/);
});

test("Send in Meetro posts only the confirmed presentation and does not mutate Visit state", async () => {
  const confirmed = visit();
  const before = structuredClone(confirmed);
  const calls = [];
  const result = await sendCanonicalScheduleInMeetro({
    visit: confirmed,
    conversationTarget: resolveCanonicalScheduleConversationTarget(confirmed, [canonicalJob()]),
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "CONVERSATION_MESSAGE_CREATED",
          conversationId: 340,
          message: {
            id: 901,
            sender: { isViewer: true },
            content: { type: "text", text: JSON.parse(options.body).message_text },
            createdAt: "2026-08-13T12:00:00.000Z",
          },
        },
      };
    },
  });
  assert.equal(result.backendId, 901);
  assert.deepEqual(confirmed, before);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, "/conversations/340/messages");
  assert.equal(calls[0].options.method, "POST");
  assert.doesNotMatch(calls[0].endpoint, /confirm|visit/i);
  assert.deepEqual(Object.keys(JSON.parse(calls[0].options.body)), ["message_text"]);
});

test("reschedule sharing uses refreshed canonical Visit time rather than stale details", () => {
  const stale = buildCanonicalScheduleSharePresentation(visit());
  const refreshed = buildCanonicalScheduleSharePresentation(visit({
    currentVersion: 4,
    scheduledStartAt: "2026-08-22T18:30:00.000Z",
    scheduledEndAt: "2026-08-22T20:00:00.000Z",
  }));
  assert.match(stale.text, /Aug 20/);
  assert.match(refreshed.text, /Aug 22/);
  assert.doesNotMatch(refreshed.text, /Aug 20/);
});

test("iOS uses governed native share and desktop uses supported web or copy fallback", async () => {
  const calls = [];
  assert.deepEqual(await shareCanonicalScheduleExternally({
    visit: visit(),
    platform: "ios",
    nativeShare: async (payload) => calls.push(["native", payload]),
    webShare: async () => calls.push(["web"]),
  }), { ok: true, method: "native" });
  assert.equal(calls[0][0], "native");

  assert.deepEqual(await shareCanonicalScheduleExternally({
    visit: visit(),
    platform: "web",
    nativeShare: null,
    webShare: async (payload) => calls.push(["web", payload]),
  }), { ok: true, method: "web" });

  assert.deepEqual(await shareCanonicalScheduleExternally({
    visit: visit(),
    platform: "web",
    nativeShare: null,
    webShare: null,
    copy: async (text) => calls.push(["copy", text]),
  }), { ok: true, method: "copy" });
  assert.equal(calls.at(-1)[0], "copy");
});

test("desktop email and all supported locales derive from the confirmed Visit", () => {
  assert.match(buildCanonicalScheduleEmailUrl(visit()), /^mailto:\?subject=/);
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    const presentation = buildCanonicalScheduleSharePresentation(visit(), { language });
    assert.ok(presentation?.title);
    assert.ok(presentation?.text);
  }
  assert.equal(buildCanonicalScheduleEmailUrl(visit({ state: "CANCELLED" })), null);
});
