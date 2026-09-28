import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildEmergencyFollowUpRequestRoute as build, readEmergencyFollowUpRequestRoute as read } from "../src/utils/emergencyFollowUpRequestRoute.js";
import { createEmergencyFollowUpJobRequest as create, EMERGENCY_API_ENDPOINTS } from "../src/utils/emergencyApi.js";
import { buildJobRequestDraftCanonicalPayload, createJobRequestDraft } from "../src/utils/jobRequestDraft.js";

const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const canonical = (replayed = false) => ({ response: { ok: true, status: replayed ? 200 : 201 }, data: {
  success: true, code: `EMERGENCY_FOLLOW_UP_JOB_REQUEST_${replayed ? "REPLAYED" : "CREATED"}`,
  replayed, emergencyRequestId: 41, emergencyJobId: uuid, linkageId: uuid, post: { id: 91, title: "New scope" }, reportedConcern: null,
} });
const invoke = (result, options = {}) => create(41, { title: "New scope" }, { idempotencyKey: "intent", authFetchImpl: async () => result, ...options });

test("route contains only presentation origin and exact positive Emergency ID", () => {
  assert.equal(build({ emergencyRequestId: 41, professionalId: 7, address: "private" }), "upload?requestOrigin=emergency_follow_up&emergencyRequestId=41");
  assert.deepEqual(read(`#${build({ emergencyRequestId: 41 })}`), { active: true, valid: true, emergencyRequestId: 41 });
  for (const id of [null, 0, -1, 1.2, "01", "1e2", "1/2", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => build({ emergencyRequestId: id }));
    assert.equal(read(`#upload?requestOrigin=emergency_follow_up&emergencyRequestId=${id}`).valid, false);
  }
  assert.equal(read("#upload").active, false);
  assert.equal(read("#myRequests?requestOrigin=emergency_follow_up&emergencyRequestId=41").active, false);
  assert.equal(read("#upload?requestOrigin=existing_customer_request&sourceMeetroRelationshipId=" + uuid).active, false);
});
test("mixed modes and duplicate parameters fail closed in either order", () => {
  for (const query of [
    "requestOrigin=existing_customer_request&requestOrigin=emergency_follow_up&emergencyRequestId=41",
    "requestOrigin=emergency_follow_up&requestOrigin=existing_customer_request&emergencyRequestId=41",
    "requestOrigin=emergency_follow_up&emergencyRequestId=41&sourceMeetroRelationshipId=" + uuid,
    "requestOrigin=existing_customer_request&emergencyRequestId=41",
    "requestOrigin=emergency_follow_up&emergencyRequestId=41&emergencyRequestId=42",
    "emergencyRequestId=41",
  ]) assert.equal(read("#upload?" + query).valid, false, query);
});
test("authenticated transport uses exact path, unchanged shared payload and intent", async () => {
  const payload = buildJobRequestDraftCanonicalPayload(createJobRequestDraft());
  const before = structuredClone(payload);
  const setPage = () => {};
  const result = await create(41, payload, { idempotencyKey: "same-intent", setPage, authFetchImpl: async (path, options, navigation) => {
    assert.equal(path, EMERGENCY_API_ENDPOINTS.followUpJobRequest(41));
    assert.equal(path, "/emergency-requests/41/follow-up-job-request");
    assert.equal(options.method, "POST"); assert.equal(options.cache, "no-store");
    assert.deepEqual(options.headers, { "Idempotency-Key": "same-intent" });
    assert.equal(navigation, setPage); assert.deepEqual(JSON.parse(options.body), JSON.parse(JSON.stringify(before)));
    return canonical();
  }});
  assert.deepEqual(payload, before); assert.equal(result.ok, true); assert.equal(result.post.id, 91);
  assert.equal(result.emergencyRequestId, 41); assert.equal(result.emergencyJobId, uuid); assert.equal(result.linkageId, uuid); assert.equal(result.reportedConcern, null);
});
test("created and replay responses normalize as canonical success", async () => {
  for (const replayed of [false, true]) {
    const result = await invoke(canonical(replayed));
    assert.equal(result.ok, true); assert.equal(result.replayed, replayed); assert.equal(result.status, replayed ? 200 : 201);
  }
});
test("bad response identity never becomes success and retains media for safe retry", async () => {
  for (const override of [
    { post: null }, { post: {} }, { post: [] }, { post: { id: "not-an-id" } },
    { emergencyRequestId: 42 }, { emergencyRequestId: null },
    { emergencyJobId: "bad" }, { linkageId: "bad" }, { success: false },
    { code: "JOB_REQUEST_CREATED" }, { replayed: true },
  ]) {
    const response = canonical(); Object.assign(response.data, override);
    const result = await invoke(response); assert.equal(result.ok, false); assert.equal(result.failureType, "ambiguous");
  }
  assert.equal((await invoke({})).ok, false);
});
test("invalid request or absent intent is rejected before transport", async () => {
  const authFetchImpl = () => { throw new Error("Must not call transport"); };
  for (const id of [0, -1, "invalid"]) assert.equal((await create(id, {}, { idempotencyKey: "key", authFetchImpl })).status, 400);
  for (const idempotencyKey of [undefined, "", "  "]) assert.equal((await create(41, {}, { idempotencyKey, authFetchImpl })).status, 400);
});
test("409 not ready preserves canonical server message and fails closed", async () => {
  const message = "The Emergency must be completed before a Standard follow-up Job Request is created.";
  const result = await invoke({ response: { ok: false, status: 409 }, data: { success: false, code: "EMERGENCY_FOLLOW_UP_NOT_READY", message } });
  assert.equal(result.ok, false); assert.equal(result.message, message); assert.equal(result.code, "EMERGENCY_FOLLOW_UP_NOT_READY"); assert.equal(result.failureType, "definitive");
});
test("network/server ambiguity and idempotency conflict preserve retry state", async () => {
  const network = await invoke(null, { authFetchImpl: async () => { throw new Error("network"); } });
  assert.equal(network.failureType, "ambiguous");
  assert.equal((await invoke({ response: { ok: false, status: 503 }, data: {} })).failureType, "ambiguous");
  assert.equal((await invoke({ response: { ok: false, status: 409 }, data: { code: "JOB_REQUEST_IDEMPOTENCY_CONFLICT" } })).failureType, "conflict");
});
test("same intent reuses exact scoped command; fresh intents and Emergency IDs stay independent", async () => {
  const calls = [];
  const authFetchImpl = async (path, options) => { calls.push([path, options.headers["Idempotency-Key"]]); const response = canonical(calls.length === 2); response.data.emergencyRequestId = Number(path.split("/")[2]); return response; };
  for (const [id, key] of [[41, "one"], [41, "one"], [41, "two"], [42, "one"]]) {
    assert.equal((await create(id, {}, { idempotencyKey: key, authFetchImpl })).ok, true);
  }
  assert.deepEqual(calls[0], calls[1]); assert.notDeepEqual(calls[0], calls[2]); assert.notDeepEqual(calls[0], calls[3]);
});
test("integration reuses owned canonical screen, shared payload, cleanup and standard detail handoff", () => {
  const upload = readFileSync(new URL("../src/pages/Upload.jsx", import.meta.url), "utf8");
  const emergency = readFileSync(new URL("../src/pages/EmergencyRequest.jsx", import.meta.url), "utf8");
  assert.match(emergency, /selectEmergencyRequestForRoute/);
  assert.match(emergency, /<EmergencyFollowUpAction key=\{canonicalRequest.id\} emergencyRequest=\{canonicalRequest\}/);
  assert.match(upload, /buildJobRequestDraftCanonicalPayload\(draft/);
  assert.match(upload, /applyExistingCustomerRequestAuthority\(/);
  assert.match(upload, /: await authFetch\(\s*"\/posts"/);
  assert.match(upload, /setPage\("homeownerRequestDetails"\)/);
  for (const name of ["emergencyFollowUpRequestRoute.js"]) {
    const code = readFileSync(new URL("../src/utils/" + name, import.meta.url), "utf8");
    assert.doesNotMatch(code, /localStorage|sessionStorage|target_contractor_profile_id|target_professional_user_id/);
  }
  const action = readFileSync(new URL("../src/components/EmergencyFollowUpAction.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(action, /authFetch|createEmergencyFollowUpJobRequest|localStorage|sessionStorage/);
});

test("authentication denial remains a failure with the canonical message", async () => {
  const result = await invoke({ response: { ok: false, status: 401 }, data: { success: false, message: "Please log in again." } });
  assert.equal(result.ok, false); assert.equal(result.status, 401); assert.equal(result.message, "Please log in again.");
});
