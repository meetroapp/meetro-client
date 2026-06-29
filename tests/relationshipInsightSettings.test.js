import assert from "node:assert/strict";
import test from "node:test";
import {
  areRelationshipInsightsEnabled,
  getRelationshipInsightsPreferenceKey,
  setRelationshipInsightsEnabled,
} from "../src/utils/relationshipInsightSettings.js";
import { t } from "../src/utils/language.js";

function makeStorage(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("relationship insights preference defaults on", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });

  assert.equal(areRelationshipInsightsEnabled({ storage }), true);
});

test("insights setting keeps the existing relationship insights storage key", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });

  const key = getRelationshipInsightsPreferenceKey({ storage, role: "personal" });
  const result = setRelationshipInsightsEnabled(false, {
    storage,
    role: "personal",
    dispatchEvent: false,
  });

  assert.equal(key, "meetro.relationshipInsights.enabled:sarah@example.com:personal");
  assert.equal(result.key, key);
  assert.equal(areRelationshipInsightsEnabled({ storage, role: "personal" }), false);
});

test("relationship insights preference is account and role scoped", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });

  const personalKey = getRelationshipInsightsPreferenceKey({ storage, role: "personal" });
  const businessKey = getRelationshipInsightsPreferenceKey({ storage, role: "business" });

  assert.notEqual(personalKey, businessKey);

  setRelationshipInsightsEnabled(false, {
    storage,
    role: "personal",
    dispatchEvent: false,
  });

  assert.equal(areRelationshipInsightsEnabled({ storage, role: "personal" }), false);
  assert.equal(areRelationshipInsightsEnabled({ storage, role: "business" }), true);
});

test("insights setting labels describe relationship and commitment insights", () => {
  const expected = {
    en: {
      label: "Insights",
      description: "Show helpful relationship and commitment insights while I work.",
    },
    es: {
      label: "Ideas útiles",
      description: "Mostrar ideas útiles sobre relaciones y compromisos mientras trabajo.",
    },
    fr: {
      label: "Informations utiles",
      description:
        "Afficher des informations utiles sur les relations et les engagements pendant que je travaille.",
    },
    "pt-BR": {
      label: "Insights",
      description:
        "Mostrar insights úteis sobre relacionamentos e compromissos enquanto trabalho.",
    },
  };

  Object.entries(expected).forEach(([language, copy]) => {
    assert.equal(t("relationshipInsights", language), copy.label);
    assert.equal(t("relationshipInsightsDescription", language), copy.description);
  });
});
