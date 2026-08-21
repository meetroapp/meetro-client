export const BUSINESS_DOCUMENT_AGREEMENT_PRESETS = Object.freeze({
  additionalWorkTerms: "Work not specifically included in the approved Scope of Work is excluded from the original project price. Additional work, customer-requested changes, or unforeseen conditions require additional authorization and may result in additional charges.",
  hiddenConditionsTerms: "Concealed or reasonably undiscoverable conditions are not included in the original project price. If hidden conditions are found, the professional will explain the condition and any additional authorization or charges required before proceeding where practical.",
  diagnosticTerms: "Diagnostic and troubleshooting charges cover professional time, testing, inspection, and assessment and remain due even if additional repair, authorization, testing, or referral to another qualified professional is required.",
});

export const BUSINESS_DOCUMENT_AGREEMENT_FIELDS = Object.freeze([
  ["additionalWorkTerms", "Additional Work / Change Orders"],
  ["hiddenConditionsTerms", "Hidden / Unforeseen Conditions"],
  ["diagnosticTerms", "Diagnostic / Troubleshooting Fees"],
  ["customerResponsibilities", "Customer Responsibilities"],
  ["warrantyTerms", "Warranty / Workmanship Terms"],
  ["cancellationTerms", "Cancellation / Rescheduling Terms"],
  ["acceptanceTerms", "Acceptance Terms"],
  ["preauthorizedAdditionalWorkLimit", "Optional pre-authorized additional work limit"],
]);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sentence(value) {
  const normalized = clean(value).replace(/^["']|["']$/g, "");
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "";
}

export function normalizeBusinessDocumentAgreement(value = {}) {
  return Object.freeze({
    exclusions: Object.freeze(Array.isArray(value.exclusions)
      ? [...new Set(value.exclusions.map(sentence).filter(Boolean))]
      : []),
    ...Object.fromEntries(BUSINESS_DOCUMENT_AGREEMENT_FIELDS.map(([key]) => [key, clean(value[key])])),
  });
}

export function buildBusinessDocumentAgreementPatch(instruction, current = {}) {
  const text = clean(instruction);
  if (!text) return Object.freeze({});
  const agreement = normalizeBusinessDocumentAgreement(current);
  const patch = {};

  const exclusion = text.match(/\bexclude\s+(.+?)\s+from\s+(?:this|the)\s+quote\b/i);
  if (exclusion) patch.exclusions = [...agreement.exclusions, sentence(exclusion[1])];

  if (/\badd\s+(?:standard\s+)?hidden[-\s]?condition protection\b|\bhidden\s*\/\s*unforeseen conditions\b/i.test(text)) {
    patch.hiddenConditionsTerms = BUSINESS_DOCUMENT_AGREEMENT_PRESETS.hiddenConditionsTerms;
  }
  if (/\b(?:extra|additional)\s+work\s+(?:requires?|must have|needs?)\s+(?:customer\s+)?approval\b|\badd\s+that\s+extra\s+work\s+requires\s+approval\b/i.test(text)) {
    patch.additionalWorkTerms = BUSINESS_DOCUMENT_AGREEMENT_PRESETS.additionalWorkTerms;
  }
  if (/\b(?:this is|add|include)\s+diagnostic(?:\s+work|\s+service)?(?:\s*;?\s*add\s+diagnostic\s+(?:service\s+)?terms)?\b/i.test(text)) {
    patch.diagnosticTerms = BUSINESS_DOCUMENT_AGREEMENT_PRESETS.diagnosticTerms;
  }

  const labeled = [
    ["customerResponsibilities", /\bcustomer responsibilit(?:y|ies)\s*:\s*([^.!?]+[.!?]?)/i],
    ["warrantyTerms", /\b(?:warranty|workmanship)\s+terms?\s*:\s*([^.!?]+[.!?]?)/i],
    ["cancellationTerms", /\b(?:cancellation|rescheduling)\s+terms?\s*:\s*([^.!?]+[.!?]?)/i],
    ["acceptanceTerms", /\bacceptance\s+terms?\s*:\s*([^.!?]+[.!?]?)/i],
    ["hiddenConditionsTerms", /\bhidden(?:\s*\/\s*unforeseen)?\s+conditions?\s*:\s*([^.!?]+[.!?]?)/i],
    ["diagnosticTerms", /\bdiagnostic(?:\s*\/\s*troubleshooting)?\s+(?:fees?|terms?)\s*:\s*([^.!?]+[.!?]?)/i],
    ["additionalWorkTerms", /\b(?:additional work|change orders?)\s*:\s*([^.!?]+[.!?]?)/i],
  ];
  labeled.forEach(([key, pattern]) => {
    const match = text.match(pattern);
    if (match) patch[key] = sentence(match[1]);
  });

  const limit = text.match(/\badditional work up to\s+\$?\s*([\d,.]+)\s+may proceed without (?:a\s+)?separate (?:change order|authorization)\b/i);
  if (limit) patch.preauthorizedAdditionalWorkLimit = `$${Number(limit[1].replace(/,/g, "")).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  return Object.freeze(patch);
}
