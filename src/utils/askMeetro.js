import { parseQuoteInvoiceCommand, lookupQuoteInvoiceCommand, quoteInvoiceResolutionMessage } from "./quoteToInvoice.js";
import { buildCustomerQuoteReviewRoute } from "./customerQuoteReviewRoute.js";
import { buildProfessionalWorkCenterRoute } from "./professionalWorkCenterRoute.js";
import { buildCanonicalConversationRoute } from "./canonicalConversationMessaging.js";
import { buildInvoiceBuilderRoute } from "./completedJobInvoiceHandoff.js";
import { isExplicitStandaloneNewQuoteIntent, resolveAssistantQuoteNavigation } from "./assistantQuoteNavigation.js";

const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : "";
const numericIdentity = (value) => /^[1-9]\d*$/.test(String(value || "")) && Number.isSafeInteger(Number(value)) ? String(value) : "";
const identity = (value) => uuid(value) || numericIdentity(value);
const pages = new Set(["home", "businessDashboard", "contractorDashboard", "workCenter", "myRequests", "homeownerRequestDetails", "projectDetails", "completedJobDetails", "businessLeads", "quoteRequests", "quoteBuilder", "invoiceBuilder", "customerQuoteReview", "customerInvoiceReview", "depositRequestBuilder", "schedule", "conversationThread", "messagesInbox", "customerRelationshipsCenter", "projectGallery"]);

// A navigation pointer is context, never permission or evidence of a lifecycle state.
// Ignore display text and browser caches; preserve only exact bounded route identities.
export function captureAskMeetroContext(route = "", explicit = {}) {
  const [page, query = ""] = String(route).replace(/^#/, "").split("?");
  if (!pages.has(page)) return Object.freeze({ page: "", blocked: true });
  const params = new URLSearchParams(query);
  const context = { page: pages.has(page) ? page : "", label: String(explicit.label || "").slice(0, 160) };
  for (const key of ["jobId", "draftId", "quoteId", "invoiceId", "visitId", "requestId", "conversationId", "relationshipId", "businessContactId"]) {
    const normalize = ["jobId", "draftId", "quoteId", "invoiceId", "visitId", "businessContactId"].includes(key) ? uuid : ["requestId", "conversationId"].includes(key) ? numericIdentity : identity;
    const fromRoute = normalize(params.get(key));
    const fromEntry = normalize(explicit[key]);
    if ((params.has(key) && !fromRoute) || params.getAll(key).length > 1 || (fromRoute && fromEntry && fromRoute !== fromEntry) || (explicit[key] && !fromEntry)) return Object.freeze({ page: context.page, blocked: true });
    if (fromRoute || fromEntry) context[key] = fromRoute || fromEntry;
  }
  return Object.freeze(context);
}

export function askMeetroRecordRoute(context, kind, role = "personal") {
  if (!context || context.blocked) return "";
  const { jobId, draftId, invoiceId, requestId, conversationId } = context;
  if (kind === "QUOTE" && role === "personal") return buildCustomerQuoteReviewRoute(context);
  if (kind === "QUOTE" && role === "business") return resolveAssistantQuoteNavigation({ context: { jobId, draftId: context.page === "quoteBuilder" ? draftId : undefined }, intent: "CONTINUE" }).route;
  if (kind === "INVOICE" && role === "business") return draftId && context.page === "invoiceBuilder" ? `invoiceBuilder?draftId=${draftId}` : buildInvoiceBuilderRoute({ jobId, invoiceId }) || "";
  if (kind === "PAYMENT") return role === "business" && jobId ? buildInvoiceBuilderRoute({ jobId, invoiceId }) || "" : "";
  if (kind === "DEPOSIT") return role === "business" && jobId ? buildProfessionalWorkCenterRoute({ jobId, stage: "deposit" }) || "" : role === "business" && draftId && context.page === "quoteBuilder" ? askMeetroRecordRoute(context, "QUOTE", role) : "";
  if (kind === "CONVERSATION") return conversationId ? buildCanonicalConversationRoute(conversationId) || "" : "messagesInbox";
  if (kind === "CUSTOMER") return ""; // Customer detail uses its mounted workspace, not a query-string deep link.
  if (["JOB", "SCHEDULE", "PHOTOS"].includes(kind)) {
    if (jobId && role === "business") return buildProfessionalWorkCenterRoute({ jobId, visitId: context.visitId, stage: kind === "SCHEDULE" ? "schedule" : "work" }) || "";
    if (requestId && role === "personal") return `homeownerRequestDetails?requestId=${requestId}`;
  }
  return "";
}

export function planAskMeetroActions(instruction, { context = {}, role = "personal" } = {}) {
  const text = String(instruction || "").trim().slice(0, 5000);
  const normalized = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const actions = [];
  const add = (kind, title, recordKind = kind, extra = {}) => actions.push(Object.freeze({ id: `${actions.length}-${kind}`, kind, title, instruction: text, route: askMeetroRecordRoute(context, recordKind, role), context, status: "PROPOSED", ...extra }));
  if (!text) return [];
  // Uncertain and negative statements do not become affirmative lifecycle proposals.
  if (/\b(not|never|don[’']t|do not|hasn[’']t|haven[’']t|isn[’']t|wasn[’']t|no|nunca|sin|maybe|perhaps|quizas)\b/.test(normalized)) return [];
  if (role === "business" && isExplicitStandaloneNewQuoteIntent(text)) {
    add("NEW_QUOTE", "Prepare a new Quote", "QUOTE", { route: "quoteBuilder?new=1" });
    return actions;
  }
  const invoiceCommand = role === "business" ? parseQuoteInvoiceCommand(text) : null;
  if (invoiceCommand && /\b(?:q\s*-?\s*\d+|quote|cotizacion)\b/.test(normalized)) {
    add("QUOTE_TO_INVOICE", "Prepare Invoice from exact Quote", "INVOICE", { route: "", invoiceCommand });
    return actions;
  }
  if (/\b(approved?|accept(?:ed)?|aprobo|aprobada|aprobado)\b/.test(normalized) && /\b(quote|cotizacion)\b/.test(normalized)) add("QUOTE_APPROVAL", "Review customer approval", "QUOTE");
  if (/\b(paid|payment|deposit|received|pago|deposito)\b/.test(normalized)) add(/\b(deposit|deposito)\b/.test(normalized) ? "DEPOSIT" : "PAYMENT", "Review payment evidence");
  if (/\b(schedule|reschedule|visit|appointment|programa|agendar|visita)\b/.test(normalized)) add("SCHEDULE", "Review visit date and time");
  if (/\b(complet(?:e|ed)|finish(?:ed)?|completar|terminado)\b/.test(normalized) && /\b(job|work|trabajo)\b/.test(normalized)) add("COMPLETE_JOB", "Review work completion", "JOB");
  if (/\b(cancel|cancellation|cancelar)\b/.test(normalized)) add("CANCEL", "Review cancellation", "JOB");
  if (/\b(photo|photos|picture|pictures|foto|fotos)\b/.test(normalized)) add("PHOTOS", "Review photos for the Project Folder");
  if (!actions.some((item) => item.kind === "QUOTE_APPROVAL") && /\b(quote|cotizacion)\b/.test(normalized)) add("QUOTE", "Review Quote instructions");
  if (/\b(invoice|factura)\b/.test(normalized)) add("INVOICE", "Prepare or review Invoice");
  if (/\b(lead|leads|opportunit(?:y|ies))\b/.test(normalized) && role === "business") add("LEADS", "Find new opportunities", "JOB", { route: "businessLeads" });
  if (/\b(request|service|servicio)\b/.test(normalized) && role === "personal" && !actions.length) add("REQUEST", "Prepare a service request", "JOB", { route: "assistant" });
  if (/\b(message|messages|conversation|conversations|chat|mensaje)\b/.test(normalized)) add("CONVERSATION", "Continue the conversation");
  if (!actions.length && context.page) add("RECORD", "Review this record", context.draftId ? "QUOTE" : "JOB");
  return actions.map((action) => {
    const details = [];
    if (["PAYMENT", "DEPOSIT"].includes(action.kind)) {
      const amount = text.match(/[$€£]\s*\d[\d,.]*/)?.[0];
      const date = text.match(/\b(today|yesterday|hoy|ayer)\b/i)?.[0];
      const method = text.match(/\b(check|cash|card|transfer|cheque|efectivo)\b/i)?.[0];
      if (amount) details.push({ label: "Requested amount", value: amount });
      if (date) details.push({ label: "Reported payment date", value: date });
      if (method) details.push({ label: "Reported method", value: method });
    }
    if (action.kind === "SCHEDULE") {
      const date = text.match(/\b(?:(?:next|this)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana)\b/i)?.[0];
      const time = text.match(/\b(?:morning|afternoon|evening|\d{1,2}(?::\d{2})?\s*[ap]m)\b/i)?.[0];
      if (date) details.push({ label: "Requested day", value: date });
      if (time) details.push({ label: "Requested time", value: time });
    }
    return Object.freeze({ ...action, details });
  });
}

export async function resolveAskMeetroActions(instruction, options = {}) {
  const actions = planAskMeetroActions(instruction, options);
  return Promise.all(actions.map(async (action) => {
    if (action.kind !== "QUOTE_TO_INVOICE") return action;
    const result = await lookupQuoteInvoiceCommand(action.invoiceCommand, options);
    return Object.freeze({ ...action, route: result.state === "EXACT_QUOTE_TO_INVOICE" ? result.route : "", resolution: result.state,
      context: Object.freeze({ page: "quoteBuilder", ...(result.document ? { draftId: result.document.id, label: result.document.customerDisplayName || result.document.content?.customerName || "" } : { blocked: true }) }),
      details: [{ label: "Quote", value: action.invoiceCommand.number || "Exact Quote required" }],
      blockedReason: result.state === "EXACT_QUOTE_TO_INVOICE" ? "" : quoteInvoiceResolutionMessage(result.state) });
  }));
}

export function askMeetroReply(actions) {
  if (!actions.length) return "Tell me what you need help with, or open Ask Meetro from a Job, customer conversation, or document to work with that exact record.";
  return `I found ${actions.length} ${actions.length === 1 ? "action" : "actions"} to review. Nothing has been changed. Each action stays with its existing Meetro record and review process.`;
}
