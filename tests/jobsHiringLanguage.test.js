import assert from "node:assert/strict";
import test from "node:test";
import { t } from "../src/utils/language.js";

const languages = ["en", "es", "fr", "pt-BR"];

const requiredJobsHiringKeys = [
  "jobsHiringTitle",
  "jobsHiringDescription",
  "jobsHiringBackToDiscover",
  "jobsHiringSearchTitle",
  "jobsHiringKeywordPlaceholder",
  "jobsHiringLocationPlaceholder",
  "jobsHiringCategoriesTitle",
  "jobsHiringFeaturedTitle",
  "jobsHiringPayRange",
  "jobsHiringLocation",
  "jobsHiringEmploymentType",
  "jobsHiringDistance",
  "jobsHiringRequirements",
  "jobsHiringApply",
  "jobsHiringMessageBusiness",
  "jobsHiringSaveJob",
  "jobsHiringViewJobDetails",
  "jobsHiringEmploymentPartTime",
  "jobsHiringEmploymentContract",
  "jobsHiringCategoryHandyman",
  "jobsHiringCategoryPainting",
  "jobsHiringCategoryDrywall",
  "jobsHiringCategoryCleaning",
  "communityHiringViewOpportunity",
  "communityHiringInterested",
  "communityHiringBackToCommunity",
  "communityHiringOpportunityEyebrow",
  "communityHiringOpportunityDetailsAria",
  "communityHiringOpenOpportunityAria",
  "communityHiringCapabilityArea",
  "communityHiringInterestStarted",
  "communityHiringNotificationTitle",
];

test("Jobs & Hiring UI labels resolve for all supported app languages", () => {
  for (const language of languages) {
    for (const key of requiredJobsHiringKeys) {
      assert.notEqual(t(key, language), key, `${key} should resolve in ${language}`);
      assert.equal(typeof t(key, language), "string");
      assert.ok(t(key, language).trim().length > 0);
    }
  }
});

test("Jobs & Hiring visible labels are localized outside English", () => {
  assert.equal(t("jobsHiringApply", "en"), "I'm Interested");
  assert.equal(t("jobsHiringPayRange", "es"), "Rango de pago");
  assert.equal(t("communityHiringInterested", "es"), "Me interesa");
  assert.equal(t("jobsHiringFeaturedTitle", "fr"), "Offres locales en vedette");
  assert.equal(t("communityHiringNotificationTitle", "fr"), "Nouvel intérêt de recrutement");
  assert.equal(t("jobsHiringEmploymentPartTime", "pt-BR"), "Meio período");
  assert.equal(t("communityHiringCapabilityArea", "pt-BR"), "Área de capacidade");
});
