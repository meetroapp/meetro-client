import { normalizeLanguage } from "./language.js";

export function getLocalizedHiringText(record = {}, field, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const translations = record?.[`${field}Translations`];

  return (
    translations?.[normalizedLanguage] ||
    translations?.en ||
    record?.[field] ||
    ""
  );
}

export function getLocalizedHiringList(record = {}, field, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const translations = record?.[`${field}Translations`];
  const localizedList = translations?.[normalizedLanguage] || translations?.en;

  if (Array.isArray(localizedList)) return localizedList;
  if (Array.isArray(record?.[field])) return record[field];
  return [];
}

export function getLocalizedHiringJobDisplay(job = {}, language) {
  return {
    title: getLocalizedHiringText(job, "title", language),
    category: getLocalizedHiringText(job, "category", language),
    description: getLocalizedHiringText(job, "description", language),
    experienceRequired: getLocalizedHiringText(job, "experienceRequired", language),
    requirements: getLocalizedHiringList(job, "requirements", language),
  };
}
