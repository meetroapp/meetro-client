import assert from "node:assert/strict";
import test from "node:test";

import {
  FIELD_CUSTOMER_UNDO_SECONDS,
  captureFieldCustomerSend,
  startFieldCustomerSendCountdown,
} from "../src/utils/fieldCustomerPendingSend.js";

const identity = Object.freeze({
  jobId: "072c8736-5d97-4253-ba3e-dd1bce281a20",
  businessId: 80,
  assignmentId: "a7c9a660-c087-4af1-b139-8d77f8d69b33",
  message: "  Exact customer update.  ",
  idempotencyKey: "field-customer-message-fixed",
});

function fakeIntervals() {
  let callback = null;
  let cleared = 0;
  return {
    setIntervalImpl(next, milliseconds) {
      assert.equal(milliseconds, 1000);
      callback = next;
      return 41;
    },
    clearIntervalImpl(intervalId) {
      assert.equal(intervalId, 41);
      cleared += 1;
    },
    tick(seconds = 1) {
      for (let index = 0; index < seconds; index += 1) callback?.();
    },
    get cleared() {
      return cleared;
    },
  };
}

test("customer send capture freezes the exact assignment, text, and idempotency identity", () => {
  const captured = captureFieldCustomerSend(identity);
  assert.deepEqual(captured, identity);
  assert.equal(captured.message, "  Exact customer update.  ");
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(captureFieldCustomerSend({ ...identity, message: "   " }), null);
  assert.equal(captureFieldCustomerSend({ ...identity, assignmentId: "" }), null);
});

test("countdown performs no expiry action at nine seconds and expires exactly once at ten", () => {
  const timer = fakeIntervals();
  const pending = captureFieldCustomerSend(identity);
  const ticks = [];
  const expired = [];
  const controller = startFieldCustomerSendCountdown({
    pending,
    onTick: (seconds) => ticks.push(seconds),
    onExpire: (command) => expired.push(command),
    setIntervalImpl: timer.setIntervalImpl,
    clearIntervalImpl: timer.clearIntervalImpl,
  });

  assert.equal(FIELD_CUSTOMER_UNDO_SECONDS, 10);
  assert.deepEqual(ticks, [10]);
  timer.tick(9);
  assert.equal(expired.length, 0);
  assert.equal(ticks.at(-1), 1);
  timer.tick(1);
  assert.deepEqual(expired, [pending]);
  timer.tick(2);
  assert.equal(expired.length, 1);
  assert.equal(controller.isActive(), false);
  assert.equal(timer.cleared, 1);
});

test("Undo cancellation before expiry prevents every expiry action", () => {
  const timer = fakeIntervals();
  const pending = captureFieldCustomerSend(identity);
  let expiryCalls = 0;
  const controller = startFieldCustomerSendCountdown({
    pending,
    onExpire: () => {
      expiryCalls += 1;
    },
    setIntervalImpl: timer.setIntervalImpl,
    clearIntervalImpl: timer.clearIntervalImpl,
  });

  timer.tick(9);
  assert.equal(controller.cancel(), true);
  assert.equal(controller.cancel(), false);
  timer.tick(2);
  assert.equal(expiryCalls, 0);
  assert.equal(timer.cleared, 1);
});
