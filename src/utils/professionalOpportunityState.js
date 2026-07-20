import { normalizeRequestConversations } from "./requestCommunication.js";

export const PROFESSIONAL_OPPORTUNITY_STATUS = Object.freeze({
  LOADING: "loading",
  UNAVAILABLE: "unavailable",
  EMPTY: "empty",
  READY: "ready",
});

export function resolveProfessionalOpportunityCollection(result = {}) {
  if (!result?.response?.ok) {
    return {
      status: PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE,
      records: [],
      code: result?.data?.code || "PROFESSIONAL_OPPORTUNITIES_UNAVAILABLE",
    };
  }

  const normalized = normalizeRequestConversations(result.data || {}, "business");
  if (!normalized) {
    return {
      status: PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE,
      records: [],
      code: "PROFESSIONAL_OPPORTUNITIES_MALFORMED",
    };
  }

  const records = [
    ...new Map(normalized.map((record) => [String(record.request_id), record])).values(),
  ];

  return {
    status: records.length > 0
      ? PROFESSIONAL_OPPORTUNITY_STATUS.READY
      : PROFESSIONAL_OPPORTUNITY_STATUS.EMPTY,
    records,
    code: "",
  };
}
