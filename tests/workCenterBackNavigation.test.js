import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t } from "../src/utils/language.js";

const dashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const backControlSource = readFileSync(
  new URL("../src/components/WorkCenterBackButton.jsx", import.meta.url),
  "utf8"
);
const legacyPanelSource = readFileSync(
  new URL("../src/components/LegacyWorkCenterReadOnlyPanel.jsx", import.meta.url),
  "utf8"
);
const legacyAuthoritySource = readFileSync(
  new URL("../src/utils/workCenterLegacyAuthority.js", import.meta.url),
  "utf8"
);

test("Work Center child screens share one visible 44px Back control", () => {
  assert.match(backControlSource, /className="work-center-back-control"/);
  assert.match(backControlSource, /minHeight: "44px"/);
  assert.match(backControlSource, /border: "1px solid/);
  assert.match(backControlSource, /background: "var\(--meetro-surface-paper/);
  assert.doesNotMatch(dashboardSource, /style=\{workCenterBackButton\}/);
  assert.ok(
    dashboardSource.match(/<WorkCenterBackButton/g)?.length >= 8,
    "expected shared Back control across Work Center child workspaces"
  );
});

test("ordinary workspaces return to Work Center while Job Overview returns to Current Jobs", () => {
  assert.match(dashboardSource, /label=\{translate\("backToWorkCenter", activeLanguage\)\}[\s\S]*onClick=\{returnToWorkCenterDashboard\}/);
  assert.match(dashboardSource, /translate\("workCenterBackToJobs", activeLanguage\)/);
  assert.equal(t("workCenterBackToJobs", "en"), "Back to Current Jobs");
  assert.equal(t("workCenterBackToJobs", "es"), "Volver a trabajos actuales");
  assert.equal(t("workCenterBackToJobs", "fr"), "Retour aux travaux en cours");
  assert.equal(t("workCenterBackToJobs", "pt-BR"), "Voltar aos trabalhos atuais");
  assert.equal(t("backToWorkCenter", "en"), "Back to Work Center");
  assert.match(
    dashboardSource,
    /const returnTab = isJobHistoryMode \? "jobHistory" : "currentJobs";[\s\S]*setJobMenuTab\(isJobHistoryMode \? "history" : "current"\)/
  );
  assert.match(dashboardSource, /openCanonicalWorkCenterConversation/);
});

test("legacy compatibility remains contained and uses the shared Back control", () => {
  assert.match(legacyPanelSource, /<WorkCenterBackButton/);
  assert.doesNotMatch(legacyPanelSource, /minHeight: "42px"/);
  assert.match(legacyAuthoritySource, /"active"/);
  assert.match(legacyAuthoritySource, /CONTAINED_LEGACY_SURFACES/);
  assert.match(dashboardSource, /isLegacyWorkCenterCommandSurfaceContained\(activeTab\)/);
});

test("simplified Work Center copy is localized in every supported language", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of [
      "workCenterNewRequestsThatNeedADecision",
      "workCenterAcceptedWorkThatStillNeedsAction",
      "workCenterUpcomingVisitsAndAppointments",
      "workCenterProposalsThatNeedReviewOrResponse",
      "workCenterClosedJobsAndSavedRecords",
      "workCenterPaymentsBalancesAndClosedJobs",
      "workCenterReview",
      "workCenterContinue",
    ]) {
      assert.ok(t(key, language), `${key} missing for ${language}`);
    }
  }
});
