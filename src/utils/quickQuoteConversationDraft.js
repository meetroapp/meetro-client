function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseAmount(value) {
  const amount = Number(String(value || "").replace(/[,\s]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function explicitFinalPrice(text) {
  const match = firstMatch(text, [
    /(?:final\s+(?:price|selling\s+price)|total|precio\s+final|prix\s+final|preço\s+final)\s*(?:is|es|est|é|:)?\s*\$?\s*([\d,.]+)/i,
    /\$\s*([\d,.]+)\s*(?:final|total)/i,
  ]);
  return match ? parseAmount(match[1]) : null;
}

function explicitMaterialAmount(text) {
  const match = firstMatch(text, [
    /(?:use|set|materials?|materiales|matériaux|materiais)\s*(?:to|at|de|a|:)?\s*\$\s*([\d,.]+)/i,
    /\$\s*([\d,.]+)\s+(?:for\s+)?(?:materials?|materiales|matériaux|materiais)/i,
  ]);
  return match ? parseAmount(match[1]) : null;
}

function explicitDuration(text) {
  const match = text.match(
    /(?:about|around|approximately|duration|takes?|dura(?:ción|ção)?|aproximadamente|environ|durée)?\s*(\d+(?:\s*[–—-]\s*\d+)?\s*(?:hours?|hrs?|days?|weeks?|horas?|días?|dias?|semaines?|jours?|semanas?))/i
  );
  return cleanText(match?.[1] || "");
}

function explicitDeposit(text) {
  const match = text.match(
    /(\d{1,3})\s*%\s*(?:deposit|depósito|acompte|entrada|sinal)/i
  );
  if (!match) return "";
  const percent = Math.min(Number(match[1]), 100);
  return Number.isFinite(percent) ? `${percent}% deposit` : "";
}

function suggestedTitle(text) {
  const title = cleanText(text.split(/[,.!?]/, 1)[0]);
  return title.length > 72 ? `${title.slice(0, 69).trim()}…` : title;
}

function explicitReplacement(text) {
  const match = text.match(/(?:just\s+say|use\s+this\s+wording|scope\s*(?:is|:))\s+["“]?(.+?)["”]?(?:\.|$)/i);
  return cleanText(match?.[1] || "");
}

function removeRequestedText(value, instruction) {
  const match = instruction.match(/remove\s+(?:the\s+)?["“]?(.+?)["”]?(?:\.|$)/i);
  const target = cleanText(match?.[1] || "");
  if (!target) return value;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanText(String(value || "").replace(new RegExp(escaped, "ig"), ""));
}

export function buildQuickQuoteConversationPatch({
  prompt,
  current = {},
  revision = false,
} = {}) {
  const instruction = cleanText(prompt);
  if (!instruction) return Object.freeze({});

  const patch = {};
  const finalPrice = explicitFinalPrice(instruction);
  const materialAmount = explicitMaterialAmount(instruction);
  const duration = explicitDuration(instruction);
  const deposit = explicitDeposit(instruction);
  const replacement = explicitReplacement(instruction);

  if (!revision) {
    patch.projectDescription = instruction;
    if (!cleanText(current.projectTitle)) patch.projectTitle = suggestedTitle(instruction);
    if (!cleanText(current.problemFound)) patch.problemFound = instruction;
    if (!cleanText(current.recommendedSolution)) patch.recommendedSolution = instruction;
    if (!cleanText(current.lineItemDescription)) patch.lineItemDescription = suggestedTitle(instruction);
  }

  if (replacement) {
    patch.projectDescription = replacement;
    patch.problemFound = replacement;
    patch.recommendedSolution = replacement;
  }

  if (/\bremove\b/i.test(instruction)) {
    patch.projectDescription = removeRequestedText(current.projectDescription, instruction);
    patch.problemFound = removeRequestedText(current.problemFound, instruction);
    patch.recommendedSolution = removeRequestedText(current.recommendedSolution, instruction);
  }

  if (duration) {
    patch.timeline = duration;
    patch.estimatedDuration = duration;
  }
  if (finalPrice !== null) patch.totalOverride = String(finalPrice);
  if (materialAmount !== null) patch.materialAmount = String(materialAmount);
  if (deposit) {
    patch.depositRequired = "Yes";
    patch.depositTerms = deposit;
  }

  return Object.freeze(patch);
}

export function mergeQuickQuoteConversationPatch(current = {}, patch = {}) {
  return Object.freeze({ ...current, ...patch });
}
