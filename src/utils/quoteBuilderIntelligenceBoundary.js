function cleanText(value) {
  return String(value ?? "").trim();
}

function quoteAmount(value) {
  const cleaned = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function inputKey(prefix, index) {
  return `${prefix}_${index}`
    .replace(/[^a-z0-9_]/gi, "_")
    .toLowerCase()
    .slice(0, 80);
}

export function buildQuoteCompositionInput({
  jobId,
  estimateProposalId,
  professionalInstructions,
  lineItems = [],
  materialRows = [],
  materialProvider,
  availability,
} = {}) {
  const pricingInputs = lineItems.flatMap((item, index) => {
    const description = cleanText(item?.description);
    const quantity = Number(item?.quantity) || 1;
    const amount = quoteAmount(item?.unitPrice || item?.total);
    if (
      !description ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      amount === null
    ) {
      return [];
    }
    return [{
      key: inputKey("service", index),
      classification: "LABOR_SERVICE",
      amountMinor: Math.round(amount * 100),
      quantity,
    }];
  });

  const input = {
    jobId,
    mode: "ADVISORY",
    professionalInstructions: cleanText(professionalInstructions) || undefined,
    pricingInputs,
    materialInputs: materialRows.flatMap((item, index) => {
      const description = cleanText(item?.name);
      return description ? [{
        key: inputKey("material", index),
        description,
        responsibility: materialProvider === "Customer Provides"
          ? "CUSTOMER_SUPPLIED"
          : "PROFESSIONAL_SUPPLIED",
      }] : [];
    }),
    terms: {
      availability: cleanText(availability) || undefined,
      confirmedTotalMinor: pricingInputs.length > 0
        ? pricingInputs.reduce(
            (sum, item) => sum + item.amountMinor * item.quantity,
            0
          )
        : undefined,
    },
  };

  const normalizedEstimateProposalId = cleanText(estimateProposalId);
  if (normalizedEstimateProposalId) {
    input.estimateProposalId = normalizedEstimateProposalId;
  }

  return input;
}

const REVIEW_ELEMENT_ID = /^[a-z][a-z0-9_.:-]{0,159}$/;

export function getSolutionReadyReviewElements(proposal = {}) {
  const presented = [
    ...(Array.isArray(proposal.materials) ? proposal.materials : []),
    ...(Array.isArray(proposal.labor) ? proposal.labor : []),
    proposal.customerQuoteDraft,
  ];
  const seen = new Set();

  return presented.filter((item) => {
    const id = cleanText(item?.id);
    if (!REVIEW_ELEMENT_ID.test(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
