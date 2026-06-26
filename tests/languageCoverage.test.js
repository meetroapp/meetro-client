import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  getLanguageLabel,
  normalizeLanguage,
  setLanguage,
  t,
  translations,
} from "../src/utils/language.js";

const requiredCommonKeys = [
  "businessTools",
  "comingSoonStatus",
  "readOnlyStatus",
  "previewStatus",
  "featuredInSpotlight",
  "useInSpotlight",
  "localServicesSpotlight",
  "saveInvoice",
  "printInvoice",
  "downloadSavePdf",
  "noReviewsYet",
  "reviewsAfterCompletedJobs",
  "backToBusinessTools",
  "selected",
  "active",
  "completed",
  "pending",
  "scheduled",
  "save",
  "send",
  "cancel",
  "edit",
  "close",
  "open",
  "businessKnowledge",
  "businessDocuments",
  "materialsLibrary",
  "pricingLibrary",
  "contractTemplates",
  "reportsCenter",
  "readOnlyReference",
  "materialsLibraryDescription",
  "pricingLibraryDescription",
  "contractTemplatesDescription",
  "reportsCenterDescription",
  "serviceType",
  "commonMaterials",
  "pricingModel",
  "laborAssumption",
  "templateName",
  "purpose",
  "reportName",
  "includes",
  "businessHealth",
  "quickActions",
  "businessInformation",
  "customerPreview",
  "customerPreviewHelp",
  "viewPublicProfile",
  "shareProfile",
  "publicProfileShareText",
  "publicProfileLinkCopied",
  "copyPublicProfileLink",
  "profileComplete",
  "emergencyReady",
  "businessHours",
  "licenseInformation",
  "notProvided",
  "portfolioTrustSubtitle",
  "showcasedProjects",
  "viewPublicPortfolio",
  "portfolioEmptyTrustTitle",
  "reviewProof",
  "credentials",
  "settingsPageSubtitle",
  "personalInformation",
  "personalInformationHelp",
  "personalInformationSaved",
  "backToSettings",
  "passwordSecurity",
  "preferences",
  "appearance",
  "availabilityShortcut",
  "emergencyReadiness",
  "connectedServices",
  "aiBusinessHelp",
  "licenses",
  "homeownerProfile",
  "homeownerProfileSubtitle",
  "manageAddresses",
  "preferredProfessionals",
  "myProfessionals",
  "paymentMethods",
  "myHome",
  "savedAddresses",
  "primaryProperty",
  "emergencyContacts",
  "communicationPreferences",
  "trustedProfessionals",
  "trustedProfessionalsEmpty",
  "reviewsWritten",
  "noReviewsWrittenYet",
  "messagesSearchPlaceholder",
  "messagesSearchClear",
  "messagesNoSearchResults",
  "messagesNoSearchResultsText",
  "messagesCaughtUpTitle",
  "messagesCaughtUpText",
  "messagesAttentionSummary",
  "messageLabelProject",
  "messageLabelQuote",
  "messageLabelSchedule",
  "messageLabelEmergency",
  "messageLabelHiring",
  "messageLabelCompleted",
];

const requiredLanguageCodes = ["en", "es", "fr", "pt-BR"];

test("common TestFlight UI labels have all supported high-priority translations", () => {
  assert.deepEqual(
    SUPPORTED_LANGUAGES.map((item) => item.code),
    requiredLanguageCodes
  );

  for (const key of requiredCommonKeys) {
    for (const language of requiredLanguageCodes) {
      assert.equal(
        typeof translations[language][key],
        "string",
        `Missing ${language} key: ${key}`
      );
      assert.ok(translations[language][key].trim(), `Empty ${language} key: ${key}`);
    }
  }
});

test("known high-risk labels are not mixed between English and Spanish", () => {
  assert.equal(translations.en.backToBusinessTools, "Back to Business Tools");
  assert.equal(translations.es.backToBusinessTools, "Volver a Herramientas");
  assert.equal(translations.en.saveInvoice, "Save Invoice");
  assert.equal(translations.es.saveInvoice, "Guardar factura");
  assert.equal(translations.en.downloadSavePdf, "Download / Save PDF");
  assert.equal(translations.es.downloadSavePdf, "Descargar / guardar PDF");
  assert.equal(translations.en.reviewsAfterCompletedJobs, "Reviews will appear after completed jobs.");
  assert.equal(
    translations.es.reviewsAfterCompletedJobs,
    "Las reseñas aparecerán después de trabajos completados."
  );
  assert.equal(translations.fr.businessTools, "Outils professionnels");
  assert.equal(translations["pt-BR"].businessTools, "Ferramentas do negócio");
  assert.equal(translations.fr.comingSoonStatus, "Bientôt disponible");
  assert.equal(translations["pt-BR"].comingSoonStatus, "Em breve");
});

test("new language helpers normalize labels and fall back to English safely", () => {
  assert.equal(normalizeLanguage("fr"), "fr");
  assert.equal(normalizeLanguage("pt-BR"), "pt-BR");
  assert.equal(normalizeLanguage("de"), "en");
  assert.equal(getLanguageLabel("fr"), "Français");
  assert.equal(getLanguageLabel("pt-BR"), "Português");

  assert.equal(t("home", "fr"), "Accueil");
  assert.equal(t("home", "pt-BR"), "Início");
  assert.equal(t("professionalOnboardingWelcomeTitle", "fr"), "Welcome to Meetro");
  assert.equal(t("professionalOnboardingWelcomeTitle", "pt-BR"), "Welcome to Meetro");
  assert.equal(t("definitelyMissingKey", "fr"), "definitelyMissingKey");
  assert.equal(t("home", "unsupported-code"), "Home");
  assert.doesNotThrow(() => t(undefined, "pt-BR"));
});

test("stored language reads and writes are normalized defensively", () => {
  const previousLocalStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const storage = new Map();

  globalThis.localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => {
      storage.set(key, value);
    },
  };
  globalThis.window = {
    dispatchEvent: () => {},
  };

  try {
    storage.set("meetroLanguage", "not-a-language");
    assert.equal(getLanguage(), "en");

    setLanguage("pt-BR");
    assert.equal(storage.get("meetroLanguage"), "pt-BR");
    assert.equal(getLanguage(), "pt-BR");

    setLanguage("klingon");
    assert.equal(storage.get("meetroLanguage"), "en");
    assert.equal(getLanguage(), "en");
  } finally {
    if (previousLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = previousLocalStorage;
    }

    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
