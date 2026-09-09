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
  for (const key of ["jobId", "draftId", "quoteId", "invoiceId", "evaluationId", "visitId", "requestId", "conversationId", "relationshipId", "businessContactId"]) {
    const normalize = ["jobId", "draftId", "quoteId", "invoiceId", "evaluationId", "visitId", "businessContactId"].includes(key) ? uuid : ["requestId", "conversationId"].includes(key) ? numericIdentity : identity;
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

const commandPrefix = "(?:(?:please|can you|could you|would you|help me|i want to) )?";
const changeClause = new RegExp(`^${commandPrefix}(?:create|prepare|revise|update|edit|record|mark|complete|finish|schedule|reschedule|approve|accept|cancel|add|attach|upload|continue|make|crear|preparar|actualizar|registrar|completar|agendar)\\b`);
const informationClause = /^(?:(?:please|can you|could you|would you)\s+)?(?:tell me|show me how|should i|can i|do i|explain|troubleshoot|diagnos(?:e|is)|summari[sz]e|compare|interpret|why|how|what|whether|explica|explicar|diagnosticar|resume|comparar|por que|como|help\b|(?:i\s+)?(?:need|want)\s+(?:help|guidance|advice)|(?:check|review)\s+(?:whether|if|why|how|what))\b/;

export function askMeetroIntent(instruction) {
  const text = String(instruction || "").trim().slice(0, 5000).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // Inspect clause heads, not relative clauses such as "with what the customer
  // paid" or "how we discussed" inside an explicit operational instruction.
  const clauses = text.split(/[;!?\n]|\.(?!\d)|,\s+|\b(?:and|but|then|also)\b/).map((part) => part.trim()).filter(Boolean);
  const information = clauses.some((clause) => informationClause.test(clause));
  const change = clauses.some((clause) => !informationClause.test(clause) && (changeClause.test(clause) || isExplicitStandaloneNewQuoteIntent(clause)));
  return { clauses, information, change };
}

export function isAskMeetroInformationRequest(instruction) {
  const { information, change } = askMeetroIntent(instruction);
  return information && !change;
}

export function planAskMeetroActions(instruction, { context = {}, role = "personal" } = {}) {
  const text = String(instruction || "").trim().slice(0, 5000);
  const normalized = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const actions = [];
  const add = (kind, title, recordKind = kind, extra = {}) => {
    const route = extra.route ?? askMeetroRecordRoute(context, recordKind, role);
    if (!route) return; // Missing exact authority is a clarification, never a placeholder review.
    actions.push(Object.freeze({ id: `${actions.length}-${kind}`, kind, title, instruction: text, route, context, status: "PROPOSED", ...extra }));
  };
  const intent = askMeetroIntent(text);
  // Until conversation is connected, hold mixed requests in full. Do not pass
  // unanswered guidance or conditional instructions into record review/apply.
  if (!text || intent.information) return [];
  // Uncertain and negative statements do not become affirmative lifecycle proposals.
  if (/\b(not|never|don[’']t|do not|hasn[’']t|haven[’']t|isn[’']t|wasn[’']t|no|nunca|sin|maybe|perhaps|quizas)\b/.test(normalized)) return [];
  if (role === "business" && isExplicitStandaloneNewQuoteIntent(text)) {
    add("NEW_QUOTE", "Prepare a new Quote", "QUOTE", { route: "quoteBuilder?new=1" });
    return actions;
  }
  // Only explicit command clauses can nominate a change. Merely mentioning a
  // payment, visit, completion, or Quote does not ask Meetro to change it.
  const command = (verbs, subject) => intent.clauses.some((clause) => new RegExp(`^${commandPrefix}(?:${verbs})\\b[\\s\\S]*\\b(?:${subject})\\b`).test(clause));
  const invoiceCommand = role === "business" && command("create|prepare|make|crear|preparar", "invoice|factura") ? parseQuoteInvoiceCommand(text) : null;
  if (invoiceCommand && /\b(?:q\s*-?\s*\d+|quote|cotizacion)\b/.test(normalized)) {
    // This is a lookup request, not a proposed mutation. Resolution must verify
    // an exact Quote before the workspace can render its review card.
    return [Object.freeze({ id: "0-QUOTE_TO_INVOICE", kind: "QUOTE_TO_INVOICE", title: "Prepare Invoice from exact Quote", instruction: text, route: "", invoiceCommand, context, status: "LOOKUP_REQUIRED" })];
  }
  if (command("approve|accept|record|mark|aprobar|registrar", "quote|cotizacion") && /\b(approv(?:e|al|ed)|accept(?:ed)?|aprobo|aprobada|aprobado)\b/.test(normalized)) add("QUOTE_APPROVAL", "Review customer approval", "QUOTE");
  if (command("record|add|registrar", "paid|payment|deposit|received|pago|deposito")) add(/\b(deposit|deposito)\b/.test(normalized) ? "DEPOSIT" : "PAYMENT", "Review payment evidence");
  if (command("schedule|reschedule|programa|agendar", "job|visit|appointment|consultation|trabajo|visita|consulta")) add("SCHEDULE", "Review visit date and time");
  if (command("mark|complete|finish|completar|terminar", "job|work|trabajo") && /\b(complet(?:e|ed)|finish(?:ed)?|completar|terminar|terminado)\b/.test(normalized)) add("COMPLETE_JOB", "Review work completion", "JOB");
  if (command("cancel|cancelar", "job|visit|appointment|trabajo|visita")) add("CANCEL", "Review cancellation", "JOB");
  if (command("add|attach|upload|agregar|subir", "photo|photos|picture|pictures|foto|fotos")) add("PHOTOS", "Review photos for the Project Folder");
  if (!actions.some((item) => item.kind === "QUOTE_APPROVAL") && command("create|prepare|revise|update|edit|continue|crear|preparar|actualizar", "quote|cotizacion")) add("QUOTE", "Review Quote instructions");
  if (command("create|prepare|revise|update|edit|crear|preparar|actualizar", "invoice|factura")) add("INVOICE", "Prepare or review Invoice");
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
    return Object.freeze({ ...action, status: result.state === "EXACT_QUOTE_TO_INVOICE" ? "PROPOSED" : "BLOCKED", route: result.state === "EXACT_QUOTE_TO_INVOICE" ? result.route : "", resolution: result.state,
      context: Object.freeze({ page: "quoteBuilder", ...(result.document ? { draftId: result.document.id, label: result.document.customerDisplayName || result.document.content?.customerName || "" } : { blocked: true }) }),
      details: [{ label: "Quote", value: action.invoiceCommand.number || "Exact Quote required" }],
      blockedReason: result.state === "EXACT_QUOTE_TO_INVOICE" ? "" : quoteInvoiceResolutionMessage(result.state) });
  }));
}

export function isAskMeetroChangeRequest(instruction) {
  const { information, change } = askMeetroIntent(instruction);
  return change && !information;
}

export function askMeetroReply(actions, instruction = "") {
  const { information, change } = askMeetroIntent(instruction);
  if (information && change) return "This message includes a question and a requested change. Conversational help is not connected yet, so I have not answered the question or proposed the change. Send the change separately to review it against its exact record. Nothing has been changed.";
  if (!actions.length && isAskMeetroChangeRequest(instruction)) return "To make that change, open Ask Meetro from the exact existing record. No action has been proposed or applied.";
  if (!actions.length) return "Conversational help is not connected yet. Your question does not require a Meetro record. Nothing has been changed.";
  return `I found ${actions.length} ${actions.length === 1 ? "action" : "actions"} to review. Nothing has been changed. Each action stays with its existing Meetro record and review process.`;
}
