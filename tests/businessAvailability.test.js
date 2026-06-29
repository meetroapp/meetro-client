import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_AVAILABILITY_CHANGED_EVENT,
  BUSINESS_AVAILABILITY_STORAGE_KEY,
  readBusinessAvailability,
  setBusinessAvailability,
} from "../src/utils/businessAvailability.js";

function createMemoryStorage(initialValue = undefined) {
  const values = new Map();
  if (initialValue !== undefined) {
    values.set(BUSINESS_AVAILABILITY_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function createEventTarget() {
  const events = [];
  return {
    events,
    dispatchEvent(event) {
      events.push(event?.type || event);
      return true;
    },
  };
}

test("business availability reads the shared availability truth", () => {
  assert.equal(readBusinessAvailability(createMemoryStorage("true")), true);
  assert.equal(readBusinessAvailability(createMemoryStorage("false")), false);
  assert.equal(readBusinessAvailability(createMemoryStorage()), false);
});

test("business availability write turns availability off and dispatches the shared event", () => {
  const storage = createMemoryStorage("true");
  const eventTarget = createEventTarget();

  const nextValue = setBusinessAvailability(false, { storage, eventTarget });

  assert.equal(nextValue, false);
  assert.equal(storage.getItem(BUSINESS_AVAILABILITY_STORAGE_KEY), "false");
  assert.deepEqual(eventTarget.events, [BUSINESS_AVAILABILITY_CHANGED_EVENT]);
});

test("business availability write turns availability on and dispatches the shared event", () => {
  const storage = createMemoryStorage("false");
  const eventTarget = createEventTarget();

  const nextValue = setBusinessAvailability(true, { storage, eventTarget });

  assert.equal(nextValue, true);
  assert.equal(storage.getItem(BUSINESS_AVAILABILITY_STORAGE_KEY), "true");
  assert.deepEqual(eventTarget.events, [BUSINESS_AVAILABILITY_CHANGED_EVENT]);
});
