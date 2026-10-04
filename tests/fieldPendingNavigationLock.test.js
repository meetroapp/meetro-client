import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isFieldCustomerNavigationLocked } from "../src/utils/fieldCustomerPendingSend.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const shellSource = readFileSync("src/components/EmployeeShell.jsx", "utf8");

test("only the pre-send countdown locks normal employee navigation", () => {
  assert.equal(isFieldCustomerNavigationLocked({ phase: "countdown" }), true);
  assert.equal(isFieldCustomerNavigationLocked({ phase: "sending" }), false);
  assert.equal(isFieldCustomerNavigationLocked(null), false);
  assert.equal(isFieldCustomerNavigationLocked({ phase: "restored" }), false);
});

test("countdown lock reaches both desktop and mobile EmployeeShell navigation", () => {
  assert.match(portalSource, /navigationLocked=\{navigationLocked\}/);
  assert.match(portalSource, /onNavigationLockChange=\{setNavigationLocked\}/);
  assert.match(portalSource, /isFieldCustomerNavigationLocked\(pendingCustomerSend\)/);
  assert.equal((shellSource.match(/navigationLocked=\{navigationLocked\}/g) || []).length, 2);
  assert.match(shellSource, /mobile[\s\S]*navigationLocked=\{navigationLocked\}/);
  assert.match(shellSource, /disabled=\{navigationLocked\}/);
  assert.match(shellSource, /aria-disabled=\{navigationLocked\}/);
  assert.match(shellSource, /employee-navigation-lock-reason/);
});

test("normal in-app navigation cannot call setPage during the countdown", () => {
  const navigationButton = shellSource.slice(
    shellSource.indexOf("<button", shellSource.indexOf("navigation.map")),
    shellSource.indexOf("</button>", shellSource.indexOf("navigation.map"))
  );
  assert.match(navigationButton, /disabled=\{navigationLocked\}/);
  assert.match(navigationButton, /!navigationLocked && setPage\(routeFor\(item, membership\)\)/);
});

test("Undo remains the explicit countdown cancellation action", () => {
  const undoBlock = portalSource.slice(
    portalSource.indexOf("function undoPendingCustomerMessage"),
    portalSource.indexOf("const composerDisabled")
  );
  assert.match(undoBlock, /pending\.phase !== "countdown"/);
  assert.match(undoBlock, /pendingCustomerController\.current\?\.cancel\(\)/);
  assert.match(undoBlock, /setPendingCustomerSend\(null\)/);
  assert.match(undoBlock, /pending\.command\.message/);
});

test("navigation unlocks when POST starts and remains unlocked after success, Undo, or restoration", () => {
  const deliveryBlock = portalSource.slice(
    portalSource.indexOf("async function deliverPendingCustomerMessage"),
    portalSource.indexOf("function submitCustomerMessage")
  );
  assert.match(deliveryBlock, /phase: "sending"/);
  assert.match(deliveryBlock, /captured\.message/);
  assert.match(deliveryBlock, /captured\.idempotencyKey/);
  assert.match(deliveryBlock, /setPendingCustomerSend\(null\)/);
  assert.match(deliveryBlock, /fieldMessageRestored/);

  const lockEffect = portalSource.slice(
    portalSource.indexOf("isFieldCustomerNavigationLocked(pendingCustomerSend)"),
    portalSource.indexOf("keepLatestMessageVisible.current = true")
  );
  assert.match(lockEffect, /onNavigationLockChange\?\.\(locked\)/);
  assert.match(lockEffect, /onNavigationLockChange\?\.\(false\)/);
});

test("unmount cancellation remains defensive rather than a reachable navigation action", () => {
  assert.match(portalSource, /pendingCustomerController\.current\?\.cancel\(\)/);
  assert.doesNotMatch(shellSource, /window\.confirm|alert\(/);
});
