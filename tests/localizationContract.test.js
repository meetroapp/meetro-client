import assert from "node:assert/strict";
import test from "node:test";
import { DEFERRED_TRANSLATION_KEYS } from "../src/utils/deferredTranslationKeys.js";
import {
  FOUNDATION_CRITICAL_KEYS,
  SHARED_INTERFACE_KEYS,
} from "../src/utils/localizationContract.js";
import { auditLocalization } from "../scripts/validate-localization.mjs";

test("parser-backed localization contract has no duplicate or unknown active keys", async () => {
  const audit = await auditLocalization();
  assert.equal(audit.duplicates.length, 0);
  assert.ok(audit.activeKeys.length >= 1810);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(audit.unknownMissingByLanguage).map(([language, keys]) => [
        language,
        keys.length,
      ])
    ),
    { en: 0, es: 0, fr: 0, "pt-BR": 0 }
  );
});

test("certified shared-interface keys have complete non-deferred parity", async () => {
  const audit = await auditLocalization();
  assert.equal(SHARED_INTERFACE_KEYS.length, 86);
  for (const missing of Object.values(audit.sharedMissingByLanguage)) {
    assert.deepEqual(missing, []);
  }
  for (const deferred of Object.values(audit.sharedDeferredByLanguage)) {
    assert.deepEqual(deferred, []);
  }
});

test("foundation keys and interpolation placeholders have complete parity", async () => {
  const audit = await auditLocalization();
  assert.equal(FOUNDATION_CRITICAL_KEYS.length, 50);
  for (const missing of Object.values(audit.foundationMissingByLanguage)) {
    assert.deepEqual(missing, []);
  }
  assert.deepEqual(audit.interpolationMismatches, []);
});

test("every active FR/PT gap is explicitly inventoried and EN/ES require no fallback", async () => {
  const audit = await auditLocalization();
  assert.deepEqual(DEFERRED_TRANSLATION_KEYS.en, []);
  assert.deepEqual(DEFERRED_TRANSLATION_KEYS.es, []);
  assert.equal(DEFERRED_TRANSLATION_KEYS.fr.length, 222);
  assert.equal(DEFERRED_TRANSLATION_KEYS["pt-BR"].length, 222);
  assert.deepEqual(audit.missingActiveByLanguage.fr, DEFERRED_TRANSLATION_KEYS.fr);
  assert.deepEqual(
    audit.missingActiveByLanguage["pt-BR"],
    DEFERRED_TRANSLATION_KEYS["pt-BR"]
  );
});
