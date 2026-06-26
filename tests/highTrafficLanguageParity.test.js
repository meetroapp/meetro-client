import assert from "node:assert/strict";
import test from "node:test";
import { t, translations } from "../src/utils/language.js";

const languages = ["en", "es", "fr", "pt-BR"];

const highTrafficKeys = [
  "homeLocalServicesEyebrow",
  "homeMyProjects",
  "homeMyProjectsSubtitle",
  "homeMyProjectsActive",
  "homeMyProjectsHistory",
  "homeLocalServicesSpotlight",
  "homeLocalServicesEmpty",
  "homeRequestDetails",
  "homeServiceDetails",
  "homeOpenRequest",
  "homeViewRecord",
  "homeViewProfile",
  "myRequestsTitle",
  "myRequestsEmptyTitle",
  "myRequestsQuoteProposal",
  "myRequestsServiceHistory",
  "myRequestsSaveChanges",
  "wcFilterAll",
  "wcFilterOnSite",
  "wcFilterInProgress",
  "wcCurrentStatus",
  "wcNextStep",
  "wcViewDetails",
  "wcNoQuotesTitle",
  "wcNoActiveWorkTitle",
  "wcThisWeek",
  "wcThisMonth",
  "workCenterQuotesTitle",
  "workCenterActiveWorkTitle",
  "workCenterRevenueTitle",
  "activeJobs",
  "workCenterPurposeStatement",
  "workCenterHeaderEyebrow",
  "workCenterChildScheduleSummary",
  "workCenterChildScheduleEmptySummary",
  "workCenterChildQuotesSummary",
  "workCenterChildQuotesEmptySummary",
  "workCenterChildActiveSummary",
  "workCenterChildActiveEmptySummary",
  "workCenterChildRevenueSummary",
  "workCenterChildHistorySummary",
  "workCenterChildHistoryEmptySummary",
  "workCenterChildHistoryDescription",
  "newOpportunity",
  "newOpportunities",
  "activeJob",
  "visitToday",
  "visitsToday",
  "viewOpportunity",
  "viewOpportunities",
  "opportunityHeaderEyebrow",
  "opportunityDetailDescription",
  "opportunityCurrentStage",
  "opportunityNextStep",
  "awaitingReview",
  "noNewOpportunities",
];

test("high-traffic Home, My Requests, and Work Center labels exist in four languages", () => {
  for (const key of highTrafficKeys) {
    for (const language of languages) {
      assert.equal(
        typeof translations[language][key],
        "string",
        `Missing ${language} translation for ${key}`
      );
      assert.ok(
        translations[language][key].trim(),
        `Empty ${language} translation for ${key}`
      );
      assert.notEqual(t(key, language), key, `${language} returned raw key ${key}`);
    }
  }
});

test("French and Portuguese use localized high-traffic labels instead of English fallback", () => {
  assert.equal(t("myRequestsTitle", "fr"), "Mes demandes");
  assert.equal(t("myRequestsTitle", "pt-BR"), "Minhas solicitações");
  assert.equal(t("workCenterQuotesTitle", "fr"), "Devis / propositions");
  assert.equal(t("workCenterQuotesTitle", "pt-BR"), "Orçamentos / Propostas");
  assert.equal(t("wcNoActiveWorkTitle", "fr"), "Aucun travail actif pour le moment.");
  assert.equal(t("wcNoActiveWorkTitle", "pt-BR"), "Nenhum trabalho ativo agora.");
});
