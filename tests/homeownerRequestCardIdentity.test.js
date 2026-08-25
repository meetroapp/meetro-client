import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getHomeownerRequestCardId,
  resolveHomeownerRequestById,
} from "../src/utils/homeownerRequestCardIdentity.js";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);
const modificationPanelSource = readFileSync(
  new URL("../src/components/HomeownerRequestModificationPanel.jsx", import.meta.url),
  "utf8"
);

const requests = [
  { requestId: "request-a", title: "Plumbing Repair", detail: "A detail" },
  { requestId: "request-b", title: "Plumbing Repair", detail: "B detail" },
  { requestId: "request-c", title: "Roof Repair", detail: "C detail" },
];

test("duplicate titles resolve independently by canonical request ID", () => {
  const selectedRequestId = "request-b";
  const updatedRequests = [
    { requestId: "request-a2", title: "Plumbing Repair", detail: "A2 detail" },
    ...requests,
  ];

  assert.equal(resolveHomeownerRequestById(updatedRequests, selectedRequestId).detail, "B detail");
  assert.equal(resolveHomeownerRequestById(updatedRequests, "request-a").detail, "A detail");
  assert.equal(resolveHomeownerRequestById(updatedRequests, "missing"), null);
  assert.deepEqual(
    updatedRequests.map(getHomeownerRequestCardId),
    ["request-a2", "request-a", "request-b", "request-c"]
  );
});

test("Homeowner Work Center routes compact cards to a dedicated canonical detail view", () => {
  assert.match(myRequestsSource, /const \[selectedRequestId, setSelectedRequestId\] = useState/);
  assert.match(myRequestsSource, /key=\{requestId\}/);
  assert.doesNotMatch(myRequestsSource, /key=\{requestId \|\| request\.createdAt\}/);
  assert.doesNotMatch(myRequestsSource, /aria-expanded/);
  assert.match(myRequestsSource, /setSelectedRequestId\(requestId\)/);
  assert.match(myRequestsSource, /localStorage\.setItem\(\s*"selectedHomeownerRequestId",\s*requestId/);
  assert.match(myRequestsSource, /setPage\("homeownerRequestDetails"\)/);
  assert.match(appSource, /page === "homeownerRequestDetails"/);
  assert.match(appSource, /<MyRequests setPage=\{setPage\} view="detail" \/>/);
  assert.match(myRequestsSource, /resolveHomeownerRequestById\(requests, selectedRequestId\)/);
  assert.match(myRequestsSource, /data-homeowner-request-detail-unavailable="true"/);
  assert.match(myRequestsSource, /const sortedRequests = \[\.\.\.requests\];/);
  assert.doesNotMatch(myRequestsSource, /sortedRequests = \[\.\.\.requests\]\.sort/);
  assert.match(myRequestsSource, /const list = \{[\s\S]*alignItems: "start"/);
});

test("ordinary cards remain compact while full sections render only in detail mode", () => {
  assert.match(myRequestsSource, /\{!isDetailView && \(\s*<button[\s\S]*canonicalPresentation\?\.ctaLabel/);
  assert.match(myRequestsSource, /\{showsDedicatedDetail && \(\s*<div[\s\S]*data-homeowner-request-details-id/);
  assert.match(myRequestsSource, /const showsDedicatedDetail =[\s\S]*isDetailView && requestId === selectedRequestId/);
  assert.match(myRequestsSource, /<HomeownerWorkflowHub/);
  assert.match(myRequestsSource, /<HomeownerRequestModificationPanel/);
  assert.match(myRequestsSource, /<PhotoStrip/);
  assert.match(myRequestsSource, /<HomeownerProfessionalResponseReview/);
  assert.doesNotMatch(myRequestsSource, /Selected request|Solicitud seleccionada/);
});

test("detail navigation, edit containment, cancellation, and Emergency routes stay explicit", () => {
  assert.match(myRequestsSource, /isDetailView \? \(\) => setPage\("myRequests"\)/);
  assert.match(modificationPanelSource, /actions\.editRequest/);
  assert.match(modificationPanelSource, /data-homeowner-modification-state=\{loadState\}/);
  assert.doesNotMatch(myRequestsSource, /Edit Request unavailable/);
  assert.match(myRequestsSource, /`\/posts\/\$\{encodeURIComponent\(pendingCancelId\)\}\/cancel`/);
  assert.match(myRequestsSource, /buildEmergencyRequestRoute\(/);
  assert.match(myRequestsSource, /!isDetailView && emergencyRequestStatus/);
});
