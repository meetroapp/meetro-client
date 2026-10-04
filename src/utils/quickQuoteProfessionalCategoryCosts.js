const AMOUNT_PATTERN =
  "([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)";

const CATEGORY_PATTERNS = Object.freeze({
  MATERIAL: Object.freeze([
    new RegExp(
      `(?:^|[.!?;\\n]\\s*)(?:purchase\\s+)?(?:materials?|materiales|matériaux|materiais)\\s*(?:total\\s*)?(?:is|are|costs?|es|est|é|:)?\\s*\\$\\s*${AMOUNT_PATTERN}(?:\\s*total)?(?=\\s*(?:$|[.!?;\\n]))`,
      "gi"
    ),
  ]),
  LABOR: Object.freeze([
    new RegExp(
      `(?:^|[.!?;\\n]\\s*)(?:labor|labour|mano\\s+de\\s+obra|main[- ]d'œuvre|mão\\s+de\\s+obra)\\s*(?:total\\s*)?(?:is|are|costs?|es|est|é|:)?\\s*\\$\\s*${AMOUNT_PATTERN}(?:\\s*total)?(?=\\s*(?:$|[.!?;\\n]))`,
      "gi"
    ),
  ]),
});

function amountMinor(value) {
  const amount = Number(String(value || "").replaceAll(",", ""));
  const minor = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(minor)
    ? minor
    : null;
}

function categoryValues(input, classification) {
  const values = [];
  for (const pattern of CATEGORY_PATTERNS[classification]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(input)) !== null) {
      const minor = amountMinor(match[1]);
      if (minor != null) values.push(minor);
    }
  }
  return [...new Set(values)];
}

export function extractProfessionalCategoryCostCandidates(value) {
  const input = typeof value === "string" ? value : "";
  const costs = [];
  const conflicts = [];

  for (const classification of ["MATERIAL", "LABOR"]) {
    const values = categoryValues(input, classification);
    if (values.length > 1) {
      conflicts.push(classification);
    } else if (values.length === 1) {
      costs.push({ classification, totalCostMinor: values[0] });
    }
  }

  return { costs, conflicts };
}
