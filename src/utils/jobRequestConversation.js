import {
  JOB_REQUEST_DRAFT_SOURCE,
  JOB_REQUEST_DRAFT_UNCERTAINTY,
  applyHomeownerInput,
} from "./jobRequestDraft.js";
import { t } from "./language.js";

export const JOB_REQUEST_CREATION_CONVERSATION_AUTHORITY = Object.freeze({
  status: "non_canonical_ui_state",
  canonicalSubmission: "explicit_submit_job_request",
  intelligenceOperation: "job_request.interpret",
});

export const JOB_REQUEST_INTERPRETATION_FAILURE = Object.freeze({
  AMBIGUOUS: "ambiguous",
  CONFLICT: "conflict",
  UNAVAILABLE: "unavailable",
  DEFINITIVE: "definitive",
});

export function getJobRequestInterpretLocale(language = "en") {
  if (language === "es") return "es-US";
  if (language === "pt-BR" || language === "pt") return "pt-BR";
  if (language === "fr") return "fr-FR";
  return "en-US";
}

export function createCreationAssistanceMessage({
  role,
  text,
  kind = "message",
  fieldPath = "",
  id,
  createdAt = Date.now(),
} = {}) {
  const safeText = String(text || "").trim();
  if (!safeText) return null;
  return {
    id: id || `${kind}_${createdAt}_${safeText.slice(0, 24).replace(/\W+/g, "_")}`,
    role,
    kind,
    text: safeText,
    fieldPath,
    createdAt,
  };
}

export function createInitialCreationAssistanceMessages(language = "en") {
  return [
    createCreationAssistanceMessage({
      role: "assistant",
      kind: "welcome",
      text: t("jobRequestConversationWelcome", language),
      id: "creation_assistance_welcome",
    }),
  ];
}

export function hasMeaningfulCreationText(value = "") {
  return String(value || "").trim().length >= 3;
}

export function applyHomeownerConversationText(draft, text) {
  const normalized = String(text || "").trim();
  if (!normalized) return draft;

  if (!String(draft.job?.description || "").trim()) {
    return applyHomeownerInput(draft, {
      "job.description": normalized,
    });
  }

  const currentNotes = String(draft.details?.additionalNotes || "").trim();
  const joinedNotes = currentNotes ? `${currentNotes}\n${normalized}` : normalized;
  return applyHomeownerInput(draft, {
    "details.additionalNotes": joinedNotes,
  });
}

export function getHighestValueClarification(interpretation = {}) {
  return (interpretation.clarifications || []).find((item) =>
    String(item?.question || "").trim()
  ) || null;
}

export function getRemainingClarifications(interpretation = {}) {
  const highest = getHighestValueClarification(interpretation);
  if (!highest) return [];
  let skipped = false;
  return (interpretation.clarifications || []).filter((item) => {
    if (!skipped && item === highest) {
      skipped = true;
      return false;
    }
    return String(item?.question || "").trim();
  });
}

export function createInterpretationSuccessMessages({
  interpretation,
  language = "en",
  photosAttached = false,
  createdAt = Date.now(),
} = {}) {
  const messages = [];
  const summary = String(interpretation?.summary || "").trim();
  if (summary) {
    messages.push(
      createCreationAssistanceMessage({
        role: "assistant",
        kind: "summary",
        text: summary,
        id: `interpret_summary_${createdAt}`,
        createdAt,
      })
    );
  }

  const clarification = getHighestValueClarification(interpretation);
  if (clarification) {
    messages.push(
      createCreationAssistanceMessage({
        role: "assistant",
        kind: "clarification",
        text: clarification.question,
        fieldPath: clarification.fieldPath || "",
        id: `interpret_clarification_${createdAt}`,
        createdAt: createdAt + 1,
      })
    );
  }

  const usefulWarning = (interpretation?.warnings || []).find((warning) =>
    String(warning?.message || "").trim()
  );
  if (!clarification && usefulWarning) {
    messages.push(
      createCreationAssistanceMessage({
        role: "assistant",
        kind: "warning",
        text: usefulWarning.message,
        id: `interpret_warning_${createdAt}`,
        createdAt: createdAt + 2,
      })
    );
  }

  if (photosAttached) {
    messages.push(
      createCreationAssistanceMessage({
        role: "assistant",
        kind: "photo_ack",
        text: t("jobRequestConversationPhotosIncluded", language),
        id: `interpret_photo_ack_${createdAt}`,
        createdAt: createdAt + 3,
      })
    );
  }

  return messages.filter(Boolean);
}

export function classifyInterpretationFailure(error = {}) {
  if (error.classification === "ambiguous") {
    return JOB_REQUEST_INTERPRETATION_FAILURE.AMBIGUOUS;
  }
  if (error.classification === "conflict") {
    return JOB_REQUEST_INTERPRETATION_FAILURE.CONFLICT;
  }
  if (
    /UNAVAILABLE|NOT_CONFIGURED|PROVIDER/i.test(String(error.code || "")) ||
    Number(error.status || 0) === 503
  ) {
    return JOB_REQUEST_INTERPRETATION_FAILURE.UNAVAILABLE;
  }
  return JOB_REQUEST_INTERPRETATION_FAILURE.DEFINITIVE;
}

export function getInterpretationFailureMessage(classification, language = "en") {
  if (classification === JOB_REQUEST_INTERPRETATION_FAILURE.AMBIGUOUS) {
    return t("jobRequestConversationRetryNeeded", language);
  }
  if (classification === JOB_REQUEST_INTERPRETATION_FAILURE.CONFLICT) {
    return t("jobRequestConversationConflict", language);
  }
  return t("jobRequestConversationUnavailable", language);
}

export function createPhotoFirstPrompt(language = "en") {
  return createCreationAssistanceMessage({
    role: "assistant",
    kind: "photo_first",
    text: t("jobRequestConversationPhotoFirst", language),
    id: "creation_assistance_photo_first",
  });
}

export function isAssistantSuggestedField(draft, path) {
  const meta = String(path || "")
    .split(".")
    .reduce((cursor, key) => cursor?.[key], draft?.fieldMeta) || {};
  return (
    meta.confirmed !== true &&
    [
      JOB_REQUEST_DRAFT_SOURCE.ASSISTANT,
      JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_SUGGESTED,
      JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED,
    ].includes(meta.provenance || meta.source)
  );
}

export function getFieldUncertainty(draft, path) {
  const meta = String(path || "")
    .split(".")
    .reduce((cursor, key) => cursor?.[key], draft?.fieldMeta) || {};
  return meta.uncertainty || JOB_REQUEST_DRAFT_UNCERTAINTY.KNOWN;
}
