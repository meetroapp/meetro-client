import test from "node:test";
import assert from "node:assert/strict";
import {
  getDashboardPageForAccountMode,
  isProfessionalSession,
  setActiveAccountMode,
} from "../src/utils/session.js";

function installStorage() {
  const store = new Map();

  global.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };

  global.window = {
    dispatchEvent: () => true,
  };
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  return store;
}

test("professional can switch to User Account mode without losing professional capability", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "professional");
  localStorage.setItem("userRole", "handyman");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "business");
  localStorage.setItem("meetroWorkCenterTab", "active");

  assert.equal(setActiveAccountMode("personal"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "homeowner");
  assert.equal(localStorage.getItem("userRole"), "homeowner");
  assert.equal(localStorage.getItem("meetroWorkCenterTab"), null);
  assert.equal(isProfessionalSession(), true);
});

test("professional can switch back to business mode after User Account mode", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("userRole", "homeowner");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(setActiveAccountMode("business"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("userRole"), "handyman");
});

test("dashboard route follows active account mode instead of professional capability", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(isProfessionalSession(), true);
  assert.equal(getDashboardPageForAccountMode(), "home");
  assert.equal(getDashboardPageForAccountMode("personal"), "home");
  assert.equal(getDashboardPageForAccountMode("business"), "businessDashboard");
});
