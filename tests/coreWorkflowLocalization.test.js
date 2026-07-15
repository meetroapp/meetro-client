import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parse } from "espree";
import { translations } from "../src/utils/language.js";
import {
  CANONICAL_LANGUAGE_CODES,
  CORE_WORKFLOW_KEYS,
  getDeferredTranslationKeys,
} from "../src/utils/localizationContract.js";

const ROUTES = [
  "src/pages/Home.jsx",
  "src/pages/MessagesInbox.jsx",
  "src/pages/ConversationThread.jsx",
  "src/pages/ContractorDashboard.jsx",
  "src/pages/MeetroMoments.jsx",
  "src/pages/MeetroMomentDetails.jsx",
  "src/pages/Discover.jsx",
];

function routeKeys(path) {
  const keys = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "CallExpression" &&
      ["t", "translate"].includes(node.callee?.name) &&
      node.arguments?.[0]?.type === "Literal"
    ) keys.add(node.arguments[0].value);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value?.type) walk(value);
    }
  };
  walk(parse(fs.readFileSync(path, "utf8"), {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  }));
  return [...keys];
}

test("core daily workflow routes have direct four-language parity without fallback", () => {
  const keys = new Set(ROUTES.flatMap(routeKeys));
  assert.ok(keys.size >= 850);
  for (const language of CANONICAL_LANGUAGE_CODES) {
    const deferred = new Set(getDeferredTranslationKeys(language));
    for (const key of keys) {
      assert.ok(String(translations[language]?.[key] || "").trim(), `${language}:${key}`);
      assert.equal(deferred.has(key), false, `${language}:${key} must not be deferred`);
    }
  }
});

test("Phase 3 reviewed keys are complete and preserve truth-state distinctions", () => {
  for (const language of CANONICAL_LANGUAGE_CODES) {
    for (const key of CORE_WORKFLOW_KEYS) {
      assert.ok(String(translations[language]?.[key] || "").trim(), `${language}:${key}`);
    }
    assert.notEqual(translations[language].stateEmpty, translations[language].stateUnavailable);
    assert.notEqual(translations[language].stateFailed, translations[language].stateSending);
    assert.notEqual(translations[language].stateUnauthorized, translations[language].stateEmpty);
  }
});

test("mounted Phase 3 routes subscribe to language or receive reactive language state", () => {
  for (const path of [
    "src/pages/Home.jsx",
    "src/pages/MessagesInbox.jsx",
    "src/pages/ConversationThread.jsx",
    "src/pages/MeetroMoments.jsx",
    "src/pages/MeetroMomentDetails.jsx",
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /useLanguage|subscribeLanguage|meetro-language-change/);
  }
  assert.match(fs.readFileSync("src/pages/ContractorDashboard.jsx", "utf8"), /language = "en"/);
});

test("user-authored Moment and message content remains rendered as stored", () => {
  const moments = fs.readFileSync("src/pages/MeetroMoments.jsx", "utf8");
  const thread = fs.readFileSync("src/pages/ConversationThread.jsx", "utf8");
  assert.match(moments, /moment\.projectTitle/);
  assert.match(thread, /\{message\.text \|\| message\.content\}/);
  assert.match(thread, /text: payload\.text \|\| backendMessage\.message_text \|\| ""/);
  assert.match(thread, /getLocalizedMessageField\(msg, "text"\)/);
  assert.match(thread, /textKey: "conversationMessageWasUnsent"/);
  assert.match(thread, /titleKey: "momentDetailLocation"/);
});

test("Conversation Thread and Work Center no longer branch between only English and Spanish", () => {
  const thread = fs.readFileSync("src/pages/ConversationThread.jsx", "utf8");
  const workCenter = fs.readFileSync("src/pages/ContractorDashboard.jsx", "utf8");

  assert.doesNotMatch(thread, /language\s*===\s*["']es["']/);
  assert.doesNotMatch(workCenter, /activeLanguage\s*===\s*["']es["']/);
  assert.match(workCenter, /getFormattingLocale\(activeLanguage\)/);
});

test("dynamic core workflow copy reacts across all four languages", () => {
  const expected = {
    en: "Waiting on 3 materials",
    es: "Esperando 3 materiales",
    fr: "En attente de 3 matériaux",
    "pt-BR": "Aguardando 3 materiais",
  };

  for (const [language, value] of Object.entries(expected)) {
    assert.equal(translations[language].workCenterWaitingMaterialsCount.replace("{count}", "3"), value);
  }
});
