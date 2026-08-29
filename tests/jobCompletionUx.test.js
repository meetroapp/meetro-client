import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getJobCompletionCopy, JOB_COMPLETION_LANGUAGES } from "../src/utils/jobCompletionLanguage.js";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const completionReview = source("src/components/ProfessionalCompletionReview.jsx");
const professionalHistory = source("src/components/ProfessionalJobHistoryWorkspace.jsx");
const customerHistory = source("src/components/CustomerCompletionHistory.jsx");
const workPlan = source("src/components/ProfessionalWorkPlanWorkspace.jsx");
const dashboard = source("src/pages/ContractorDashboard.jsx");
const projectDetails = source("src/pages/ProjectDetails.jsx");
const api = source("src/utils/jobCompletionApi.js");

test("legacy Job completion remains server-gated but is not presented as atomic Work completion", () => {
  assert.doesNotMatch(workPlan, /ProfessionalCompletionReview|completeCanonicalJob/);
  assert.match(workPlan, /WORK_LEVEL_AUTHORITY_GAPS/);
  assert.match(workPlan, /Start Work is temporarily unavailable/);
  assert.match(completionReview, /fetchJobCompletionReview/);
  assert.match(completionReview, /review\.canComplete && !confirming/);
  assert.match(completionReview, /role="alertdialog"/);
  assert.match(completionReview, /expectedVersion: state\.review\.currentVersion/);
  assert.match(completionReview, /if \(!commandKeyRef\.current\)[\s\S]*createJobCompletionIdempotencyKey/);
  assert.match(completionReview, /idempotencyKey: commandKeyRef\.current/);
  assert.match(completionReview, /submittingRef\.current/);
  assert.match(completionReview, /await loadReview\(\)/);
  assert.doesNotMatch(completionReview, /localStorage|sessionStorage|quoteStatus|visitStatus|invoiceId|paymentStatus|portfolio/);
});

test("canonical completed jobs leave Current Work and enter server-owned Job History", () => {
  assert.match(dashboard, /job\.liveJob\?\.stage\?\.code === "JOB_COMPLETED"/);
  assert.match(dashboard, /fetchProfessionalJobHistory\(\{ limit: 20/);
  assert.match(dashboard, /professionalJobHistorySource\.history\?\.totalCount/);
  assert.match(dashboard, /<ProfessionalJobHistoryWorkspace/);
  assert.match(dashboard, /onLoadMore=\{loadMoreProfessionalJobHistory\}/);
  assert.match(professionalHistory, /fetchProfessionalJobHistoryDetail/);
  assert.match(professionalHistory, /history\?\.pagination\.nextCursor/);
  assert.doesNotMatch(professionalHistory, /localStorage|sessionStorage|completedProjects|workflow_quote_sent/);
  assert.doesNotMatch(api, /localStorage|sessionStorage/);
});

test("customer Project Journey exposes only read-only canonical completion history", () => {
  assert.match(projectDetails, /<CustomerCompletionHistory/);
  assert.match(projectDetails, /jobId=\{requestModificationState\.jobId\}/);
  assert.match(projectDetails, /onMessageProfessional=\{openProjectConversation\}/);
  assert.match(customerHistory, /fetchCustomerJobHistory/);
  assert.match(customerHistory, /JOB_HISTORY_UNAVAILABLE/);
  assert.match(customerHistory, /history\.actions\.canMessageProfessional/);
  assert.doesNotMatch(customerHistory, /completeCanonicalJob|Approve|Decline|invoice|payment|portfolio|localStorage|sessionStorage/);
});

test("completion and history copy is complete for EN, ES, FR, and PT-BR", () => {
  assert.deepEqual(JOB_COMPLETION_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  const required = [
    "completionReview", "completeJob", "confirmTitle", "workCompleted",
    "readyToInvoice", "history", "viewHistory", "originalRequest",
    "preservedRecord", "customerCompletionBody",
  ];
  for (const language of JOB_COMPLETION_LANGUAGES) {
    const copy = getJobCompletionCopy(language);
    for (const key of required) assert.ok(copy[key], `${language}:${key}`);
  }
});

test("completion controls remain responsive, readable, and at least 44px", () => {
  for (const component of [completionReview, professionalHistory, customerHistory]) {
    assert.match(component, /minHeight: 44/);
    assert.match(component, /minWidth: 0/);
    assert.match(component, /flexWrap: "wrap"/);
  }
  assert.match(completionReview, /gridTemplateColumns: "repeat\(auto-fit, minmax\(145px, 1fr\)\)"/);
  assert.match(professionalHistory, /overflowWrap: "anywhere"/);
  assert.match(customerHistory, /overflowWrap: "anywhere"/);
});
