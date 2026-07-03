import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Login keeps the current Meetro start surface while using backend 2FA", () => {
  const source = readFileSync(
    new URL("../src/pages/Login.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /SUPPORTED_LANGUAGES/);
  assert.match(source, /heroWaveOne/);
  assert.match(source, /welcomeTagline/);
  assert.match(source, /T\.getStarted/);
  assert.match(source, /verifyTwoFactorCode\(\{/);
  assert.doesNotMatch(source, /const languageSelect/);
  assert.doesNotMatch(source, /<span style=\{languageLabel\}>Language<\/span>/);
  assert.doesNotMatch(source, /123456/);
});
