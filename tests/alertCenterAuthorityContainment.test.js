import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notificationsSource = readFileSync(
  new URL("../src/pages/Notifications.jsx", import.meta.url),
  "utf8"
);
const presentationSource = readFileSync(
  new URL("../src/utils/alertPresentation.js", import.meta.url),
  "utf8"
);
const controllerSource = readFileSync(
  new URL("../src/utils/alertCenterController.js", import.meta.url),
  "utf8"
);
const combinedSource = `${notificationsSource}\n${presentationSource}\n${controllerSource}`;

test("Alert Center has no legacy notification or direct transport authority", () => {
  for (const forbidden of [
    /utils\/notifications/,
    /utils\/meetroNotifications/,
    /notificationCenter/,
    /conversationUnread/,
    /workflowDependencyAlerts/,
    /authFetch/,
    /axios/,
    /fetch\s*\(/,
  ]) {
    assert.doesNotMatch(combinedSource, forbidden);
  }
  assert.match(notificationsSource, /from "\.\.\/utils\/alertApi"/);
  assert.match(presentationSource, /normalizeCanonicalAlertDestination/);
});

test("Alert Center creates no browser persistence, polling, or coordinator ownership", () => {
  for (const forbidden of [
    /localStorage/,
    /sessionStorage/,
    /indexedDB/,
    /setInterval/,
    /setTimeout/,
    /requestAnimationFrame/,
    /addEventListener/,
    /visibilitychange/,
    /storage event/i,
    /subscribeAlertCounts/,
    /setAlertCountIdentity/,
    /resetAlertCounts/,
  ]) {
    assert.doesNotMatch(combinedSource, forbidden);
  }
  assert.match(notificationsSource, /refreshAlertCounts/);
});

test("alert read, dismiss, and read-all never mutate conversation read state", () => {
  assert.match(notificationsSource, /markAlertRead\(alert\.id/);
  assert.match(notificationsSource, /dismissAlert\(alert\.id/);
  assert.match(notificationsSource, /markAllAlertsRead\(\{ setPage \}\)/);
  assert.doesNotMatch(combinedSource, /markConversationRead|conversationUnread|\/conversations\/.*\/read/);
  assert.doesNotMatch(combinedSource, /resolveConversation|resolvedAt\s*=|readAt\s*=/);
});

test("only governed canonical Alert destinations may navigate", () => {
  assert.doesNotMatch(notificationsSource, /window\.location|location\.hash|history\.|navigate\(/);
  assert.doesNotMatch(notificationsSource, /requestId|emergencyRequestId|relationshipId|sourceEntityId|evaluationId|businessProfileId|reviewId/);
  assert.match(notificationsSource, /getAlertDestinationActionTarget/);
  assert.match(notificationsSource, /onOpenDestination\(destinationTarget\.route\)/);
  assert.match(notificationsSource, /onOpenDestination=\{\(route\) => setPage\(route\)\}/);
  assert.doesNotMatch(notificationsSource, /setPage\("conversationThread"\)|conversationThread\?conversationId=/);
  assert.match(notificationsSource, /destinationKey/);
  assert.match(presentationSource, /alertCenterDestinationLater/);
  assert.match(presentationSource, /alertCenterDestinationUnavailable/);
  assert.match(presentationSource, /normalized\?\.type === "conversation"/);
  assert.match(presentationSource, /returnPage: "notifications"/);
  assert.match(presentationSource, /preferCommunicationCenterShell: true/);
});

test("recipient identity, alert counts, and canonical ordering remain backend-owned", () => {
  assert.doesNotMatch(combinedSource, /recipientUserId|recipient identity|dedupeKey|sourceId|sourceType/);
  assert.doesNotMatch(notificationsSource, /fetchAlertCounts|\.reduce\(|\.sort\(|\.filter\(/);
  assert.doesNotMatch(notificationsSource, /Date\.now|new Date\(/);
  assert.match(notificationsSource, /snapshot\.alerts\.map/);
  assert.match(controllerSource, /alerts: \[\.\.\.snapshot\.alerts, \.\.\.response\.alerts\]/);
});

test("canonical mutations wait for confirmation and refetch instead of optimistically editing", () => {
  assert.match(notificationsSource, /await markAlertRead/);
  assert.match(notificationsSource, /await dismissAlert/);
  assert.match(notificationsSource, /await markAllAlertsRead/);
  assert.match(notificationsSource, /await controller\.refresh\(\)/);
  assert.match(controllerSource, /preserveConfirmed: Boolean\(snapshot\)/);
  assert.doesNotMatch(notificationsSource, /splice\(|filter\(.*alert|isRead:\s*true|lifecycle:\s*"dismissed"/s);
});

test("selected view and snapshots stay page-local and are invalidated safely", () => {
  assert.match(notificationsSource, /createAlertCenterInitialState/);
  assert.match(notificationsSource, /controllerRef/);
  assert.match(controllerSource, /let generation = 0/);
  assert.match(controllerSource, /let snapshot = null/);
  assert.match(notificationsSource, /mountedRef/);
  assert.match(notificationsSource, /mutationTokensRef/);
  assert.match(notificationsSource, /readAllTokenRef/);
  assert.doesNotMatch(presentationSource, /let\s+.*snapshot|var\s+.*snapshot|const\s+.*snapshot/);
});
