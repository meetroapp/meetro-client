const DEPOSIT_PERCENT_PATTERN = /(?:^|[^0-9])(\d{1,3}(?:\.\d+)?)\s*%\s*(?:deposit|down payment)\b/i;

export function deriveQuoteDepositPresentation(quote = {}) {
  const terms = typeof quote?.customerTermsSnapshot?.paymentTerms === "string"
    ? quote.customerTermsSnapshot.paymentTerms.trim()
    : "";
  const totalMinor = Number(quote?.totalMinor);
  if (!terms || !Number.isSafeInteger(totalMinor) || totalMinor < 0) {
    return Object.freeze({ state: "NONE" });
  }
  if (!/\b(?:deposit|down payment)\b/i.test(terms)) {
    return Object.freeze({ state: "NONE" });
  }
  const match = terms.match(DEPOSIT_PERCENT_PATTERN);
  const percent = match ? Number(match[1]) : null;
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return Object.freeze({ state: "UNVERIFIED" });
  }
  const dueMinor = Math.round((totalMinor * percent) / 100);
  if (!Number.isSafeInteger(dueMinor) || dueMinor < 0 || dueMinor > totalMinor) {
    return Object.freeze({ state: "UNVERIFIED" });
  }
  return Object.freeze({
    state: "DUE",
    percent,
    dueMinor,
    remainingMinor: totalMinor - dueMinor,
  });
}

export function projectCanonicalQuoteDecisionEvents(messages = []) {
  if (!Array.isArray(messages)) return [];
  const projected = [];
  const projectedDecisionKeys = new Set();
  messages.forEach((message, index) => {
    projected.push({ ...message, __timelineOrder: index * 2 });
    if (
      message?.type !== "quote_shared" ||
      !["APPROVED", "DECLINED"].includes(message?.quoteShare?.businessStatus) ||
      !message?.quoteShare?.decidedAt ||
      !Number.isFinite(Date.parse(message.quoteShare.decidedAt))
    ) return;
    const decisionKey = [
      message?.reference?.quoteId || message.quoteShare.quoteId,
      message.quoteShare.businessStatus,
      message.quoteShare.decidedAt,
    ].join(":");
    if (projectedDecisionKeys.has(decisionKey)) return;
    projectedDecisionKeys.add(decisionKey);
    projected.push({
      id: `${message.id}-decision-${message.quoteShare.businessStatus.toLowerCase()}`,
      type: "quote_decision",
      quoteShare: message.quoteShare,
      reference: message.reference,
      createdAt: message.quoteShare.decidedAt,
      time: message.quoteShare.decidedAt,
      __timelineOrder: index * 2 + 1,
    });
  });
  return projected
    .sort((first, second) => {
      const firstTime = Date.parse(first.createdAt || first.time || "");
      const secondTime = Date.parse(second.createdAt || second.time || "");
      if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
        return firstTime - secondTime;
      }
      return first.__timelineOrder - second.__timelineOrder;
    })
    .map((item) => {
      const message = { ...item };
      delete message.__timelineOrder;
      return message;
    });
}
