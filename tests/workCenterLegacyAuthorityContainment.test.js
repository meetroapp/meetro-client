import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WORK_CENTER_LEGACY_AUTHORITY_POLICY,
  buildLegacyWorkCenterReferences,
  isLegacyWorkCenterCommandSurfaceContained,
  selectCanonicalWorkCenterTruth,
} from "../src/utils/workCenterLegacyAuthority.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const dashboard = read("src/pages/ContractorDashboard.jsx");
const panel = read("src/components/LegacyWorkCenterReadOnlyPanel.jsx");
const completion = read("src/pages/CompletionSheet.jsx");
const completedDetails = read("src/pages/CompletedJobDetails.jsx");
const jobUpdate = read("src/pages/JobUpdate.jsx");
const changeOrder = read("src/pages/ChangeOrderRequest.jsx");
const quoteRequests = read("src/pages/QuoteRequests.jsx");

test("ordinary legacy command surfaces are release-contained while Pending preserves real lead and Emergency entry", () => {
  for (const surface of [
    "schedule",
    "quotes",
    "active",
    "completed",
    "materials",
    "records",
    "revenue",
  ]) {
    assert.equal(isLegacyWorkCenterCommandSurfaceContained(surface), true, surface);
    assert.match(
      dashboard,
      new RegExp(`activeTab === ["']${surface}["'] && !isLegacyCommandSurfaceContained`)
    );
  }

  assert.equal(isLegacyWorkCenterCommandSurfaceContained("pending"), false);
  assert.match(dashboard, /workCenterLiveEmergencyRequest[\s\S]*acceptEmergencyRequest/);
  assert.match(dashboard, /pendingProjectRequests[\s\S]*openBusinessLeadOpportunityDetail/);
});

test("the contained panel exposes references without mutation controls or false success", () => {
  assert.match(panel, /Read-only/);
  assert.match(panel, /cannot update or override canonical[\s\n ]+lifecycle truth/);
  assert.doesNotMatch(panel, /onAction|onSave|onComplete|onSchedule|onPayment|onInvoice/);
  assert.doesNotMatch(
    panel,
    /Scheduled successfully|Marked paid|Job completed|Change order created|Invoice generated/i
  );
});

test("Pending browser workflow is reference-only and cannot move local state to Active Work", () => {
  const start = dashboard.indexOf('{activeTab === "pending"');
  const end = dashboard.indexOf('{activeTab === "active"', start);
  const pendingSurface = dashboard.slice(start, end);

  assert.match(pendingSurface, /LegacyWorkCenterReadOnlyPanel/);
  assert.doesNotMatch(pendingSurface, /saveActiveWorkSnapshot|saveActiveJobSnapshot/);
  assert.doesNotMatch(pendingSurface, /setItem\("activeWorkStatus"|moveToActiveJob/);
});

test("canonical domain truth wins without inheriting conflicting local status", () => {
  const canonicalQuote = { id: "canonical-quote", status: "ISSUED", totalMinor: 92000 };
  const localQuote = { id: "local-quote", status: "paid", total: 1 };
  const selectedQuote = selectCanonicalWorkCenterTruth({
    canonical: canonicalQuote,
    legacy: localQuote,
  });

  assert.equal(selectedQuote.record, canonicalQuote);
  assert.equal(selectedQuote.authority, "CANONICAL_READ");
  assert.equal(selectedQuote.ignoredLegacyConflict, true);
  assert.equal(selectedQuote.record.status, "ISSUED");
  assert.equal(Object.hasOwn(selectedQuote.record, "paidAt"), false);

  const canonicalWorkstream = { id: "canonical-workstream", state: "ACTIVE" };
  const localActiveWork = { id: "local-work", status: "completed" };
  const selectedWorkstream = selectCanonicalWorkCenterTruth({
    canonical: canonicalWorkstream,
    legacy: localActiveWork,
  });
  assert.equal(selectedWorkstream.record.state, "ACTIVE");
  assert.equal(Object.hasOwn(selectedWorkstream.record, "status"), false);

  const canonicalEvaluation = { id: "canonical-evaluation", observations: "Server truth" };
  const localEvaluation = { id: "local-evaluation", observations: "Browser override" };
  assert.equal(
    selectCanonicalWorkCenterTruth({
      canonical: canonicalEvaluation,
      legacy: localEvaluation,
    }).record.observations,
    "Server truth"
  );
});

test("legacy-only records remain visible without canonical labels or operational status", () => {
  const legacy = { id: "legacy-1", title: "Kitchen sink", status: "paid" };
  const selected = selectCanonicalWorkCenterTruth({ legacy });
  const references = buildLegacyWorkCenterReferences("quotes", [legacy]);

  assert.equal(selected.authority, "LEGACY_COMPATIBILITY");
  assert.equal(selected.readOnly, true);
  assert.deepEqual(references, [
    {
      id: "legacy-1",
      title: "Kitchen sink",
      detail: "",
      authority: "LEGACY_COMPATIBILITY",
      readOnly: true,
      sourceLabel: "Legacy compatibility reference",
    },
  ]);
  assert.equal(Object.hasOwn(references[0], "status"), false);
  assert.doesNotMatch(JSON.stringify(references), /CANONICAL_BACKEND_READ|paid/i);
});

test("legacy Job and History detail return before simulated workflow controls", () => {
  assert.match(
    dashboard,
    /if \(!isCanonicalReadOnlyJob\) \{[\s\S]*LegacyWorkCenterReadOnlyPanel[\s\S]*returnTab[\s\S]*\}\s*const historyEvaluation/
  );
  assert.match(dashboard, /Read-only legacy reference/);
  assert.match(dashboard, /Canonical History remains unavailable/);
});

test("deferred route surfaces remain unavailable and storage-mutation free", () => {
  const routePolicies = [
    [completion, /completionRecordingUnavailableTitle/],
    [completedDetails, /completedJobDetailsUnavailable/],
    [jobUpdate, /jobUpdateUnavailableTitle/],
    [changeOrder, /changeOrderUnavailableTitle/],
  ];

  for (const [source, marker] of routePolicies) {
    assert.match(source, marker);
    assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem)/);
    assert.doesNotMatch(
      source,
      /save[A-Z]|submit[A-Z]|complete[A-Z]|generateInvoice|jsPDF/,
      "route source mutates authority"
    );
  }
});

test("Quote Requests remains an active lead-messaging route without Quote lifecycle authority", () => {
  assert.match(quoteRequests, /authFetch\(\s*"\/contractor-quote-requests"/);
  assert.match(quoteRequests, /authFetch\(\s*"\/messages"/);
  assert.doesNotMatch(
    quoteRequests,
    /(?:quickReply|sendReply):\s*[^,\n]*pageText\.(?:quickReply|sendReply)/
  );
  assert.doesNotMatch(
    quoteRequests,
    /\/quotes|\/authorizations|Record Payment|Schedule Work|Complete Job/
  );
});

test("authority inventory classifies deferred domains and keeps Emergency separate", () => {
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.scheduling.authority, "UNAVAILABLE");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.paymentDeposit.authority, "UNAVAILABLE");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.quote.authority, "READ_ONLY");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.activeWork.authority, "READ_ONLY");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.completion.authority, "UNAVAILABLE");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.history.authority, "READ_ONLY");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.jobUpdate.authority, "UNAVAILABLE");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.changeOrder.authority, "UNAVAILABLE");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.invoicePdf.authority, "UNAVAILABLE");
  assert.equal(WORK_CENTER_LEGACY_AUTHORITY_POLICY.emergency.authority, "SEPARATE");
});
