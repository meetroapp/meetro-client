import { Buffer } from "node:buffer";

const DEFAULT_MAX_CONTEXT_BYTES = 48_000;
const PROTECTED_SECTIONS = new Set(["system"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmpty(value) {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isRecord(value)) return Object.keys(value).length === 0;
  return false;
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function buildUnifiedContext(engineResults = [], { maxBytes = DEFAULT_MAX_CONTEXT_BYTES } = {}) {
  const context = {};
  const sections = [];
  const droppedSections = [];
  let truncated = false;

  const ordered = engineResults
    .filter((result) => result?.section && !isEmpty(result.data))
    .map((result, index) => ({ ...result, index }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index);

  for (const result of ordered) {
    if (Object.hasOwn(context, result.section) || PROTECTED_SECTIONS.has(result.section)) {
      droppedSections.push(result.section);
      continue;
    }

    const candidate = { ...context, [result.section]: structuredClone(result.data) };
    if (byteLength(candidate) > maxBytes) {
      truncated = true;
      droppedSections.push(result.section);
      continue;
    }

    context[result.section] = candidate[result.section];
    sections.push(result.section);
  }

  return {
    context,
    metadata: {
      sections,
      truncated,
      droppedSections,
      byteLength: byteLength(context),
    },
  };
}

export { DEFAULT_MAX_CONTEXT_BYTES };
