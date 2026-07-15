import { DEFERRED_TRANSLATION_KEYS } from "./deferredTranslationKeys.js";

export const CANONICAL_LANGUAGE_CODES = Object.freeze(["en", "es", "fr", "pt-BR"]);

export const FOUNDATION_CRITICAL_KEYS = Object.freeze([
  "account",
  "active",
  "available",
  "back",
  "business",
  "businessDashboard",
  "businessProfile",
  "businessTools",
  "cancel",
  "close",
  "communicationCenterTitle",
  "completed",
  "continue",
  "createAccount",
  "customers",
  "dashboard",
  "emailAddress",
  "emergency",
  "failed",
  "hiringCenter",
  "history",
  "home",
  "language",
  "loading",
  "login",
  "logout",
  "messages",
  "messagesSearchPlaceholder",
  "momentsYourMoments",
  "notifications",
  "operations",
  "password",
  "pending",
  "pleaseWait",
  "professional",
  "profile",
  "project",
  "returnHome",
  "retry",
  "save",
  "send",
  "serverError",
  "settings",
  "signIn",
  "somethingWentWrong",
  "teamMembers",
  "tryAgain",
  "unavailable",
  "work",
  "workCenterDashboardTitle",
]);

const deferredSets = Object.fromEntries(
  CANONICAL_LANGUAGE_CODES.map((language) => [
    language,
    new Set(DEFERRED_TRANSLATION_KEYS[language] || []),
  ])
);

export function isDeferredTranslationKey(key, language) {
  return deferredSets[language]?.has(String(key || "")) || false;
}

export function getDeferredTranslationKeys(language) {
  return [...(DEFERRED_TRANSLATION_KEYS[language] || [])];
}
