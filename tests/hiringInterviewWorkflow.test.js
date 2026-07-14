import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hiringSource = readFileSync("src/pages/HiringCenter.jsx", "utf8");
const editorSource = readFileSync("src/components/HiringInterviewEditor.jsx", "utf8");
const conversationSource = readFileSync("src/pages/ConversationThread.jsx", "utf8");
const interviewUtilitySource = readFileSync("src/utils/hiringInterviews.js", "utf8");

test("production Hiring Center cannot schedule or advance local interviews", () => {
  assert.doesNotMatch(hiringSource, /HiringInterviewEditor|createHiringInterview|updateHiringInterview/);
  assert.doesNotMatch(hiringSource, /completeHiringInterview|cancelHiringInterview/);
  assert.match(hiringSource, /HiringUnavailableState/);
});

test("existing interview editor remains null-safe but is not mounted by production Hiring", () => {
  assert.match(editorSource, /role="dialog"/);
  assert.match(editorSource, /aria-modal="true"/);
  assert.doesNotMatch(hiringSource, /<HiringInterviewEditor/);
});

test("legacy interview storage is isolated and no longer authoritative in Hiring Center", () => {
  assert.match(interviewUtilitySource, /meetroHiringInterviews/);
  assert.doesNotMatch(hiringSource, /meetroHiringInterviews|localStorage|sessionStorage/);
});

test("existing hiring conversation route cannot be triggered by the unavailable workspace", () => {
  assert.match(conversationSource, /isHiringThread/);
  assert.doesNotMatch(hiringSource, /saveHiringConversation|setPage\("conversationThread"\)/);
});
