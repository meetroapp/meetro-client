import { getLanguage, normalizeLanguage } from "./language.js";

export const FORMATTING_LOCALES = Object.freeze({
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  "pt-BR": "pt-BR",
});

export function getFormattingLocale(language = getLanguage()) {
  return FORMATTING_LOCALES[normalizeLanguage(language)] || FORMATTING_LOCALES.en;
}

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocaleDate(value, options = {}, language = getLanguage()) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat(getFormattingLocale(language), options).format(date) : "";
}

export function formatLocaleTime(value, options = {}, language = getLanguage()) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat(getFormattingLocale(language), options).format(date) : "";
}

export function formatLocaleNumber(value, options = {}, language = getLanguage()) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(getFormattingLocale(language), options).format(number)
    : "";
}

export function formatLocaleCurrency(
  value,
  currency = "USD",
  options = {},
  language = getLanguage()
) {
  return formatLocaleNumber(
    value,
    { style: "currency", currency, ...options },
    language
  );
}

export function formatLocalePercentage(value, options = {}, language = getLanguage()) {
  return formatLocaleNumber(value, { style: "percent", ...options }, language);
}

export function formatLocaleRelativeTime(
  value,
  unit = "day",
  options = {},
  language = getLanguage()
) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.RelativeTimeFormat(getFormattingLocale(language), {
        numeric: "auto",
        ...options,
      }).format(number, unit)
    : "";
}
