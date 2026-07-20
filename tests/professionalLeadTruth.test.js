import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getProfessionalWorkMetrics } from "../src/utils/dashboardMetrics.js";
import { t } from "../src/utils/language.js";

const readSource = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const leadsSource = readSource("src/pages/BusinessLeads.jsx");
const dashboardSource = readSource("src/pages/BusinessDashboard.jsx");
const homeSource = readSource("src/pages/Home.jsx");
const metricsSource = readSource("src/utils/dashboardMetrics.js");
const opportunityStateSource = readSource("src/utils/professionalOpportunityState.js");
test("Business Leads uses only the backend-authorized professional projection", () => {
  assert.match(leadsSource, /authFetch/);
  assert.match(leadsSource, /professional-request-opportunities/);
  assert.match(leadsSource, /setStatus\("unavailable"\)/);
  assert.match(leadsSource, /purgeProfessionalLeadCaches/);
  assert.doesNotMatch(leadsSource, /["']\/posts["']/);
  assert.doesNotMatch(leadsSource, /getStoredHomeownerRequests/);
  assert.doesNotMatch(leadsSource, /normalizeLeadCandidate/);
  assert.doesNotMatch(leadsSource, /selectedQuoteRequest/);
});

test("professional lead surfaces do not project browser-local homeowner requests", () => {
  assert.doesNotMatch(metricsSource, /getEligibleSharedProfessionalLeads/);
  assert.doesNotMatch(dashboardSource, /matchingDashboardLeads/);
  assert.doesNotMatch(dashboardSource, /function LeadCard/);
  assert.match(dashboardSource, /professional-request-opportunities/);
  assert.match(dashboardSource, /resolveProfessionalOpportunityCollection/);
  assert.match(opportunityStateSource, /new Map/);
  assert.doesNotMatch(dashboardSource, /Professional leads are not available yet/);
  assert.doesNotMatch(dashboardSource, /unlimited homeowner leads|unlimited lead access/i);
  assert.match(homeSource, /leadProjectionAvailable/);

  const metrics = getProfessionalWorkMetrics({
    homeownerRequests: [{ id: "browser-only-request", status: "open" }],
  });

  assert.equal(metrics.leadProjectionAvailable, false);
  assert.equal(metrics.newLeadCount, null);
  assert.deepEqual(metrics.newLeads, []);
});

test("unsupported professional lead defaults are absent", () => {
  for (const unsupported of [
    /\$150\s*-\s*\$500/,
    /distance:\s*["']Nearby["']/,
    /posted:\s*["']Today["']/,
    /verified:\s*true/,
    /urgency:\s*["']New["']/,
  ]) {
    assert.doesNotMatch(leadsSource, unsupported);
    assert.doesNotMatch(dashboardSource, unsupported);
  }
});

test("professional lead unavailable state is localized", () => {
  assert.equal(t("professionalLeadsUnavailable", "en"), "Professional leads are not available yet.");

  for (const language of ["es", "fr", "pt-BR"]) {
    assert.notEqual(
      t("professionalLeadsUnavailable", language),
      t("professionalLeadsUnavailable", "en")
    );
    assert.notEqual(t("professionalLeadsUnavailableText", language), "professionalLeadsUnavailableText");
  }
});
