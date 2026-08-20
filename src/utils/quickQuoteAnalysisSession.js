import { authFetch } from "./authFetch.js";

export const QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE =
  "/api/intelligence/quick-quote-analysis/sessions";

export const QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY =
  "PRIVATE_NON_CANONICAL";

export const QUICK_QUOTE_ANALYSIS_PROPOSAL_AUTHORITY =
  "ADVISORY_NON_CANONICAL";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ELEMENT_ID =
  /^[a-z][a-z0-9_.:-]{0,159}$/;

const SHA256 =
  /^[a-f0-9]{64}$/i;

const CREATE_SUCCESS = new Set([
  "QUICK_QUOTE_ANALYSIS_SESSION_CREATED",
  "QUICK_QUOTE_ANALYSIS_SESSION_REPLAYED",
]);

const LOAD_SUCCESS = new Set([
  "QUICK_QUOTE_ANALYSIS_SESSION_LOADED",
]);

const EVIDENCE_SUCCESS = new Set([
  "QUICK_QUOTE_ANALYSIS_EVIDENCE_APPENDED",
  "QUICK_QUOTE_ANALYSIS_EVIDENCE_CURRENT",
  "QUICK_QUOTE_ANALYSIS_EVIDENCE_REPLAYED",
]);

const EXECUTION_SUCCESS = new Set([
  "QUICK_QUOTE_ANALYSIS_COMPLETED",
  "QUICK_QUOTE_ANALYSIS_CONTINUED",
  "QUICK_QUOTE_ANALYSIS_EXECUTION_REPLAYED",
]);

const DISCARD_SUCCESS = new Set([
  "QUICK_QUOTE_ANALYSIS_SESSION_DISCARDED",
  "QUICK_QUOTE_ANALYSIS_SESSION_DISCARD_REPLAYED",
]);

const REVIEW_ACTIONS = Object.freeze([
  "ACCEPTED",
  "EDITED",
  "REJECTED",
]);

const REVIEWABLE_COLLECTIONS = Object.freeze([
  "questionsForProfessional",
  "observed",
  "needsVerification",
  "repairSuggestions",
  "materialSuggestions",
]);

const PROHIBITED_RESPONSE_KEYS = new Set([
  "accesstoken",
  "authorization",
  "cookie",
  "password",
  "refreshtoken",
  "secret",
  "token",
  "tokens",
]);

function plain(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function exactKeys(
  value,
  required
) {
  if (!plain(value)) {
    return false;
  }

  const keys =
    Object.keys(value);

  return (
    keys.length === required.length &&
    required.every(
      (key) =>
        Object.hasOwn(
          value,
          key
        )
    )
  );
}

function safeUuid(value) {
  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  return UUID.test(normalized)
    ? normalized
    : "";
}

function safeText(
  value,
  maximum,
  {
    required = true,
  } = {}
) {
  if (
    typeof value !== "string" ||
    value.length > maximum
  ) {
    return "";
  }

  if (
    required &&
    !value.trim()
  ) {
    return "";
  }

  return value;
}

function safeDate(value) {
  return (
    typeof value === "string" &&
    value.length <= 100 &&
    !Number.isNaN(
      Date.parse(value)
    )
  );
}

function safePositiveInteger(value) {
  return (
    Number.isInteger(value) &&
    value > 0
  );
}

function safeNonNegativeInteger(
  value
) {
  return (
    Number.isInteger(value) &&
    value >= 0
  );
}

function safeArray(
  value,
  maximum
) {
  return (
    Array.isArray(value) &&
    value.length <= maximum
  );
}

function normalizeKey(value) {
  return String(value)
    .replace(
      /[^a-z0-9]/gi,
      ""
    )
    .toLowerCase();
}

function assertSafeResponseObject(
  value
) {
  const pending = [value];
  const visited =
    new Set();

  while (pending.length) {
    const current =
      pending.shift();

    if (
      !current ||
      typeof current !== "object" ||
      visited.has(current)
    ) {
      continue;
    }

    visited.add(current);

    for (
      const [
        key,
        child,
      ] of Object.entries(current)
    ) {
      if (
        PROHIBITED_RESPONSE_KEYS.has(
          normalizeKey(key)
        )
      ) {
        return false;
      }

      if (
        child &&
        typeof child === "object"
      ) {
        pending.push(child);
      }
    }
  }

  return true;
}

function analysisRoute(
  sessionId,
  suffix = ""
) {
  const normalized =
    safeUuid(sessionId);

  if (!normalized) {
    throw new TypeError(
      "A valid Job Analysis session is required."
    );
  }

  return (
    `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/` +
    `${encodeURIComponent(normalized)}${suffix}`
  );
}

function normalizeLocale(
  value
) {
  const locale =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !locale ||
    locale.length > 32 ||
    !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(
      locale
    )
  ) {
    throw new TypeError(
      "A valid Job Analysis locale is required."
    );
  }

  return locale;
}

function normalizeEvidenceInput({
  professionalInput = "",
  photos = [],
} = {}) {
  if (
    typeof professionalInput !==
      "string" ||
    professionalInput.length > 4000 ||
    !Array.isArray(photos) ||
    photos.length > 5 ||
    !photos.every(plain) ||
    (
      !professionalInput.trim() &&
      photos.length === 0
    )
  ) {
    throw new TypeError(
      "Job Analysis requires professional details or governed photos."
    );
  }

  return {
    professionalInput,
    photos,
  };
}

function validSourceReference(
  value
) {
  return (
    exactKeys(
      value,
      [
        "type",
        "id",
        "version",
      ]
    ) &&
    value.type ===
      "QUOTE_DRAFT_PHOTO" &&
    Boolean(
      safeText(
        value.id,
        500
      )
    ) &&
    safePositiveInteger(
      value.version
    )
  );
}

function validQuestion(
  value
) {
  return (
    exactKeys(
      value,
      [
        "id",
        "text",
      ]
    ) &&
    ELEMENT_ID.test(
      String(
        value.id || ""
      )
    ) &&
    Boolean(
      safeText(
        value.text,
        1200
      )
    )
  );
}

function validAssistanceItem(
  value,
  classification
) {
  if (
    !exactKeys(
      value,
      [
        "id",
        "text",
        "classification",
        "sourceReferences",
      ]
    ) ||
    !ELEMENT_ID.test(
      String(
        value.id || ""
      )
    ) ||
    !safeText(
      value.text,
      3000
    ) ||
    value.classification !==
      classification ||
    !safeArray(
      value.sourceReferences,
      12
    ) ||
    !value.sourceReferences.every(
      validSourceReference
    )
  ) {
    return false;
  }

  return (
    classification !==
      "OBSERVED" ||
    value.sourceReferences.length > 0
  );
}

function validStringCollection(
  value,
  maximumCount,
  maximumLength
) {
  return (
    safeArray(
      value,
      maximumCount
    ) &&
    value.every(
      (item) =>
        Boolean(
          safeText(
            item,
            maximumLength
          )
        )
    )
  );
}

function sameStringSet(
  value,
  expected
) {
  return (
    Array.isArray(value) &&
    value.length ===
      expected.length &&
    expected.every(
      (item) =>
        value.includes(item)
    )
  );
}

export function validateQuickQuoteAnalysisProposal(
  value,
  expected = {}
) {
  const requiredKeys = [
    "schemaVersion",
    "proposalId",
    "analysisSessionId",
    "evidenceVersion",
    "priorProposalId",
    "authorityClassification",
    "sourceContextFingerprint",
    "assistantMessage",
    "summary",
    "questionsForProfessional",
    "observed",
    "needsVerification",
    "repairSuggestions",
    "materialSuggestions",
    "photoAnalysis",
    "warnings",
    "reviewContract",
    "humanToCanonicalBoundary",
    "learningContext",
    "canonicalMutationPerformed",
  ];

  if (
    !exactKeys(
      value,
      requiredKeys
    ) ||
    value.schemaVersion !== 1 ||
    !safeUuid(
      value.proposalId
    ) ||
    !safeUuid(
      value.analysisSessionId
    ) ||
    !safePositiveInteger(
      value.evidenceVersion
    ) ||
    (
      value.priorProposalId !==
        null &&
      !safeUuid(
        value.priorProposalId
      )
    ) ||
    value.authorityClassification !==
      QUICK_QUOTE_ANALYSIS_PROPOSAL_AUTHORITY ||
    value.canonicalMutationPerformed !==
      false ||
    !SHA256.test(
      String(
        value.sourceContextFingerprint ||
          ""
      )
    ) ||
    !safeText(
      value.assistantMessage,
      4000
    ) ||
    !safeText(
      value.summary,
      1200
    )
  ) {
    return null;
  }

  if (
    expected.sessionId &&
    safeUuid(
      value.analysisSessionId
    ) !==
      safeUuid(
        expected.sessionId
      )
  ) {
    return null;
  }

  if (
    expected.evidenceVersion != null &&
    value.evidenceVersion !==
      expected.evidenceVersion
  ) {
    return null;
  }

  if (
    Object.hasOwn(
      expected,
      "priorProposalId"
    )
  ) {
    const expectedPrior =
      expected.priorProposalId ==
      null
        ? null
        : safeUuid(
            expected.priorProposalId
          );

    if (
      value.priorProposalId !==
        expectedPrior
    ) {
      return null;
    }
  }

  if (
    !safeArray(
      value.questionsForProfessional,
      40
    ) ||
    !value.questionsForProfessional.every(
      validQuestion
    ) ||
    !safeArray(
      value.observed,
      40
    ) ||
    !value.observed.every(
      (item) =>
        validAssistanceItem(
          item,
          "OBSERVED"
        )
    ) ||
    !safeArray(
      value.needsVerification,
      40
    ) ||
    !value.needsVerification.every(
      (item) =>
        validAssistanceItem(
          item,
          "NEEDS_VERIFICATION"
        )
    ) ||
    !safeArray(
      value.repairSuggestions,
      40
    ) ||
    !value.repairSuggestions.every(
      (item) =>
        validAssistanceItem(
          item,
          "AI_SUGGESTED"
        )
    ) ||
    !safeArray(
      value.materialSuggestions,
      40
    ) ||
    !value.materialSuggestions.every(
      (item) =>
        validAssistanceItem(
          item,
          "AI_SUGGESTED"
        )
    ) ||
    !validStringCollection(
      value.warnings,
      40,
      500
    )
  ) {
    return null;
  }

  if (
    !exactKeys(
      value.photoAnalysis,
      [
        "supported",
        "analyzedReferenceIds",
        "limitations",
        "imageMeasurementsAreEstimates",
      ]
    ) ||
    typeof value.photoAnalysis
      .supported !== "boolean" ||
    value.photoAnalysis
      .imageMeasurementsAreEstimates !==
      true ||
    !validStringCollection(
      value.photoAnalysis
        .analyzedReferenceIds,
      5,
      500
    ) ||
    !validStringCollection(
      value.photoAnalysis.limitations,
      20,
      500
    )
  ) {
    return null;
  }

  if (
    !plain(
      value.reviewContract
    ) ||
    value.reviewContract
      .explicitHumanDecisionRequired !==
      true ||
    !sameStringSet(
      value.reviewContract.actions,
      REVIEW_ACTIONS
    ) ||
    !sameStringSet(
      value.reviewContract
        .reviewableElementCollections,
      REVIEWABLE_COLLECTIONS
    )
  ) {
    return null;
  }

  if (
    !plain(
      value.humanToCanonicalBoundary
    ) ||
    value.humanToCanonicalBoundary
      .directMutationAllowed !==
      false ||
    value.humanToCanonicalBoundary
      .workingDraftApplicationRequiresReview !==
      true ||
    !Array.isArray(
      value.humanToCanonicalBoundary
        .prohibitedCanonicalCommands
    )
  ) {
    return null;
  }

  if (
    !plain(
      value.learningContext
    ) ||
    value.learningContext.context !==
      "quick_quote_analysis_continuation" ||
    value.learningContext
      .learnedPatternIsCanonicalRule !==
      false
  ) {
    return null;
  }

  if (
    !assertSafeResponseObject(
      value
    )
  ) {
    return null;
  }

  return value;
}

function validatePhotoReference(
  value
) {
  return (
    exactKeys(
      value,
      [
        "type",
        "publicId",
        "secureUrl",
        "version",
        "format",
        "width",
        "height",
        "displayOrder",
      ]
    ) &&
    value.type ===
      "QUOTE_DRAFT_PHOTO" &&
    Boolean(
      safeText(
        value.publicId,
        500
      )
    ) &&
    Boolean(
      safeText(
        value.secureUrl,
        4000
      )
    ) &&
    Boolean(
      safeText(
        value.format,
        20
      )
    ) &&
    safePositiveInteger(
      value.version
    ) &&
    safePositiveInteger(
      value.width
    ) &&
    safePositiveInteger(
      value.height
    ) &&
    safeNonNegativeInteger(
      value.displayOrder
    )
  );
}

export function validateQuickQuoteAnalysisEvidence(
  value
) {
  if (
    !exactKeys(
      value,
      [
        "version",
        "professionalInput",
        "photoReferences",
        "evidenceFingerprint",
        "createdAt",
      ]
    ) ||
    !safePositiveInteger(
      value.version
    ) ||
    typeof value.professionalInput !==
      "string" ||
    value.professionalInput.length >
      4000 ||
    !safeArray(
      value.photoReferences,
      5
    ) ||
    !value.photoReferences.every(
      validatePhotoReference
    ) ||
    !SHA256.test(
      String(
        value.evidenceFingerprint ||
          ""
      )
    ) ||
    !safeDate(
      value.createdAt
    )
  ) {
    return null;
  }

  return value;
}

export function validateQuickQuoteAnalysisTurn(
  value,
  {
    sessionId = "",
  } = {}
) {
  if (
    !exactKeys(
      value,
      [
        "turnId",
        "turnIndex",
        "evidenceVersion",
        "role",
        "authorityClassification",
        "payload",
        "createdAt",
      ]
    ) ||
    !safeUuid(
      value.turnId
    ) ||
    !safePositiveInteger(
      value.turnIndex
    ) ||
    !safePositiveInteger(
      value.evidenceVersion
    ) ||
    ![
      "PROFESSIONAL",
      "MEETRO",
    ].includes(
      value.role
    ) ||
    value.authorityClassification !==
      QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY ||
    !plain(
      value.payload
    ) ||
    !safeDate(
      value.createdAt
    )
  ) {
    return null;
  }

  if (
    value.role ===
      "PROFESSIONAL"
  ) {
    if (
      !exactKeys(
        value.payload,
        [
          "message",
          "priorProposalId",
        ]
      ) ||
      !safeText(
        value.payload.message,
        4000
      ) ||
      (
        value.payload.priorProposalId !==
          null &&
        !safeUuid(
          value.payload
            .priorProposalId
        )
      )
    ) {
      return null;
    }
  }

  if (
    value.role ===
      "MEETRO" &&
    !validateQuickQuoteAnalysisProposal(
      value.payload,
      {
        ...(sessionId
          ? { sessionId }
          : {}),
        evidenceVersion:
          value.evidenceVersion,
      }
    )
  ) {
    return null;
  }

  return value;
}

export function validateQuickQuoteAnalysisSession(
  value
) {
  if (
    !exactKeys(
      value,
      [
        "sessionId",
        "authorityClassification",
        "createdAt",
        "latestEvidenceVersion",
        "latestTurnIndex",
        "evidenceVersions",
        "turns",
      ]
    ) ||
    !safeUuid(
      value.sessionId
    ) ||
    value.authorityClassification !==
      QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY ||
    !safeDate(
      value.createdAt
    ) ||
    (
      value.latestEvidenceVersion !==
        null &&
      !safePositiveInteger(
        value.latestEvidenceVersion
      )
    ) ||
    !safeNonNegativeInteger(
      value.latestTurnIndex
    ) ||
    !safeArray(
      value.evidenceVersions,
      100
    ) ||
    !safeArray(
      value.turns,
      200
    )
  ) {
    return null;
  }

  if (
    !value.evidenceVersions.every(
      (item) =>
        validateQuickQuoteAnalysisEvidence(
          item
        )
    )
  ) {
    return null;
  }

  for (
    let index = 0;
    index <
    value.evidenceVersions.length;
    index += 1
  ) {
    if (
      value.evidenceVersions[index]
        .version !==
      index + 1
    ) {
      return null;
    }
  }

  const latestEvidence =
    value.evidenceVersions.at(-1);

  if (
    (
      latestEvidence
        ? latestEvidence.version
        : null
    ) !==
    value.latestEvidenceVersion
  ) {
    return null;
  }

  if (
    !value.turns.every(
      (item) =>
        validateQuickQuoteAnalysisTurn(
          item,
          {
            sessionId:
              value.sessionId,
          }
        )
    )
  ) {
    return null;
  }

  for (
    let index = 0;
    index <
    value.turns.length;
    index += 1
  ) {
    if (
      value.turns[index]
        .turnIndex !==
      index + 1
    ) {
      return null;
    }
  }

  const latestTurn =
    value.turns.at(-1);

  if (
    (
      latestTurn
        ? latestTurn.turnIndex
        : 0
    ) !==
    value.latestTurnIndex
  ) {
    return null;
  }

  return value;
}

function normalizeSuccessEnvelope(
  response,
  data,
  codes
) {
  if (
    !response?.ok ||
    data?.success !== true ||
    !codes.has(
      data?.code
    ) ||
    data
      ?.canonicalMutationPerformed !==
      false
  ) {
    throw new QuickQuoteAnalysisApiError(
      data?.message ||
        "The private Job Analysis request could not be completed.",
      {
        status:
          response?.status || 0,
        code:
          data?.code ||
          "QUICK_QUOTE_ANALYSIS_REQUEST_FAILED",
      }
    );
  }

  return data;
}

async function requestQuickQuoteAnalysis({
  route,
  method,
  body,
  idempotencyKey,
  successCodes,
  setPage,
  authFetchImpl,
}) {
  const options = {
    method,
  };

  if (
    idempotencyKey
  ) {
    options.headers = {
      "Idempotency-Key":
        idempotencyKey,
    };
  }

  if (
    body !== undefined
  ) {
    options.body =
      JSON.stringify(body);
  }

  const {
    response,
    data,
  } = await authFetchImpl(
    route,
    options,
    setPage
  );

  return normalizeSuccessEnvelope(
    response,
    data,
    successCodes
  );
}

export class QuickQuoteAnalysisApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      code =
        "QUICK_QUOTE_ANALYSIS_REQUEST_FAILED",
    } = {}
  ) {
    super(message);
    this.name =
      "QuickQuoteAnalysisApiError";
    this.status = status;
    this.code = code;
  }
}

export function createQuickQuoteAnalysisKey(
  cryptoProvider =
    globalThis.crypto
) {
  if (
    !cryptoProvider ||
    typeof cryptoProvider.randomUUID !==
      "function"
  ) {
    throw new QuickQuoteAnalysisApiError(
      "Private Job Analysis is unavailable on this device.",
      {
        code:
          "QUICK_QUOTE_ANALYSIS_IDEMPOTENCY_UNAVAILABLE",
      }
    );
  }

  const key =
    cryptoProvider
      .randomUUID()
      .toLowerCase();

  if (
    !safeUuid(key)
  ) {
    throw new QuickQuoteAnalysisApiError(
      "Private Job Analysis could not create a safe request identity.",
      {
        code:
          "QUICK_QUOTE_ANALYSIS_IDEMPOTENCY_UNAVAILABLE",
      }
    );
  }

  return key;
}

function requireIdempotencyKey(
  value
) {
  const normalized =
    safeUuid(value);

  if (!normalized) {
    throw new TypeError(
      "A valid Job Analysis idempotency key is required."
    );
  }

  return normalized;
}

export async function createQuickQuoteAnalysisSession({
  professionalInput = "",
  photos = [],
  idempotencyKey =
    createQuickQuoteAnalysisKey(),
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const evidence =
    normalizeEvidenceInput({
      professionalInput,
      photos,
    });

  const data =
    await requestQuickQuoteAnalysis({
      route:
        QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE,
      method: "POST",
      body: evidence,
      idempotencyKey:
        requireIdempotencyKey(
          idempotencyKey
        ),
      successCodes:
        CREATE_SUCCESS,
      setPage,
      authFetchImpl,
    });

  const session =
    validateQuickQuoteAnalysisSession(
      data.session
    );

  if (!session) {
    throw new QuickQuoteAnalysisApiError(
      "The private Job Analysis session response was invalid.",
      {
        status: 502,
        code:
          "UNSAFE_QUICK_QUOTE_ANALYSIS_SESSION_RESPONSE",
      }
    );
  }

  return {
    session,
    replayed:
      data.replayed === true,
  };
}

export async function loadQuickQuoteAnalysisSession({
  sessionId,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const data =
    await requestQuickQuoteAnalysis({
      route:
        analysisRoute(
          sessionId
        ),
      method: "GET",
      successCodes:
        LOAD_SUCCESS,
      setPage,
      authFetchImpl,
    });

  const session =
    validateQuickQuoteAnalysisSession(
      data.session
    );

  if (!session) {
    throw new QuickQuoteAnalysisApiError(
      "The private Job Analysis session response was invalid.",
      {
        status: 502,
        code:
          "UNSAFE_QUICK_QUOTE_ANALYSIS_SESSION_RESPONSE",
      }
    );
  }

  return {
    session,
  };
}

export async function appendQuickQuoteAnalysisEvidence({
  sessionId,
  professionalInput = "",
  photos = [],
  idempotencyKey =
    createQuickQuoteAnalysisKey(),
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const evidenceInput =
    normalizeEvidenceInput({
      professionalInput,
      photos,
    });

  const data =
    await requestQuickQuoteAnalysis({
      route:
        analysisRoute(
          sessionId,
          "/evidence"
        ),
      method: "POST",
      body:
        evidenceInput,
      idempotencyKey:
        requireIdempotencyKey(
          idempotencyKey
        ),
      successCodes:
        EVIDENCE_SUCCESS,
      setPage,
      authFetchImpl,
    });

  const evidence =
    validateQuickQuoteAnalysisEvidence(
      data.evidence
    );

  if (
    !evidence ||
    typeof data.changed !==
      "boolean"
  ) {
    throw new QuickQuoteAnalysisApiError(
      "The private Job Analysis evidence response was invalid.",
      {
        status: 502,
        code:
          "UNSAFE_QUICK_QUOTE_ANALYSIS_EVIDENCE_RESPONSE",
      }
    );
  }

  return {
    evidence,
    changed:
      data.changed,
    replayed:
      data.replayed === true,
  };
}

function validateExecutionEnvelope(
  data,
  {
    sessionId,
    priorProposalId,
  }
) {
  const proposal =
    validateQuickQuoteAnalysisProposal(
      data.proposal,
      {
        sessionId,
        priorProposalId,
      }
    );

  if (
    !proposal ||
    !safeArray(
      data.turns,
      2
    ) ||
    !data.turns.every(
      (turn) =>
        validateQuickQuoteAnalysisTurn(
          turn,
          {
            sessionId,
          }
        )
    ) ||
    !data.turns.every(
      (turn) =>
        turn.evidenceVersion ===
          proposal.evidenceVersion
    )
  ) {
    throw new QuickQuoteAnalysisApiError(
      "Ask Meetro returned an unsafe or invalid Job Analysis exchange.",
      {
        status: 502,
        code:
          "UNSAFE_QUICK_QUOTE_ANALYSIS_EXECUTION_RESPONSE",
      }
    );
  }

  const meetroTurn =
    data.turns.find(
      (turn) =>
        turn.role === "MEETRO"
    );

  if (
    !meetroTurn ||
    meetroTurn.payload
      .proposalId !==
      proposal.proposalId
  ) {
    throw new QuickQuoteAnalysisApiError(
      "The Job Analysis proposal is not linked to its durable Meetro turn.",
      {
        status: 502,
        code:
          "UNSAFE_QUICK_QUOTE_ANALYSIS_EXECUTION_RESPONSE",
      }
    );
  }

  return {
    proposal,
    turns:
      data.turns,
    replayed:
      data.replayed === true,
  };
}

export async function analyzeQuickQuoteAnalysisSession({
  sessionId,
  locale = "en-US",
  idempotencyKey =
    createQuickQuoteAnalysisKey(),
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedSessionId =
    safeUuid(sessionId);

  if (
    !normalizedSessionId
  ) {
    throw new TypeError(
      "A valid Job Analysis session is required."
    );
  }

  const data =
    await requestQuickQuoteAnalysis({
      route:
        analysisRoute(
          normalizedSessionId,
          "/analyze"
        ),
      method: "POST",
      body: {
        locale:
          normalizeLocale(
            locale
          ),
      },
      idempotencyKey:
        requireIdempotencyKey(
          idempotencyKey
        ),
      successCodes:
        EXECUTION_SUCCESS,
      setPage,
      authFetchImpl,
    });

  return validateExecutionEnvelope(
    data,
    {
      sessionId:
        normalizedSessionId,
      priorProposalId:
        null,
    }
  );
}

export async function continueQuickQuoteAnalysisSession({
  sessionId,
  priorProposalId,
  message,
  locale = "en-US",
  idempotencyKey =
    createQuickQuoteAnalysisKey(),
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedSessionId =
    safeUuid(sessionId);

  const normalizedPrior =
    safeUuid(
      priorProposalId
    );

  if (
    !normalizedSessionId ||
    !normalizedPrior ||
    typeof message !==
      "string" ||
    !message.trim() ||
    message.length > 4000
  ) {
    throw new TypeError(
      "A valid Job Analysis continuation is required."
    );
  }

  const data =
    await requestQuickQuoteAnalysis({
      route:
        analysisRoute(
          normalizedSessionId,
          "/continue"
        ),
      method: "POST",
      body: {
        priorProposalId:
          normalizedPrior,
        message,
        locale:
          normalizeLocale(
            locale
          ),
      },
      idempotencyKey:
        requireIdempotencyKey(
          idempotencyKey
        ),
      successCodes:
        EXECUTION_SUCCESS,
      setPage,
      authFetchImpl,
    });

  return validateExecutionEnvelope(
    data,
    {
      sessionId:
        normalizedSessionId,
      priorProposalId:
        normalizedPrior,
    }
  );
}

export async function discardQuickQuoteAnalysisSession({
  sessionId,
  idempotencyKey =
    createQuickQuoteAnalysisKey(),
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const normalizedSessionId =
    safeUuid(sessionId);

  if (
    !normalizedSessionId
  ) {
    throw new TypeError(
      "A valid Job Analysis session is required."
    );
  }

  const data =
    await requestQuickQuoteAnalysis({
      route:
        analysisRoute(
          normalizedSessionId
        ),
      method: "DELETE",
      idempotencyKey:
        requireIdempotencyKey(
          idempotencyKey
        ),
      successCodes:
        DISCARD_SUCCESS,
      setPage,
      authFetchImpl,
    });

  if (
    safeUuid(
      data.sessionId
    ) !==
      normalizedSessionId ||
    data.discarded !==
      true
  ) {
    throw new QuickQuoteAnalysisApiError(
      "The private Job Analysis discard response was invalid.",
      {
        status: 502,
        code:
          "UNSAFE_QUICK_QUOTE_ANALYSIS_DISCARD_RESPONSE",
      }
    );
  }

  return {
    sessionId:
      normalizedSessionId,
    discarded: true,
    replayed:
      data.replayed === true,
  };
}

/*
 * Browser state below is PRESENTATION ONLY.
 *
 * Durable session/evidence/turn authority remains the server projection.
 * These helpers never invent session IDs, evidence versions, or turns.
 */
export function createQuickQuoteAnalysisPresentationState() {
  return {
    sessionId: "",
    latestEvidenceVersion:
      null,
    turns: [],
    latestProposal: null,
    stale: false,
  };
}

export function hydrateQuickQuoteAnalysisPresentationState(
  session
) {
  const validated =
    validateQuickQuoteAnalysisSession(
      session
    );

  if (!validated) {
    throw new TypeError(
      "A valid server-owned Job Analysis session is required."
    );
  }

  /*
   * Only a Meetro turn from the CURRENT evidence version
   * can be presented as the current analysis.
   *
   * Older turns remain durable history, but they become stale
   * immediately when the server advances evidence.
   */
  const currentEvidenceVersion =
    validated.latestEvidenceVersion;

  const latestMeetroTurn =
    [...validated.turns]
      .reverse()
      .find(
        (turn) =>
          turn.role ===
            "MEETRO" &&
          turn.evidenceVersion ===
            currentEvidenceVersion
      );

  const hasHistoricalMeetroTurn =
    validated.turns.some(
      (turn) =>
        turn.role ===
        "MEETRO"
    );

  return {
    sessionId:
      validated.sessionId,
    latestEvidenceVersion:
      currentEvidenceVersion,
    turns:
      [...validated.turns],
    latestProposal:
      latestMeetroTurn
        ? latestMeetroTurn
            .payload
        : null,
    stale:
      hasHistoricalMeetroTurn &&
      !latestMeetroTurn,
  };
}

export function applyQuickQuoteAnalysisExecutionToPresentationState(
  state,
  execution
) {
  if (
    !plain(state) ||
    !safeUuid(
      state.sessionId
    ) ||
    !safePositiveInteger(
      state.latestEvidenceVersion
    ) ||
    !execution ||
    !validateQuickQuoteAnalysisProposal(
      execution.proposal,
      {
        sessionId:
          state.sessionId,
        evidenceVersion:
          state.latestEvidenceVersion,
      }
    ) ||
    !safeArray(
      execution.turns,
      2
    )
  ) {
    throw new TypeError(
      "A valid durable Job Analysis exchange is required."
    );
  }

  const merged =
    new Map(
      (
        Array.isArray(
          state.turns
        )
          ? state.turns
          : []
      ).map(
        (turn) => [
          turn.turnId,
          turn,
        ]
      )
    );

  for (
    const turn of
      execution.turns
  ) {
    const validatedTurn =
      validateQuickQuoteAnalysisTurn(
        turn,
        {
          sessionId:
            state.sessionId,
        }
      );

    if (
      !validatedTurn ||
      validatedTurn
        .evidenceVersion !==
        state.latestEvidenceVersion
    ) {
      throw new TypeError(
        "A valid current-evidence Job Analysis turn is required."
      );
    }

    merged.set(
      validatedTurn.turnId,
      validatedTurn
    );
  }

  const turns =
    [...merged.values()]
      .sort(
        (a, b) =>
          a.turnIndex -
          b.turnIndex
      );

  return {
    sessionId:
      state.sessionId,
    latestEvidenceVersion:
      state.latestEvidenceVersion,
    turns,
    latestProposal:
      execution.proposal,
    stale: false,
  };
}

export function markQuickQuoteAnalysisPresentationStale(
  state
) {
  if (
    !plain(state)
  ) {
    throw new TypeError(
      "A valid Job Analysis presentation state is required."
    );
  }

  return {
    ...state,
    stale: true,
  };
}
