import { COMPANION_CAPABILITY_LIBRARY } from "./capabilityLibrary.js";

const MAX_PRIMARY_CAPABILITIES = 6;
const MAX_SUPPORTING_CAPABILITIES = 8;
const MAX_CAPABILITY_FAMILIES = 5;

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function uniqueLimited(values = [], limit = 5) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function getCapabilitySearchText({ userMessage = "", intent = "", context = {}, knowledge = {} } = {}) {
  return [
    userMessage,
    intent,
    context?.source?.page,
    context?.source?.surface,
    context?.workflow?.status,
    context?.workflow?.nextAction,
    context?.workflow?.serviceType,
    context?.user?.accountType,
    context?.user?.role,
    ...(Array.isArray(context?.professional?.serviceCategories)
      ? context.professional.serviceCategories
      : []),
    ...(Array.isArray(context?.professional?.specialties)
      ? context.professional.specialties
      : []),
    ...(Array.isArray(knowledge?.responseGuidance) ? knowledge.responseGuidance : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreCapabilityEntry(entry, searchText) {
  const normalizedText = normalize(searchText);
  let score = 0;

  for (const label of entry.labels || []) {
    const normalizedLabel = normalize(label);
    if (normalizedText.includes(normalizedLabel)) {
      score += Math.max(4, normalizedLabel.length / 4);
    }
  }

  for (const capability of [
    ...(entry.primaryCapabilities || []),
    ...(entry.supportingCapabilities || []),
    ...(entry.capabilityFamilies || []),
  ]) {
    if (normalizedText.includes(normalize(capability))) score += 2;
  }

  return score;
}

function buildReasoningSummary(matches = []) {
  if (!matches.length) {
    return "No specific capability pattern was strong enough to infer beyond the visible context.";
  }

  const labels = matches.map((match) => match.entry.id.replaceAll("-", " ")).slice(0, 2);
  return `The request most closely matches ${labels.join(" and ")} work patterns, so only those capability signals were selected.`;
}

export function buildCompanionCapabilities({
  userMessage = "",
  intent = "reasoning",
  context = {},
  knowledge = {},
} = {}) {
  const searchText = getCapabilitySearchText({ userMessage, intent, context, knowledge });
  const matches = COMPANION_CAPABILITY_LIBRARY
    .map((entry, index) => ({
      entry,
      index,
      score: scoreCapabilityEntry(entry, searchText),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3);

  const primaryCapabilities = uniqueLimited(
    matches.flatMap((match) => match.entry.primaryCapabilities || []),
    MAX_PRIMARY_CAPABILITIES
  );
  const supportingCapabilities = uniqueLimited(
    matches.flatMap((match) => match.entry.supportingCapabilities || []),
    MAX_SUPPORTING_CAPABILITIES
  );
  const capabilityFamilies = uniqueLimited(
    matches.flatMap((match) => match.entry.capabilityFamilies || []),
    MAX_CAPABILITY_FAMILIES
  );
  const topScore = matches[0]?.score || 0;
  const confidence = matches.length ? Math.min(0.9, Number((0.45 + topScore / 20).toFixed(2))) : 0.2;

  return {
    primaryCapabilities,
    supportingCapabilities,
    capabilityFamilies,
    confidence,
    reasoningSummary: buildReasoningSummary(matches),
  };
}

export { COMPANION_CAPABILITY_LIBRARY };

