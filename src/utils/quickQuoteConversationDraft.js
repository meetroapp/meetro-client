function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseAmount(value) {
  const amount = Number(String(value || "").replace(/[,\s]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function capitalizeLabel(value) {
  const label = cleanText(value).replace(/^[.!?;,\s]+/, "").replace(/^the\s+/i, "");
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "";
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

const STRUCTURED_QUOTE_FIELD =
  /\b(customer(?:\s+name)?|client(?:\s+name)?|project|scope(?:\s+of\s+work)?|materials?\s+total|labor\s+total|installation\s+total|tax\s+total|subtotal|final\s+price|project\s+price|quote\s+total|price|total|estimated\s+duration|duration|payment\s+terms?|customer\s+note|quote\s+note)\s*:\s*/gi;

function structuredFieldName(value) {
  const label = cleanText(value).toLowerCase();
  if (["customer", "customer name", "client", "client name"].includes(label)) return "customer";
  if (label === "project") return "project";
  if (["scope", "scope of work"].includes(label)) return "scope";
  if (["final price", "project price", "quote total", "price", "total"].includes(label)) return "price";
  if (["estimated duration", "duration"].includes(label)) return "duration";
  if (["payment term", "payment terms"].includes(label)) return "paymentTerms";
  if (["customer note", "quote note"].includes(label)) return "notes";
  return "";
}

function structuredQuoteFields(value) {
  const text = String(value || "").trim();
  if (!text) return Object.freeze({});

  const matches = [...text.matchAll(STRUCTURED_QUOTE_FIELD)];
  const fields = {};

  matches.forEach((match, index) => {
    const key = structuredFieldName(match[1]);
    const next = matches[index + 1];
    const rawValue = text.slice(match.index + match[0].length, next?.index ?? text.length);
    const fieldValue = cleanText(rawValue)
      .replace(/^[,;\s]+/, "")
      .replace(/[.;,\s]+$/, "")
      .trim();
    if (key && fieldValue) fields[key] = fieldValue;
  });

  return Object.freeze(fields);
}

function explicitFinalPrice(text) {
  const match = firstMatch(text, [
    /\btotal\s+project\s+price\s*(?:is|to|:)?\s*\$?\s*([\d,.]+)/i,
    /\b(?:make|set|change|update)\s+(?:the\s+)?total\s*(?:is|to|:)?\s*\$?\s*([\d,.]+)/i,
    /\b(?:quote\s+customer|customer\s+quote)\s+\$?\s*([\d,.]+)\s+total\b/i,
    /(?:^|[.!?;]\s*)(?:(?:set|change|update|revise)\s+(?:the\s+)?)?(?:final\s+(?:price|selling\s+price|quote)|quote\s+total|project\s+price|price|total|amount|precio\s+final|prix\s+final|preço\s+final)\s*(?:is|es|est|é|to|:)?\s*\$?\s*([\d,.]+)/i,
    /(?:^|[.!?;]\s*)\$\s*([\d,.]+)\s*(?:final|total)/i,
  ]);
  return match ? parseAmount(match[match.length - 1]) : null;
}

function explicitContractorProjectPrice(text) {
  const scopeAuthority =
    /^(?:please\s+)?(?:replace|repair|install|rebuild|reconstruct|construct|paint|seal|service|clean)\b/i.test(text) ||
    /^(?:[A-Za-z][\w'’-]*\s+){0,7}(?:replacement|repair|installation|service|painting|rebuild|reconstruction)\b(?=\s*(?:,|[.!?]|$))/i.test(text) ||
    /^(?:please\s+)?add\s+(?:labor|labour)\s+and\s+materials?\s+for\b/i.test(text);
  if (!scopeAuthority) return null;
  if (/\b(?:materials?|labor|labour|installation|tax|subtotal)\s+for\s+\$\s*[\d,.]+\s*[.!]?$/i.test(text)) {
    return null;
  }
  const match = text.match(/(?:\s+for\s+|,\s*)\$\s*([\d,.]+)\s*[.!]?$/i);
  return match ? parseAmount(match[1]) : null;
}

function explicitMaterialAmount(text) {
  const match = firstMatch(text, [
    /(?:use|set|materials?|materiales|matériaux|materiais)\s*(?:(?:are|is|costs?|to|at|de|a)|:)?\s*\$\s*([\d,.]+)/i,
    /(?:materials?|materiales|matériaux|materiais)\s+(?:are|is|costs?|to|at|:)\s*\$?\s*([\d,.]+)(?:\s*(?:dollars?|usd))?\b/i,
    /(?:materials?|materiales|matériaux|materiais)\s+([\d,.]+)\b(?!\s*(?:hours?|hrs?|days?|weeks?))/i,
    /\$\s*([\d,.]+)\s+(?:for\s+)?(?:materials?|materiales|matériaux|materiais)/i,
  ]);
  return match ? parseAmount(match[1]) : null;
}

function explicitLaborAmount(text) {
  const match = firstMatch(text, [
    /(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|to|at|:)?\s*\$\s*([\d,.]+)/i,
    /(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+(?:is|are|costs?|to|:)\s*\$?\s*([\d,.]+)(?:\s*(?:dollars?|usd))?\b/i,
    /(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|:)?\s*([\d,.]+)\s*(?:dollars?|usd)\b/i,
    /(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+([\d,.]+)\b(?!\s*(?:hours?|hrs?|days?|weeks?))/i,
    /\$\s*([\d,.]+)\s+(?:for\s+)?(?:labor|labour|installation)/i,
  ]);
  return match ? parseAmount(match[1]) : null;
}

function explicitCustomerName(text) {
  const explicit = firstMatch(text, [
    /\b(?:set|change)\s+(?:the\s+)?(?:customer|client)(?:\s+name)?\s+to\s+([^.!?;]+)/i,
    /\b(?:customer|client)\s+name\s*(?:is|:)?\s+([^.!?;]+)/i,
    /\b(?:quote\s+for|customer\s+is|client\s+is)\s+([^.!?;]+)/i,
    /\b(?:this\s+(?:quote|job)|this)\s+is\s+for\s+([^.!?;]+)/i,
    /\bput\s+this\s+under\s+([^.!?;]+)/i,
    /\b(?:customer|client)\s+([^.!?;]+)/i,
  ]);
  if (explicit) {
    const candidate = cleanText(explicit[1]).split(
      /\s+(?=(?:at|for|needs?|wants?|ceiling|fan|install|installation|repair|replace|replacement|rebuild|paint|painting|service|work|materials?|labor|labour|price|total)\b)/i
    )[0];
    const words = candidate.match(/[A-Za-zÀ-ÖØ-öø-ÿ'’-]+/g) || [];
    if (words.length >= 1 && words.length <= 4) return candidate;
  }

  const serviceForCustomer = text.match(
    /(?:^|[.!?;]\s*)((?:[A-Za-z][\w'’-]*\s+){0,5}(?:replacement|repair|installation|install|service|painting|rebuild))\s+for\s+([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]+)(?=[.!?;]|$)/
  );
  if (serviceForCustomer) return cleanText(serviceForCustomer[2]);

  const conversational = text.match(
    /\bcustomer\s+([A-Za-zÀ-ÖØ-öø-ÿ'’-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ'’-]+)(?=\s+(?:at|for|needs?|wants?|ceiling|fan|install|installation|repair|replace|rebuild|paint|painting|service|work)\b)/i
  );

  return conversational
    ? cleanText(`${conversational[1]} ${conversational[2]}`)
    : "";
}

function explicitCustomerLocation(text) {
  const match = text.match(
    /\b(?:at|location\s*(?:is|:)?|address\s*(?:is|:)?)\s+(\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9 .#'’-]*?\b(?:ave(?:nue)?|st(?:reet)?|rd|road|dr(?:ive)?|blvd|boulevard|ln|lane|ct|court|way|pkwy|parkway|pl|place)\b(?:\s+(?:unit|apt|suite|#)\s*[\w-]+)?)/i
  );
  return cleanText(match?.[1] || "");
}

const CUSTOMER_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const CUSTOMER_PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}/;
const NATURAL_SCOPE_START = /(?:^|[.!?]\s+)((?:please\s+)?(?:replace|repair|install|rebuild|reconstruct|construct|paint|seal|service|clean)\b[\s\S]*)/i;

function naturalProfessionalFactBundle(text) {
  const scopeMatch = text.match(NATURAL_SCOPE_START);
  if (!scopeMatch) return Object.freeze({});

  const scopeStart = scopeMatch.index + scopeMatch[0].indexOf(scopeMatch[1]);
  const contactText = cleanText(text.slice(0, scopeStart)).replace(/[.!?;]+$/, "");
  const email = cleanText(contactText.match(CUSTOMER_EMAIL_PATTERN)?.[0] || "");
  const phone = cleanText(contactText.match(CUSTOMER_PHONE_PATTERN)?.[0] || "");
  if (!email || !phone) return Object.freeze({});

  const parts = contactText
    .split(",")
    .map((part) => cleanText(part).replace(/^[.!?;\s]+|[.!?;\s]+$/g, ""))
    .filter(Boolean)
    .filter((part) => !CUSTOMER_EMAIL_PATTERN.test(part) && !CUSTOMER_PHONE_PATTERN.test(part));
  if (parts.length < 2) return Object.freeze({});

  const customerName = parts[0];
  const nameWords = customerName.match(/[A-Za-zÀ-ÖØ-öø-ÿ'’-]+/g) || [];
  if (nameWords.length < 2 || nameWords.length > 4 || /\d/.test(customerName)) {
    return Object.freeze({});
  }

  const customerAddress = cleanText(parts.slice(1).join(", "));
  if (!customerAddress) return Object.freeze({});

  return Object.freeze({
    customerName,
    customerEmail: email,
    customerPhone: phone,
    customerAddress,
    scopeText: cleanText(text.slice(scopeStart)),
  });
}

function explicitCustomerEmail(text) {
  return cleanText(text.match(CUSTOMER_EMAIL_PATTERN)?.[0] || "");
}

function explicitCustomerPhone(text) {
  return cleanText(text.match(CUSTOMER_PHONE_PATTERN)?.[0] || "");
}

function explicitCustomerAddress(text) {
  const match = text.match(
    /\b(?:customer\s+address|service\s+(?:address|area)|address|location)\s*(?:is|:)?\s*([^.!?;]+)/i
  );
  return cleanText(match?.[1] || "");
}

function normalizeDurationNumberWords(value) {
  const words = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
  return cleanText(value)
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, (word) => words[word.toLowerCase()])
    .replace(/^(\d+)\s*-\s*(hours?|hrs?|days?|weeks?)\b/i, "$1 $2")
    .replace(/^a\s+/i, "1 ");
}

function explicitDuration(text) {
  const hyphenated = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[- ](hours?|hrs?|days?|weeks?)\s+job\b/i);
  if (hyphenated) return normalizeDurationNumberWords(`${hyphenated[1]} ${hyphenated[2]}`);
  const match = text.match(/(?:about|around|approximately|duration|takes?|should\s+take|dura(?:ción|ção)?|aproximadamente|environ|durée)?\s*((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?|horas?|días?|dias?|semaines?|jours?|semanas?))/i);
  return normalizeDurationNumberWords(match?.[1] || "");
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
  const percent = Number(match[1]);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100
    ? `${percent}% deposit`
    : "";
}

function quotePricingInstructionPatch(text) {
  const patch = {};
  const percentMatch = text.match(/(\d{1,3}(?:\.\d+)?)\s*(?:%|percent)\s*(?:deposit|down\s+payment)/i);
  const percent = percentMatch ? Number(percentMatch[1]) : null;
  if (Number.isFinite(percent) && percent >= 0 && percent <= 100) {
    patch.depositRequired = "Yes";
    patch.depositMode = "PERCENT";
    patch.depositPercent = String(percent);
    patch.depositFixedAmount = "";
    patch.depositTerms = `${percent}% deposit`;
  }
  const fixedMatch = text.match(/\b(?:fixed\s+)?deposit\s*(?:of|is|:)?\s*\$\s*([\d,.]+)/i);
  const fixed = fixedMatch ? parseAmount(fixedMatch[1]) : null;
  if (fixed !== null) {
    patch.depositRequired = "Yes";
    patch.depositMode = "FIXED";
    patch.depositPercent = "";
    patch.depositFixedAmount = String(fixed);
    patch.depositAmount = String(fixed);
    patch.depositTerms = `$${fixed} deposit`;
  }
  if (/\b(?:no|without)\s+(?:deposit|down\s+payment)\b/i.test(text)) {
    patch.depositRequired = "No";
    patch.depositMode = "NONE";
    patch.depositPercent = "";
    patch.depositFixedAmount = "";
    patch.depositAmount = "";
    patch.depositTerms = "";
  }

  if (/\b(?:don['’]t|do\s+not|without)\s+show\s+(?:the\s+)?(?:price\s+)?breakdown\b/i.test(text) ||
      /\b(?:total|single)\s+(?:project\s+)?price\s+(?:only|presentation)\b/i.test(text)) {
    patch.pricingDisplayMode = "TOTAL_ONLY";
  } else if (/\bshow\s+(?:labor|labour)(?:\s+and|\s*\/)?\s+materials?\s+separately\b/i.test(text) ||
      /\bshow\s+them\s+separately\b/i.test(text) ||
      /\bshow\s+(?:the\s+)?breakdown\b/i.test(text)) {
    patch.pricingDisplayMode = "CATEGORY_BREAKDOWN";
  } else if (/\bshow\s+(?:the\s+)?detailed\s+line\s+items?\b/i.test(text)) {
    patch.pricingDisplayMode = "DETAILED_LINE_ITEMS";
  }

  if (/\bcustomer\s+(?:will\s+)?provide(?:s)?\s+(?:the\s+)?materials?\b/i.test(text)) {
    patch.materialsDisplayMode = "CUSTOMER_PROVIDES";
  } else if (/\b(?:labor|labour)\s+and\s+(?:standard\s+)?materials?\s+included\b/i.test(text) ||
      /\binclude\s+materials?\s+in\s+(?:the\s+)?total\b/i.test(text) ||
      /\b(?:don['’]t|do\s+not)\s+show\s+materials?\s+separately\b/i.test(text)) {
    patch.materialsDisplayMode = "INCLUDED_IN_TOTAL";
  } else if (/\bshow\s+(?:the\s+)?materials?\s+separately\b/i.test(text)) {
    patch.materialsDisplayMode = "SHOW_SEPARATELY";
  }

  if (patch.pricingDisplayMode === "CATEGORY_BREAKDOWN" &&
      /\b(?:materials?|them)\b/i.test(text) &&
      !patch.materialsDisplayMode) {
    patch.materialsDisplayMode = "SHOW_SEPARATELY";
  }

  if (patch.pricingDisplayMode === "TOTAL_ONLY" && !patch.materialsDisplayMode &&
      /\bmaterials?\b/i.test(text)) {
    patch.materialsDisplayMode = "INCLUDED_IN_TOTAL";
  }
  return patch;
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
  if (generic !== null) items.push({ name: "Materials", total: String(generic) });

  const specific = text.match(/(?:^|[.!?;,]\s*)(?:the\s+)?[A-Za-z][\w -]{0,38}?\s+(?:costs?|is)\s*\$?\s*[\d,.]+(?:\s*(?:dollars?|usd))?/gi) || [];
  specific.forEach((statement) => {
    const match = statement.match(/(?:^|[.!?;,]\s*)(?:the\s+)?(.+?)\s+(?:costs?|is)\s*\$?\s*([\d,.]+)/i);
    const amount = parseAmount(match?.[2]);
    const name = capitalizeLabel(match?.[1] || "");
    if (/^(?:her|his|their|customer(?:'s)?|client(?:'s)?)\s+(?:phone|number|email|e-mail|address)\b/i.test(name)) return;
    if (amount !== null && name && !/^(?:labor|labour|installation|materials?|tax|subtotal|total|price|project price|final price|final quote|amount)$/i.test(name)) {
      items.push({ name, total: String(amount) });
    }
  });

  const useSpecific = text.match(/\buse\s+\$\s*([\d,.]+)\s+for\s+(?:the\s+)?([A-Za-z][\w -]{1,38}?)(?:\.|$)/i);
  if (useSpecific) {
    const amount = parseAmount(useSpecific[1]);
    if (amount !== null) items.push({ name: cleanText(useSpecific[2]), total: String(amount) });
  }

  const naturalPrice = text.match(
    /\b(?:price\s+for|cost\s+of)\s+(?:the\s+)?([A-Za-z][\w -]{0,38}?)\s*(?:is|:)?\s*\$?\s*([\d,.]+)\s*(?:dollars?|usd)\b/i
  );
  if (naturalPrice) {
    const amount = parseAmount(naturalPrice[2]);
    const name = cleanText(naturalPrice[1]);
    if (
      amount !== null &&
      name &&
      !items.some((item) => item.name.toLowerCase() === name.toLowerCase())
    ) {
      items.push({ name, total: String(amount) });
    }
  }

  const chargeItems = text.match(/\b(?:charge|add)\s+\$?\s*[\d,.]+\s+for\s+(?:the\s+)?[A-Za-z][\w -]{0,38}?(?=[.!?;,]|$)/gi) || [];
  chargeItems.forEach((statement) => {
    const match = statement.match(/\b(?:charge|add)\s+\$?\s*([\d,.]+)\s+for\s+(?:the\s+)?(.+?)(?=[.!?;,]|$)/i);
    const amount = parseAmount(match?.[1]);
    const name = capitalizeLabel(match?.[2] || "");
    if (amount !== null && name && !items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      items.push({ name, total: String(amount) });
    }
  });

  const standaloneCharge = text.match(/(?:^|[.!?;]\s*)charge\s+\$?\s*([\d,.]+)(?=[.!?;]|$)/i);
  if (standaloneCharge) {
    const amount = parseAmount(standaloneCharge[1]);
    if (amount !== null) items.push({ name: "Charge", total: String(amount) });
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
  const match = firstMatch(text, [
    /\b(labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|to|at|:)?\s*\$\s*([\d,.]+)/i,
    /\b(labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+(?:is|are|costs?|to|:)\s*\$?\s*([\d,.]+)(?:\s*(?:dollars?|usd))?\b/i,
    /\b(labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|:)?\s*([\d,.]+)\s*(?:dollars?|usd)\b/i,
    /\b(labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+([\d,.]+)\b(?!\s*(?:hours?|hrs?|days?|weeks?))/i,
  ]);
  if (match) {
    const amount = parseAmount(match[2]);
    if (amount !== null) {
      items.push({
        description: cleanText(match[1]),
        total: String(amount),
      });
    }
  }
  return items;
}

function cleanScope(text) {
  let scope = text;
  scope = scope.replace(new RegExp(
    `\\b(?:her|his|their|customer(?:'s)?|client(?:'s)?)?\\s*(?:phone|number)\\s*(?:is|:)\\s*${CUSTOMER_PHONE_PATTERN.source}[.!?;]?`,
    "i"
  ), "");
  scope = scope.replace(new RegExp(
    `\\b(?:her|his|their|customer(?:'s)?|client(?:'s)?)?\\s*(?:email|e-mail)\\s*(?:is|:)\\s*${CUSTOMER_EMAIL_PATTERN.source}[.!?;]?`,
    "i"
  ), "");
  scope = scope.replace(/\b(?:her|his|their|customer(?:'s)?|client(?:'s)?)?\s*(?:customer\s+address|service\s+(?:address|area)|address|location)\s*(?:is|:)?\s*[^.!?;]+[.!?;]?/gi, "");
  scope = scope.replace(CUSTOMER_EMAIL_PATTERN, "");
  scope = scope.replace(CUSTOMER_PHONE_PATTERN, "");
  scope = scope.replace(/\b(?:set|change)\s+(?:the\s+)?(?:customer|client)(?:\s+name)?\s+to\s+[^.!?;]+[.!?;]?/i, "");
  scope = scope.replace(/\b(?:quote\s+for|customer(?:\s+name)?\s*(?:is|:)|client(?:\s+name)?\s*(?:is|:))\s+[^.!?;]+[.!?;]?/i, "");
  scope = scope.replace(/\b(?:this\s+(?:quote|job)|this)\s+is\s+for\s+[^.!?;]+[.!?;]?/i, "");
  scope = scope.replace(/\bput\s+this\s+under\s+[^.!?;]+[.!?;]?/i, "");
  scope = scope.replace(/\b(?:customer|client)\s+[A-Za-zÀ-ÖØ-öø-ÿ'’-]+\s+[A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?=[.!?;]|$)/i, "");
  scope = scope.replace(/\s+for\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?=[.!?;]|$)/g, "");
  scope = scope.replace(
    /\bcustomer\s+[A-Za-zÀ-ÖØ-öø-ÿ'’-]+\s+[A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?=\s+(?:at|for|needs?|wants?|ceiling|fan|install|installation|repair|replace|rebuild|paint|painting|service|work)\b)/i,
    ""
  );
  scope = scope.replace(
    /\b(?:at|location\s*(?:is|:)?|address\s*(?:is|:)?)\s+\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9 .#'’-]*?\b(?:ave(?:nue)?|st(?:reet)?|rd|road|dr(?:ive)?|blvd|boulevard|ln|lane|ct|court|way|pkwy|parkway|pl|place)\b(?:\s+(?:unit|apt|suite|#)\s*[\w-]+)?/gi,
    ""
  );
  scope = scope.replace(
    /\b(?:price\s+for|cost\s+of)\s+(?:the\s+)?[A-Za-z][\w -]{0,38}?\s*(?:is|:)?\s*\$?\s*[\d,.]+\s*(?:dollars?|usd)\b[,.;]?/gi,
    ""
  );
  scope = scope.replace(/\b(?:charge|add)\s+\$?\s*[\d,.]+\s+for\s+(?:the\s+)?[A-Za-z][\w -]{0,38}?(?=[.!?;,]|$)[.!?;,]?/gi, "");
  scope = scope.replace(/(?:^|[.!?;]\s*)charge\s+\$?\s*[\d,.]+(?=[.!?;]|$)[.!?;]?/gi, "");
  scope = scope.replace(
    /\b(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s*(?:is|are|costs?|:)?\s*[\d,.]+\s*(?:dollars?|usd)\b[,.;]?/gi,
    ""
  );
  scope = scope.replace(/\b(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+[\d,.]+\b(?!\s*(?:hours?|hrs?|days?|weeks?))[.!]?/gi, "");
  scope = scope.replace(/\b(?:materials?|materiales|matériaux|materiais|labor|labour|installation|tax|subtotal)\s+(?:(?:total)\s+(?:is|are|:)?\s*\$\s*[\d,.]+|\$\s*[\d,.]+\s+total)[.!]?/gi, "");
  scope = scope.replace(/\b(?:materials?|materiales|matériaux|materiais|labor|labour|installation)\s+(?:are|is|costs?|to|at|:)\s*\$?\s*[\d,.]+(?:\s*(?:dollars?|usd))?[.!]?/gi, "");
  scope = scope.replace(/\b(?:materials?|materiales|matériaux|materiais)\s+(?:are|is|costs?|de|a|:)?\s*\$\s*[\d,.]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:labor|labour|installation|mano\s+de\s+obra|main[- ]d'œuvre|mão\s+de\s+obra)\s+(?:is|are|costs?|:)?\s*\$\s*[\d,.]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:estimated\s+)?duration\s+(?:is|:)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?)[.!]?/gi, "");
  scope = scope.replace(/\b(?:(?:should\s+take|takes?)\s+)?(?:about\s+|around\s+|approximately\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?)[.!]?/gi, "");
  scope = scope.replace(/\b\d{1,3}\s*%\s*(?:deposit|depósito|acompte|entrada|sinal)(?:\s+required)?[.!]?/gi, "");
  scope = scope.replace(/\b(?:final\s+(?:price|selling\s+price|quote)|quote\s+total|project\s+price|price|total|amount|precio\s+final|prix\s+final|preço\s+final)\s*(?:is|es|est|é|to|:)?\s*\$?\s*[\d,.]+[.!]?/gi, "");
  scope = scope.replace(/\b(?:note|condition)\s*:\s*[^.!?]+[.!]?/gi, "");
  scope = scope.replace(/(^|[.!?;,]\s*)(?:the\s+)?[A-Za-z][\w -]{0,38}?\s+(?:costs?|is)\s*\$?\s*[\d,.]+(?:\s*(?:dollars?|usd))?[.!]?/gi, "$1");
  scope = scope.replace(/(?:\s+for\s+|,\s*)\$\s*[\d,.]+\s*[.!]?$/i, "");
  return cleanText(scope)
    .replace(/\s+([.!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
    .replace(/\s+(?:and|with|,)$/i, "");
}

function suggestedTitle(text) {
  const title = capitalizeLabel(text.split(/[,.!?]/, 1)[0]);
  return title.length > 72 ? `${title.slice(0, 69).trim()}…` : title;
}

function explicitReplacement(text) {
  const match = text.match(/(?:just\s+say|use\s+this\s+wording|scope\s*(?:is|:))\s+["“]?(.+?)["”]?(?:\.|$)/i);
  return cleanText(match?.[1] || "");
}

function naturalScopeDeclaration(text) {
  return (
    /^(?:please\s+)?(?:replace|repair|install|rebuild|reconstruct|construct|paint|seal|service|clean)\b/i.test(text) ||
    /^(?:[A-Za-z][\w'’-]*\s+){0,7}(?:replacement|repair|installation|service|painting|rebuild|reconstruction)\b(?=\s*(?:,|[.!?]|$))/i.test(text)
  );
}

function explicitScopeAddition(text) {
  const match = text.match(
    /\badd\s+(.+?)\s+to\s+(?:the\s+)?scope\b[.!?]?/i
  );
  if (match) return cleanText(match[1]);
  const standalone = text.match(/^(?:please\s+)?add\s+(?!\$)(.+?)[.!?]?$/i);
  return standalone ? cleanScope(standalone[1]) : "";
}

function appendScope(value, addition) {
  const current = cleanText(value);
  const next = cleanText(addition).replace(/[.!?]+$/, "");
  if (!next) return current;
  if (current.toLowerCase().includes(next.toLowerCase())) return current;
  const sentence = `${capitalizeLabel(next)}.`;
  return current ? `${current.replace(/\s+$/, "")} ${sentence}` : sentence;
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
  const structured = structuredQuoteFields(prompt);
  const instruction = cleanText(prompt);
  if (!instruction) return Object.freeze({});

  const patch = {};
  const pricingPatch = quotePricingInstructionPatch(instruction);
  const structuredPrice = Object.hasOwn(structured, "price")
    ? parseAmount(String(structured.price).replace(/^\$\s*/, ""))
    : null;
  const finalPrice = structuredPrice ?? explicitFinalPrice(instruction) ?? explicitContractorProjectPrice(instruction);
  const materialAmount = explicitMaterialAmount(instruction);
  const laborAmount = explicitLaborAmount(instruction);
  const laborItems = explicitLaborItems(instruction);
  const naturalFacts = naturalProfessionalFactBundle(instruction);
  const customerName = cleanText(
    structured.customer || explicitCustomerName(instruction) || naturalFacts.customerName
  );
  const customerEmail = explicitCustomerEmail(instruction) || naturalFacts.customerEmail || "";
  const customerPhone = explicitCustomerPhone(instruction) || naturalFacts.customerPhone || "";
  const customerAddress = explicitCustomerAddress(instruction) || naturalFacts.customerAddress || "";
  const customerLocation = explicitCustomerLocation(instruction);
  const duration = normalizeDurationNumberWords(
    structured.duration || explicitDuration(instruction)
  );
  const deposit = explicitDeposit(instruction);
  const note = cleanText(structured.notes || explicitNote(instruction));
  const condition = explicitCondition(instruction);
  const structuredScope = cleanText(structured.scope);
  const replacement = structuredScope ? "" : cleanText(explicitReplacement(instruction));
  const scopeAddition = explicitScopeAddition(instruction);
  const scope = structuredScope || replacement || (
    Object.keys(structured).length
      ? ""
      : cleanScope(naturalFacts.scopeText || instruction)
  );

  if (structured.project) {
    patch.projectTitle = cleanText(structured.project);
  }

  if (!revision) {
    if (scope && !scopeAddition) {
      patch.projectDescription = scope;
      patch.recommendedSolution = scope;
      if (!cleanText(current.projectTitle) && !structured.project) {
        patch.projectTitle = suggestedTitle(scope);
      }
    }
    if (customerName) patch.customerName = customerName;
    if (customerEmail) patch.customerEmail = customerEmail;
    if (customerPhone) patch.customerPhone = customerPhone;
    if (customerAddress) patch.customerAddress = customerAddress;
    if (customerAddress && !customerLocation) patch.customerLocation = customerAddress;
    if (customerLocation) patch.customerLocation = customerLocation;
  }
  if (revision && customerName) patch.customerName = customerName;
  if (revision && customerEmail) patch.customerEmail = customerEmail;
  if (revision && customerPhone) patch.customerPhone = customerPhone;
  if (revision && customerAddress) patch.customerAddress = customerAddress;
  if (revision && customerAddress && !customerLocation) patch.customerLocation = customerAddress;
  if (revision && customerLocation) patch.customerLocation = customerLocation;

  if (structuredScope) {
    patch.projectDescription = structuredScope;
    patch.recommendedSolution = structuredScope;
    if (!cleanText(current.projectTitle) && !structured.project) {
      patch.projectTitle = suggestedTitle(structuredScope);
    }
  }

  if (revision && !structuredScope && !replacement && !scopeAddition && naturalScopeDeclaration(instruction) && scope) {
    patch.projectDescription = scope;
    patch.recommendedSolution = scope;
    if (!cleanText(current.projectTitle) && !structured.project) {
      patch.projectTitle = suggestedTitle(scope);
    }
  }

  if (replacement) {
    patch.projectDescription = replacement;
    patch.problemFound = replacement;
    patch.recommendedSolution = replacement;
    if (!cleanText(current.projectTitle) && !structured.project) {
      patch.projectTitle = suggestedTitle(replacement);
    }
  }

  if (scopeAddition) {
    patch.projectDescription = appendScope(
      current.projectDescription,
      scopeAddition
    );
    patch.recommendedSolution = appendScope(
      current.recommendedSolution || current.projectDescription,
      scopeAddition
    );
  }

  if (revision && /^(?:please\s+)?remove\b/i.test(instruction)) {
    patch.projectDescription = removeRequestedText(current.projectDescription, instruction);
    patch.problemFound = removeRequestedText(current.problemFound, instruction);
    patch.recommendedSolution = removeRequestedText(current.recommendedSolution, instruction);
  }

  if (duration) {
    patch.timeline = duration;
    patch.estimatedDuration = duration;
    if (revision) {
      const durationFields = structuredScope
        ? ["projectDescription", "recommendedSolution"]
        : ["projectDescription", "problemFound", "recommendedSolution"];
      for (const key of durationFields) {
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
  if (structured.paymentTerms) patch.terms = cleanText(structured.paymentTerms);
  if (note) patch.notes = note;
  if (condition) patch.terms = condition;

  Object.assign(patch, pricingPatch);

  return Object.freeze(patch);
}

const RECOGNIZED_QUOTE_INSTRUCTION_PATTERNS = Object.freeze([
  /\b(?:labor|labour|installation)\s*(?:is|are|costs?|to|at|:)?\s*\$?\s*[\d,.]+(?:\s*(?:dollars?|usd))?\b/gi,
  /\bmaterials?\s*(?:are|is|costs?|to|at|:)?\s*\$?\s*[\d,.]+(?:\s*(?:dollars?|usd))?\b/gi,
  /\b(?:make|set|change|update)\s+(?:the\s+)?total\s*(?:is|to|:)?\s*\$?\s*[\d,.]+\b/gi,
  /\b(?:total\s+project\s+price|project\s+price|quote\s+total|final\s+price|total|price)\s*(?:is|to|:)?\s*\$?\s*[\d,.]+\b/gi,
  /\b(?:quote\s+customer|customer\s+quote)\s+\$?\s*[\d,.]+\s+total\b/gi,
  /\b\d{1,3}(?:\.\d+)?\s*(?:%|percent)\s*(?:deposit|down\s+payment)\b/gi,
  /\b(?:fixed\s+)?deposit\s*(?:of|is|:)?\s*\$\s*[\d,.]+\b/gi,
  /\b(?:no|without)\s+(?:deposit|down\s+payment)\b/gi,
  /\b(?:about|around|approximately|duration|takes?|should\s+take)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a)(?:\s*[–—-]\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s*(?:hours?|hrs?|days?|weeks?)\b/gi,
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)[- ](?:hours?|hrs?|days?|weeks?)\s+job\b/gi,
  /\b(?:don['’]t|do\s+not|without)\s+show\s+(?:the\s+)?(?:price\s+)?breakdown\b/gi,
  /\b(?:don['’]t|do\s+not)\s+show\s+materials?\s+separately\b/gi,
  /\bshow\s+(?:(?:labor|labour)(?:\s+and|\s*\/)?\s+materials?|materials?|them|the\s+breakdown)\s+separately\b/gi,
  /\bshow\s+(?:the\s+)?detailed\s+line\s+items?\b/gi,
  /\bcustomer\s+(?:will\s+)?provide(?:s)?\s+(?:the\s+)?materials?\b/gi,
  /\b(?:labor|labour)\s+and\s+(?:standard\s+)?materials?\s+included\b/gi,
  /\binclude\s+materials?\s+in\s+(?:the\s+)?total\b/gi,
  /\b(?:scope(?:\s+of\s+work)?\s*(?:is|:)|add\s+.+?\s+to\s+(?:the\s+)?scope|(?:replace|repair|install|rebuild|paint|seal|service|clean)\b[^,.;]*)/gi,
]);

function quoteProposalChanges(patch, current) {
  const changes = [];
  const add = (field, label, value) => changes.push(Object.freeze({ field, label, value }));
  if (patch.laborItems?.length) {
    const value = patch.laborItems.reduce((sum, row) => sum + (parseAmount(row.total) || 0), 0);
    add("laborItems", "Labor", value);
  }
  if (patch.materialItems?.length || patch.materialAmount) {
    const value = patch.materialItems?.length
      ? patch.materialItems.reduce((sum, row) => sum + (parseAmount(row.total) || 0), 0)
      : parseAmount(patch.materialAmount);
    add("materialItems", "Materials", value || 0);
  }
  if (Object.hasOwn(patch, "totalOverride")) add("totalOverride", "Customer project price", parseAmount(patch.totalOverride) || 0);
  if (patch.estimatedDuration) add("estimatedDuration", "Estimated duration", patch.estimatedDuration);
  if (patch.depositMode === "PERCENT") add("depositPercent", "Deposit", `${patch.depositPercent}%`);
  if (patch.depositMode === "FIXED") add("depositFixedAmount", "Deposit", `$${patch.depositFixedAmount}`);
  if (patch.depositMode === "NONE") add("depositMode", "Deposit", "None");
  if (patch.pricingDisplayMode) add("pricingDisplayMode", "Customer pricing display", patch.pricingDisplayMode);
  if (patch.materialsDisplayMode) add("materialsDisplayMode", "Materials on customer Quote", patch.materialsDisplayMode);
  if (["projectDescription", "recommendedSolution"].some((key) => Object.hasOwn(patch, key))) {
    add("scope", "Scope of Work", patch.recommendedSolution || patch.projectDescription);
  }
  if (patch.terms && !patch.depositTerms) add("terms", "Payment / project terms", patch.terms);
  if (patch.notes) add("notes", "Customer note", patch.notes);

  const projected = quoteCustomerPricingProjection({ ...current, ...patch });
  if (changes.some((change) => ["laborItems", "materialItems", "totalOverride"].includes(change.field))) {
    add("calculatedTotal", "Project total", projected.total);
  }
  if (patch.depositMode && patch.depositMode !== "NONE" && projected.deposit.valid) {
    add("depositDue", "Deposit due", projected.deposit.due);
    add("remainingBalance", "Remaining balance", projected.deposit.remaining);
  }
  return Object.freeze(changes);
}

function unrecognizedQuoteInstructionSegments(instruction) {
  let residual = String(instruction || "");
  for (const pattern of RECOGNIZED_QUOTE_INSTRUCTION_PATTERNS) {
    residual = residual.replace(pattern, " ");
  }
  return Object.freeze(residual
    .split(/[,.;!?]+|\band\b/gi)
    .map((segment) => cleanText(segment)
      .replace(/^(?:please|internally|also|then|quote)\b\s*/i, "")
      .replace(/^(?:is|are|to|at|for|with)\b\s*/i, "")
      .trim())
    .filter((segment) => segment && !/^(?:the|a|an|it|this|that)$/i.test(segment)));
}

export function quoteConversationProposalFingerprint(current = {}) {
  return JSON.stringify(current);
}

export function buildQuickQuoteConversationProposal({
  prompt,
  current = {},
  revision = true,
} = {}) {
  const instruction = cleanText(prompt);
  const patch = buildQuickQuoteConversationPatch({ prompt: instruction, current, revision });
  const recognizedChanges = quoteProposalChanges(patch, current);
  return Object.freeze({
    instruction,
    patch,
    recognizedChanges,
    unrecognizedSegments: unrecognizedQuoteInstructionSegments(instruction),
    baselineFingerprint: quoteConversationProposalFingerprint(current),
    pricing: quoteCustomerPricingProjection({ ...current, ...patch }),
  });
}

export function mergeQuickQuoteConversationPatch(current = {}, patch = {}) {
  return Object.freeze({ ...current, ...patch });
}
import {
  quoteCustomerPricingProjection,
} from "./quotePricingPresentation.js";
