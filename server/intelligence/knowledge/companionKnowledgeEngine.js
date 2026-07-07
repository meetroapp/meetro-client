import {
  MEETRO_KNOWLEDGE_BASE,
  MEETRO_KNOWLEDGE_CATEGORIES,
} from "./meetroKnowledgeBase.js";

const MAX_SELECTED_KNOWLEDGE_ITEMS = 5;

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

function getSearchText({ userMessage = "", intent = "", context = {} } = {}) {
  return [
    userMessage,
    intent,
    context?.source?.page,
    context?.source?.surface,
    context?.workflow?.status,
    context?.workflow?.nextAction,
    context?.workflow?.serviceType,
    context?.professional?.businessName,
    ...(Array.isArray(context?.professional?.serviceCategories)
      ? context.professional.serviceCategories
      : []),
    context?.relationship?.knownRelationshipType,
    context?.user?.accountType,
    context?.user?.role,
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreItem(item, searchText, intent) {
  let score = 0;
  const normalizedText = normalize(searchText);
  const normalizedIntent = normalize(intent);

  for (const tag of item.tags || []) {
    if (normalizedText.includes(normalize(tag))) score += 3;
  }

  if (item.category === "workflowRules" && /workflow|guidance|next|schedule|quote|approval|completion|closure/.test(normalizedText)) {
    score += 4;
  }

  if (item.category === "safetyRules" && /emergency|danger|unsafe|disclaimer|guarantee/.test(normalizedText)) {
    score += 5;
  }

  if (item.category === "productRules" && /provider|openai|model|ai|frontend|context|memory|knowledge/.test(normalizedText)) {
    score += 5;
  }

  if (item.category === "responseGuidance" && ["workflow_guidance", "explanation", "reasoning"].includes(normalizedIntent)) {
    score += 2;
  }

  if (item.id === "community-purpose") score += 1;
  if (item.id === "relationship-first-communication") score += 1;

  return score;
}

function emptyKnowledgePacket() {
  return Object.fromEntries(MEETRO_KNOWLEDGE_CATEGORIES.map((category) => [category, []]));
}

function addKnowledgeItem(packet, item) {
  if (!packet[item.category]) return;
  packet[item.category].push(item.text);
}

export function buildCompanionKnowledge({
  userMessage = "",
  intent = "reasoning",
  context = {},
} = {}) {
  const searchText = getSearchText({ userMessage, intent, context });
  const selected = MEETRO_KNOWLEDGE_BASE
    .map((item, index) => ({
      item,
      index,
      score: scoreItem(item, searchText, intent),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, MAX_SELECTED_KNOWLEDGE_ITEMS)
    .map((entry) => entry.item);

  const packet = emptyKnowledgePacket();
  selected.forEach((item) => addKnowledgeItem(packet, item));

  return {
    packet,
    diagnostics: {
      knowledgeItemCount: selected.length,
      knowledgeCategories: [...new Set(selected.map((item) => item.category))],
      selectedKnowledgeIds: selected.map((item) => item.id),
    },
  };
}

export { MEETRO_KNOWLEDGE_BASE };
