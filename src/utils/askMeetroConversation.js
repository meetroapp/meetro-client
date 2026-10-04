import { authFetch } from "./authFetch.js";
import { createIntelligenceKey } from "./contextualIntelligence.js";
import { askMeetroIntent, askMeetroRecordRoute, askMeetroReply, resolveAskMeetroActions } from "./askMeetro.js";
import { isExplicitStandaloneNewQuoteIntent } from "./assistantQuoteNavigation.js";
import { resolveExactSourceQuote } from "./quoteToInvoice.js";
import { listBusinessDocumentDrafts } from "./businessDocumentDraftApi.js";
import { hydrateSavedQuoteAuthority } from "./savedQuoteAuthorityHydration.js";

export const ASK_CONVERSATION_OPERATION = "companion.converse";
const SUCCESS = new Set(["INTELLIGENCE_OPERATION_COMPLETED", "INTELLIGENCE_OPERATION_REPLAYED"]);
const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const sameUuid = (left, right) =>
  uuid(left) &&
  uuid(right) &&
  String(left).trim().toLowerCase() ===
    String(right).trim().toLowerCase();

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
  if (context?.page === "emergencyRequest") {
    if (continuation !== null && continuation !== undefined) {
      throw Object.assign(
        new Error("Emergency guidance does not support record selection. Start a new advisory question."),
        { code: "ASK_CONVERSATION_CONTINUATION_INVALID" }
      );
    }

    return {};
  }

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

function normalizeResolvedQuoteTarget(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bq\s+(\d{1,12})\b/g, "q$1");
}

function isVagueResolvedQuoteChange(instruction, resolution) {
  if (
    resolution?.status !== "RESOLVED" ||
    resolution?.records?.length !== 1
  ) {
    return false;
  }

  const item = resolution.records[0];
  const record = item?.record;
  const number = normalizeResolvedQuoteTarget(item?.number)
    .replace(/\s+/g, "");

  // Universal Retrieval may resolve a professional Quote search either to
  // canonical Quote authority or to an unattached working Quote document.
  // A working document is Quote-like here only when its authorized returned
  // document number is explicitly a Q-number. This affects clarification
  // wording only; it does not create route or mutation authority.
  const quoteLike =
    record?.type === "QUOTE" ||
    (
      record?.type === "DOCUMENT_DRAFT" &&
      /^q\d{1,12}$/.test(number)
    );

  if (!quoteLike) return false;

  let text = normalizeResolvedQuoteTarget(instruction);

  const command =
    /^(?:(?:please|can you|could you|would you|help me|i want to)\s+)?(?:update|edit|revise)\s+/;

  if (!command.test(text)) return false;
  text = text.replace(command, "").trim();

  const name = normalizeResolvedQuoteTarget(item?.name);
  const targets = new Set(["quote"]);

  if (number) {
    targets.add(`quote ${number}`);
  }

  if (name) {
    targets.add(`${name} quote`);
    targets.add(`customer ${name} quote`);

    if (number) {
      targets.add(`${name} quote ${number}`);
      targets.add(`customer ${name} quote ${number}`);
    }
  }

  return targets.has(text);
}

function isSpecificResolvedInvoiceChange(instruction, resolution) {
  if (
    resolution?.status !== "RESOLVED" ||
    resolution?.records?.length !== 1
  ) {
    return false;
  }

  const item = resolution.records[0];
  const record = item?.record;

  // R4.2A Invoice hosting is intentionally limited to the exact
  // working DOCUMENT_DRAFT returned by Universal Retrieval.
  // A canonical INVOICE pointer does not imply editable draft authority.
  if (record?.type !== "DOCUMENT_DRAFT") {
    return false;
  }

  let text = normalizeResolvedQuoteTarget(instruction);

  const command =
    /^(?:(?:please|can you|could you|would you|help me|i want to)\s+)?(?:update|edit|revise)\s+/;

  if (!command.test(text)) {
    return false;
  }

  text = text.replace(command, "").trim();

  const name = normalizeResolvedQuoteTarget(item?.name);
  const number = normalizeResolvedQuoteTarget(item?.number);
  const compactNumber = number.replace(/\s+/g, "");

  const targets = new Set(["invoice"]);

  if (number) {
    targets.add(`invoice ${number}`);

    if (compactNumber && compactNumber !== number) {
      targets.add(`invoice ${compactNumber}`);
    }
  }

  if (name) {
    targets.add(`${name} invoice`);
    targets.add(`customer ${name} invoice`);

    if (number) {
      targets.add(`${name} invoice ${number}`);
      targets.add(`customer ${name} invoice ${number}`);

      if (compactNumber && compactNumber !== number) {
        targets.add(`${name} invoice ${compactNumber}`);
        targets.add(`customer ${name} invoice ${compactNumber}`);
      }
    }
  }

  const target = [...targets]
    .sort((left, right) => right.length - left.length)
    .find((candidate) =>
      text === candidate ||
      text.startsWith(`${candidate} `)
    );

  return Boolean(
    target &&
    text.slice(target.length).trim()
  );
}

function isSpecificResolvedQuoteChange(instruction, resolution) {
  if (
    resolution?.status !== "RESOLVED" ||
    resolution?.records?.length !== 1
  ) {
    return false;
  }

  const item = resolution.records[0];
  const record = item?.record;
  const number = normalizeResolvedQuoteTarget(item?.number)
    .replace(/\s+/g, "");

  const quoteLike =
    record?.type === "QUOTE" ||
    (
      record?.type === "DOCUMENT_DRAFT" &&
      /^q\d{1,12}$/.test(number)
    );

  // Universal in-panel lookup needs the exact authorized Quote number.
  if (!quoteLike || !/^q\d{1,12}$/.test(number)) {
    return false;
  }

  let text = normalizeResolvedQuoteTarget(instruction);

  const command =
    /^(?:(?:please|can you|could you|would you|help me|i want to)\s+)?(?:update|edit|revise)\s+/;

  if (!command.test(text)) {
    return false;
  }

  text = text.replace(command, "").trim();

  const name = normalizeResolvedQuoteTarget(item?.name);

  const targets = new Set([
    `quote ${number}`,
  ]);

  if (name) {
    targets.add(`${name} quote`);
    targets.add(`customer ${name} quote`);
    targets.add(`${name} quote ${number}`);
    targets.add(`customer ${name} quote ${number}`);
  }

  // Prefer the longest authorized target. Otherwise a complete target such
  // as "Bob Hamel Quote Q0000049" could match the shorter
  // "Bob Hamel Quote" prefix and incorrectly treat the Quote number itself
  // as requested change detail.
  const target = [...targets]
    .sort((left, right) => right.length - left.length)
    .find((candidate) =>
      text === candidate ||
      text.startsWith(`${candidate} `)
    );

  return Boolean(
    target &&
    text.slice(target.length).trim()
  );
}

export async function resolveAskMeetroHeldQuoteFollowUp(
  instruction,
  resolution,
  {
    setPage,
    listDocuments = listBusinessDocumentDrafts,
    getQuoteAuthority = hydrateSavedQuoteAuthority,
  } = {}
) {
  const priorInstruction =
    String(resolution?.instruction || "").trim();

  if (
    !priorInstruction ||
    !isVagueResolvedQuoteChange(priorInstruction, resolution)
  ) {
    return null;
  }

  const intent = askMeetroIntent(instruction);

  if (!intent.change || intent.information) {
    return null;
  }

  const normalizedInstruction =
    normalizeResolvedQuoteTarget(instruction);

  // A newly supplied Q-number nominates a new target and must go through
  // normal Universal Retrieval instead of inheriting the previous Quote.
  if (/\bq\d{1,12}\b/.test(
    normalizedInstruction.replace(/\s+/g, "")
  )) {
    return null;
  }

  // Do not let an unrelated lifecycle command inherit Quote identity.
  if (
    /\b(?:invoice|job|visit|appointment|schedule|complete|completion|cancel|photo|approval|approve|accept)\b/.test(
      normalizedInstruction
    )
  ) {
    return null;
  }

  const item = resolution.records?.[0];
  const record = item?.record;

  const number =
    String(item?.number || "").trim();

  const normalizedNumber =
    normalizeResolvedQuoteTarget(number).replace(/\s+/g, "");

  const quoteLike =
    record?.type === "QUOTE" ||
    (
      record?.type === "DOCUMENT_DRAFT" &&
      /^q\d{1,12}$/.test(normalizedNumber)
    );

  if (!quoteLike || !/^q\d{1,12}$/.test(normalizedNumber)) {
    return null;
  }

  const documents = await listDocuments({
    search: number,
    type: "QUOTE",
    setPage,
  });

  const exact = resolveExactSourceQuote({
    number,
    customerName: String(item?.name || "").trim(),
    documents,
  });

  if (exact.state !== "EXACT_QUOTE") {
    throw Object.assign(
      new Error(
        "The previously resolved Quote could not be reverified. Search for the Quote again. Nothing has been changed."
      ),
      { code: "ASK_HELD_QUOTE_REVERIFY_FAILED" }
    );
  }

  const binding =
    await verifyAskMeetroResolvedQuoteBinding({
      item,
      document: exact.document,
      setPage,
      getQuoteAuthority,
    });

  if (binding.state !== "EXACT_QUOTE") {
    throw Object.assign(
      new Error(
        binding.state === "CANONICAL_MISMATCH"
          ? "The previously resolved canonical Quote no longer matches this working draft. Search again. Nothing has been changed."
          : binding.state === "DOCUMENT_DRAFT_MISMATCH"
            ? "The previously resolved Quote no longer matches the exact working draft. Search again. Nothing has been changed."
            : "The previously resolved Quote authority could not be reverified. Search again. Nothing has been changed."
      ),
      {
        code:
          binding.state === "CANONICAL_MISMATCH"
            ? "ASK_HELD_CANONICAL_QUOTE_MISMATCH"
            : binding.state === "DOCUMENT_DRAFT_MISMATCH"
              ? "ASK_HELD_QUOTE_IDENTITY_CHANGED"
              : "ASK_HELD_QUOTE_AUTHORITY_UNVERIFIED",
      }
    );
  }

  return Object.freeze({
    context: Object.freeze({
      page: "quoteBuilder",
      draftId: exact.document.id,
      ...(item?.label
        ? { label: String(item.label).slice(0, 160) }
        : {}),
    }),
    document: exact.document,
  });
}

function isBoundResolvedQuoteFollowUp(
  instruction,
  resolution,
  currentContext = {}
) {
  const intent = askMeetroIntent(instruction);

  if (
    !intent.change ||
    intent.information ||
    currentContext?.page !== "quoteBuilder" ||
    !uuid(currentContext?.draftId) ||
    resolution?.status !== "RESOLVED" ||
    resolution?.records?.length !== 1
  ) {
    return false;
  }

  const item = resolution.records[0];
  const record = item?.record;
  const number =
    normalizeResolvedQuoteTarget(item?.number)
      .replace(/\s+/g, "");

  return (
    record?.type === "DOCUMENT_DRAFT" &&
    record.id === currentContext.draftId &&
    /^q\d{1,12}$/.test(number)
  );
}

async function verifyAskMeetroResolvedQuoteBinding({
  item,
  document,
  setPage,
  getQuoteAuthority = hydrateSavedQuoteAuthority,
} = {}) {
  const record = item?.record;

  if (!record || !document) {
    return Object.freeze({ state: "INVALID" });
  }

  if (record.type === "DOCUMENT_DRAFT") {
    return Object.freeze({
      state:
        sameUuid(document.id, record.id)
          ? "EXACT_QUOTE"
          : "DOCUMENT_DRAFT_MISMATCH",
      document,
      authority: null,
    });
  }

  if (record.type !== "QUOTE") {
    return Object.freeze({ state: "INVALID" });
  }

  // A canonical Quote can only transfer editable authority through an
  // exact saved Job-linked working Quote mapping. Matching number/customer
  // alone is never sufficient.
  if (!uuid(document.id) || !uuid(document.jobId)) {
    return Object.freeze({
      state: "CANONICAL_UNVERIFIED",
      document,
      authority: null,
    });
  }

  let authority;

  try {
    authority = await getQuoteAuthority({
      document,
      setPage,
    });
  } catch {
    return Object.freeze({
      state: "CANONICAL_UNVERIFIED",
      document,
      authority: null,
    });
  }

  const canonical = authority?.canonicalQuote;
  const sourceDocument = authority?.sourceDocument;

  const sourceIdentityMatches =
    sameUuid(sourceDocument?.documentId, document.id) &&
    Number(sourceDocument?.documentVersion) === Number(document.version) &&
    sameUuid(sourceDocument?.jobId, document.jobId);

  const canonicalIdentityMatches =
    sameUuid(canonical?.id, record.id) &&
    sameUuid(canonical?.jobId, document.jobId) &&
    sameUuid(
      canonical?.sourceBusinessDocument?.documentId,
      document.id
    );

  if (!sourceIdentityMatches || !canonicalIdentityMatches) {
    return Object.freeze({
      state: "CANONICAL_MISMATCH",
      document,
      authority,
    });
  }

  return Object.freeze({
    state: "EXACT_QUOTE",
    document,
    authority,
  });
}

function inlineQuoteResolutionMessage(state) {
  if (state === "CANONICAL_MISMATCH") {
    return "The resolved canonical Quote does not match this exact working Quote. Nothing has been opened or changed.";
  }

  if (state === "CANONICAL_UNVERIFIED") {
    return "The resolved canonical Quote could not be verified against this exact working Quote. Nothing has been opened or changed.";
  }

  if (state === "DOCUMENT_DRAFT_MISMATCH") {
    return "The resolved working Quote identity does not match this exact saved draft. Nothing has been opened or changed.";
  }

  if (state === "BLOCKED_MISMATCH") {
    return "The resolved customer does not match the exact working Quote. Nothing has been changed.";
  }

  if (state === "NOT_FOUND") {
    return "The exact working Quote could not be opened here. Nothing has been changed.";
  }

  if (state === "AMBIGUOUS") {
    return "More than one working Quote matched that identity. Open the exact Quote from Saved Files before editing. Nothing has been changed.";
  }

  return "The exact working Quote could not be verified for editing. Nothing has been changed.";
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
  let inlineWorkspace = null;

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

  if (
    resolution?.reviewRequired === true &&
    resolution.status === "RESOLVED" &&
    actions.length === 0 &&
    !blockedReason &&
    options.role === "business" &&
    (
      isSpecificResolvedQuoteChange(instruction, resolution) ||
      isBoundResolvedQuoteFollowUp(
        instruction,
        resolution,
        options.context || {}
      )
    )
  ) {
    const item = resolution.records[0];
    const number = String(item?.number || "").trim();
    const customerName = String(item?.name || "").trim();

    try {
      const documents = await (
        options.listDocuments || listBusinessDocumentDrafts
      )({
        search: number,
        type: "QUOTE",
        setPage: options.setPage,
      });

      const exact = resolveExactSourceQuote({
        number,
        customerName,
        documents,
      });

      if (exact.state === "EXACT_QUOTE") {
        const binding =
          await verifyAskMeetroResolvedQuoteBinding({
            item,
            document: exact.document,
            setPage: options.setPage,
            getQuoteAuthority:
              options.getQuoteAuthority ||
              hydrateSavedQuoteAuthority,
          });

        if (binding.state === "EXACT_QUOTE") {
          inlineWorkspace = Object.freeze({
            type: "BUSINESS_DOCUMENT",
            documentType: "QUOTE",
            document: exact.document,
            instruction,
          });
        } else {
          blockedReason =
            inlineQuoteResolutionMessage(binding.state);
        }
      } else {
        blockedReason = inlineQuoteResolutionMessage(exact.state);
      }
    } catch {
      blockedReason =
        "The exact working Quote is temporarily unavailable. Nothing has been changed.";
    }
  }

  if (
    resolution?.reviewRequired === true &&
    resolution.status === "RESOLVED" &&
    actions.length === 0 &&
    !blockedReason &&
    options.role === "business" &&
    isSpecificResolvedInvoiceChange(
      instruction,
      resolution
    )
  ) {
    const item = resolution.records[0];
    const record = item?.record;
    const number = String(item?.number || "").trim();

    try {
      const documents = await (
        options.listDocuments || listBusinessDocumentDrafts
      )({
        search: number,
        type: "INVOICE",
        setPage: options.setPage,
      });

      const exact = (documents || []).filter(
        (document) =>
          sameUuid(document?.id, record?.id) &&
          String(document?.documentType || "").toUpperCase() ===
            "INVOICE"
      );

      if (exact.length === 1) {
        inlineWorkspace = Object.freeze({
          type: "BUSINESS_DOCUMENT",
          documentType: "INVOICE",
          document: exact[0],
          instruction,
        });
      } else if (exact.length > 1) {
        blockedReason =
          "More than one saved Invoice returned the same exact working identity. Open the Invoice from Saved Files before editing. Nothing has been changed.";
      } else {
        blockedReason =
          "The exact working Invoice could not be reopened from Saved Files. Nothing has been changed.";
      }
    } catch {
      blockedReason =
        "The exact working Invoice is temporarily unavailable. Nothing has been changed.";
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
  const inlineDocumentLabel =
    inlineWorkspace?.documentType === "INVOICE"
      ? "Invoice"
      : "Quote";

  const finalText =
    inlineWorkspace
      ? `${resolvedLabel ? `I found ${resolvedLabel}` : `I found the ${inlineDocumentLabel}`}${resolvedNumber ? `, ${resolvedNumber}` : ""}. The exact working ${inlineDocumentLabel} is ready here so you can review or edit the requested change. Nothing has been changed.`
      : blockedReason ||
    (clarificationRequired
      ? `${resolvedLabel ? `I found ${resolvedLabel}. ` : ""}What would you like to change on this Quote?${resolvedNumber ? ` Include ${resolvedNumber} in your next instruction.` : ""} Nothing has been changed.`
      : !resolution && intent.information && intent.change
        ? `${text}\n\nNo change has been proposed. Send the requested change separately for exact-record Review.`
        : text);

  return {
    actions,
    text: finalText,
    resolution,
    ...(inlineWorkspace ? { inlineWorkspace } : {}),
    ...(blockedReason ? { blockedReason } : {}),
  };
}

export function askConversationRecord(context = {}) {
  if (context.blocked && context.page) throw new Error("The exact record context could not be verified. Reopen Ask Meetro from the record.");
  // Emergency is page-only advisory context until Retrieval has a distinct,
  // canonical Emergency record type. Never reinterpret its numeric ID as a
  // JOB_REQUEST pointer.
  if (context.page === "emergencyRequest") return {};
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
