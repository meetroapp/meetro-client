import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getProfessionalSignupCategoriesFromTaxonomy } from "../src/utils/communityTaxonomy.js";

test("Login keeps the Meetro Community arrival surface while using backend 2FA", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /SUPPORTED_LANGUAGES/);
  assert.match(source, /className="meetro-visual-page"/);
  assert.match(source, /className="meetro-visual-hero"/);
  assert.match(source, /className="meetro-visual-surface"/);
  assert.match(source, /heroWaveOne/);
  assert.match(source, /welcomeTagline/);
  assert.match(source, /The work continues here\./);
  assert.match(source, /Continue the work that matters, with the people who matter\./);
  assert.match(source, /login: "Sign in"/);
  assert.match(source, /Continue where you left off\./);
  assert.match(source, /Join Meetro Community/);
  assert.match(source, /continueAction: "Continue"/);
  assert.match(source, /Built around trust, meaningful work, and lasting relationships\./);
  assert.match(source, /We're here to support you and the people you serve\./);
  assert.match(source, /Meetro Community is built around trust, relationships, and the work that matters most\./);
  assert.match(source, /T\.getStarted/);
  assert.match(source, /mode === "login" && \(/);
  assert.match(source, /localStorage\.setItem\("meetroLoginMode", "signup"\);\s*setMode\("signup"\);/);
  assert.match(source, /mode === "signup" && \(/);
  assert.match(source, /← \{t\("backToLogin", normalizedLanguage\)\}/);
  assert.equal((source.match(/t\("backToLogin", normalizedLanguage\)/g) || []).length, 1);
  assert.match(source, /localStorage\.setItem\("meetroLoginMode", "login"\);\s*setMode\("login"\);\s*setLegalAccepted\(false\);/);
  assert.match(source, /forgotPasswordButton/);
  assert.match(source, /supportPanel/);
  assert.match(source, /brandLockup/);
  assert.match(source, /brandWordmark/);
  assert.match(source, /heroNeighborhood/);
  assert.match(source, /openLegalDocument\("terms"\)/);
  assert.match(source, /openLegalDocument\("privacy"\)/);
  assert.match(source, /openLegalDocument\("emergency"\)/);
  assert.match(source, /openLegalDocument\("ai"\)/);
  assert.match(source, /verifyTwoFactorCode\(\{/);
  assert.match(source, /fetch\(`\$\{API_URL\}\$\{endpoint\}`/);
  assert.match(source, /endpoint = mode === "login" \? "\/auth\/login" : "\/auth\/signup"/);
  assert.match(source, /buildPasswordResetRequest\(resetEmail\)/);
  assert.match(source, /setLanguage\(nextLanguage\)/);
  assert.match(source, /var\(--meetro-gradient-community-action/);
  assert.match(source, /var\(--meetro-color-forest/);
  assert.match(source, /var\(--meetro-surface-paper/);
  assert.doesNotMatch(source, /The modern platform for home and business services/);
  assert.doesNotMatch(source, /Welcome back/);
  assert.doesNotMatch(source, /Welcome back\./);
  assert.doesNotMatch(source, /getStarted: "Get Started"/);
  assert.doesNotMatch(source, /<MeetroIcon name="lock" size=\{18\} decorative \/>\s*\{T\.login\}/);
  assert.doesNotMatch(source, /linear-gradient\(135deg,\s*#5b3df5/);
  assert.doesNotMatch(source, /background:\s*"#5b3df5"/);
  assert.doesNotMatch(source, /brandMark/);
  assert.doesNotMatch(source, /supportMark/);
  assert.doesNotMatch(source, /aria-hidden="true">M<\/div>/);
  assert.doesNotMatch(source, /const languageSelect/);
  assert.doesNotMatch(source, /<span style=\{languageLabel\}>Language<\/span>/);
  assert.doesNotMatch(source, /123456/);
});

test("Arrival Experience documentation preserves auth guardrails", () => {
  const source = readFileSync(
    new URL("../docs/KnowledgeBase/ARRIVAL_EXPERIENCE_WONDER_PASS.md", import.meta.url),
    "utf8"
  );

  assert.match(source, /front door to Meetro Community/);
  assert.match(source, /Welcome back\./);
  assert.match(source, /Continue the work that matters\./);
  assert.match(source, /Do not change authentication behavior/);
  assert.match(source, /Do not change legal routing/);
  assert.match(source, /Do not change backend\/API calls/);
});

test("professional signup category search renders results and clears only search after selection", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /const \[professionalCategory, setProfessionalCategory\] = useState\("contractor"\)/);
  assert.match(source, /const \[categorySearch, setCategorySearch\] = useState\(""\)/);
  assert.match(source, /getProfessionalSignupCategoriesFromTaxonomy/);
  assert.match(source, /normalizedCategorySearch/);
  assert.match(source, /item\.taxonomyEcosystemId/);
  assert.match(source, /\.\.\.\(Array\.isArray\(item\.aliases\) \? item\.aliases : \[\]\)/);
  const signupCategories = getProfessionalSignupCategoriesFromTaxonomy({
    translate: (_key, fallback) => fallback,
  });
  const propertyManagement = signupCategories.find(
    (category) => category.value === "propertyManagement"
  );
  assert.ok(propertyManagement);
  assert.ok(
    propertyManagement.aliases.some((alias) =>
      String(alias).toLowerCase().includes("property")
    )
  );
  assert.match(source, /const hasCategorySearch = categorySearch\.trim\(\)\.length > 0/);
  assert.match(source, /function selectProfessionalCategory\(value\) \{\s*setProfessionalCategory\(value\);\s*setCategorySearch\(""\);\s*\}/);
  assert.match(source, /hasCategorySearch && \(/);
  assert.match(source, /style=\{categorySearchResults\}/);
  assert.match(source, /filteredProfessionalCategories\.map\(\(item\) => \(/);
  assert.match(source, /onClick=\{\(\) => selectProfessionalCategory\(item\.value\)\}/);
  assert.match(source, /value=\{professionalCategory\}/);
  assert.match(source, /onChange=\{\(e\) => selectProfessionalCategory\(e\.target\.value\)\}/);
  assert.match(source, /professionalCategories\.map\(\(item\) => \(/);
  assert.doesNotMatch(source, /professionalCategorySelectValue/);
  assert.doesNotMatch(source, /<option value="" disabled>/);

  const handlerBody = source.match(
    /function selectProfessionalCategory\(value\) \{([\s\S]*?)\n  \}/
  )?.[1] || "";

  assert.doesNotMatch(handlerBody, /setName\(/);
  assert.doesNotMatch(handlerBody, /setBusinessName\(/);
  assert.doesNotMatch(handlerBody, /setEmail\(/);
  assert.doesNotMatch(handlerBody, /setPassword\(/);
  assert.doesNotMatch(handlerBody, /setMobileNumber\(/);
});
