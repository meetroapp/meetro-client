import { authFetch } from "./authFetch.js";
import { createIntelligenceKey } from "./contextualIntelligence.js";
import { askMeetroIntent, askMeetroRecordRoute, askMeetroReply, resolveAskMeetroActions } from "./askMeetro.js";
import { isExplicitStandaloneNewQuoteIntent } from "./assistantQuoteNavigation.js";

export const ASK_CONVERSATION_OPERATION = "companion.converse";
const SUCCESS = new Set(["INTELLIGENCE_OPERATION_COMPLETED", "INTELLIGENCE_OPERATION_REPLAYED"]);
const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const RETRIEVAL_STATUSES = new Set(["RESOLVED", "AMBIGUOUS", "NOT_FOUND", "SAFE_NOT_FOUND", "NO_RECORD_REQUIRED"]);
const RETRIEVAL_ANSWER_SOURCES = new Set(["PROVIDER_CONVERSATION", "DETERMINISTIC_RETRIEVAL"]);
const RETRIEVAL_AUDIENCES = new Set(["professional", "homeowner"]);
const RETRIEVAL_RECORD_TYPES = new Set(["JOB", "JOB_REQUEST", "DOCUMENT_DRAFT", "QUOTE", "INVOICE", "EVALUATION", "VISIT", "CUSTOMER_RELATIONSHIP", "CONVERSATION"]);
const RETRIEVAL_MAX_RECORDS = 10;

function plainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value, keys) {
  if (!plainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function validRetrievalPointer(value) {
  if (!plainObject(value) || !RETRIEVAL_RECORD_TYPES.has(value.type)) return false;
  const numeric = ["JOB_REQUEST", "CONVERSATION"].includes(value.type);
  const allowed = value.type === "VISIT" ? ["type", "id", "jobId"] : ["type", "id"];
  if (!exactKeys(value, allowed)) return false;
  if (typeof value.id !== "string") return false;
  if (numeric ? !/^[1-9]\d*$/.test(value.id) : !uuid(value.id)) return false;
  return value.type !== "VISIT" || uuid(value.jobId);
}

function validBoundedText(value, max) {
  return typeof value === "string" && value.length <= max;
}

export function validateAskMeetroResolution(value) {
  if (!exactKeys(value, [
    "version",
    "status",
    "audience",
    "records",
    "truncated",
    "reviewRequired",
    "continuation",
    "answerSource",
    "providerInvoked",
  ])) return null;

  if (
    value.version !== 1 ||
    !RETRIEVAL_STATUSES.has(value.status) ||
    !RETRIEVAL_AUDIENCES.has(value.audience) ||
    typeof value.truncated !== "boolean" ||
    typeof value.reviewRequired !== "boolean" ||
    !RETRIEVAL_ANSWER_SOURCES.has(value.answerSource) ||
    typeof value.providerInvoked !== "boolean" ||
    !Array.isArray(value.records) ||
    value.records.length > RETRIEVAL_MAX_RECORDS
  ) return null;

  if (
    (value.answerSource === "PROVIDER_CONVERSATION") !== value.providerInvoked
  ) return null;

  const records = [];
  for (const item of value.records) {
    if (!exactKeys(item, ["record", "name", "title", "number", "label"])) return null;
    if (
      !validRetrievalPointer(item.record) ||
      !validBoundedText(item.name, 100) ||
      !validBoundedText(item.title, 120) ||
      !validBoundedText(item.number, 80) ||
      !validBoundedText(item.label, 240)
    ) return null;

    records.push({
      record: { ...item.record },
      name: item.name,
      title: item.title,
      number: item.number,
      label: item.label,
    });
  }

  let continuation = null;
  if (value.continuation !== null) {
    if (
      !exactKeys(value.continuation, ["reference", "expiresAfterSeconds"]) ||
      !uuid(value.continuation.reference) ||
      !Number.isInteger(value.continuation.expiresAfterSeconds) ||
      value.continuation.expiresAfterSeconds <= 0 ||
      value.continuation.expiresAfterSeconds > 900
    ) return null;

    continuation = {
      reference: value.continuation.reference,
      expiresAfterSeconds: value.continuation.expiresAfterSeconds,
    };
  }

  if (records.length && !continuation) return null;
  if (!records.length && continuation) return null;

  return Object.freeze({
    version: 1,
    status: value.status,
    audience: value.audience,
    records: Object.freeze(records),
    truncated: value.truncated,
    reviewRequired: value.reviewRequired,
    continuation,
    answerSource: value.answerSource,
    providerInvoked: value.providerInvoked,
  });
}

export function buildAskMeetroConversationContext(context = {}, continuation = null) {
  const exact = askConversationRecord(context);
  const retrieval = { version: 1 };

  if (continuation !== null && continuation !== undefined) {
    if (
      !plainObject(continuation) ||
      !exactKeys(continuation, ["reference", "index"]) ||
      !uuid(continuation.reference) ||
      !Number.isInteger(continuation.index) ||
      continuation.index < 0 ||
      continuation.index >= RETRIEVAL_MAX_RECORDS
    ) {
      throw Object.assign(
        new Error("The selected Ask Meetro record is no longer available. Search again."),
        { code: "ASK_CONVERSATION_CONTINUATION_INVALID" }
      );
    }

    retrieval.continuation = {
      reference: continuation.reference,
      index: continuation.index,
    };
  }

  return { ...exact, retrieval };
}

export function askMeetroResolvedRecordContext(resolution, currentContext = {}, role = "personal") {
  if (
    !resolution ||
    resolution.version !== 1 ||
    resolution.status !== "RESOLVED" ||
    resolution.reviewRequired !== true ||
    !Array.isArray(resolution.records) ||
    resolution.records.length !== 1
  ) return null;

  const item = resolution.records[0];
  const record = item?.record;
  if (!validRetrievalPointer(record)) return null;

  const label = String(item.label || item.title || item.name || "").slice(0, 160);

  if (record.type === "JOB") {
    return Object.freeze({
      page: "workCenter",
      jobId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "VISIT") {
    return Object.freeze({
      page: "workCenter",
      jobId: record.jobId,
      visitId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "JOB_REQUEST") {
    return Object.freeze({
      page: role === "personal" ? "homeownerRequestDetails" : "myRequests",
      requestId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "CONVERSATION") {
    return Object.freeze({
      page: "conversationThread",
      conversationId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "QUOTE") {
    return Object.freeze({
      page: role === "personal" ? "customerQuoteReview" : "quoteBuilder",
      quoteId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "INVOICE") {
    return Object.freeze({
      page: role === "personal" ? "customerInvoiceReview" : "invoiceBuilder",
      invoiceId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "EVALUATION") {
    return Object.freeze({
      page: "workCenter",
      evaluationId: record.id,
      ...(label ? { label } : {}),
    });
  }

  if (record.type === "CUSTOMER_RELATIONSHIP") {
    return Object.freeze({
      page: "customerRelationshipsCenter",
      relationshipId: record.id,
      ...(label ? { label } : {}),
    });
  }

  // A detached working document does not carry enough route identity in
  // Retrieval V1 to guess Quote vs Invoice. Reuse it only when the user
  // was already on that exact document.
  if (
    record.type === "DOCUMENT_DRAFT" &&
    currentContext?.draftId === record.id &&
    ["quoteBuilder", "invoiceBuilder", "depositRequestBuilder"].includes(currentContext.page)
  ) {
    return Object.freeze({
      ...currentContext,
      ...(label ? { label } : {}),
    });
  }

  return null;
}

function isVagueResolvedQuoteChange(instruction, resolution) {
  const record = resolution?.records?.[0]?.record;

  if (
    resolution?.status !== "RESOLVED" ||
    resolution?.records?.length !== 1 ||
    record?.type !== "QUOTE"
  ) {
    return false;
  }

  const text = String(instruction || "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  return /^(?:(?:please|can you|could you|would you|help me|i want to)\s+)?(?:update|edit|revise)\s+(?:this\s+)?quote(?:\s+q\s*-?\s*\d{1,12})?[.!]?$/.test(
    text
  );
}

function expectedRetrievalAudience(role) {
  return role === "business" ? "professional" : "homeowner";
}

async function finalizeAskMeetroConversation({
  conversation,
  instruction,
  intent,
  options,
}) {
  const text =
    typeof conversation === "string" ? conversation : conversation?.text;

  const resolution =
    typeof conversation === "string"
      ? null
      : conversation?.resolution || null;

  if (typeof text !== "string" || !text.trim()) {
    throw Object.assign(
      new Error("Ask Meetro returned an invalid response. Nothing has been changed."),
      { code: "ASK_CONVERSATION_RESPONSE_INVALID" }
    );
  }

  if (
    resolution &&
    resolution.audience !== expectedRetrievalAudience(options.role)
  ) {
    throw Object.assign(
      new Error("Ask Meetro returned record context for a different account mode. Nothing has been changed."),
      { code: "ASK_CONVERSATION_AUDIENCE_INVALID" }
    );
  }

  let actions = [];
  let blockedReason = "";

  if (resolution?.reviewRequired === true) {
    if (
      resolution.status !== "RESOLVED" ||
      resolution.records.length !== 1 ||
      !intent.change ||
      intent.information
    ) {
      throw Object.assign(
        new Error("Ask Meetro returned an invalid Review handoff. Nothing has been changed."),
        { code: "ASK_CONVERSATION_REVIEW_INVALID" }
      );
    }

    const resolvedContext = askMeetroResolvedRecordContext(
      resolution,
      options.context || {},
      options.role
    );

    if (resolvedContext) {
      const resolved = await (
        options.resolveActions || resolveAskMeetroActions
      )(instruction, {
        ...options,
        context: resolvedContext,
      });

      // Retrieval identifies the record. Only the PRE-EXISTING governed
      // action planner may provide a route into an existing reviewer.
      actions = resolved.filter(
        (action) =>
          action?.status === "PROPOSED" &&
          typeof action.route === "string" &&
          action.route
      );

      if (!actions.length) {
        blockedReason =
          resolved.find(
            (action) =>
              action?.status === "BLOCKED" &&
              typeof action.blockedReason === "string" &&
              action.blockedReason.trim()
          )?.blockedReason.trim() || "";
      }
    }
  }

  const clarificationRequired =
    resolution?.reviewRequired === true &&
    resolution.status === "RESOLVED" &&
    actions.length === 0 &&
    !blockedReason &&
    isVagueResolvedQuoteChange(instruction, resolution);

  const resolvedRecord = resolution?.records?.[0] || null;
  const resolvedLabel =
    typeof resolvedRecord?.label === "string"
      ? resolvedRecord.label.trim()
      : "";
  const resolvedNumber =
    typeof resolvedRecord?.number === "string"
      ? resolvedRecord.number.trim()
      : "";

  // Legacy string-only mocks do not contain the server's mixed-intent
  // protection, so preserve the old warning only for those callers.
  const finalText =
    blockedReason ||
    (clarificationRequired
      ? `${resolvedLabel ? `I found ${resolvedLabel}. ` : ""}What would you like to change on this Quote?${resolvedNumber ? ` Include ${resolvedNumber} in your next instruction.` : ""} Nothing has been changed.`
      : !resolution && intent.information && intent.change
        ? `${text}\n\nNo change has been proposed. Send the requested change separately for exact-record Review.`
        : text);

  return {
    actions,
    text: finalText,
    resolution,
    ...(blockedReason ? { blockedReason } : {}),
  };
}

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
export async function requestAskConversation({ instruction, context = {}, messages = [], locale = "en-US", idempotencyKey = createIntelligenceKey(), authFetchImpl = authFetch, setPage, timeoutMs = 45000, signal, continuation = null, returnResolution = false }) {
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
        body: JSON.stringify({ operation: ASK_CONVERSATION_OPERATION, capability: ASK_CONVERSATION_OPERATION, locale, context: buildAskMeetroConversationContext(context, continuation), input: { message: instruction, history: boundedAskHistory(messages) } }),
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
  const keys = result && plainObject(result) ? Object.keys(result).sort().join(",") : "";
  const baseKeys = "authorityClassification,directMutationAllowed,schemaVersion,text";
  const retrievalKeys = "authorityClassification,directMutationAllowed,resolution,schemaVersion,text";

  if (
    !result ||
    ![baseKeys, retrievalKeys].includes(keys) ||
    result.schemaVersion !== 1 ||
    result.authorityClassification !== "CONVERSATIONAL_NON_CANONICAL" ||
    result.directMutationAllowed !== false ||
    typeof result.text !== "string" ||
    !result.text.trim() ||
    result.text.length > 8000
  ) {
    throw Object.assign(new Error("Ask Meetro returned an invalid response. Nothing has been changed."), { code: "ASK_CONVERSATION_RESPONSE_INVALID" });
  }

  let resolution = null;
  if (Object.hasOwn(result, "resolution")) {
    resolution = validateAskMeetroResolution(result.resolution);
    if (!resolution) {
      throw Object.assign(new Error("Ask Meetro returned invalid record resolution. Nothing has been changed."), { code: "ASK_CONVERSATION_RESOLUTION_INVALID" });
    }
  }

  return returnResolution ? { text: result.text, resolution } : result.text;
}

export async function resolveAskMeetroRequest(instruction, options = {}) {
  const intent = askMeetroIntent(instruction);

  if (options.continuation) {
    const conversation = await (
      options.requestConversation || requestAskConversation
    )({
      ...options,
      instruction,
      returnResolution: true,
    });

    return finalizeAskMeetroConversation({
      conversation,
      instruction,
      intent,
      options,
    });
  }

  const navigation = knownAskNavigation(
    instruction,
    options.context || {},
    options.role
  );

  if (navigation) {
    return {
      actions: [],
      route: navigation,
      text: "Opening the requested Meetro page.",
    };
  }

  if (
    /^(?:open|show|display) (?:this|the current) (?:quote|invoice|job|conversation)[.!]?$/i.test(
      instruction.trim()
    )
  ) {
    return {
      actions: [],
      text: "Open Ask Meetro from the exact record to view it.",
    };
  }

  if (
    /^open leads[.!]?$/i.test(instruction.trim()) &&
    options.role !== "business"
  ) {
    return {
      actions: [],
      text: "Leads are available in your business workspace.",
    };
  }

  if (
    /^(?:show|what is) this job['’]s status[?.!]?$/i.test(
      instruction.trim()
    )
  ) {
    if (
      !uuid(options.context?.jobId) ||
      options.context.blocked ||
      options.role !== "business"
    ) {
      return {
        actions: [],
        text: "Open the exact Job to see its current status.",
      };
    }

    const { response, data } = await (
      options.authFetchImpl || authFetch
    )(
      `/jobs/${options.context.jobId}/live-state`,
      { method: "GET" },
      options.setPage
    );

    const job = data?.liveJob;

    if (
      !response.ok ||
      data.success !== true ||
      job?.jobId !== options.context.jobId ||
      typeof job.stage?.label !== "string" ||
      !job.stage.label ||
      job.stage.label.length > 160
    ) {
      throw new Error(
        "The current Job status could not be verified. Please try again."
      );
    }

    return {
      actions: [],
      text: `Current Job status: ${job.stage.label}.`,
    };
  }

  const standaloneNewQuote =
    options.role === "business" &&
    isExplicitStandaloneNewQuoteIntent(instruction);

  const requiresServerTargetResolution =
    intent.change &&
    !intent.information &&
    !standaloneNewQuote;

  // Record-changing commands cannot inherit the currently mounted record
  // before the server has resolved the user's intended authorized target.
  // Exact/deictic context can still resolve deterministically server-side.
  const localActions = requiresServerTargetResolution
    ? []
    : await (
        options.resolveActions || resolveAskMeetroActions
      )(instruction, options);

  // Preserve record-free governed actions such as explicit standalone New Quote.
  if (localActions.length) {
    return {
      actions: localActions,
      text:
        localActions.find((action) => action.blockedReason)?.blockedReason ||
        askMeetroReply(localActions, instruction),
    };
  }

  // IMPORTANT:
  // A pure change with no local exact-record action must NOT be blocked here.
  // Universal Retrieval now resolves the authorized record server-side.
  if (options.signal?.aborted) {
    throw new Error("The Ask Meetro request was cancelled.");
  }

  const conversation = await (
    options.requestConversation || requestAskConversation
  )({
    ...options,
    instruction,
    returnResolution: true,
  });

  return finalizeAskMeetroConversation({
    conversation,
    instruction,
    intent,
    options,
  });
}
