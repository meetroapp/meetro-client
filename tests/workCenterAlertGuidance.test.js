import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL(
    "../src/pages/ContractorDashboard.jsx",
    import.meta.url
  ),
  "utf8"
);

const workspace = readFileSync(
  new URL(
    "../src/components/WorkCenterWorkspaceSystem.jsx",
    import.meta.url
  ),
  "utf8"
);

test("Business Current Jobs surface exact canonical Alert counts", () => {
  assert.match(
    dashboard,
    /getWorkCenterJobAttention/
  );

  assert.match(
    dashboard,
    /jobAlertCount/
  );

  assert.match(
    dashboard,
    /<WorkCenterAttentionBadge[\s\S]*count=\{jobAlertCount\}/
  );
});

test("canonical Job panels expose owned unread lifecycle counts", () => {
  for (const marker of [
    "evaluationAlertCount",
    "quoteAlertPanelCount",
    "depositSchedulingAlertCount",
    "workPlanAlertCount",
    "completionInvoiceAlertCount",
  ]) {
    assert.match(
      dashboard,
      new RegExp(marker)
    );
  }

  assert.match(
    dashboard,
    /id="canonical-job-evaluation"[\s\S]{0,220}attentionCount=\{evaluationAlertCount\}/
  );

  assert.match(
    dashboard,
    /id="canonical-job-quotes"[\s\S]{0,220}attentionCount=\{quoteAlertPanelCount\}/
  );

  assert.match(
    dashboard,
    /id="canonical-job-deposit-scheduling"[\s\S]{0,240}attentionCount=\{depositSchedulingAlertCount\}/
  );

  assert.match(
    dashboard,
    /id="canonical-job-work-plan"[\s\S]{0,220}attentionCount=\{workPlanAlertCount\}/
  );

  assert.match(
    dashboard,
    /id="canonical-job-completion-invoice"[\s\S]{0,240}attentionCount=\{completionInvoiceAlertCount\}/
  );
});

test("Alert stage is part of exact Work Center route application", () => {
  assert.match(
    dashboard,
    /current\?\.stage === next\?\.stage/
  );

  assert.match(
    dashboard,
    /setSelectedWorkCenterAlertStage\([\s\S]{0,80}target\.stage/
  );

  assert.match(
    dashboard,
    /getBusinessWorkCenterPanelId\([\s\S]{0,100}selectedWorkCenterAlertStage/
  );

  assert.match(
    dashboard,
    /data-work-center-accordion/
  );
});

test("shared accordion renders attention separately from lifecycle status", () => {
  assert.match(
    workspace,
    /export function WorkCenterAttentionBadge/
  );

  assert.match(
    workspace,
    /attentionCount = 0/
  );

  assert.match(
    workspace,
    /<WorkCenterAttentionBadge count=\{attentionCount\}/
  );
});
