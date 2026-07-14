import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PERSONAL_PROFILE_ENDPOINT,
  reconcileAuthenticatedUser,
  updatePersonalProfile,
} from "../src/utils/personalProfile.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    snapshot: () => Object.fromEntries(values),
  };
}

test("personal profile sends only the supported username and reconciles confirmed backend identity", async () => {
  const storage = memoryStorage({
    user: JSON.stringify({ id: 1, username: "Before", email: "person@example.test" }),
    userName: "Before",
    userEmail: "person@example.test",
    activeAccountMode: "personal",
  });
  let request;
  const result = await updatePersonalProfile({
    username: "  Confirmed Name  ",
    storage,
    authFetchImpl: async (endpoint, options) => {
      request = { endpoint, options, body: JSON.parse(options.body) };
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "PROFILE_UPDATED",
          user: { id: 1, username: "Confirmed Name", email: "person@example.test", role: "homeowner" },
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(request.endpoint, PERSONAL_PROFILE_ENDPOINT);
  assert.equal(request.options.method, "PATCH");
  assert.deepEqual(request.body, { username: "Confirmed Name" });
  assert.equal("email" in request.body, false);
  assert.equal("phone" in request.body, false);
  assert.equal("userId" in request.body, false);
  assert.equal(storage.getItem("userName"), "Confirmed Name");
  assert.equal(storage.getItem("activeAccountMode"), "personal");
});

test("rejected and malformed profile updates leave displayed identity unchanged", async () => {
  for (const response of [
    { response: { ok: false, status: 400 }, data: { code: "PROFILE_NAME_REQUIRED" } },
    { response: { ok: true, status: 200 }, data: { success: true, code: "PROFILE_UPDATED" } },
    { response: { ok: true, status: 200 }, data: { success: true, code: "UNKNOWN", user: { id: 1, username: "False Success" } } },
  ]) {
    const storage = memoryStorage({ userName: "Before", user: '{"id":1,"username":"Before"}' });
    const before = storage.snapshot();
    const result = await updatePersonalProfile({
      username: "Attempted Name",
      storage,
      authFetchImpl: async () => response,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(storage.snapshot(), before);
  }
});

test("auth me reconciliation replaces stale cached identity only with a canonical user", () => {
  const storage = memoryStorage({ userName: "Stale Name", userEmail: "stale@example.test" });
  const rejected = reconcileAuthenticatedUser(null, storage);
  assert.equal(rejected.ok, false);
  assert.equal(storage.getItem("userName"), "Stale Name");

  const reconciled = reconcileAuthenticatedUser({
    id: 1,
    username: "Backend Name",
    email: "canonical@example.test",
  }, storage);
  assert.equal(reconciled.ok, true);
  assert.equal(storage.getItem("userName"), "Backend Name");
  assert.equal(storage.getItem("userEmail"), "canonical@example.test");
});

test("Profile no longer presents browser-local personal identity as a successful save", () => {
  const source = readFileSync("src/pages/Profile.jsx", "utf8");
  const saveStart = source.indexOf("async function savePersonalInfo");
  const fieldsStart = source.indexOf("function renderPersonalInfoFields", saveStart);
  const saveSource = source.slice(saveStart, fieldsStart);

  assert.match(saveSource, /await updatePersonalProfile/);
  assert.match(source, /readOnly[\s\S]*personalInformationEmailReadOnly/);
  assert.match(source, /personalInformationPhoneUnavailable/);
  assert.doesNotMatch(saveSource, /localStorage|setUser\(\(currentUser/);
  assert.doesNotMatch(saveSource, /nextEmail|nextPhone|homeownerPrivatePhone/);
});
