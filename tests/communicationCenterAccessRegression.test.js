import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";
import test from "node:test";
import {
  getConversationVisitReadFailureCopy,
} from "../src/utils/conversationVisitReadFailure.js";

const authFetchSource = readFileSync("src/utils/authFetch.js", "utf8");
const messagesSource = readFileSync("src/pages/MessagesInbox.jsx", "utf8");
const conversationSource = readFileSync("src/pages/ConversationThread.jsx", "utf8");

test("Visit authority and network failures stay local to the scheduling card", () => {
  assert.equal(
    getConversationVisitReadFailureCopy({
      status: 403,
      code: "VISIT_AUTHORITY_REQUIRED",
    }),
    "Evaluation Visit scheduling is not available for this project yet. You can continue messaging."
  );
  assert.equal(
    getConversationVisitReadFailureCopy({ status: 503 }),
    "Evaluation Visit scheduling is temporarily unavailable. You can continue messaging."
  );

  assert.match(
    authFetchSource,
    /shouldAnnounceAccountConnectionIssue\(accountConnectionState\)/
  );
  assert.match(
    messagesSource,
    /window\.addEventListener\(\s*"meetroAccountConnectionIssue"/
  );
  assert.match(conversationSource, /<CanonicalConversationVisitCard/);
});

test("authFetch does not broadcast resource denials or endpoint outages as account failures", () => {
  const scenario = String.raw`
    import assert from "node:assert/strict";

    const events = [];
    globalThis.localStorage = {
      getItem(key) { return key === "token" ? "fixture-token" : null; },
      removeItem() {},
    };
    globalThis.window = {
      location: { hash: "" },
      dispatchEvent(event) { events.push(event); return true; },
    };
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };

    const { authFetch } = await import("./src/utils/authFetch.js");
    const responses = [
      [403, { code: "VISIT_AUTHORITY_REQUIRED", message: "Visit authority is required." }],
      [503, { code: "VISIT_SERVICE_UNAVAILABLE" }],
      [403, { code: "ACCOUNT_ACCESS_BLOCKED" }],
    ];
    globalThis.fetch = async () => {
      const [status, body] = responses.shift();
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    };

    await authFetch("/jobs/job-id/visits");
    await authFetch("/jobs/job-id/visits");
    assert.equal(events.length, 0);

    await authFetch("/account");
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "meetroAccountConnectionIssue");
    assert.equal(events[0].detail.reason, "account_access_blocked");
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", scenario],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
