import { buildSavedQuoteRoute, parseSavedQuoteRoute } from "./savedQuoteRoute.js";
import { buildGenericNewQuoteRoute } from "./newQuoteCustomerSetup.js";

const result = (kind, route, reason) => Object.freeze({ kind, route, reason });
const blocked = (reason) => result("BLOCKED_AMBIGUOUS", "", reason);
const present = (value) => value !== undefined && value !== null && value !== "";

// Match the whole command. Any request/Job/visit qualifier or additional clause
// leaves precedence with the contextual responders instead of detaching work.
export function isExplicitStandaloneNewQuoteIntent(question) {
  if (typeof question !== "string") return false;
  const text = question.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
  return /^(?:please,? )?(?:(?:create|start|make|build|draft) (?:a )?)?new (?:standalone )?quote(?:,? please)?[.!?]*$/.test(text) ||
    /^(?:por favor,? )?(?:(?:crea|crear|inicia|iniciar|empieza|empezar|haz|hacer|prepara|preparar) (?:una )?)?(?:nueva cotizacion|cotizacion nueva)(?: independiente)?(?:,? por favor)?[.!?]*$/.test(text);
}

// Only an existing Quote route supplies ambient navigation identity. Browser
// request/project/active-work hints are deliberately not inputs to this contract.
export function assistantQuoteContextFromRoute(route = "") {
  const parsed = parseSavedQuoteRoute(route);
  if (parsed.page !== "quoteBuilder" || !parsed.valid) return Object.freeze({});
  return Object.freeze({
    ...(parsed.jobId ? { jobId: parsed.jobId } : {}),
    ...(parsed.draftId ? { draftId: parsed.draftId } : {}),
  });
}

export function isAssistantQuoteAction(action = {}) {
  return Boolean(action.quoteIntent) || parseSavedQuoteRoute(action.target).page === "quoteBuilder";
}

export function resolveAssistantQuoteNavigation({ action = {}, context = {}, intent = action.quoteIntent || "CONTINUE" } = {}) {
  const sources = [action, context];
  const jobs = sources.flatMap((source) => [source?.canonicalJobId, source?.jobId]).filter(present);
  const drafts = sources.flatMap((source) => [source?.draftId, source?.workingDraftId, source?.existingQuote?.workingDraftId]).filter(present);
  const target = parseSavedQuoteRoute(action.target);
  if (target.page === "quoteBuilder") {
    if (!target.valid) return blocked("INVALID_EXACT_IDENTITY");
    if (target.jobId) jobs.push(target.jobId);
    if (target.draftId) drafts.push(target.draftId);
  }

  if (intent === "GENERIC_NEW") {
    // Generic actions are constructed independently of ambient workflow state.
    // A contradictory contextual payload must never be erased as a side effect.
    const contextualKeys = ["request", "project", "requestId", "projectId", "conversationId", "selectedRequestId", "selectedQuoteRequestId", "quoteId", "canonicalQuoteId", "activeJobId", "activeWorkRequestId", "scheduleId", "visitId", "customerName", "existingQuote"];
    const hasContext = Object.values(context).some(present) || contextualKeys.some((key) => present(action[key]));
    if (jobs.length || drafts.length || hasContext) return blocked("NEW_INTENT_CONFLICTS_WITH_CONTEXT");
    return result("GENERIC_NEW", buildGenericNewQuoteRoute(), "EXPLICIT_STANDALONE_NEW");
  }
  if (intent !== "CONTINUE") return blocked("UNKNOWN_QUOTE_INTENT");

  function normalize(values, field) {
    const ids = values.map((value) => {
      if (typeof value !== "string") return "";
      const route = buildSavedQuoteRoute({ [field]: value });
      return route ? parseSavedQuoteRoute(route)[field] : "";
    });
    return ids.includes("") ? null : [...new Set(ids)];
  }
  const jobIds = normalize(jobs, "jobId");
  const draftIds = normalize(drafts, "draftId");
  if (!jobIds || !draftIds) return blocked("INVALID_EXACT_IDENTITY");
  if (jobIds.length > 1 || draftIds.length > 1) return blocked("CONFLICTING_EXACT_IDENTITIES");
  const jobId = jobIds[0] || "";
  const draftId = draftIds[0] || "";
  if (draftId) return result("EXACT_SAVED_QUOTE", buildSavedQuoteRoute({ jobId, draftId }), "EXPLICIT_WORKING_DRAFT_ID");
  if (jobId) return result("EXACT_JOB_CONTEXT", buildSavedQuoteRoute({ jobId }), "EXPLICIT_CANONICAL_JOB_ID");
  return blocked("EXACT_JOB_OR_WORKING_QUOTE_REQUIRED");
}
