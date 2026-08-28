import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getConversationQuoteAuthority,
  getConversationVisitContextFacts,
  getConversationVisitTimelineIndex,
  shouldRenderCurrentVisitInline,
} from "../src/utils/communicationSchedulePlacement.js";
import { getAppLayoutSnapshot } from "../src/utils/appLayout.js";
import { getCommunicationLayout } from "../src/utils/communicationLayout.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const QUOTE_ID = "f08a4f3b-8a21-4da8-a6b0-4258f5a8df9b";

const threadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const inboxSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);

function communicationModeAt(width, height) {
  const appLayout = getAppLayoutSnapshot({
    windowObject: { innerWidth: width, innerHeight: height },
    documentObject: {
      documentElement: { clientWidth: width, clientHeight: height },
    },
    capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
  });
  return getCommunicationLayout(appLayout).contextMode;
}

test("canonical Quote authority controls only responsive Visit placement", () => {
  const waiting = getConversationQuoteAuthority({
    jobId: JOB_ID,
    quoteIds: [QUOTE_ID],
    quotes: [{ quoteId: QUOTE_ID, jobId: JOB_ID, businessStatus: "WAITING_ON_CUSTOMER" }],
  });
  const approved = getConversationQuoteAuthority({
    jobId: JOB_ID,
    quoteIds: [QUOTE_ID],
    quotes: [{ id: QUOTE_ID, jobId: JOB_ID, classification: "APPROVED" }],
  });

  assert.equal(waiting.approved, false);
  assert.equal(approved.approved, true);
  assert.equal(shouldRenderCurrentVisitInline({
    contextMode: "mobile",
    quoteAuthorityPhase: "ready",
    quoteAuthority: approved,
  }), true);
  assert.equal(shouldRenderCurrentVisitInline({
    contextMode: "inline",
    quoteAuthorityPhase: "ready",
    quoteAuthority: waiting,
  }), true);
  assert.equal(shouldRenderCurrentVisitInline({
    contextMode: "column",
    quoteAuthorityPhase: "ready",
    quoteAuthority: approved,
  }), false);
  assert.equal(shouldRenderCurrentVisitInline({
    contextMode: "column",
    quoteAuthorityPhase: "unavailable",
    quoteAuthority: null,
  }), true);
});

test("phone, tall phone, tablet, and desktop use the intended responsive context", () => {
  assert.equal(communicationModeAt(390, 844), "mobile");
  assert.equal(communicationModeAt(430, 932), "mobile");
  assert.equal(communicationModeAt(768, 1024), "mobile");
  assert.equal(communicationModeAt(1180, 820), "inline");
  assert.equal(communicationModeAt(1440, 900), "column");
});

test("Visit timeline placement follows canonical timestamps relative to the Quote", () => {
  const messages = [
    { id: "before", createdAt: "2026-08-28T12:00:00.000Z" },
    { id: "quote", createdAt: "2026-08-28T14:00:00.000Z" },
    { id: "after", createdAt: "2026-08-28T15:00:00.000Z" },
  ];
  assert.equal(getConversationVisitTimelineIndex({
    visit: { completedAt: "2026-08-28T13:00:00.000Z" },
    messages,
  }), 1);
  assert.equal(getConversationVisitTimelineIndex({
    visit: { versionCreatedAt: "2026-08-28T16:00:00.000Z" },
    messages,
  }), 3);
});

test("Visit context preserves canonical identity and privacy-safe location meaning", () => {
  const facts = getConversationVisitContextFacts({
    id: "76a1797d-e6f2-4ceb-989e-3a1c40a3240a",
    currentVersion: 3,
    state: "COMPLETED",
    scheduledStartAt: "2026-08-28T13:00:00.000Z",
    timeZone: "America/New_York",
    locationMode: "JOB_SERVICE_LOCATION",
  });

  assert.deepEqual(facts.map(({ label }) => label), [
    "Evaluation Visit",
    "Schedule",
    "Location",
  ]);
  assert.equal(facts[2].value, "Project service location");
  assert.doesNotMatch(JSON.stringify(facts), /street|unit|access note/i);
});

test("Visit card is a normal child of the one conversation scroll owner before Quote history", () => {
  const scrollStart = threadSource.indexOf(
    '<div className="chat-messages conversation-messages"'
  );
  const visit = threadSource.indexOf(
    'data-conversation-timeline-item="canonical-visit"'
  );
  const quote = threadSource.indexOf('msg.type === "quote_shared" && msg.quoteShare');
  const scrollEnd = threadSource.indexOf('<div ref={bottomRef}></div>', scrollStart);

  assert.ok(scrollStart >= 0 && visit > scrollStart);
  assert.ok(quote > visit && scrollEnd > quote);
  assert.match(threadSource, /const timelineVisitRow = \{[\s\S]*position: "static"[\s\S]*zIndex: "auto"/);
  assert.match(threadSource, /data-current-visit-placement=/);
  assert.match(threadSource, /conversationTimelineItems\.map\(\(msg\) =>/);
  assert.match(threadSource, /getConversationVisitTimelineIndex/);
  assert.doesNotMatch(
    threadSource.slice(scrollEnd, threadSource.indexOf('className="chat-bottom-stack"')),
    /CanonicalConversationVisitCard/
  );
});

test("approved desktop and iPad context uses canonical GET projections and retains history", () => {
  assert.match(threadSource, /fetchCustomerJobQuotes/);
  assert.match(threadSource, /fetchProfessionalQuotes/);
  assert.match(threadSource, /quoteAuthorityPhase: canonicalQuoteAuthority\.phase/);
  assert.match(threadSource, /conversationTimelineItems\.map\(\(msg\) =>/);
  assert.match(inboxSource, /onCanonicalWorkContextChange/);
  assert.match(inboxSource, /data-canonical-current-work=/);
  assert.match(inboxSource, /data-canonical-visit-id=/);
  assert.match(inboxSource, /getConversationVisitContextFacts/);
  assert.match(inboxSource, /aria-controls="communication-inline-context"/);
});

test("rendering and resizing do not introduce lifecycle mutations", () => {
  const placementSource = readFileSync(
    new URL("../src/utils/communicationSchedulePlacement.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    placementSource,
    /authFetch|method:\s*["'](?:POST|PATCH|DELETE)|approveIssued|declineIssued|sendProfessional|issueCanonical|runCanonicalVisitCommand/i
  );
});
