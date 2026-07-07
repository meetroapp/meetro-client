export const INTELLIGENCE_ENGINE_CONTRACT_VERSION = "1.0";

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanObject(value = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanArray(value = []) {
  return Array.isArray(value) ? value : [];
}

export function createIntelligenceEngineSuccess({
  engine = "",
  data = {},
  diagnostics = {},
  warnings = [],
} = {}) {
  return {
    ok: true,
    success: true,
    contractVersion: INTELLIGENCE_ENGINE_CONTRACT_VERSION,
    engine: cleanText(engine, "unknown_engine"),
    data: cleanObject(data),
    diagnostics: cleanObject(diagnostics),
    warnings: cleanArray(warnings),
  };
}

export function createIntelligenceEngineFailure({
  engine = "",
  code = "engine_failure",
  message = "The intelligence engine could not complete safely.",
  data = {},
  diagnostics = {},
  recoverable = true,
} = {}) {
  return {
    ok: false,
    success: false,
    contractVersion: INTELLIGENCE_ENGINE_CONTRACT_VERSION,
    engine: cleanText(engine, "unknown_engine"),
    data: cleanObject(data),
    diagnostics: cleanObject(diagnostics),
    recoverable: recoverable !== false,
    error: {
      code: cleanText(code, "engine_failure"),
      message: cleanText(message, "The intelligence engine could not complete safely."),
    },
  };
}

export function isIntelligenceEngineResult(value = {}) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    value.contractVersion === INTELLIGENCE_ENGINE_CONTRACT_VERSION &&
    typeof value.engine === "string" &&
    typeof value.ok === "boolean" &&
    typeof value.success === "boolean"
  );
}

