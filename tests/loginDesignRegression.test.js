import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
  assert.match(source, /Continue the work that matters\./);
  assert.match(source, /Sign in to continue where you left off\./);
  assert.match(source, /Join Meetro Community/);
  assert.match(source, /continueAction: "Continue"/);
  assert.match(source, /Built around trust, meaningful work, and lasting relationships\./);
  assert.match(source, /We're here to support you and the people you serve\./);
  assert.match(source, /Meetro Community is built around trust, relationships, and the work that matters most\./);
  assert.match(source, /T\.getStarted/);
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
  assert.doesNotMatch(source, /getStarted: "Get Started"/);
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
