import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { t } from "../src/utils/language.js";

const hiringSource = fs.readFileSync("src/pages/HiringCenter.jsx", "utf8");
const editorSource = fs.readFileSync("src/components/HiringInterviewEditor.jsx", "utf8");
const conversationSource = fs.readFileSync("src/pages/ConversationThread.jsx", "utf8");
const interviewUtilitySource = fs.readFileSync("src/utils/hiringInterviews.js", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");

test("Hiring Center completes applicant list and applicant detail interview entry points", () => {
  assert.match(hiringSource, /openInterview\(selectedApplicant, activeInterview\)/);
  assert.match(hiringSource, /openInterview\(applicant, active \|\| null\)/);
  assert.match(hiringSource, /<HiringInterviewEditor/);
  assert.doesNotMatch(hiringSource, /Schedule Interview is coming soon/);
  assert.match(hiringSource, /filterHiringInterviews\(interviews, \{ applicantId: selectedApplicant\.id \}\)/);
});

test("interview editor is viewport-owned, accessible, and safe-area contained", () => {
  assert.match(editorSource, /role="dialog"/);
  assert.match(editorSource, /aria-modal="true"/);
  assert.match(editorSource, /aria-labelledby="hiring-interview-title"/);
  assert.match(editorSource, /titleRef\.current\?\.focus/);
  assert.match(editorSource, /event\.key === "Escape"/);
  assert.match(editorSource, /htmlFor=\{id\}/);
  assert.match(editorSource, /aria-invalid/);
  assert.match(cssSource, /\.meetro-interview-workspace/);
  assert.match(cssSource, /max-height: calc\(100dvh/);
  assert.match(cssSource, /env\(safe-area-inset-bottom/);
  assert.match(cssSource, /width: min\(100%, 680px\)/);
});

test("hiring conversation exposes interview action only inside a business hiring thread", () => {
  const handler = conversationSource.slice(conversationSource.indexOf("const handleQuickReply"), conversationSource.indexOf("const sendMessage", conversationSource.indexOf("const handleQuickReply")));
  assert.match(handler, /isHiringThread &&\s*isBusinessUser/);
  assert.match(handler, /selectedHiringApplicantId/);
  assert.match(handler, /setPage\("hiringCenter"\)/);
  assert.doesNotMatch(handler, /contractorDashboard|meetro_business_schedule|homeownerRequests/);
});

test("conversation renders a hiring-specific card without customer workflow language", () => {
  assert.match(conversationSource, /msg\.type === "hiring-interview"/);
  assert.match(conversationSource, /hiringInterviewMessageCard/);
  const utilityCard = fs.readFileSync("src/utils/hiringConversations.js", "utf8").slice(
    fs.readFileSync("src/utils/hiringConversations.js", "utf8").indexOf("export function upsertHiringInterviewMessage"),
    fs.readFileSync("src/utils/hiringConversations.js", "utf8").indexOf("function safeId")
  );
  assert.match(utilityCard, /workflowType: "hiring_interview"/);
  assert.doesNotMatch(utilityCard, /service visit|project appointment|job scheduled|technician arrival|evaluation visit|customer address/);
  assert.doesNotMatch(utilityCard, /scheduleId|appointmentId|requestId|projectId|quoteId|invoiceId/);
});

test("hiring interview storage is separate from customer and emergency workflows", () => {
  assert.match(interviewUtilitySource, /meetroHiringInterviews/);
  assert.doesNotMatch(interviewUtilitySource, /meetro_business_schedule|homeownerRequests|activeEmergencyRecord|completedProjects|quoteHistory|invoice/i);
  assert.doesNotMatch(hiringSource, /meetro_business_schedule|homeownerRequests|activeEmergencyRecord|completedProjects/);
});

test("required interview language exists in every supported locale", () => {
  const keys = [
    "scheduleInterview", "interviewScheduled", "interviewDetails", "rescheduleInterview",
    "cancelInterview", "markInterviewComplete", "interviewCompleted", "interviewCancelled",
    "interviewType", "hiringInterviewTypeInPerson", "hiringInterviewTypePhone",
    "hiringInterviewTypeVideo", "date", "startTime", "endTime", "timeZone",
    "location", "meetingLink", "notes", "applicant", "position", "saveChanges",
    "schedule", "cancel", "close", "required", "invalidDate", "invalidTime",
    "endAfterStart", "noInterviewsScheduled", "upcomingInterviews", "pastInterviews",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) assert.notEqual(t(key, language), key, `${language}:${key}`);
  }
});
