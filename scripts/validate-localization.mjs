import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "espree";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGUAGE_SOURCE = path.join(ROOT, "src/utils/language.js");
const ACTIVE_ROOTS = [
  path.join(ROOT, "src/App.jsx"),
  path.join(ROOT, "src/components"),
  path.join(ROOT, "src/pages"),
];
const BACKUP_FILE_PATTERN = /(?:\.bak(?:-|\.)|backup|\.orig(?:\.|$))/i;
const PLACEHOLDER_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
    else if (value && typeof value === "object" && value.type) walk(value, visit);
  }
}

function parseModule(source, filePath) {
  return parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: filePath.endsWith(".jsx") },
    loc: true,
  });
}

function listSourceFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) return listSourceFiles(child);
    return /\.(?:js|jsx)$/.test(entry.name) && !BACKUP_FILE_PATTERN.test(entry.name)
      ? [child]
      : [];
  });
}

function propertyName(property) {
  if (!property || property.computed) return null;
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal") return String(property.key.value);
  return null;
}

function findDuplicateProperties() {
  const source = fs.readFileSync(LANGUAGE_SOURCE, "utf8");
  const ast = parseModule(source, LANGUAGE_SOURCE);
  const duplicates = [];

  walk(ast, (node) => {
    if (node.type !== "ObjectExpression") return;
    const seen = new Map();
    for (const property of node.properties) {
      if (property.type !== "Property") continue;
      const key = propertyName(property);
      if (!key) continue;
      if (seen.has(key)) {
        duplicates.push({
          key,
          firstLine: seen.get(key),
          duplicateLine: property.loc.start.line,
        });
      } else {
        seen.set(key, property.loc.start.line);
      }
    }
  });

  return duplicates;
}

function findActiveKeys() {
  const keys = new Set();
  const files = ACTIVE_ROOTS.flatMap(listSourceFiles);

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");
    const ast = parseModule(source, filePath);
    walk(ast, (node) => {
      if (node.type !== "CallExpression") return;
      if (node.callee?.type !== "Identifier") return;
      if (!new Set(["t", "translate"]).has(node.callee.name)) return;
      const argument = node.arguments?.[0];
      if (argument?.type === "Literal" && typeof argument.value === "string") {
        keys.add(argument.value);
      }
    });
  }

  return [...keys].sort();
}

function placeholders(value) {
  return [...String(value || "").matchAll(PLACEHOLDER_PATTERN)]
    .map((match) => match[1])
    .sort();
}

export async function auditLocalization() {
  const languageModule = await import(`${pathToFileURL(LANGUAGE_SOURCE).href}?audit=${Date.now()}`);
  const contractModule = await import(
    `${pathToFileURL(path.join(ROOT, "src/utils/localizationContract.js")).href}?audit=${Date.now()}`
  );
  const { translations } = languageModule;
  const { CANONICAL_LANGUAGE_CODES, FOUNDATION_CRITICAL_KEYS, getDeferredTranslationKeys } =
    contractModule;
  const activeKeys = findActiveKeys();
  const duplicates = findDuplicateProperties();
  const missingActiveByLanguage = {};
  const unknownMissingByLanguage = {};
  const foundationMissingByLanguage = {};

  for (const language of CANONICAL_LANGUAGE_CODES) {
    const dictionary = translations[language] || {};
    const missing = activeKeys.filter((key) => !String(dictionary[key] || "").trim());
    const deferred = new Set(getDeferredTranslationKeys(language));
    missingActiveByLanguage[language] = missing;
    unknownMissingByLanguage[language] = missing.filter((key) => !deferred.has(key));
    foundationMissingByLanguage[language] = FOUNDATION_CRITICAL_KEYS.filter(
      (key) => !String(dictionary[key] || "").trim()
    );
  }

  const templateKeys = new Set(
    CANONICAL_LANGUAGE_CODES.flatMap((language) => Object.keys(translations[language] || {}))
  );
  const interpolationMismatches = [];
  for (const key of templateKeys) {
    const englishPlaceholders = placeholders(translations.en?.[key]);
    if (!englishPlaceholders.length) continue;
    for (const language of CANONICAL_LANGUAGE_CODES.slice(1)) {
      const localized = translations[language]?.[key];
      if (!localized) continue;
      const localizedPlaceholders = placeholders(localized);
      if (JSON.stringify(localizedPlaceholders) !== JSON.stringify(englishPlaceholders)) {
        interpolationMismatches.push({ key, language, englishPlaceholders, localizedPlaceholders });
      }
    }
  }

  return {
    activeKeys,
    duplicates,
    missingActiveByLanguage,
    unknownMissingByLanguage,
    foundationMissingByLanguage,
    interpolationMismatches,
  };
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const result = await auditLocalization();
  const summary = {
    duplicateCount: result.duplicates.length,
    activeKeyCount: result.activeKeys.length,
    missingActiveCount: Object.fromEntries(
      Object.entries(result.missingActiveByLanguage).map(([language, keys]) => [language, keys.length])
    ),
    unknownMissingCount: Object.fromEntries(
      Object.entries(result.unknownMissingByLanguage).map(([language, keys]) => [language, keys.length])
    ),
    foundationMissingCount: Object.fromEntries(
      Object.entries(result.foundationMissingByLanguage).map(([language, keys]) => [language, keys.length])
    ),
    interpolationMismatchCount: result.interpolationMismatches.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (process.argv.includes("--details")) console.log(JSON.stringify(result, null, 2));

  const failed =
    summary.duplicateCount > 0 ||
    summary.interpolationMismatchCount > 0 ||
    Object.values(summary.unknownMissingCount).some(Boolean) ||
    Object.values(summary.foundationMissingCount).some(Boolean);
  if (failed) process.exitCode = 1;
}
