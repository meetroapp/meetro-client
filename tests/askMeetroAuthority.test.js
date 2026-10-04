import assert from "node:assert/strict";
import test from "node:test";
import { captureAskMeetroContext, planAskMeetroActions, askMeetroRecordRoute, isAskMeetroInformationRequest, isAskMeetroChangeRequest, resolveAskMeetroActions, askMeetroReply } from "../src/utils/askMeetro.js";
import { reviewAskMeetroCompletion, applyAskMeetroCompletion } from "../src/utils/askMeetroCompletion.js";
import { parseProfessionalWorkCenterRoute } from "../src/utils/professionalWorkCenterRoute.js";
const JOB = "7e742dc1-e2a2-49c6-a493-11e351c80d54", DRAFT = "7a02ee20-7f32-48eb-96dc-a3217bc5dcda";
const context = captureAskMeetroContext(`workCenter?jobId=${JOB}&stage=work`);

for (const instruction of ["Why might this outlet have no power?", "How do I schedule a visit?", "Explain this Quote.", "Help me troubleshoot this outlet."]) test(`clause-head guidance remains informational: ${instruction}`, () => {
  assert.equal(isAskMeetroInformationRequest(instruction), true);
  assert.equal(isAskMeetroChangeRequest(instruction), false);
  assert.deepEqual(planAskMeetroActions(instruction, { context, role: "business" }), []);
});

for (const [instruction, kind] of [
  ["Update this invoice with what the customer paid.", "INVOICE"],
  ["Schedule this job how we discussed.", "SCHEDULE"],
  ["Record what the customer paid on this exact Invoice.", "PAYMENT"],
  ["Update this invoice to explain the additional labor.", "INVOICE"],
  ["Update this invoice with why the customer paid less.", "INVOICE"],
  ["Update this invoice with whether the customer paid.", "INVOICE"],
]) test(`embedded question words preserve exact operational review: ${instruction}`, async () => {
  assert.equal(isAskMeetroInformationRequest(instruction), false);
  assert.equal(isAskMeetroChangeRequest(instruction), true);
  const actions = await resolveAskMeetroActions(instruction, { context, role: "business", authFetchImpl: () => assert.fail("planning must not call backend") });
  assert.deepEqual(actions.map((action) => action.kind), [kind]);
  assert.equal(actions[0].status, "PROPOSED");
  assert.equal(actions[0].route, askMeetroRecordRoute(context, kind, "business"));
  for (const missing of [{}, { page: "workCenter" }, { ...context, blocked: true }]) {
    assert.deepEqual(planAskMeetroActions(instruction, { context: missing, role: "business" }), []);
  }
});

for (const instruction of [
  "Explain this Quote. Update this invoice with what the customer paid.",
  "Update this invoice and explain what the customer paid.",
  "Schedule this job, then explain how to prepare.",
  "Why is the outlet broken? Complete this job.",
  "Complete this job; help me troubleshoot the outlet.",
  "Record what the customer paid on this exact Invoice but explain why it is overdue.",
  "Create invoice from Quote Q0000049 and explain the work.",
  "Explain this Quote and create invoice from Quote Q0000049.",
  "New Quote. How do I schedule a visit?",
  "Update this invoice, can you explain the amount?",
]) test(`mixed intent is held without lookup or partial proposals: ${instruction}`, async () => {
  assert.equal(isAskMeetroInformationRequest(instruction), false, "mixed intent is distinct from pure guidance");
  assert.equal(isAskMeetroChangeRequest(instruction), false);
  for (const record of [{}, context]) {
    const actions = await resolveAskMeetroActions(instruction, { context: record, role: "business", listDocuments: () => assert.fail("must not look up partial mixed request"), authFetchImpl: () => assert.fail("must not call backend") });
    assert.deepEqual(actions, []);
    assert.match(askMeetroReply(actions, instruction), /have not answered the question or proposed the change/);
  }
});
function completionReview(version = 0) { return { contractVersion: 1, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: version, state: "ACTIVE", eligible: true, canComplete: true, reasons: [], work: { workstreamCount: 2, completedWorkstreamCount: 2, workItemCount: 4, completedWorkItemCount: 4 }, outstanding: { workstreams: 0, workItems: 0, obligations: 0, findings: 0 }, customerUpdates: { count: 2, status: "UP_TO_DATE" }, completedAt: null }; }
function completion() { return { contractVersion: 1, id: DRAFT, jobId: JOB, requestId: 14, relationshipId: 22, currentVersion: 1, status: "COMPLETED", completedAt: "2026-09-08T14:00:00.000Z", summary: { workstreamCount: 2, workItemCount: 4, customerUpdateCount: 2 }, nextAction: { code: "READY_TO_INVOICE", label: "Ready to Invoice" } }; }

test("context allowlist captures exact record pointers and strips claimed lifecycle authority", () => {
  const result = captureAskMeetroContext(`quoteBuilder?draftId=${DRAFT}`, { label: "Window repair", customerName: "Wrong inferred name", canApprove: true, paid: true });
  assert.deepEqual(result, { page: "quoteBuilder", label: "Window repair", draftId: DRAFT });
  assert.equal(captureAskMeetroContext(`workCenter?jobId=bad`).blocked, true);
  assert.equal(captureAskMeetroContext(`workCenter?jobId=${JOB}&jobId=${JOB}`).blocked, true);
  assert.equal(captureAskMeetroContext(`workCenter?jobId=${JOB}`, { jobId: DRAFT }).blocked, true);
  assert.equal(captureAskMeetroContext(`unknown?jobId=${JOB}`).blocked, true);
});
for (const [page, key, id] of [["quoteBuilder", "draftId", DRAFT], ["invoiceBuilder", "invoiceId", DRAFT], ["workCenter", "jobId", JOB], ["schedule", "visitId", DRAFT], ["businessLeads", "requestId", "14"], ["conversationThread", "conversationId", "340"], ["customerRelationshipsCenter", "businessContactId", DRAFT]]) test(`bounded ${page} context carries ${key}`, () => {
  assert.equal(captureAskMeetroContext(`${page}?${key}=${id}`)[key], id);
});
test("multi-action language proposes three reviews without asserting approval/payment/schedule", () => {
  const actions = planAskMeetroActions("Record customer approval of the kitchen quote and record the $1,500 deposit paid today. Schedule the job for next Friday morning.", { context, role: "business" });
  assert.deepEqual(actions.map((action) => action.kind), ["QUOTE_APPROVAL", "DEPOSIT", "SCHEDULE"]);
  assert.ok(actions.every((action) => action.status === "PROPOSED"));
  assert.equal(parseProfessionalWorkCenterRoute(actions[1].route).stage, "deposit");
  assert.equal(parseProfessionalWorkCenterRoute(actions[2].route).stage, "schedule");
});
test("standalone Quote precedence and exact contextual continuation preserve frozen authority", () => {
  assert.equal(planAskMeetroActions("New Quote", { context, role: "business" })[0].route, "quoteBuilder?new=1");
  assert.deepEqual(planAskMeetroActions("Create a quote for this Job", { role: "business" }), []);
  assert.equal(planAskMeetroActions("Create a quote for this Job", { context, role: "business" })[0].route, `quoteBuilder?jobId=${JOB}`);
  assert.equal(planAskMeetroActions("Show new leads", { role: "personal" }).length, 0);
  assert.equal(askMeetroRecordRoute({ ...context, blocked: true }, "JOB", "business"), "");
});
test("real canonical completion adapter requires review, confirmation, exact current version and receipt evidence", async () => {
  const calls = [];
  const options = { role: "business", authFetchImpl: async (path, request) => { calls.push({ path, ...request }); return { response: { ok: true }, data: { success: true, ...(request.method === "POST" ? { completion: completion() } : { completionReview: completionReview() }) } }; } };
  const action = planAskMeetroActions("Mark this job as completed", { context, role: "business" })[0];
  const prepared = await reviewAskMeetroCompletion(action, options);
  assert.ok(calls.every((call) => call.method === "GET"));
  await assert.rejects(applyAskMeetroCompletion(prepared, options), /confirmation/);
  const receipt = await applyAskMeetroCompletion(prepared, { ...options, confirmed: true });
  assert.deepEqual(JSON.parse(calls.at(-1).body), { expectedVersion: 0 });
  assert.equal(calls.at(-1).headers["Idempotency-Key"], prepared.idempotencyKey);
  assert.equal(receipt.evidenceId, DRAFT); assert.equal(receipt.recordId, JOB);
  assert.equal(parseProfessionalWorkCenterRoute(receipt.route).jobId, JOB);
});
for (const failure of ["stale", "ineligible", "wrong-job", "malformed", "forbidden"]) test(`completion fails closed on ${failure}, without a receipt or mutation`, async () => {
  const action = planAskMeetroActions("Complete this job", { context, role: "business" })[0];
  const calls = []; let changed = false;
  const options = { role: "business", authFetchImpl: async (_path, request) => {
    calls.push(request.method); const review = completionReview(changed && failure === "stale" ? 1 : 0);
    if (changed && failure === "ineligible") { review.eligible = false; review.canComplete = false; }
    if (changed && failure === "wrong-job") review.jobId = DRAFT;
    if (changed && failure === "malformed") review.inventedAuthority = true;
    return { response: { ok: !(changed && failure === "forbidden"), status: 403 }, data: { success: true, completionReview: review } };
  } };
  const prepared = await reviewAskMeetroCompletion(action, options); changed = true;
  await assert.rejects(applyAskMeetroCompletion(prepared, { ...options, confirmed: true }));
  assert.deepEqual(calls, ["GET", "GET"]);
});
test("homeowner and ambiguous job completion never call the API", async () => {
  const authFetchImpl = () => assert.fail("must not call backend");
  for (const role of ["personal", "business"]) await assert.rejects(reviewAskMeetroCompletion({ kind: "COMPLETE_JOB", context: role === "personal" ? context : {} }, { role, authFetchImpl }));
});

test("negative or uncertain completion/payment language never proposes an affirmative change", () => {
  for (const text of ["Do not complete this job", "The job is not completed", "Customer hasn't paid the deposit", "Maybe complete the job", "No completar el trabajo"]) {
    assert.deepEqual(planAskMeetroActions(text, { context, role: "business" }), []);
  }
});
test("multi-action details preserve reported amount and relative date without asserting recorded evidence", () => {
  const actions = planAskMeetroActions("Record customer approval of the quote and record the $1,500 deposit paid today by check. Schedule the job for next Friday morning.", { context, role: "business" });
  assert.deepEqual(actions[1].details.map(({ value }) => value), ["$1,500", "today", "check"]);
  assert.deepEqual(actions[2].details.map(({ value }) => value), ["next Friday", "morning"]);
  assert.ok(actions.every(({ status }) => status === "PROPOSED"));
});
for (const [instruction, expected] of [
  ["Create invoice for the Bob Hamel job quote number Q0000049", "EXACT_QUOTE_TO_INVOICE"],
  ["Create invoice from Quote Q0000049 for Jane Doe", "BLOCKED_MISMATCH"],
]) test(`Ask retains exact Quote authority: ${instruction}`, async () => {
  const { resolveAskMeetroActions } = await import("../src/utils/askMeetro.js");
  const calls = [];
  const actions = await resolveAskMeetroActions(instruction, { context, role: "business", listDocuments: async (options) => {
    calls.push(options); return [{ id: DRAFT, version: 4, documentType: "QUOTE", status: "WORKING_DRAFT", documentNumber: "Q-0000049", content: { customerName: "Bob Hamel" } }];
  } });
  assert.equal(calls.length, 1); assert.equal(calls[0].type, "QUOTE");
  assert.equal(actions.length, 1); assert.equal(actions[0].resolution, expected);
  assert.equal(Boolean(actions[0].route), expected === "EXACT_QUOTE_TO_INVOICE");
  if (actions[0].route) assert.match(actions[0].route, new RegExp(`sourceQuoteDraftId=${DRAFT}`));
});
test("native record links use supported exact route contracts", () => {
  assert.equal(captureAskMeetroContext(`conversationThread?conversationId=${JOB}`).blocked, true);
  assert.equal(askMeetroRecordRoute({ page: "myRequests", requestId: "14" }, "JOB", "personal"), "homeownerRequestDetails?requestId=14");
  assert.equal(askMeetroRecordRoute({ page: "invoiceBuilder", jobId: JOB, invoiceId: DRAFT }, "INVOICE", "business"), `invoiceBuilder?jobId=${JOB}&invoiceId=${DRAFT}`);
  assert.equal(askMeetroRecordRoute({ page: "customerRelationshipsCenter", relationshipId: DRAFT }, "CUSTOMER", "business"), "");
});
for (const failure of ["forbidden", "malformed", "network"]) test(`an unsuccessful completion command (${failure}) never produces a success receipt`, async () => {
  const action = planAskMeetroActions("Complete this job", { context, role: "business" })[0];
  const calls = [];
  const options = { role: "business", authFetchImpl: async (_path, request) => {
    calls.push(request.method);
    if (request.method === "GET") return { response: { ok: true }, data: { success: true, completionReview: completionReview() } };
    if (failure === "network") throw new Error("Network unavailable");
    return { response: { ok: failure !== "forbidden", status: 403 }, data: { success: true, completion: {} } };
  } };
  const prepared = await reviewAskMeetroCompletion(action, options);
  await assert.rejects(applyAskMeetroCompletion(prepared, { ...options, confirmed: true }));
  assert.deepEqual(calls, ["GET", "GET", "POST"]);
});

for (const question of [
  "Need help resolving a non working outlet",
  "Help me troubleshoot an outlet that stopped working",
  "Why might this outlet have no power?",
  "Explain what I should check first",
  "Explain how to complete this job",
  "Help me review this quote",
  "Compare this invoice with the quote",
  "Summarize the work completed for this customer",
  "Check whether the customer paid the deposit",
  "How do I schedule this visit?",
  "Need help with outlet that does not work",
]) test(`informational intent never proposes canonical actions: ${question}`, () => {
  for (const record of [{}, { page: "businessDashboard" }, context, { page: "customerRelationshipsCenter", relationshipId: DRAFT }, { page: "quoteBuilder", draftId: DRAFT }]) {
    assert.deepEqual(planAskMeetroActions(question, { context: record, role: "business" }), []);
  }
});
test("verbs and reported events alone are not instructions to change Meetro state", () => {
  for (const instruction of ["resolve", "fix this", "review", "work on the outlet", "The visit is Friday", "The work is completed", "Customer paid the deposit", "Customer approved the quote"]) {
    assert.deepEqual(planAskMeetroActions(instruction, { context, role: "business" }), []);
  }
});
test("clear record commands require exact authority before a review is proposed", () => {
  for (const instruction of ["Complete this job", "Record the deposit paid today", "Schedule this job Friday", "Create a quote for this Job", "Update this invoice"]) {
    assert.deepEqual(planAskMeetroActions(instruction, { context: { page: "workCenter" }, role: "business" }), []);
    assert.deepEqual(planAskMeetroActions(instruction, { context: { ...context, blocked: true }, role: "business" }), []);
    assert.ok(planAskMeetroActions(instruction, { context, role: "business" }).every((action) => action.route && action.status === "PROPOSED"));
  }
});
test('Send this Invoice proposes the existing owner and never sends from Ask',async()=>{
 const invoiceContext={page:'workCenter',jobId:JOB,invoiceId:DRAFT};
 const actions=await resolveAskMeetroActions('Send this Invoice',{context:invoiceContext,role:'business'});
 assert.equal(actions.length,1);assert.equal(actions[0].kind,'INVOICE');assert.match(actions[0].route,new RegExp(DRAFT));assert.equal(actions[0].status,'PROPOSED');
 assert.deepEqual(planAskMeetroActions('Send this Invoice',{context:{},role:'business'}),[]);
});
