import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getHomeownerRequestCardId,
  reconcileExpandedHomeownerRequestId,
  resolveHomeownerRequestById,
  toggleExpandedHomeownerRequestId,
} from "../src/utils/homeownerRequestCardIdentity.js";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

const requests = [
  { requestId: "request-a", title: "Plumbing Repair", detail: "A detail" },
  { requestId: "request-b", title: "Plumbing Repair", detail: "B detail" },
  { requestId: "request-c", title: "Roof Repair", detail: "C detail" },
];

function expansionState(records, expandedRequestId) {
  return records.map((request) => ({
    requestId: getHomeownerRequestCardId(request),
    expanded: getHomeownerRequestCardId(request) === expandedRequestId,
  }));
}

test("expansion is isolated to the selected canonical request identity", () => {
  const expandedRequestId = toggleExpandedHomeownerRequestId(null, "request-b");

  assert.deepEqual(expansionState(requests, expandedRequestId), [
    { requestId: "request-a", expanded: false },
    { requestId: "request-b", expanded: true },
    { requestId: "request-c", expanded: false },
  ]);
  assert.equal(resolveHomeownerRequestById(requests, expandedRequestId).detail, "B detail");
});

test("sequential Review Details selection never transfers details between cards", () => {
  let expandedRequestId = toggleExpandedHomeownerRequestId(null, "request-a");
  assert.equal(resolveHomeownerRequestById(requests, expandedRequestId).detail, "A detail");

  expandedRequestId = toggleExpandedHomeownerRequestId(
    expandedRequestId,
    "request-b"
  );
  assert.equal(resolveHomeownerRequestById(requests, expandedRequestId).detail, "B detail");
  assert.equal(expansionState(requests, expandedRequestId)[0].expanded, false);
});

test("duplicate titles and list insertion preserve canonical expansion identity", () => {
  const expandedRequestId = "request-b";
  const updatedRequests = [
    { requestId: "request-a2", title: "Plumbing Repair", detail: "A2 detail" },
    ...requests,
  ];

  assert.equal(
    reconcileExpandedHomeownerRequestId(updatedRequests, expandedRequestId),
    "request-b"
  );
  assert.equal(resolveHomeownerRequestById(updatedRequests, expandedRequestId).detail, "B detail");
  assert.deepEqual(
    updatedRequests.map(getHomeownerRequestCardId),
    ["request-a2", "request-a", "request-b", "request-c"]
  );
});

test("expansion resets when its canonical request disappears", () => {
  assert.equal(
    reconcileExpandedHomeownerRequestId(
      requests.filter((request) => request.requestId !== "request-b"),
      "request-b"
    ),
    null
  );
});

test("Homeowner Work Center binds keys, details, ARIA state, and grid height by request ID", () => {
  assert.match(myRequestsSource, /const \[expandedRequestId, setExpandedRequestId\] = useState/);
  assert.match(myRequestsSource, /key=\{requestId\}/);
  assert.doesNotMatch(myRequestsSource, /key=\{requestId \|\| request\.createdAt\}/);
  assert.match(myRequestsSource, /aria-expanded=\{isExpanded\}/);
  assert.match(myRequestsSource, /aria-controls=\{detailPanelId\}/);
  assert.match(myRequestsSource, /data-homeowner-request-details-id=\{requestId\}/);
  assert.match(myRequestsSource, /const sortedRequests = \[\.\.\.requests\];/);
  assert.doesNotMatch(myRequestsSource, /sortedRequests = \[\.\.\.requests\]\.sort/);
  assert.match(myRequestsSource, /const list = \{[\s\S]*alignItems: "start"/);
});
