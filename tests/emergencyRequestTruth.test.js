import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const emergencySource = readFileSync(
  new URL("../src/pages/Emergency.jsx", import.meta.url),
  "utf8"
);
const requestSource = readFileSync(
  new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
  "utf8"
);

test("Emergency entry truthfully states that request delivery is unavailable", () => {
  assert.match(emergencySource, /Requests unavailable/);
  assert.match(emergencySource, /Emergency request delivery is not available right now/);
  assert.match(emergencySource, /disabled\s+aria-disabled="true"/);
  assert.doesNotMatch(emergencySource, /Available now/);
  assert.doesNotMatch(emergencySource, /setPage\("emergencyBusinessSelection"\)/);
});

test("direct Emergency Request route cannot simulate submission or dispatch", () => {
  assert.match(requestSource, /Emergency requests are unavailable/);
  assert.match(requestSource, /cannot send or dispatch emergency requests right now/);
  assert.doesNotMatch(requestSource, /function submitRequest/);
  assert.doesNotMatch(requestSource, /emergencyDispatchStatus/);
  assert.doesNotMatch(requestSource, /activeEmergencyRequestId/);
  assert.doesNotMatch(requestSource, /activeEmergencyRecord/);
  assert.doesNotMatch(requestSource, /createNotification/);
  assert.doesNotMatch(requestSource, /meetro_conversation_registry/);
  assert.doesNotMatch(requestSource, /status:\s*"sent"/);
});

test("unavailable Emergency routes preserve safe navigation", () => {
  assert.match(requestSource, /setPage\("emergency"\)/);
  assert.match(requestSource, /setPage\("home"\)/);
  assert.match(requestSource, /<BottomNav currentPage="emergency" setPage=\{setPage\} \/>/);
});
