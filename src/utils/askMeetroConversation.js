import { authFetch } from "./authFetch.js";
import { createIntelligenceKey } from "./contextualIntelligence.js";
import { askMeetroIntent, askMeetroRecordRoute, askMeetroReply, resolveAskMeetroActions } from "./askMeetro.js";

export const ASK_CONVERSATION_OPERATION = "companion.converse";
const SUCCESS = new Set(["INTELLIGENCE_OPERATION_COMPLETED", "INTELLIGENCE_OPERATION_REPLAYED"]);
const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function askConversationRecord(context = {}) {
  if (context.blocked && context.page) throw new Error("The exact record context could not be verified. Reopen Ask Meetro from the record.");
  const pair = context.page === "conversationThread" && context.conversationId ? ["CONVERSATION", context.conversationId]
    : context.draftId && ["quoteBuilder", "invoiceBuilder", "depositRequestBuilder"].includes(context.page) ? ["DOCUMENT_DRAFT", context.draftId]
      : context.invoiceId ? ["INVOICE", context.invoiceId]
        : context.quoteId ? ["QUOTE", context.quoteId]
          : context.evaluationId ? ["EVALUATION", context.evaluationId]
            : context.visitId && context.jobId ? ["VISIT", context.visitId]
              : context.relationshipId && context.page === "customerRelationshipsCenter" ? ["CUSTOMER_RELATIONSHIP", context.relationshipId]
                : context.jobId ? ["JOB", context.jobId]
                  : context.requestId ? ["JOB_REQUEST", context.requestId] : null;
  if (!pair) return {};
  const [type, id] = pair;
  if (["CONVERSATION", "JOB_REQUEST"].includes(type) ? !/^[1-9]\d*$/.test(id) : !uuid(id)) throw new Error("The exact record context could not be verified.");
  return { record: { type, id: String(id), ...(type === "VISIT" ? { jobId: context.jobId } : {}) } };
}

export function boundedAskHistory(messages = []) {
  let remaining = 8000;
  return messages.filter((turn) => ["user", "assistant"].includes(turn.role) && typeof turn.text === "string" && turn.text.trim()).slice(-8).reverse().map((turn) => {
    const text = turn.text.slice(0, Math.min(2000, remaining)); remaining -= text.length;
    return { role: turn.role, text };
  }).filter((turn) => turn.text).reverse();
}

export function knownAskNavigation(instruction, context, role) {
  const text = instruction.trim().replace(/[.!]$/, "").toLowerCase();
  const destinations = { "open communication": "messagesInbox", "open chat": "messagesInbox", "open home": "home", ...(role === "business" ? { "open leads": "businessLeads" } : {}) };
  if (destinations[text]) return destinations[text];
  if (/^show (?:this job['’]s )?(?:scheduled date|schedule)$/.test(text)) return askMeetroRecordRoute(context, "SCHEDULE", role);
  const record = /^(?:open|show|display) (?:this|the current) (quote|invoice|job|conversation)$/.exec(text);
  return record ? askMeetroRecordRoute(context, record[1].toUpperCase(), role) : "";
}

// One transport; provider text never enters the action resolver or navigation.
export async function requestAskConversation({ instruction, context = {}, messages = [], locale = "en-US", idempotencyKey = createIntelligenceKey(), authFetchImpl = authFetch, setPage, timeoutMs = 45000, signal }) {
  if (typeof instruction !== "string" || !instruction.trim() || instruction.length > 5000) throw new Error("Enter a question of 5,000 characters or fewer.");
  const controller = new AbortController();
  let timer, envelope, cancel;
  const cancelled = () => Object.assign(new Error("The Ask Meetro request was cancelled."), { code: "ASK_CONVERSATION_CANCELLED" });
  if (signal?.aborted) throw cancelled();
  const cancellation = new Promise((_, reject) => {
    cancel = () => { reject(cancelled()); controller.abort(); };
    signal?.addEventListener("abort", cancel, { once: true });
  });
  try {
    envelope = await Promise.race([
      cancellation,
      authFetchImpl("/api/companion/ask", {
        method: "POST", headers: { "Idempotency-Key": idempotencyKey }, signal: controller.signal,
        body: JSON.stringify({ operation: ASK_CONVERSATION_OPERATION, capability: ASK_CONVERSATION_OPERATION, locale, context: askConversationRecord(context), input: { message: instruction, history: boundedAskHistory(messages) } }),
      }, setPage),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(Object.assign(new Error("Ask Meetro did not respond in time. Your message is still available; please try again."), { code: "ASK_CONVERSATION_TIMEOUT" }));
          controller.abort();
        }, Math.max(1, Math.min(timeoutMs, 45000)));
      }),
    ]);
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", cancel); }
  const { response, data } = envelope;
  if (!response.ok || data?.success !== true || !SUCCESS.has(data.code) || data.operation !== ASK_CONVERSATION_OPERATION) {
    throw Object.assign(new Error("Ask Meetro could not complete the response. Your message is still available; please try again."), { code: data?.code || "ASK_CONVERSATION_FAILED" });
  }
  const result = data.result;
  if (!result || Object.keys(result).sort().join(",") !== "authorityClassification,directMutationAllowed,schemaVersion,text" || result.schemaVersion !== 1 || result.authorityClassification !== "CONVERSATIONAL_NON_CANONICAL" || result.directMutationAllowed !== false || typeof result.text !== "string" || !result.text.trim() || result.text.length > 8000) {
    throw Object.assign(new Error("Ask Meetro returned an invalid response. Nothing has been changed."), { code: "ASK_CONVERSATION_RESPONSE_INVALID" });
  }
  return result.text;
}

export async function resolveAskMeetroRequest(instruction, options = {}) {
  const navigation = knownAskNavigation(instruction, options.context || {}, options.role);
  if (navigation) return { actions: [], route: navigation, text: "Opening the requested Meetro page." };
  if (/^(?:open|show|display) (?:this|the current) (?:quote|invoice|job|conversation)[.!]?$/i.test(instruction.trim())) return { actions: [], text: "Open Ask Meetro from the exact record to view it." };
  if (/^open leads[.!]?$/i.test(instruction.trim()) && options.role !== "business") return { actions: [], text: "Leads are available in your business workspace." };
  if (/^(?:show|what is) this job['’]s status[?.!]?$/i.test(instruction.trim())) {
    if (!uuid(options.context?.jobId) || options.context.blocked || options.role !== "business") return { actions: [], text: "Open the exact Job to see its current status." };
    const { response, data } = await (options.authFetchImpl || authFetch)(`/jobs/${options.context.jobId}/live-state`, { method: "GET" }, options.setPage);
    const job = data?.liveJob;
    if (!response.ok || data.success !== true || job?.jobId !== options.context.jobId || typeof job.stage?.label !== "string" || !job.stage.label || job.stage.label.length > 160) throw new Error("The current Job status could not be verified. Please try again.");
    return { actions: [], text: `Current Job status: ${job.stage.label}.` };
  }
  const intent = askMeetroIntent(instruction);
  const actions = await (options.resolveActions || resolveAskMeetroActions)(instruction, options);
  if (actions.length || (intent.change && !intent.information)) return { actions, text: actions.find((action) => action.blockedReason)?.blockedReason || askMeetroReply(actions, instruction) };
  if (options.signal?.aborted) throw new Error("The Ask Meetro request was cancelled.");
  const text = await (options.requestConversation || requestAskConversation)({ ...options, instruction });
  return { actions: [], text: intent.information && intent.change ? `${text}\n\nNo change has been proposed. Send the requested change separately for exact-record Review.` : text };
}
