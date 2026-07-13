import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  getBusinessServicesProjection,
  readBusinessServiceProfile,
  writeBusinessServiceProfile,
} from "../src/utils/businessServiceProfile.js";
import { applyBusinessIdentityFields, getBusinessIdentityProjection } from "../src/utils/businessIdentity.js";
import { buildSpotlightProfessionalProfile } from "../src/utils/localSpotlightVisibility.js";
import { canProfessionalReceiveRequest } from "../src/utils/professionalRequestMatching.js";
import { t } from "../src/utils/language.js";

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test("Business Profile and Professional Setup persist the same service capability data", () => {
  const storage = createStorage();

  const profile = writeBusinessServiceProfile(
    { serviceSpecialties: ["door_replacement", "painting"] },
    storage
  );
  const saved = readBusinessServiceProfile(storage);

  assert.deepEqual(saved.serviceSpecialties, profile.serviceSpecialties);
  assert.deepEqual(saved.serviceCategories, profile.serviceCategories);
  assert.deepEqual(saved.serviceDomains, profile.serviceDomains);
  assert.equal(storage.getItem("businessServiceDomain"), "home_services");
  assert.deepEqual(JSON.parse(storage.getItem("businessServiceSpecialties")), [
    "door_replacement",
    "painting",
  ]);
  assert.deepEqual(
    JSON.parse(storage.getItem("businessServiceCapabilities")).map(
      (capability) => capability.serviceId
    ),
    ["door_replacement", "painting"]
  );
});

test("services projection reads explicit business services without leaking stored profile services", () => {
  const storage = createStorage({
    contractorProfile: JSON.stringify({
      business_name: "Current Contractor",
      serviceSpecialties: ["painting"],
      serviceCategories: ["Painting"],
      logo: "current-logo.jpg",
    }),
  });

  const storedProjection = getBusinessServicesProjection({}, {
    storage,
    translate: t,
  });
  const publicProjection = getBusinessServicesProjection({
    businessName: "Garage Specialist",
    serviceSpecialties: ["garage_door_opener_installation"],
    serviceCategories: ["Garage Door Opener Installation"],
  }, {
    storage,
    translate: t,
  });
  const publicIdentity = getBusinessIdentityProjection({
    businessName: "Sparse Public Business",
    logo: "public-logo.jpg",
  }, {
    storage,
  });

  assert.deepEqual(storedProjection.serviceIds, ["painting"]);
  assert.deepEqual(publicProjection.serviceIds, ["garage_door_opener_installation"]);
  assert.equal(publicProjection.shortSummary, "Garage Door Opener Installation");
  assert.equal(publicIdentity.businessName, "Sparse Public Business");
  assert.equal(publicIdentity.imageUrl, "public-logo.jpg");
});

test("business identity public records carry the same servicesOffered projection", () => {
  const storage = createStorage({
    contractorProfile: JSON.stringify({
      business_name: "Shared Services LLC",
      serviceSpecialties: ["plumbing_repairs", "garage_door_opener_installation"],
      serviceCategories: ["Plumbing Repairs", "Garage Door Opener Installation"],
      serviceDomain: "home_services",
      serviceDomains: ["home_services"],
    }),
  });

  const publicRecord = applyBusinessIdentityFields({}, { storage });
  const identity = getBusinessIdentityProjection(publicRecord, { storage });

  assert.deepEqual(identity.servicesOffered.serviceIds, [
    "plumbing_repairs",
    "garage_door_opener_installation",
  ]);
  assert.deepEqual(publicRecord.businessServiceSpecialties, identity.servicesOffered.serviceIds);
  assert.deepEqual(
    publicRecord.businessServiceCapabilities.map((capability) => capability.serviceId),
    identity.servicesOffered.serviceIds
  );
  assert.equal(identity.servicesSummary, "Plumbing Repairs, Garage Door Opener Installation");
});

test("spotlight profiles project capabilities from Services Offered", () => {
  const profile = buildSpotlightProfessionalProfile({
    businessName: "Door Ready",
    category: "handyman",
    serviceSpecialties: ["garage_door_opener_installation"],
    serviceCategories: ["Garage Door Opener Installation"],
  });

  assert.deepEqual(profile.businessServiceSpecialties, ["garage_door_opener_installation"]);
  assert.deepEqual(
    profile.businessServiceCapabilities.map((capability) => capability.serviceId),
    ["garage_door_opener_installation"]
  );
  assert.equal(
    canProfessionalReceiveRequest(profile, {
      category: "Garage door opener installation",
      serviceDomain: "home_services",
    }),
    true
  );
});

test("services can be added without creating duplicate capability records", () => {
  const storage = createStorage();

  writeBusinessServiceProfile(
    { serviceSpecialties: ["painting", "painting", "unknown"] },
    storage
  );
  writeBusinessServiceProfile(
    { serviceSpecialties: ["painting", "painting"] },
    storage
  );

  assert.deepEqual(JSON.parse(storage.getItem("businessServiceSpecialties")), [
    "painting",
  ]);
  assert.deepEqual(JSON.parse(storage.getItem("businessServiceCategories")), [
    "Painting",
  ]);
  assert.deepEqual(
    JSON.parse(storage.getItem("businessServiceCapabilities")).map(
      (capability) => capability.id
    ),
    ["capability:painting"]
  );
});

test("services can be removed while preserving the shared capability model", () => {
  const storage = createStorage();

  writeBusinessServiceProfile(
    { serviceSpecialties: ["painting", "drywall", "plumbing_repairs"] },
    storage
  );
  const updated = writeBusinessServiceProfile(
    { serviceSpecialties: ["painting", "plumbing_repairs"] },
    storage
  );

  assert.deepEqual(updated.serviceSpecialties, ["painting", "plumbing_repairs"]);
  assert.deepEqual(
    updated.serviceCapabilities.map((capability) => capability.serviceId),
    ["painting", "plumbing_repairs"]
  );
  assert.equal(
    updated.serviceCapabilities.some(
      (capability) => capability.serviceId === "drywall"
    ),
    false
  );
});

test("Services Offered changes immediately affect lead eligibility", () => {
  const storage = createStorage();
  const offered = writeBusinessServiceProfile(
    { serviceSpecialties: ["garage_door_opener_installation"] },
    storage
  );
  const professional = {
    businessCategory: "Handyman",
    ...offered,
  };

  assert.equal(
    canProfessionalReceiveRequest(professional, {
      category: "Garage Door Opener Installation",
      serviceDomain: "home_services",
    }),
    true
  );
  assert.equal(
    canProfessionalReceiveRequest(professional, {
      category: "Kitchen faucet leak",
      serviceDomain: "home_services",
    }),
    false
  );
});

test("capabilities determine eligibility even when business type is broad", () => {
  const storage = createStorage();
  const offered = writeBusinessServiceProfile(
    { serviceSpecialties: ["plumbing_repairs"] },
    storage
  );
  const handymanWithPlumbingRepairs = {
    businessCategory: "Handyman",
    ...offered,
  };

  assert.equal(
    canProfessionalReceiveRequest(handymanWithPlumbingRepairs, {
      category: "Kitchen faucet leak",
      serviceDomain: "home_services",
    }),
    true
  );
  assert.equal(
    canProfessionalReceiveRequest(handymanWithPlumbingRepairs, {
      category: "Garage door opener installation",
      serviceDomain: "home_services",
    }),
    false
  );
});

test("existing business profiles remain compatible with stored service fields", () => {
  const storage = createStorage({
    contractorProfile: JSON.stringify({
      serviceSpecialties: ["cabinetry"],
      serviceCategories: ["Cabinetry"],
      serviceDomain: "home_services",
      serviceDomains: ["home_services"],
    }),
  });

  const profile = readBusinessServiceProfile(storage);

  assert.deepEqual(profile.serviceSpecialties, ["cabinetry"]);
  assert.deepEqual(profile.serviceCategories, ["Cabinetry"]);
  assert.equal(profile.serviceDomain, "home_services");
});

test("Business Profile renders Services Offered from the shared onboarding registry", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /ServicesOfferedSection/);
  assert.match(source, /PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS/);
  assert.match(source, /writeBusinessServiceProfile\(\{ serviceSpecialties \}\)/);
  assert.match(source, /ServiceSelectorSheet/);
  assert.match(source, /flattenServiceGroups/);
});

test("public service surfaces use the shared services projection helper", () => {
  const files = [
    "src/pages/Discover.jsx",
    "src/pages/ContractorDetails.jsx",
    "src/pages/ProjectGallery.jsx",
    "src/utils/localSpotlightVisibility.js",
    "src/utils/businessIdentity.js",
  ];

  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /getBusinessServicesProjection/);
  });
});

test("User Profile no longer owns business verification or service area chips", () => {
  const source = fs.readFileSync("src/pages/Profile.jsx", "utf8");
  const heroSection = source.slice(
    source.indexOf("<section style={homeownerHeroCard}>"),
    source.indexOf("<section style={quickActionRow}")
  );

  assert.doesNotMatch(heroSection, /notVerified|verifiedBusiness|serviceArea|homeownerServiceArea/);
  assert.doesNotMatch(source, /homeownerVerificationBadge|homeownerHeroBadges/);
});

test("Business Profile shows business verification and service area ownership", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /businessVerification/);
  assert.match(source, /businessIdentity\.verification/);
  assert.match(source, /businessVerificationLabel/);
  assert.match(source, /t\("businessVerification"\)/);
  assert.match(source, /verificationStatusCard/);
  assert.match(source, /title=\{t\("businessVerification"\)\}/);
  assert.doesNotMatch(source, /label=\{t\("verification"\)\}/);
  assert.doesNotMatch(source, /value=\{businessVerificationLabel\}/);
  assert.match(source, /t\("serviceArea"\)/);
  assert.match(source, /profileDisplayAddress/);
});

test("Business Profile stewardship order keeps customer proof and services near the top", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  const heroIndex = source.indexOf("identityHeroLayout");
  const readinessIndex = source.indexOf('title={t("businessHealth")}');
  const customerPreviewIndex = source.indexOf('<h2 style={compactCardTitle}>{t("customerPreview")}</h2>');
  const servicesIndex = source.indexOf("<ServicesOfferedSection");
  const reviewsIndex = source.indexOf('title={t("reviews")}');
  const quickActionsIndex = source.indexOf('<h2 style={compactCardTitle}>{t("quickActions")}</h2>');
  const informationIndex = source.indexOf('title={t("businessInformation")}');
  const verificationIndex = source.indexOf('title={t("businessVerification")}');
  const setupIndex = source.indexOf('title={t("businessSetup")}');

  [
    heroIndex,
    readinessIndex,
    customerPreviewIndex,
    servicesIndex,
    reviewsIndex,
    quickActionsIndex,
    informationIndex,
    verificationIndex,
    setupIndex,
  ].forEach((index) => assert.ok(index > -1));

  assert.ok(heroIndex < readinessIndex);
  assert.ok(readinessIndex < customerPreviewIndex);
  assert.ok(customerPreviewIndex < servicesIndex);
  assert.ok(servicesIndex < reviewsIndex);
  assert.ok(reviewsIndex < quickActionsIndex);
  assert.ok(quickActionsIndex < informationIndex);
  assert.ok(informationIndex < verificationIndex);
  assert.ok(verificationIndex < setupIndex);
  assert.match(source, /businessReadinessSentence/);
  assert.match(source, /reviewsAfterCompletedJobs/);
  assert.doesNotMatch(source, /noReviewsYet[\s\S]{0,120}reviewsAfterCompletedJobs/);
});

test("Business Profile hero keeps identity grouped without oversized mobile name", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /businessIdentity\.businessName/);
  assert.match(source, /businessVerification\.compactBadgeText/);
  assert.match(source, /const pageTitle = \{/);
  assert.match(source, /fontSize: "clamp\(22px, 5\.8vw, 32px\)"/);
  assert.match(source, /maxWidth: "min\(100%, 460px\)"/);
  assert.match(source, /const identityHeroLayout = \{/);
  assert.match(source, /background: "rgba\(255,255,255,0\.06\)"/);
  assert.match(source, /width: "clamp\(56px, 15vw, 76px\)"/);
  assert.match(source, /whiteSpace: "normal"/);
});

test("Business Profile customer trust surfaces stay grouped without new truth owners", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  const trustGroupIndex = source.indexOf("customerTrustGroup");
  const customerPreviewIndex = source.indexOf('<h2 style={compactCardTitle}>{t("customerPreview")}</h2>');
  const servicesIndex = source.indexOf("<ServicesOfferedSection");
  const reviewsIndex = source.indexOf('title={t("reviews")}');
  const quickActionsIndex = source.indexOf('<h2 style={compactCardTitle}>{t("quickActions")}</h2>');
  const informationIndex = source.indexOf('title={t("businessInformation")}');
  const verificationIndex = source.indexOf('title={t("businessVerification")}');

  [
    trustGroupIndex,
    customerPreviewIndex,
    servicesIndex,
    reviewsIndex,
    quickActionsIndex,
    informationIndex,
    verificationIndex,
  ].forEach((index) => assert.ok(index > -1));

  assert.ok(trustGroupIndex < customerPreviewIndex);
  assert.ok(customerPreviewIndex < servicesIndex);
  assert.ok(servicesIndex < reviewsIndex);
  assert.ok(reviewsIndex < quickActionsIndex);
  assert.ok(quickActionsIndex < informationIndex);
  assert.ok(informationIndex < verificationIndex);
  assert.match(source, /t\("customerTrust"\)/);
  assert.match(source, /customerPreviewCard/);
  assert.match(source, /portfolioProofCard/);
  assert.match(source, /reviewsAfterCompletedJobs/);
  assert.doesNotMatch(source, /trustScore|customerTrustScore|newTrustMetric/);
});

test("Business Profile readiness and improvement guidance use existing truth without fake scoring", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /businessReadinessItems/);
  assert.match(source, /getBusinessPortfolioProofProjection/);
  assert.match(source, /readBusinessPortfolioStorage/);
  assert.match(source, /profileImprovementGuidance/);
  assert.match(source, /visibleProfileGuidance/);
  assert.match(source, /t\("publicPresenceGuidance"\)/);
  assert.match(source, /t\("portfolioProof"\)/);
  assert.match(source, /className="business-profile-shell"/);
  assert.match(source, /grid-template-columns: minmax\(0, 1\.08fr\) minmax\(300px, 0\.92fr\)/);
  assert.doesNotMatch(source, /profileCompletionPercent/);
  assert.doesNotMatch(source, /92%/);
  assert.doesNotMatch(source, /trustScore|customerTrustScore|newTrustMetric/);
});

test("Business Profile uses accessible collapsible cards for detail-heavy sections", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /function BusinessProfileCollapsibleCard/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=\{sectionId\}/);
  assert.match(source, /businessProfileCollapseBodyOpen/);
  assert.match(source, /title=\{t\("businessHealth"\)\}/);
  assert.match(source, /title=\{t\("businessInformation"\)\}/);
  assert.match(source, /title=\{t\("businessVerification"\)\}/);
  assert.match(source, /title=\{t\("businessSetup"\)\}/);
  assert.match(source, /collapsible\s+open=\{isBusinessProfileSectionOpen\("services", !servicesReady\)\}/);
  assert.match(source, /visibleProfileGuidance\.map/);
});

test("Business Profile labels use business-native language", () => {
  assert.equal(t("quickActions"), "Business Management");
  assert.equal(t("activeCapabilities"), "services offered");
  assert.equal(t("setupRequired"), "Business Profile Needed");
  assert.equal(t("notProvided"), "Not added yet");
  assert.equal(t("businessSetup"), "Business Setup Review");
  assert.equal(t("viewPublicProfile"), "Preview Customer View");
  assert.equal(t("businessHealth"), "Business Readiness");
  assert.equal(t("readyForCustomers"), "Ready for customers");
  assert.equal(t("portfolioProof"), "Portfolio Proof");
  assert.equal(t("publicPresenceGuidance"), "Improve Customer Presence");
  assert.equal(t("addBusinessHours"), "Add Business Hours");
  assert.equal(t("addLicenseInformation"), "Add License Information");
  assert.equal(t("editBusinessInformation"), "Edit Business Information");
  assert.equal(t("reviewVerification"), "Review Verification");

  const legacyLabels = [
    "Quick Actions",
    "Setup Required",
    "active capabilities",
    "Active capabilities",
    "View Public Profile",
    "Business Health",
  ];

  legacyLabels.forEach((label) => {
    assert.notEqual(t("quickActions"), label);
    assert.notEqual(t("activeCapabilities"), label);
    assert.notEqual(t("setupRequired"), label);
    assert.notEqual(t("viewPublicProfile"), label);
    assert.notEqual(t("businessHealth"), label);
  });
});

test("Business Profile availability control uses shared Dashboard availability truth", () => {
  const profileSource = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");
  const dashboardSource = fs.readFileSync("src/pages/BusinessDashboard.jsx", "utf8");

  assert.match(profileSource, /function updateBusinessAvailability\(nextValue\)/);
  assert.match(profileSource, /setBusinessAvailability\(nextValue\)/);
  assert.match(profileSource, /onClick=\{\(\) => updateBusinessAvailability\(!availableNow\)\}/);
  assert.doesNotMatch(profileSource, /availabilityHealthButton/);
  assert.doesNotMatch(profileSource, /availabilityEditorOpen/);
  assert.match(profileSource, /t\("currentlyAvailable"\)/);
  assert.match(profileSource, /t\("currentlyInactive"\)/);
  assert.match(profileSource, /t\("setAvailable"\)/);
  assert.match(profileSource, /t\("setUnavailable"\)/);
  assert.match(dashboardSource, /setBusinessAvailability\(!availableNow\)/);
  assert.match(dashboardSource, /readBusinessAvailability\(\)/);
  assert.match(dashboardSource, /window\.addEventListener\("meetroAvailabilityChanged", syncAvailability\)/);
});

test("Business Profile owns business hours and license information", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /const \[businessHours, setBusinessHours\]/);
  assert.match(source, /const \[licenseNumber, setLicenseNumber\]/);
  assert.match(source, /const \[licenseState, setLicenseState\]/);
  assert.match(source, /const \[licenseType, setLicenseType\]/);
  assert.match(source, /const \[licenseExpiration, setLicenseExpiration\]/);
  assert.match(source, /function buildBusinessDetailFields\(\)/);
  assert.match(source, /function persistBusinessDetailFields\(fields\)/);
  assert.match(source, /businessHours: businessHours\.trim\(\)/);
  assert.match(source, /licenseNumber: licenseNumber\.trim\(\)/);
  assert.match(source, /persistBusinessDetailFields\(businessDetailFields\)/);
  assert.match(source, /value=\{profileBusinessHours \|\| t\("addBusinessHours"\)\}/);
  assert.match(source, /value=\{profileLicenseSummary \|\| t\("addLicenseInformation"\)\}/);
  assert.match(source, /t\("editBusinessInformation"\)/);
  assert.match(source, /t\("businessHoursHelp"\)/);
  assert.match(source, /t\("licenseInformationHelp"\)/);
});

test("Business Verification section has an actionable owner path", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  const verificationSectionIndex = source.indexOf('title={t("businessVerification")}');
  const reviewActionIndex = source.indexOf('t("reviewVerification")', verificationSectionIndex);

  assert.ok(verificationSectionIndex > -1);
  assert.ok(reviewActionIndex > verificationSectionIndex);
  assert.match(source, /onClick=\{\(\) => setEditing\(true\)\}/);
  assert.doesNotMatch(source, /label=\{t\("verification"\)\}/);
  assert.doesNotMatch(source, /value=\{businessVerificationLabel\}/);
});

test("Business Profile links Review Business Setup to the existing onboarding flow", () => {
  const source = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");
  const onboardingSource = fs.readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");

  assert.match(source, /reviewBusinessSetup/);
  assert.match(source, /t\("businessSetup"\)/);
  assert.match(source, /t\("reviewBusinessSetupHelp"\)/);
  assert.match(source, /title=\{t\("businessSetup"\)\}/);
  assert.match(source, /t\("reviewBusinessSetup"\)/);
  assert.match(source, /meetroProfessionalOnboardingReturnPage", "contractorProfile"/);
  assert.match(source, /setPage\("professionalOnboarding"\)/);
  assert.match(onboardingSource, /returnPage === "contractorProfile"/);
  assert.match(onboardingSource, /setPage\(destination\)/);
});

test("service selector is shared across request creation setup and Business Profile", () => {
  const uploadSource = fs.readFileSync("src/pages/Upload.jsx", "utf8");
  const onboardingSource = fs.readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");
  const selectorSource = fs.readFileSync("src/components/ServiceSelectorSheet.jsx", "utf8");

  assert.match(uploadSource, /ServiceSelectorSheet/);
  assert.match(uploadSource, /selectedServiceCard/);
  assert.doesNotMatch(uploadSource, /<select\s*\n\s*value=\{category\}/);
  assert.match(onboardingSource, /ServiceSelectorSheet/);
  assert.match(onboardingSource, /flattenServiceGroups/);
  assert.match(selectorSource, /maxHeight: "min\(82dvh, 720px\)"/);
  assert.match(selectorSource, /window\.visualViewport/);
  assert.match(selectorSource, /keyboardInset/);
  assert.match(selectorSource, /createPortal\(sheetNode, document\.body\)/);
  assert.match(selectorSource, /scrollPositionRef/);
  assert.match(selectorSource, /window\.scrollTo\(scrollPosition\.x, scrollPosition\.y\)/);
  assert.match(selectorSource, /placement === "center" \|\| keyboardOpen[\s\S]*\? "center" : "flex-end"/);
  assert.doesNotMatch(selectorSource, /autoFocus/);
  assert.match(selectorSource, /wordBreak: "normal"/);
  assert.match(selectorSource, /overflowY: "auto"/);
  assert.match(selectorSource, /touchAction: "pan-y"/);
  assert.match(selectorSource, /const groupedOptions = useMemo/);
  assert.match(selectorSource, /<div style=\{categoryHeader\}>\{group\.label\}<\/div>/);
  assert.match(selectorSource, /group\.options\.map/);
  assert.doesNotMatch(selectorSource, /<span style=\{optionGroup\}>/);
});

test("multi-select service selector has a visible finish action", () => {
  const selectorSource = fs.readFileSync("src/components/ServiceSelectorSheet.jsx", "utf8");
  const onboardingSource = fs.readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");
  const profileSource = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");
  const uploadSource = fs.readFileSync("src/pages/Upload.jsx", "utf8");

  assert.match(selectorSource, /showMultiSelectFooter/);
  assert.match(selectorSource, /sheetFooter/);
  assert.match(selectorSource, /doneLabel \|\| t\("done", language\)/);
  assert.match(selectorSource, /onDone\?\.\(\)/);
  assert.match(selectorSource, /gridTemplateRows: "auto auto 1fr auto"/);
  assert.match(onboardingSource, /doneLabel=\{t\("professionalOnboardingContinue"\)\}/);
  assert.match(onboardingSource, /onDone=\{\(\) => setStep\(4\)\}/);
  assert.match(profileSource, /doneLabel=\{t\("save"\)\}/);
  assert.match(profileSource, /placement="center"/);
  assert.match(profileSource, /onDone=\{\(\) => setSelectorOpen\(false\)\}/);

  const uploadSelectorBlock = uploadSource.slice(
    uploadSource.indexOf("<ServiceSelectorSheet"),
    uploadSource.indexOf("<BottomNav")
  );
  assert.doesNotMatch(uploadSelectorBlock, /\bmultiple\b/);
  assert.match(uploadSelectorBlock, /onSelect=\{selectServiceOption\}/);
});

test("professional setup gate preserves completed businesses on login", () => {
  const appSource = fs.readFileSync("src/App.jsx", "utf8");

  assert.match(appSource, /hasRequiredProfessionalSetupData/);
  assert.match(appSource, /readBusinessServiceProfile\(undefined, contractorProfile\)/);
  assert.match(appSource, /safeSetStorageItem\("meetroProfessionalOnboardingCompleted", "true"\)/);
  assert.match(appSource, /serviceProfile\.serviceSpecialties\.length > 0/);
  assert.match(appSource, /availability\.length > 0/);
  assert.doesNotMatch(appSource, /meetroProfessionalOnboardingCompleted"\) === "true"\) return false/);
  assert.doesNotMatch(appSource, /meetroProfessionalOnboardingSkipped"\) === "true"\) return false/);
});

test("professional setup finalization persists services before marking setup complete", () => {
  const onboardingSource = fs.readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");
  const completionFlagIndex = onboardingSource.indexOf(
    'writeStorageValue(ONBOARDING_COMPLETED_KEY, "true")'
  );
  const writeServiceIndex = onboardingSource.indexOf("writeBusinessServiceProfile");
  const readBackIndex = onboardingSource.indexOf("readBusinessServiceProfile(localStorage)");

  assert.match(onboardingSource, /hasRequiredCompletionData/);
  assert.match(onboardingSource, /try \{/);
  assert.match(onboardingSource, /catch \(error\)/);
  assert.match(onboardingSource, /removeStorageValue\(ONBOARDING_COMPLETED_KEY\)/);
  assert.ok(writeServiceIndex >= 0);
  assert.ok(readBackIndex > writeServiceIndex);
  assert.ok(completionFlagIndex > readBackIndex);
});

test("professional setup completion uses a safe post-setup destination", () => {
  const onboardingSource = fs.readFileSync("src/pages/ProfessionalOnboarding.jsx", "utf8");

  assert.match(onboardingSource, /SAFE_RETURN_PAGES/);
  assert.match(onboardingSource, /"contractorProfile"/);
  assert.match(onboardingSource, /getSafeCompletionDestination/);
  assert.match(onboardingSource, /SAFE_RETURN_PAGES\.has\(returnPage\) \? returnPage : "contractorProfile"/);
});

test("professional setup services persist in the expected shared capability format", () => {
  const storage = createStorage();
  const profile = writeBusinessServiceProfile(
    {
      serviceSpecialties: ["garage_door_opener_installation"],
      serviceRadius: "15 miles",
    },
    storage
  );
  const savedProfile = readBusinessServiceProfile(storage);

  assert.deepEqual(savedProfile.serviceSpecialties, [
    "garage_door_opener_installation",
  ]);
  assert.deepEqual(
    savedProfile.serviceCapabilities.map((capability) => capability.serviceId),
    ["garage_door_opener_installation"]
  );
  assert.equal(profile.serviceDomain, "home_services");
  assert.equal(storage.getItem("businessServiceRadius"), "15 miles");
  assert.doesNotThrow(() => readBusinessServiceProfile(createStorage({
    businessServiceSpecialties: "{bad json",
    businessServiceCapabilities: "{bad json",
    contractorProfile: "{bad json",
  })));
});

test("Services Offered language is available in EN, ES, FR, and PT", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("businessReadinessSentence", language), "businessReadinessSentence");
    assert.notEqual(t("servicesOffered", language), "servicesOffered");
    assert.notEqual(t("servicesOfferedSubtitle", language), "servicesOfferedSubtitle");
    assert.notEqual(t("servicesOfferedEmpty", language), "servicesOfferedEmpty");
    assert.notEqual(t("activeCapabilities", language), "activeCapabilities");
    assert.notEqual(t("chooseService", language), "chooseService");
    assert.notEqual(t("searchServices", language), "searchServices");
    assert.notEqual(t("saveServices", language), "saveServices");
    assert.notEqual(t("verification", language), "verification");
    assert.notEqual(t("businessVerification", language), "businessVerification");
    assert.notEqual(t("businessVerificationHelp", language), "businessVerificationHelp");
    assert.notEqual(t("businessVerifiedTrustSummary", language), "businessVerifiedTrustSummary");
    assert.notEqual(t("businessVerificationPendingSummary", language), "businessVerificationPendingSummary");
    assert.notEqual(t("verificationPending", language), "verificationPending");
    assert.notEqual(t("credentialsProvided", language), "credentialsProvided");
    assert.notEqual(t("credentialsPending", language), "credentialsPending");
    assert.notEqual(t("businessSetup", language), "businessSetup");
    assert.notEqual(t("reviewBusinessSetup", language), "reviewBusinessSetup");
    assert.notEqual(t("reviewBusinessSetupHelp", language), "reviewBusinessSetupHelp");
    assert.notEqual(t("serviceArea", language), "serviceArea");
    assert.notEqual(
      t("professionalOnboardingSpecialtyGarageDoorOpenerInstallation", language),
      "professionalOnboardingSpecialtyGarageDoorOpenerInstallation"
    );
    assert.notEqual(
      t("professionalOnboardingSpecialtyPlumbingRepairs", language),
      "professionalOnboardingSpecialtyPlumbingRepairs"
    );
    assert.notEqual(
      t("professionalOnboardingSpecialtyCeilingFanInstallation", language),
      "professionalOnboardingSpecialtyCeilingFanInstallation"
    );
  }
});
