import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getLanguage,
  normalizeLanguage,
  resolveTranslation,
  setLanguage,
  subscribeLanguage,
  t,
} from "../src/utils/language.js";
import {
  FORMATTING_LOCALES,
  formatLocaleCurrency,
  formatLocaleDate,
  formatLocaleNumber,
  formatLocalePercentage,
  formatLocaleRelativeTime,
  formatLocaleTime,
  getFormattingLocale,
} from "../src/utils/localeFormat.js";

const aliases = {
  en: ["en", "en-US", "en-GB", " EN_us "],
  es: ["es", "es-US", "es-ES", "es-MX"],
  fr: ["fr", "fr-FR", "fr-CA", "FR_fr"],
  "pt-BR": ["pt", "pt-BR", "pt-PT", "PT_br"],
};

test("documented locale aliases normalize to canonical persisted codes", () => {
  for (const [canonical, values] of Object.entries(aliases)) {
    for (const value of values) assert.equal(normalizeLanguage(value), canonical);
  }
  for (const malformed of [null, undefined, 14, {}, "", "unknown-ZZ"]) {
    assert.equal(normalizeLanguage(malformed), "en");
  }
});

test("lookup reports selected, deferred fallback, and safe missing states", () => {
  assert.deepEqual(resolveTranslation("home", "es"), {
    key: "home",
    language: "es",
    source: "selected",
    value: "Inicio",
    missingVariables: [],
  });
  assert.equal(
    resolveTranslation("professionalOnboardingWelcomeTitle", "fr").source,
    "deferred-english"
  );
  assert.equal(resolveTranslation("welcomeBack", "fr").source, "missing");
  assert.equal(t("welcomeBack", "fr"), "");
  assert.equal(t("notARealTranslationKey", "fr"), "");
  assert.doesNotThrow(() => t(null, null));
});

test("interpolation preserves variables and removes unavailable placeholders safely", () => {
  const complete = resolveTranslation("businessLeadsSubtitle", "fr", {
    businessName: "Atelier Meetro",
  });
  assert.match(complete.value, /Atelier Meetro/);
  assert.deepEqual(complete.missingVariables, []);

  const incomplete = resolveTranslation("businessLeadsSubtitle", "pt-BR");
  assert.deepEqual(incomplete.missingVariables, ["businessName"]);
  assert.doesNotMatch(incomplete.value, /\{businessName\}/);
});

test("canonical subscription updates a mounted language observer without reload", () => {
  const previousLocalStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const storage = new Map();
  const listeners = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  globalThis.window = {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
    dispatchEvent: () => true,
  };

  try {
    const observed = [];
    const unsubscribe = subscribeLanguage(() => observed.push(t("home")));
    for (const language of ["en", "es", "fr", "pt", "en-GB"]) setLanguage(language);
    unsubscribe();

    assert.deepEqual(observed, ["Home", "Inicio", "Accueil", "Início", "Home"]);
    assert.equal(getLanguage(), "en");
    assert.equal(storage.get("meetroLanguage"), "en");
  } finally {
    if (previousLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocalStorage;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("BottomNav consumes the canonical reactive language hook", () => {
  const source = fs.readFileSync("src/components/BottomNav.jsx", "utf8");
  assert.match(source, /import useLanguage from "\.\.\/hooks\/useLanguage"/);
  assert.match(source, /const language = useLanguage\(\)/);
  assert.doesNotMatch(source, /updateLanguage\(getLanguage\(\)\)/);
});

test("shared formatters use documented locales for all supported values", () => {
  assert.deepEqual(FORMATTING_LOCALES, {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    "pt-BR": "pt-BR",
  });
  const date = new Date(2026, 6, 15, 13, 30);
  for (const [language, locale] of Object.entries(FORMATTING_LOCALES)) {
    assert.equal(getFormattingLocale(language), locale);
    assert.equal(
      formatLocaleDate(date, { dateStyle: "medium" }, language),
      new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date)
    );
    assert.equal(
      formatLocaleTime(date, { timeStyle: "short" }, language),
      new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(date)
    );
    assert.equal(
      formatLocaleNumber(12345.6, {}, language),
      new Intl.NumberFormat(locale).format(12345.6)
    );
    assert.ok(formatLocaleCurrency(42.5, "USD", {}, language));
    assert.ok(formatLocalePercentage(0.42, {}, language));
    assert.ok(formatLocaleRelativeTime(-1, "day", {}, language));
  }
  assert.equal(formatLocaleDate("invalid"), "");
  assert.equal(formatLocaleNumber("invalid"), "");
});
