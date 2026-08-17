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
    /(?:^|[.!?;]\s*)(?:final\s+(?:price|selling\s+price|quote)|quote\s+total|total|precio\s+final|prix\s+final|preço\s+final)\s*(?:is|es|est|é|:)?\s*\$?\s*([\d,.]+)/i,
    /(?:^|[.!?;]\s*)\$\s*([\d,.]+)\s*(?:final|total)/i,
  ]);
  return match ? parseAmount(match[match.length - 1]) : null;
}

function explicitMaterialAmount(text) {
  const match = firstMatch(text, [
    /(?:use|set|materials?|materiales|matériaux|materiais)\s*(?:(?:are|is|costs?|to|at|de|a)|:)?\s*\$\s*([\d,.]+)/i,
    /\$\s*([\d,.]+)\s+(?:for\s+)?(?:materials?|materiales|matériaux|materiais)/i,
  ]);
  return match ? parseAmount(match[1]) : null;
}

function explicitLaborAmount(text) {
  const match = firstMatch(text, [
    /(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|:)?\s*\$\s*([\d,.]+)/i,
    /\$\s*([\d,.]+)\s+(?:for\s+)?(?:labor|labour|installation)/i,
  ]);
  return match ? parseAmount(match[1]) : null;
}

function explicitCustomerName(text) {
  const match = text.match(/(?:quote\s+for|customer\s+is|client\s+is)\s+([^.!?]+)/i);
  return cleanText(match?.[1] || "");
}

function explicitDuration(text) {
  const match = text.match(/(?:about|around|approximately|duration|takes?|should\s+take|dura(?:ción|ção)?|aproximadamente|environ|durée)?\s*((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?|horas?|días?|dias?|semaines?|jours?|semanas?))/i);
  const words = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
  return cleanText(match?.[1] || "")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, (word) => words[word.toLowerCase()])
    .replace(/^a\s+/i, "1 ");
}

function replaceExistingDuration(value, duration) {
  const current = cleanText(value);
  if (!current || !duration) return current;
  return cleanText(current.replace(
    /\d+(?:\s*[–—-]\s*\d+)?\s*(?:hours?|hrs?|days?|weeks?|horas?|días?|dias?|semaines?|jours?|semanas?)/i,
    duration
  ));
}

function explicitDeposit(text) {
  const match = text.match(
    /(\d{1,3})\s*%\s*(?:deposit|depósito|acompte|entrada|sinal)/i
  );
  if (!match) return "";
  const percent = Math.min(Number(match[1]), 100);
  return Number.isFinite(percent) ? `${percent}% deposit` : "";
}

function explicitNote(text) {
  const match = text.match(/\bnote\s*:\s*([^.!?]+)/i);
  return cleanText(match?.[1] || "");
}

function explicitCondition(text) {
  const match = text.match(/\bcondition\s*:\s*([^.!?]+)/i);
  return cleanText(match?.[1] || "");
}

function explicitMaterialItems(text) {
  const items = [];
  const generic = explicitMaterialAmount(text);
  if (generic !== null) items.push({ name: "Materials", quantity: "1", cost: String(generic) });

  const specific = text.match(/\b([A-Za-z][\w -]{1,38}?)\s+costs?\s*\$\s*([\d,.]+)/gi) || [];
  specific.forEach((statement) => {
    const match = statement.match(/^(.+?)\s+costs?\s*\$\s*([\d,.]+)/i);
    const amount = parseAmount(match?.[2]);
    const name = cleanText(match?.[1] || "");
    if (amount !== null && name && !/^(?:labor|labour|installation)$/i.test(name)) {
      items.push({ name, quantity: "1", cost: String(amount) });
    }
  });

  const useSpecific = text.match(/\buse\s+\$\s*([\d,.]+)\s+for\s+(?:the\s+)?([A-Za-z][\w -]{1,38}?)(?:\.|$)/i);
  if (useSpecific) {
    const amount = parseAmount(useSpecific[1]);
    if (amount !== null) items.push({ name: cleanText(useSpecific[2]), quantity: "1", cost: String(amount) });
  }
  return items;
}

function explicitLaborItems(text) {
  const items = [];
  const hourly = text.match(/\b(labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|:)?\s*(\d+(?:\.\d+)?)\s+hours?\s+at\s+\$\s*([\d,.]+)\s+per\s+hour/i);
  if (hourly) {
    const hours = parseAmount(hourly[2]);
    const rate = parseAmount(hourly[3]);
    if (hours !== null && rate !== null) {
      items.push({ description: cleanText(hourly[1]), hours: String(hours), rate: String(rate) });
      return items;
    }
  }
  const match = text.match(/\b(labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|:)?\s*\$\s*([\d,.]+)/i);
  if (match) {
    const amount = parseAmount(match[2]);
    if (amount !== null) items.push({ description: cleanText(match[1]), total: String(amount) });
  }
  return items;
}

function cleanScope(text) {
  let scope = text;
  scope = scope.replace(/(?:quote\s+for|customer\s+is|client\s+is)\s+[^.!?]+[.!?]?/i, "");
  scope = scope.replace(/\b(?:materials?|materiales|matériaux|materiais|labor|labour|installation|tax|subtotal)\s+(?:(?:total)\s+(?:is|are|:)?\s*\$\s*[\d,.]+|\$\s*[\d,.]+\s+total)[.!]?/gi, "");
  scope = scope.replace(/\b(?:materials?|materiales|matériaux|materiais)\s+(?:are|is|costs?|de|a|:)?\s*\$\s*[\d,.]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+(?:is|are|costs?|:)?\s*\$\s*[\d,.]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:estimated\s+)?duration\s+(?:is|:)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?)[.!]?/gi, "");
  scope = scope.replace(/\b(?:about|around|approximately|should\s+take|takes?)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?)[.!]?/gi, "");
  scope = scope.replace(/\b\d{1,3}\s*%\s*(?:deposit|depósito|acompte|entrada|sinal)(?:\s+required)?[.!]?/gi, "");
  scope = scope.replace(/\b(?:final\s+(?:price|selling\s+price|quote)|quote\s+total|total|precio\s+final|prix\s+final|preço\s+final)\s*(?:is|es|est|é|:)?\s*\$?\s*[\d,.]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:note|condition)\s*:\s*[^.!?]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:[A-Za-z][\w -]{1,38}?)\s+costs?\s*\$\s*[\d,.]+[.!]?/gi, "");
  return cleanText(scope).replace(/\s+([.!?])/g, "$1").replace(/\.{2,}/g, ".").replace(/\s+(?:and|with|,)$/i, "");
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
  const laborAmount = explicitLaborAmount(instruction);
  const laborItems = explicitLaborItems(instruction);
  const customerName = explicitCustomerName(instruction);
  const duration = explicitDuration(instruction);
  const deposit = explicitDeposit(instruction);
  const note = explicitNote(instruction);
  const condition = explicitCondition(instruction);
  const replacement = explicitReplacement(instruction);
  const scope = cleanScope(replacement || instruction);

  if (!revision) {
    if (scope) {
      patch.projectDescription = scope;
      patch.recommendedSolution = scope;
      if (!cleanText(current.projectTitle)) patch.projectTitle = suggestedTitle(scope);
      if (!cleanText(current.lineItemDescription)) patch.lineItemDescription = suggestedTitle(scope);
    }
    if (customerName) patch.customerName = customerName;
  }
  if (revision && customerName) patch.customerName = customerName;

  if (replacement) {
    patch.projectDescription = replacement;
    patch.problemFound = replacement;
    patch.recommendedSolution = replacement;
  }

  if (revision && /\bremove\b/i.test(instruction)) {
    patch.projectDescription = removeRequestedText(current.projectDescription, instruction);
    patch.problemFound = removeRequestedText(current.problemFound, instruction);
    patch.recommendedSolution = removeRequestedText(current.recommendedSolution, instruction);
  }

  if (duration) {
    patch.timeline = duration;
    patch.estimatedDuration = duration;
    if (revision) {
      for (const key of ["projectDescription", "problemFound", "recommendedSolution"]) {
        const revisedValue = replaceExistingDuration(current[key], duration);
        if (revisedValue && revisedValue !== cleanText(current[key])) patch[key] = revisedValue;
      }
    }
  }
  if (finalPrice !== null) patch.totalOverride = String(finalPrice);
  if (materialAmount !== null) patch.materialAmount = String(materialAmount);
  if (laborAmount !== null || laborItems.length) patch.laborItems = laborItems;
  const materialItems = explicitMaterialItems(instruction);
  if (materialItems.length) patch.materialItems = materialItems;
  if (deposit) {
    patch.depositRequired = "Yes";
    patch.depositTerms = deposit;
  }
  if (note) patch.notes = note;
  if (condition) patch.terms = condition;

  return Object.freeze(patch);
}

export function mergeQuickQuoteConversationPatch(current = {}, patch = {}) {
  return Object.freeze({ ...current, ...patch });
}
