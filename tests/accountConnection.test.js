import assert from "node:assert/strict";
import test from "node:test";
import {
  getAccountConnectionStateFromAuthResult,
  getAccountConnectionStateFromLoginData,
  getStoredAccountConnectionState,
} from "../src/utils/accountConnection.js";

function createStorage(values = {}) {
  const store = new Map(Object.entries(values));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test("stored account connection requires a current token", () => {
  const state = getStoredAccountConnectionState(createStorage());

  assert.equal(state.connected, false);
  assert.equal(state.reason, "missing_token");
  assert.equal(state.requiresLogin, true);
});

test("inactive stored account blocks connected message access", () => {
  const storage = createStorage({
    token: "token-123",
    user: JSON.stringify({
      id: "user-1",
      email: "william@example.com",
      status: "inactive",
    }),
  });

  const state = getStoredAccountConnectionState(storage);

  assert.equal(state.connected, false);
  assert.equal(state.reason, "account_inactive");
  assert.match(state.message, /active Meetro account/);
});

test("disconnected account flags block connected message access", () => {
  const storage = createStorage({
    token: "token-123",
    user: JSON.stringify({
      id: "user-1",
      account_connected: false,
    }),
  });

  const state = getStoredAccountConnectionState(storage);

  assert.equal(state.connected, false);
  assert.equal(state.reason, "account_disconnected");
  assert.equal(state.requiresLogin, true);
});

test("auth result maps inactive and stale sessions separately", () => {
  assert.equal(
    getAccountConnectionStateFromAuthResult({
      response: { status: 401 },
      data: { code: "token_expired" },
    }).reason,
    "session_stale"
  );

  assert.equal(
    getAccountConnectionStateFromAuthResult({
      response: { status: 403 },
      data: { code: "account_inactive" },
    }).reason,
    "account_inactive"
  );
});

test("active login data remains connected", () => {
  const state = getAccountConnectionStateFromLoginData({
    token: "token-123",
    user: {
      id: "user-1",
      email: "william@example.com",
      status: "active",
      account_connected: true,
    },
  });

  assert.equal(state.connected, true);
  assert.equal(state.reason, "connected");
});
