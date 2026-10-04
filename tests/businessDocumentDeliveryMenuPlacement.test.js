import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBusinessDocumentDeliveryMenuPlacement,
} from "../src/utils/businessDocumentDeliveryMenuPlacement.js";

test("delivery menu opens downward when the visible pane has enough room", () => {
  assert.equal(
    resolveBusinessDocumentDeliveryMenuPlacement({
      triggerRect: {
        top: 400,
        bottom: 442,
      },
      menuHeight: 132,
      boundaryRect: {
        top: 180,
        bottom: 760,
      },
      gap: 4,
    }),
    "down"
  );
});

test("delivery menu opens upward when downward placement would leave the visible pane", () => {
  assert.equal(
    resolveBusinessDocumentDeliveryMenuPlacement({
      triggerRect: {
        top: 700,
        bottom: 742,
      },
      menuHeight: 132,
      boundaryRect: {
        top: 180,
        bottom: 760,
      },
      gap: 4,
    }),
    "up"
  );
});

test("delivery menu chooses the side with more usable space when neither side fully fits", () => {
  assert.equal(
    resolveBusinessDocumentDeliveryMenuPlacement({
      triggerRect: {
        top: 520,
        bottom: 562,
      },
      menuHeight: 300,
      boundaryRect: {
        top: 400,
        bottom: 700,
      },
      gap: 4,
    }),
    "down"
  );

  assert.equal(
    resolveBusinessDocumentDeliveryMenuPlacement({
      triggerRect: {
        top: 540,
        bottom: 582,
      },
      menuHeight: 300,
      boundaryRect: {
        top: 200,
        bottom: 660,
      },
      gap: 4,
    }),
    "up"
  );
});

test("delivery menu fails safely to downward placement when geometry is unavailable", () => {
  assert.equal(
    resolveBusinessDocumentDeliveryMenuPlacement({
      triggerRect: null,
      menuHeight: 0,
      boundaryRect: null,
    }),
    "down"
  );
});
