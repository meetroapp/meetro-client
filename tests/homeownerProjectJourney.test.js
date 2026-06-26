import test from "node:test";
import assert from "node:assert/strict";
import {
  getHomeownerJourneyStages,
  getHomeownerProjectJourney,
  getHomeownerProjectTimelineEvents,
} from "../src/utils/homeownerProjectJourney.js";
import { t } from "../src/utils/language.js";

test("default homeowner journey can skip appointment when no appointment exists", () => {
  const stages = getHomeownerJourneyStages(
    {
      title: "Kitchen Remodel",
      status: "open",
    },
    "en"
  ).map((stage) => stage.key);

  assert.deepEqual(stages, [
    "request",
    "review",
    "quote",
    "work",
    "completion",
  ]);
});

test("quote-ready project maps to quote stage with one primary action", () => {
  const journey = getHomeownerProjectJourney(
    {
      title: "Kitchen Remodel",
      status: "quoted",
      quotesReceived: [{ quoteId: "quote-1", status: "sent", amount: 8750 }],
      businessName: "Bgone Home Renovation",
    },
    "en"
  );

  assert.equal(journey.currentKey, "quote");
  assert.equal(journey.currentTitle, "Quote Ready");
  assert.equal(journey.primaryActionKey, "reviewQuote");
  assert.equal(journey.primaryActionLabel, "Review Quote");
  assert.equal(journey.professionalName, "Bgone Home Renovation");
  assert.equal(journey.stages.filter((stage) => stage.current).length, 1);
});

test("appointment data inserts appointment into the universal journey", () => {
  const journey = getHomeownerProjectJourney(
    {
      status: "scheduled",
      appointmentDate: "2026-06-24T13:30:00.000Z",
    },
    "en"
  );

  assert.deepEqual(
    journey.stages.map((stage) => stage.key),
    ["request", "review", "appointment", "quote", "work", "completion"]
  );
  assert.equal(journey.currentKey, "appointment");
  assert.equal(journey.primaryActionKey, "viewAppointment");
});

test("emergency requests use emergency-specific stage labels", () => {
  const journey = getHomeownerProjectJourney(
    {
      isEmergency: true,
      status: "active",
      service: "Emergency Plumbing",
    },
    "en"
  );

  assert.deepEqual(
    journey.stages.map((stage) => stage.label),
    ["Emergency", "Dispatch", "Active", "Complete"]
  );
  assert.equal(journey.currentKey, "work");
});

test("current-stage primary action mapping stays homeowner focused", () => {
  assert.equal(
    getHomeownerProjectJourney({ status: "open" }, "en").primaryActionKey,
    "messageProfessional"
  );
  assert.equal(
    getHomeownerProjectJourney(
      { status: "scheduled", appointmentDate: "2026-06-24" },
      "en"
    ).primaryActionKey,
    "viewAppointment"
  );
  assert.equal(
    getHomeownerProjectJourney(
      { acceptedQuote: { quoteId: "quote-1", status: "accepted" } },
      "en"
    ).primaryActionKey,
    "reviewQuote"
  );
  assert.equal(
    getHomeownerProjectJourney(
      {
        acceptedQuote: { quoteId: "quote-1", status: "accepted" },
        workStatus: "work_scheduled",
      },
      "en"
    ).primaryActionKey,
    "viewSchedule"
  );
  assert.equal(
    getHomeownerProjectJourney({ status: "active" }, "en").primaryActionKey,
    "messageProfessional"
  );
  assert.equal(
    getHomeownerProjectJourney({ status: "active" }, "en").primaryActionLabel,
    "Continue Conversation"
  );
  assert.equal(
    getHomeownerProjectJourney({ status: "completed" }, "en").primaryActionKey,
    "reviewCompletion"
  );
  assert.equal(
    getHomeownerProjectJourney({ status: "closed" }, "en").primaryActionKey,
    "leaveReview"
  );
});

test("relationship timeline only shows events supported by project data", () => {
  const events = getHomeownerProjectTimelineEvents(
    {
      createdAt: "2026-06-20T10:00:00.000Z",
      respondedAt: "2026-06-20T11:00:00.000Z",
      scheduledAt: "2026-06-21T14:00:00.000Z",
      quotesReceived: [{ quoteId: "quote-1", createdAt: "2026-06-22T12:00:00.000Z" }],
    },
    "en"
  );

  assert.deepEqual(
    events.map((event) => event.key),
    [
      "requestSubmitted",
      "professionalResponded",
      "appointmentScheduled",
      "quoteSent",
    ]
  );
});

test("project journey edit and communication labels exist in supported languages", () => {
  const keys = [
    "requestDetails",
    "editRequest",
    "requestChange",
    "continueConversation",
    "messageProfessional",
  ];
  const languages = ["en", "es", "fr", "pt-BR"];

  for (const language of languages) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key);
    }
  }
});
