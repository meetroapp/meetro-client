import { useEffect, useRef, useState } from "react";
import ContextualAskMeetro from "./ContextualAskMeetro.jsx";
import {
  getCanonicalEvaluationSourceContext,
  ordinaryCanonicalEvaluationContentToForm,
} from "../utils/canonicalEvaluation.js";
import {
  completeCanonicalEvaluationDraft,
  loadCanonicalEvaluationForRecord,
  saveCanonicalEvaluationDraft,
} from "../utils/evaluationAuthorityController.js";
import { fetchCanonicalVisits } from "../utils/canonicalVisitProjection.js";
import { getEfrCopy } from "../utils/efrLanguage.js";
import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage.js";
import {
  INTELLIGENCE_OPERATION,
  recordWorkflowReview,
  requestWorkflowIntelligence,
} from "../utils/contextualIntelligence.js";
import { isCanonicalWorkCenterHydrationEnabled } from "../utils/workCenterCanonicalHydration.js";
import { getCanonicalEvaluationDraftProgress } from "../utils/evaluationDraftProgression.js";
import CanonicalFindingsPanel from "./CanonicalFindingsPanel.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import { WorkCenterAccordion } from "./WorkCenterWorkspaceSystem.jsx";
import {
  loadCanonicalFindingsForEvaluation,
  loadCanonicalRecommendationsForFinding,
} from "../utils/findingRecommendationReadController.js";
import {
  buildEvaluationAssistantProfessionalInput,
  selectApprovedQuote,
} from "../utils/workCenterLifecycleUx.js";
import { fetchProfessionalJobWorkPlan } from "../utils/workPlanApi.js";
import { fetchWorkPreparation } from "../utils/workPreparationApi.js";
import {
  loadCanonicalQuoteDetail,
  loadCanonicalQuotesForRecord,
} from "../utils/quoteReadController.js";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker.js";
import { guardFriendsAndFamilyMediaUpload } from "../utils/mediaDeferral.js";
import { authFetch } from "../utils/authFetch.js";
import {
  appendHomeownerRequestPhoto,
  createRequestModificationIdempotencyKey,
} from "../utils/homeownerRequestModificationApi.js";
import {
  REQUEST_PHOTO_MAX_COUNT,
  cleanupRequestPhoto,
  createTemporaryRequestPhotoPreview,
  uploadRequestPhotos,
  validateRequestPhotoFiles,
} from "../utils/requestPhotoMedia.js";

const EMPTY_FORM = Object.freeze({
  observations: "",
  diagnosisSummary: "",
  limitations: "",
  internalNotes: "",
});

function formForEvaluation(evaluation) {
  return ordinaryCanonicalEvaluationContentToForm(evaluation) || { ...EMPTY_FORM };
}

function canonicalRecord({ jobId, requestId, relationshipId }) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
    postId: requestId,
    requestId,
    relationshipId,
  };
}

function errorMessage(error, copy) {
  if (/STALE_/.test(String(error?.code || ""))) return copy.changedElsewhere;
  if (error?.code === "EVALUATION_COMPLETED") return copy.completed;
  return error?.message || copy.evaluationUnavailable;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeCanonicalPhoto(photo, fallbackOrder = 0) {
  const referenceId = String(photo?.reference_id || "").trim();
  const previewUrl = String(photo?.preview_url || "").trim();
  if (!referenceId || !previewUrl) return null;
  const displayOrder = Number(photo?.display_order);
  return {
    referenceId,
    previewUrl,
    displayOrder: Number.isSafeInteger(displayOrder) && displayOrder >= 0
      ? displayOrder
      : fallbackOrder,
    displayMetadata:
      photo?.display_metadata && typeof photo.display_metadata === "object"
        ? { ...photo.display_metadata }
        : {},
  };
}

function readCanonicalPhotoLifecycle(data = {}) {
  const lifecycle = data?.lifecycle && typeof data.lifecycle === "object"
    ? data.lifecycle
    : {};
  const sourcePhotos = Array.isArray(data?.request_photos)
    ? data.request_photos
    : Array.isArray(lifecycle.request_photos)
      ? lifecycle.request_photos
      : [];
  const photos = sourcePhotos
    .map(normalizeCanonicalPhoto)
    .filter(Boolean)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const concerns = Array.isArray(lifecycle.reportedConcerns)
    ? lifecycle.reportedConcerns
    : [];
  const concernId = String(concerns.find((concern) => concern?.id)?.id || "").trim();
  const modificationVersion = positiveInteger(
    data?.modification_version ??
      data?.requestVersion ??
      data?.authority?.requestVersion ??
      lifecycle.modification_version ??
      lifecycle.modificationVersion
  );
  return { photos, concernId, modificationVersion };
}

async function fetchCanonicalPhotoLifecycle({ requestId, setPage }) {
  const { response, data } = await authFetch(
    `/posts/${encodeURIComponent(requestId)}/lifecycle`,
    { cache: "no-store" },
    setPage
  );
  if (!response?.ok) return null;
  return readCanonicalPhotoLifecycle(data);
}

export default function CanonicalJobEvaluation({
  record = {},
  customerConcern = "",
  availableActions = [],
  language = "en",
  setPage,
  findingsPresentation = null,
  onCanonicalChange,
}) {
  const copy = getEfrCopy(language);
  const sourceContext = getCanonicalEvaluationSourceContext(record);
  const jobId = sourceContext?.jobId || "";
  const requestId = sourceContext?.requestId || null;
  const relationshipId = sourceContext?.relationshipId || null;
  const environmentEnabled = isCanonicalWorkCenterHydrationEnabled();
  const [refresh, setRefresh] = useState(0);
  const [loadState, setLoadState] = useState({
    status: "loading",
    evaluation: null,
    error: "",
    notice: "",
  });
  const [evaluationVisitState, setEvaluationVisitState] = useState({
    status: "loading",
    completedVisitId: "",
    startedVisitId: "",
    activeState: "",
  });
  const [editing, setEditing] = useState(false);
  const [documentationReminderDismissed, setDocumentationReminderDismissed] = useState(false);
  const [findingsReviewRequest, setFindingsReviewRequest] = useState(0);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [assistant, setAssistant] = useState({
    busy: false,
    error: "",
    notice: "",
    result: null,
  });
  const [assistantContext, setAssistantContext] = useState({
    findings: [], recommendations: [], approvedQuote: null, preparation: null, workPlan: null,
  });
  const [assistantFindingDraft, setAssistantFindingDraft] = useState(null);
  const [assistantRecommendationDraft, setAssistantRecommendationDraft] = useState(null);
  const [photoLifecycle, setPhotoLifecycle] = useState({
    status: "loading",
    photos: [],
    concernId: "",
    modificationVersion: null,
  });
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const [selectedPhotoReferenceIds, setSelectedPhotoReferenceIds] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaNotice, setMediaNotice] = useState("");
  const [mediaError, setMediaError] = useState("");
  const photoUploadInputRef = useRef(null);
  const photoCameraInputRef = useRef(null);
  const [assistantEvaluationEdit, setAssistantEvaluationEdit] = useState(null);

  useEffect(() => {
    let active = true;
    if (!loadState.evaluation) {
      queueMicrotask(() => {
        if (active) setAssistantContext({ findings: [], recommendations: [], approvedQuote: null, preparation: null, workPlan: null });
      });
      return () => { active = false; };
    }
    const scopedRecord = canonicalRecord({ jobId, requestId, relationshipId });
    const evaluationContextRead = loadCanonicalFindingsForEvaluation({ evaluation: loadState.evaluation, setPage })
      .then(async (findings) => {
        const canonicalFindings = findings || [];
        const recommendationGroups = await Promise.all(canonicalFindings.map((finding) =>
          loadCanonicalRecommendationsForFinding({ finding, setPage }).catch(() => [])
        ));
        return { findings: canonicalFindings, recommendations: recommendationGroups.flat() };
      });
    const approvedQuoteRead = loadCanonicalQuotesForRecord({ record: scopedRecord, setPage })
      .then((quotes) => {
        const quote = selectApprovedQuote(quotes);
        return quote ? loadCanonicalQuoteDetail({ record: scopedRecord, quote, setPage }) : null;
      });
    void Promise.allSettled([
      evaluationContextRead,
      approvedQuoteRead,
      fetchWorkPreparation({ jobId, setPage }),
      fetchProfessionalJobWorkPlan({ jobId, setPage }),
    ]).then(([evaluationResult, quoteResult, preparationResult, workPlanResult]) => {
      if (!active) return;
      setAssistantContext({
        findings: evaluationResult.status === "fulfilled" ? evaluationResult.value.findings : [],
        recommendations: evaluationResult.status === "fulfilled" ? evaluationResult.value.recommendations : [],
        approvedQuote: quoteResult.status === "fulfilled" ? quoteResult.value : null,
        preparation: preparationResult.status === "fulfilled" ? preparationResult.value?.workPreparation : null,
        workPlan: workPlanResult.status === "fulfilled" ? workPlanResult.value : null,
      });
    });
    return () => { active = false; };
  }, [jobId, loadState.evaluation, relationshipId, requestId, setPage]);

  useEffect(() => {
    setSelectedPhotoReferenceIds([]);
    setPendingPhotos((current) => {
      current.forEach((photo) => photo?.revoke?.());
      return [];
    });
    setMediaError("");
    setMediaNotice("");
  }, [jobId, requestId]);

  useEffect(() => () => {
    pendingPhotos.forEach((photo) => photo?.revoke?.());
  }, [pendingPhotos]);

  useEffect(() => {
    let active = true;
    if (!environmentEnabled || !requestId) {
      queueMicrotask(() => {
        if (!active) return;
        setPhotoLifecycle({
          status: "unavailable",
          photos: [],
          concernId: "",
          modificationVersion: null,
        });
      });
      return () => { active = false; };
    }

    queueMicrotask(() => {
      if (!active) return;
      setPhotoLifecycle((current) => ({ ...current, status: "loading" }));
    });
    void fetchCanonicalPhotoLifecycle({ requestId, setPage }).then((canonical) => {
      if (!active) return;
      if (!canonical) {
        setPhotoLifecycle({
          status: "error",
          photos: [],
          concernId: "",
          modificationVersion: null,
        });
        return;
      }
      setPhotoLifecycle({ status: "ready", ...canonical });
      setSelectedPhotoReferenceIds((current) => current.filter((referenceId) =>
        canonical.photos.some((photo) => photo.referenceId === referenceId)
      ));
    }).catch(() => {
      if (!active) return;
      setPhotoLifecycle({
        status: "error",
        photos: [],
        concernId: "",
        modificationVersion: null,
      });
    });
    return () => { active = false; };
  }, [environmentEnabled, photoRefresh, requestId, setPage]);

  useEffect(() => {
    let active = true;
    setEditing(false);
    setDocumentationReminderDismissed(false);
    setConfirmingCompletion(false);
    setAssistantEvaluationEdit(null);
    if (!environmentEnabled || !jobId || !requestId) {
      queueMicrotask(() => {
        if (active) {
          setLoadState({ status: "unavailable", evaluation: null, error: copy.evaluationUnavailable, notice: "" });
        }
      });
      return () => { active = false; };
    }
    const scopedRecord = canonicalRecord({ jobId, requestId, relationshipId });
    queueMicrotask(() => {
      if (active) setLoadState((current) => ({ ...current, status: "loading", error: "" }));
    });
    void loadCanonicalEvaluationForRecord({ record: scopedRecord, setPage })
      .then((evaluation) => {
        if (!active) return;
        setLoadState({ status: "ready", evaluation, error: "", notice: "" });
        setForm(formForEvaluation(evaluation));
      })
      .catch((error) => {
        if (active) {
          setLoadState({ status: "error", evaluation: null, error: errorMessage(error, copy), notice: "" });
        }
      });
    return () => { active = false; };
  }, [copy, environmentEnabled, jobId, relationshipId, refresh, requestId, setPage]);

  useEffect(() => {
    let active = true;
    if (!environmentEnabled || !jobId) {
      setEvaluationVisitState({ status: "unavailable", completedVisitId: "", startedVisitId: "", activeState: "" });
      return () => { active = false; };
    }
    setEvaluationVisitState((current) => ({ ...current, status: "loading" }));
    void fetchCanonicalVisits({ jobId, purpose: "EVALUATION", setPage })
      .then((visits) => {
        if (!active) return;
        const completed = [...visits]
          .filter((visit) => visit.state === "COMPLETED")
          .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))[0];
        const current = [...visits]
          .sort((left, right) => Date.parse(right.versionCreatedAt) - Date.parse(left.versionCreatedAt))[0];
        setEvaluationVisitState({
          status: "ready",
          completedVisitId: completed?.id || "",
          startedVisitId: current?.state === "STARTED" ? current.id : "",
          activeState: current?.state || "",
        });
      })
      .catch(() => {
        if (active) setEvaluationVisitState({ status: "error", completedVisitId: "", startedVisitId: "", activeState: "" });
      });
    return () => { active = false; };
  }, [environmentEnabled, jobId, refresh, setPage]);

  const evaluation = loadState.evaluation;
  const actionCodes = new Set(availableActions.map((action) => String(action?.code || "")));
  const visitAllowsDocumentation = Boolean(
    evaluationVisitState.startedVisitId || evaluationVisitState.completedVisitId
  );
  const canStart = actionCodes.has("START_EVALUATION") && visitAllowsDocumentation;
  const canEdit = visitAllowsDocumentation && actionCodes.has("EDIT_EVALUATION") && evaluation?.evaluation?.capabilities?.canEditDraft === true;
  const canComplete = actionCodes.has("COMPLETE_EVALUATION") && evaluation?.evaluation?.capabilities?.canComplete === true;
  const editingAllowed = evaluation ? canEdit : canStart;
  const workflowCopy = getAskMeetroWorkflowCopy(language);
  const canonicalPhotos = photoLifecycle.photos;
  const selectedCanonicalPhotos = selectedPhotoReferenceIds
    .map((referenceId) => canonicalPhotos.find((photo) => photo.referenceId === referenceId))
    .filter(Boolean);
  const selectedPhotoCount = selectedCanonicalPhotos.length;
  const hasPhotoCaptureSupport = typeof window !== "undefined"
    ? (typeof document !== "undefined" && "capture" in document.createElement("input"))
    : false;
  const hasCoarsePointer =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches
      : false;
  const canTakePhoto = hasPhotoCaptureSupport && hasCoarsePointer;

  const photoActionLabel = () => {
    if (selectedPhotoCount === 1) return workflowCopy.analyzePhoto || "Analyze Photo";
    if (typeof workflowCopy.analyzePhotosWithCount === "string" && workflowCopy.analyzePhotosWithCount.includes("{count}")) {
      return workflowCopy.analyzePhotosWithCount.replace("{count}", String(selectedPhotoCount));
    }
    return `Analyze ${selectedPhotoCount} Photos`;
  };

  const askActions = [
    { id: "describe", label: workflowCopy.helpDescribe },
    { id: "inspect", label: workflowCopy.whatCheck },
    { id: "measurements", label: workflowCopy.helpMeasurements },
    { id: "findings", label: workflowCopy.turnIntoFindings },
    { id: "recommendations", label: workflowCopy.draftRecommendations },
  ];
  if (selectedPhotoCount > 0) {
    askActions.splice(2, 0, { id: "photos", label: photoActionLabel() });
  }

  function clearPhotoMessages() {
    setMediaError("");
    setMediaNotice("");
  }

  function setPhotoError(message) {
    setMediaError(message || workflowCopy.uploadError);
  }

  async function openPhotoGalleryPicker() {
    clearPhotoMessages();
    if (!guardFriendsAndFamilyMediaUpload({
      event: null,
      language,
      onDeferred: setPhotoError,
    })) {
      return;
    }

    if (photoUploadInputRef.current) {
      photoUploadInputRef.current.click();
      return;
    }

    await openJobPhotoPicker({
      fileNamePrefix: "evaluation-photo",
      language,
      onPhotos: (photos) => void onPhotoSelection({ target: createPhotoInputEvent(photos.map((photo) => photo.file)) }),
      onError: setPhotoError,
    });
  }

  async function openPhotoCameraPicker() {
    clearPhotoMessages();
    if (!guardFriendsAndFamilyMediaUpload({
      event: null,
      language,
      onDeferred: setPhotoError,
    })) {
      return;
    }

    if (photoCameraInputRef.current && canTakePhoto) {
      photoCameraInputRef.current.click();
      return;
    }

    try {
      if (photoCameraInputRef.current) {
        photoCameraInputRef.current.click();
      } else {
        await openJobPhotoPicker({
          fileNamePrefix: "evaluation-photo",
          language,
          onPhotos: (photos) => void onPhotoSelection({ target: createPhotoInputEvent(photos.map((photo) => photo.file)) }),
          onError: setPhotoError,
        });
      }
    } catch (error) {
      setPhotoError(error?.message || CAMERA_PERMISSION_MESSAGE);
    }
  }

  async function cleanupUploadedMedia(mediaItems) {
    await Promise.all(mediaItems.map((media) =>
      cleanupRequestPhoto({ media, authFetchImpl: authFetch, setPage })
    ));
  }

  async function onPhotoSelection(event) {
    if (!guardFriendsAndFamilyMediaUpload({
      event,
      language,
      onDeferred: setPhotoError,
    })) {
      return;
    }
    const files = Array.from(event?.target?.files || []);
    if (event?.target) event.target.value = "";
    if (files.length === 0) return;
    if (
      photoLifecycle.status !== "ready" ||
      !photoLifecycle.concernId ||
      !photoLifecycle.modificationVersion
    ) {
      setPhotoError(workflowCopy.photoAuthorityUnavailable);
      return;
    }
    const validation = validateRequestPhotoFiles(files, {
      existingCount: canonicalPhotos.length,
    });
    if (!validation.ok) {
      setPhotoError(
        validation.code === "REQUEST_PHOTO_COUNT_EXCEEDED"
          ? workflowCopy.photoLimitReached.replace("{count}", String(REQUEST_PHOTO_MAX_COUNT))
          : workflowCopy.uploadError
      );
      return;
    }

    clearPhotoMessages();
    const localPreviews = validation.files.map((file) =>
      createTemporaryRequestPhotoPreview(file)
    );
    setPendingPhotos(localPreviews);
    setMediaBusy(true);
    setMediaNotice(workflowCopy.uploadingPhotos);

    const upload = await uploadRequestPhotos({
      files: validation.files,
      authFetchImpl: authFetch,
      setPage,
    });
    if (!upload.ok) {
      setMediaBusy(false);
      setMediaNotice("");
      setPhotoError(workflowCopy.uploadError);
      return;
    }

    let currentVersion = photoLifecycle.modificationVersion;
    let appendFailure = null;
    for (let index = 0; index < upload.photos.length; index += 1) {
      const command = {
        requestId,
        concernId: photoLifecycle.concernId,
        expectedVersion: currentVersion,
        media: upload.photos[index],
        idempotencyKey: createRequestModificationIdempotencyKey(
          `evaluation-photo:${requestId}:${currentVersion}`
        ),
        setPage,
      };
      let result = await appendHomeownerRequestPhoto(command);
      if (result.code === "REQUEST_PHOTO_APPEND_NETWORK_FAILED") {
        result = await appendHomeownerRequestPhoto(command);
      }
      if (!result.ok || !result.requestVersion) {
        appendFailure = {
          index,
          confirmationUncertain: result.code === "REQUEST_PHOTO_APPEND_NETWORK_FAILED",
        };
        break;
      }
      currentVersion = result.requestVersion;
    }

    if (appendFailure) {
      const cleanupStart = appendFailure.confirmationUncertain
        ? appendFailure.index + 1
        : appendFailure.index;
      await cleanupUploadedMedia(upload.photos.slice(cleanupStart));
      const reconciled = await fetchCanonicalPhotoLifecycle({ requestId, setPage });
      if (reconciled) {
        setPhotoLifecycle({ status: "ready", ...reconciled });
        setSelectedPhotoReferenceIds((current) => current.filter((referenceId) =>
          reconciled.photos.some((photo) => photo.referenceId === referenceId)
        ));
        setPendingPhotos([]);
      } else {
        setPhotoRefresh((value) => value + 1);
      }
      setMediaBusy(false);
      setMediaNotice("");
      setPhotoError(workflowCopy.photoAppendError);
      onCanonicalChange?.();
      return;
    }

    const refreshed = await fetchCanonicalPhotoLifecycle({ requestId, setPage });
    if (
      !refreshed?.modificationVersion ||
      refreshed.photos.length < canonicalPhotos.length + upload.photos.length
    ) {
      setMediaBusy(false);
      setMediaNotice("");
      setPhotoError(workflowCopy.photoRefreshError);
      setPhotoRefresh((value) => value + 1);
      onCanonicalChange?.();
      return;
    }
    setPhotoLifecycle({ status: "ready", ...refreshed });
    setSelectedPhotoReferenceIds([]);
    setPendingPhotos([]);
    setMediaBusy(false);
    setMediaError("");
    setMediaNotice(workflowCopy.photosReady);
    onCanonicalChange?.();
  }

  function toggleCanonicalPhoto(referenceId) {
    setSelectedPhotoReferenceIds((current) => {
      if (current.includes(referenceId)) {
        return current.filter((item) => item !== referenceId);
      }
      if (current.length >= REQUEST_PHOTO_MAX_COUNT) return current;
      return [...current, referenceId];
    });
  }

  const selectedPhotoSummary = workflowCopy.photoCountSummary
    ? workflowCopy.photoCountSummary.replace("{count}", String(selectedPhotoCount))
    : `${selectedPhotoCount} photo${selectedPhotoCount === 1 ? "" : "s"} selected for analysis`;

  function beginEditing() {
    if (!editingAllowed) return;
    setLoadState((current) => ({ ...current, error: "", notice: "" }));
    setForm(formForEvaluation(evaluation));
    setAssistantEvaluationEdit(null);
    setEditing(true);
  }

  async function requestEvaluationHelp(action, prompt) {
    const intents = {
      describe: "DESCRIBE_CONDITION",
      inspect: "INSPECTION_CHECKLIST",
      photos: "ANALYZE_PHOTOS",
      measurements: "MEASUREMENT_HELP",
      findings: "DRAFT_FINDINGS",
      recommendations: "DRAFT_RECOMMENDATIONS",
    };
    const photoReferenceIds = action === "photos"
      ? selectedCanonicalPhotos.map((photo) => photo.referenceId).slice(0, REQUEST_PHOTO_MAX_COUNT)
      : [];
    if (action === "photos" && photoReferenceIds.length === 0) {
      setAssistant((current) => ({
        ...current,
        error: workflowCopy.selectPhotosFirst,
        notice: "",
      }));
      return;
    }
    setAssistant({ busy: true, error: "", notice: "", result: null });
    try {
      const result = await requestWorkflowIntelligence({
        operation: INTELLIGENCE_OPERATION.EVALUATION,
        locale: language,
        input: {
          jobId,
          evaluationId: evaluation?.evaluation?.id || null,
          intent: intents[action],
          ...(action === "photos" ? { photoReferenceIds } : {}),
          professionalInput: buildEvaluationAssistantProfessionalInput({
            evaluation: evaluation ? {
              ...evaluation,
              evaluation: {
                ...evaluation.evaluation,
                content: {
                  ...evaluation.evaluation.content,
                  observations: form.observations || evaluation.evaluation.content.observations,
                  diagnosisSummary: form.diagnosisSummary || evaluation.evaluation.content.diagnosisSummary,
                  limitations: form.limitations || evaluation.evaluation.content.limitations,
                  internalNotes: form.internalNotes || evaluation.evaluation.content.internalNotes,
                },
              },
            } : null,
            structuredFindings: assistantContext.findings,
            recommendations: assistantContext.recommendations,
            approvedQuote: assistantContext.approvedQuote,
            preparation: assistantContext.preparation,
            workPlan: assistantContext.workPlan,
            prompt,
            selectedPhotoSummary: action === "photos" ? selectedPhotoSummary : "",
          }),
        },
        expected: { jobId, evaluationId: evaluation?.evaluation?.id || undefined },
        setPage,
      });
      setAssistant({ busy: false, error: "", notice: "", result });
    } catch (error) {
      setAssistant({ busy: false, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable, notice: "", result: null });
    }
  }

  function mediaActions() {
    return (
      <div style={styles.mediaPanel}>
        {mediaNotice && <p style={styles.mediaMessage}>{mediaNotice}</p>}
        {mediaError && <p role="alert" style={styles.mediaError}>{mediaError}</p>}
        {photoLifecycle.status === "loading" && (
          <p role="status" style={styles.mediaMessage}>{workflowCopy.loadingPhotos}</p>
        )}
        {canonicalPhotos.length > 0 ? (
          <div style={styles.photoReviewBlock}>
            <strong style={styles.photoReviewTitle}>
              {workflowCopy.canonicalPhotoTitle || "Evaluation photos"}
            </strong>
            <p style={styles.photoReviewCount}>
              {selectedPhotoCount > 0
                ? selectedPhotoSummary
                : workflowCopy.selectPhotosHelp}
            </p>
            <div style={styles.photoPreviewGrid}>
              {canonicalPhotos.map((photo, index) => {
                const selected = selectedPhotoReferenceIds.includes(photo.referenceId);
                return (
                <div key={photo.referenceId} style={{
                  ...styles.photoPreviewCard,
                  ...(selected ? styles.photoPreviewCardSelected : {}),
                }}>
                  <img
                    src={photo.previewUrl}
                    alt={`${workflowCopy.uploadPhotoLabelFallback || "Evaluation photo"} ${index + 1}`}
                    style={styles.photoPreviewImage}
                  />
                  <span style={styles.photoPreviewName}>
                    {workflowCopy.photoPosition
                      .replace("{current}", String(index + 1))
                      .replace("{total}", String(canonicalPhotos.length))}
                  </span>
                  <button
                    type="button"
                    aria-pressed={selected}
                    style={selected ? styles.selectedButton : styles.removeButton}
                    onClick={() => toggleCanonicalPhoto(photo.referenceId)}
                  >
                    {selected ? workflowCopy.deselectPhoto : workflowCopy.selectPhoto}
                  </button>
                </div>
              )})}
            </div>
          </div>
        ) : null}
        {pendingPhotos.length > 0 && (
          <div style={styles.photoReviewBlock} aria-busy={mediaBusy}>
            <strong style={styles.photoReviewTitle}>{workflowCopy.pendingPhotoTitle}</strong>
            <p style={styles.photoReviewCount}>{workflowCopy.pendingPhotoHelp}</p>
            <div style={styles.photoPreviewGrid}>
              {pendingPhotos.map((photo, index) => (
                <div key={photo.id} style={styles.photoPreviewCard}>
                  {photo.url && (
                    <img
                      src={photo.url}
                      alt={`${workflowCopy.uploadPhotoLabelFallback || "Evaluation photo"} ${index + 1}`}
                      style={styles.photoPreviewImage}
                    />
                  )}
                  <span style={styles.photoPreviewName}>{workflowCopy.pendingPhoto}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={styles.mediaActions}>
          {canTakePhoto ? (
            <button
              type="button"
              style={styles.secondaryButton}
              disabled={mediaBusy || photoLifecycle.status !== "ready"}
              onClick={() => void openPhotoCameraPicker()}
            >
              {workflowCopy.takePhoto || "Take Photo"}
            </button>
          ) : null}
          <button
            type="button"
            style={styles.secondaryButton}
            disabled={mediaBusy || photoLifecycle.status !== "ready"}
            onClick={() => void openPhotoGalleryPicker()}
          >
            {canonicalPhotos.length > 0
              ? workflowCopy.uploadAdditionalPhotos || "Upload Photos"
              : workflowCopy.uploadPhotos || "Upload Photos"}
          </button>
        </div>
        <input
          ref={photoUploadInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => void onPhotoSelection(event)}
          style={styles.hiddenInput}
        />
        {canTakePhoto ? (
          <input
            ref={photoCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void onPhotoSelection(event)}
            style={styles.hiddenInput}
          />
        ) : null}
      </div>
    );
  }

  const photoControls = mediaActions();

  async function reviewAssistantItem(item, action, editedValue) {
    const result = assistant.result;
    if (!result || !item?.id) return false;
    try {
      await recordWorkflowReview({
        proposalId: result.proposal.proposalId,
        elementId: item.id,
        action,
        editedValue,
        reasonCategory: action === "REJECTED" ? "PROFESSIONAL_DISMISSED" : undefined,
        setPage,
      });
      return true;
    } catch (error) {
      setAssistant((current) => ({ ...current, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable }));
      return false;
    }
  }

  async function addEvaluationDraft({ edit = false } = {}) {
    const proposal = assistant.result?.proposal;
    if (!proposal?.evaluationDraft || !editingAllowed) return;
    if (!edit && !await reviewAssistantItem(proposal.evaluationDraft, "ACCEPTED")) return;
    setForm((current) => ({
      ...current,
      observations: proposal.evaluationDraft.observations || current.observations,
      diagnosisSummary: proposal.evaluationDraft.diagnosisSummary || current.diagnosisSummary,
      limitations: proposal.evaluationDraft.limitations || current.limitations,
    }));
    setEditing(true);
    setAssistantEvaluationEdit(edit ? proposal.evaluationDraft : null);
    setAssistant((current) => ({ ...current, notice: getAskMeetroWorkflowCopy(language).addToEvaluation }));
  }

  async function prepareAssistantFinding(item) {
    if (!evaluation) {
      if (!await reviewAssistantItem(item, "ACCEPTED")) return;
      setForm((current) => ({
        ...current,
        observations: [current.observations, item.text].filter(Boolean).join("\n"),
      }));
      setEditing(true);
      setAssistant((current) => ({ ...current, notice: "Added to What did you find?" }));
      return;
    }
    setAssistantFindingDraft(item);
  }

  async function prepareAssistantRecommendation(item) {
    if (!evaluation) {
      if (!await reviewAssistantItem(item, "ACCEPTED")) return;
      setForm((current) => ({
        ...current,
        diagnosisSummary: [current.diagnosisSummary, item.text].filter(Boolean).join("\n"),
      }));
      setEditing(true);
      setAssistant((current) => ({ ...current, notice: "Added to What do you recommend?" }));
      return;
    }
    setAssistantRecommendationDraft(item);
  }

  async function saveEvaluation() {
    if (!editingAllowed) {
      setLoadState((current) => ({ ...current, error: copy.updateUnavailable }));
      return;
    }
    setLoadState((current) => ({ ...current, status: "saving", error: "", notice: "" }));
    const updatingExistingDraft = Boolean(evaluation);
    try {
      if (assistantEvaluationEdit) {
        const reviewed = await reviewAssistantItem(assistantEvaluationEdit, "EDITED", {
          observations: form.observations,
          diagnosisSummary: form.diagnosisSummary,
          limitations: form.limitations,
        });
        if (!reviewed) {
          setLoadState((current) => ({ ...current, status: "ready" }));
          return;
        }
      }
      const confirmed = await saveCanonicalEvaluationDraft({
        record: canonicalRecord({ jobId, requestId, relationshipId }),
        form,
        currentEvaluation: evaluation,
        evaluationVisitId:
          evaluationVisitState.completedVisitId ||
          evaluationVisitState.startedVisitId ||
          null,
        setPage,
      });
      setLoadState({
        status: "ready",
        evaluation: confirmed,
        error: "",
        notice: updatingExistingDraft
          ? "Evaluation draft updated"
          : "Evaluation draft saved",
      });
      setDocumentationReminderDismissed(false);
      setForm(formForEvaluation(confirmed));
      setEditing(false);
      setAssistantEvaluationEdit(null);
      onCanonicalChange?.();
    } catch (error) {
      setLoadState((current) => ({ ...current, status: "ready", error: errorMessage(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) setRefresh((value) => value + 1);
    }
  }

  function reviewFindingsAndRecommendations() {
    setDocumentationReminderDismissed(true);
    setFindingsReviewRequest((value) => value + 1);
  }

  const draftProgress = getCanonicalEvaluationDraftProgress(evaluation);
  const savedDraftIsMeaningful =
    evaluation?.evaluation?.status === "draft" &&
    draftProgress.hasMeaningfulSavedContent;

  async function completeEvaluation() {
    if (!canComplete || !evaluation) return;
    setLoadState((current) => ({ ...current, status: "completing", error: "", notice: "" }));
    try {
      const completed = await completeCanonicalEvaluationDraft({
        record: canonicalRecord({ jobId, requestId, relationshipId }),
        form: formForEvaluation(evaluation),
        currentEvaluation: evaluation,
        evaluationVisitId: evaluationVisitState.completedVisitId || null,
        setPage,
      });
      setLoadState({ status: "ready", evaluation: completed, error: "", notice: copy.evaluationCompleted });
      setForm(formForEvaluation(completed));
      setConfirmingCompletion(false);
      onCanonicalChange?.();
    } catch (error) {
      setLoadState((current) => ({ ...current, status: "ready", error: errorMessage(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) setRefresh((value) => value + 1);
    }
  }

  const statusLabel = loadState.status === "loading"
    ? copy.loading
    : loadState.status === "saving"
      ? copy.saving
      : loadState.status === "completing"
        ? copy.completing
        : evaluation
          ? evaluation.evaluation.status === "completed"
            ? copy.completed
            : savedDraftIsMeaningful
              ? "Evaluation draft saved"
              : evaluationVisitState.completedVisitId
                ? "Evaluation documentation not complete"
              : evaluationVisitState.activeState === "STARTED"
                ? "Evaluation Visit In Progress"
              : evaluationVisitState.activeState === "SCHEDULED"
                ? "Evaluation Draft — Visit Scheduled"
                : "Evaluation Draft"
          : evaluationVisitState.completedVisitId
            ? "Evaluation documentation not complete"
            : copy.noEvaluation;

  return (
    <>
      <section style={findingsPresentation ? { ...styles.section, ...styles.embeddedSection } : styles.section} aria-labelledby="canonical-job-evaluation-title">
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>{copy.assessment}</span>
            <h3
              id="canonical-job-evaluation-title"
              tabIndex={-1}
              style={{ ...styles.title, scrollMarginTop: 88 }}
            >
              {copy.evaluation}
            </h3>
          </div>
          <span style={styles.statusBadge}>{statusLabel}</span>
        </div>
        <div style={styles.concern}>
          <span style={styles.fieldLabel}>{copy.customerConcern}</span>
          <strong style={styles.readOnlyLabel}>{copy.customerDetails}</strong>
          <p style={styles.readText}>{customerConcern || copy.unavailable}</p>
        </div>
        {loadState.status === "loading" && <p role="status" style={styles.message}>{copy.loadingEvaluation}</p>}
        {loadState.error && <p role="alert" style={styles.error}>{loadState.error}</p>}
        {loadState.notice && <p role="status" style={styles.success}>{loadState.notice}</p>}
        {environmentEnabled && jobId && visitAllowsDocumentation && (
          <ContextualAskMeetro
            language={language}
            contextLabel="evaluation"
            contextName={customerConcern || copy.evaluation}
            actions={askActions}
            busy={assistant.busy}
            error={assistant.error}
            notice={assistant.notice}
            onRequest={requestEvaluationHelp}
            mediaControls={photoControls}
          >
            {assistant.result && (
              <EvaluationAssistantResult
                result={assistant.result.proposal}
                language={language}
                canApplyEvaluation={editingAllowed}
                onAddEvaluation={() => void addEvaluationDraft()}
                onEditEvaluation={() => void addEvaluationDraft({ edit: true })}
                onAddFinding={(item) => void prepareAssistantFinding(item)}
                onAddRecommendation={(item) => void prepareAssistantRecommendation(item)}
                onDismiss={(item) => reviewAssistantItem(item, "REJECTED")}
              />
            )}
          </ContextualAskMeetro>
        )}
        {loadState.status === "error" && (
          <button type="button" style={styles.secondaryButton} onClick={() => setRefresh((value) => value + 1)}>
            {copy.retry}
          </button>
        )}
        {loadState.status === "ready" && !evaluation && !editing && (
          <div style={styles.emptyState}>
            {!documentationReminderDismissed && evaluationVisitState.completedVisitId && (
              <strong>Evaluation documentation not complete</strong>
            )}
            {!documentationReminderDismissed && (
              <p style={styles.message}>
                {evaluationVisitState.completedVisitId
                ? "You can document the Evaluation now or return later."
                : evaluationVisitState.activeState === "STARTED"
                  ? "Evaluation Visit in progress. Document the assessment as you work."
                : evaluationVisitState.activeState === "SCHEDULED"
                  ? "Start the Evaluation Visit when you arrive to begin documenting the assessment."
                  : "Schedule and start an Evaluation Visit before documenting the onsite assessment."}
              </p>
            )}
            <div style={styles.actions}>
              {canStart && <button type="button" style={styles.primaryButton} onClick={beginEditing}>Fill manually</button>}
              {!documentationReminderDismissed && evaluationVisitState.completedVisitId && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setDocumentationReminderDismissed(true)}
                >
                  Do this later
                </button>
              )}
            </div>
          </div>
        )}
        {loadState.status === "ready" &&
          evaluation?.evaluation?.status === "draft" &&
          (evaluationVisitState.completedVisitId || savedDraftIsMeaningful) &&
          !editing &&
          !documentationReminderDismissed && (
            <div
              role="status"
              style={savedDraftIsMeaningful
                ? styles.savedDraftGuidance
                : styles.documentationReminder}
            >
              <strong>
                {savedDraftIsMeaningful
                  ? "Evaluation draft saved"
                  : "Evaluation documentation not complete"}
              </strong>
              <p style={styles.message}>
                {savedDraftIsMeaningful
                  ? "Your latest Evaluation work is saved. You can finish it now or return later."
                  : "You can document the Evaluation now or return later."}
              </p>
              <div style={styles.actions}>
                {savedDraftIsMeaningful ? (
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={reviewFindingsAndRecommendations}
                  >
                    Review Findings &amp; Recommendations
                  </button>
                ) : (
                  <button type="button" style={styles.primaryButton} onClick={beginEditing}>
                    Continue Evaluation
                  </button>
                )}
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setDocumentationReminderDismissed(true)}
                >
                  Do this later
                </button>
              </div>
            </div>
          )}
        {evaluation && !editing && (
          <div style={styles.readView}>
            {evaluation.evaluation.status === "draft" && !evaluationVisitState.completedVisitId && (
              <p style={styles.message}>
                {evaluationVisitState.activeState === "STARTED"
                  ? "Document the assessment now. Finalize it only after the Visit is completed."
                  : "Evaluation documentation is unavailable until the scheduled Visit starts."}
              </p>
            )}
            <div style={styles.readField}>
              <span style={styles.fieldLabel}>{copy.observations}</span>
              <p style={styles.readText}>{evaluation.evaluation.content.observations || copy.noneRecorded}</p>
            </div>
            {evaluation.evaluation.content.diagnosisSummary && (
              <div style={styles.readField}><span style={styles.fieldLabel}>{copy.assessmentSummary}</span><p style={styles.readText}>{evaluation.evaluation.content.diagnosisSummary}</p></div>
            )}
            {evaluation.evaluation.content.limitations && (
              <div style={styles.readField}><span style={styles.fieldLabel}>{copy.limitations}</span><p style={styles.readText}>{evaluation.evaluation.content.limitations}</p></div>
            )}
            {evaluation.evaluation.content.internalNotes && (
              <div style={styles.readField}><span style={styles.fieldLabel}>{copy.internalNotes}</span><p style={styles.readText}>{evaluation.evaluation.content.internalNotes}</p></div>
            )}
            <div style={styles.actions}>
              {canEdit && <button type="button" style={styles.secondaryButton} onClick={beginEditing}>{copy.editEvaluation}</button>}
              {canComplete && !confirmingCompletion && (
                <button type="button" style={styles.primaryButton} onClick={() => setConfirmingCompletion(true)}>{copy.completeEvaluation}</button>
              )}
            </div>
            {confirmingCompletion && (
              <div style={styles.confirmation}>
                <strong>{copy.confirmCompletion}</strong>
                <p style={styles.message}>{copy.completionHelp}</p>
                <div style={styles.actions}>
                  <button type="button" style={styles.primaryButton} onClick={() => void completeEvaluation()}>{copy.completeEvaluation}</button>
                  <button type="button" style={styles.secondaryButton} onClick={() => setConfirmingCompletion(false)}>{copy.keepEditing}</button>
                </div>
              </div>
            )}
          </div>
        )}
        {editing && editingAllowed && (
          <div style={styles.form}>
            {[
              ["observations", "What did you find?", true],
              ["diagnosisSummary", "What do you recommend?", false],
            ].map(([field, label, required]) => (
              <label key={field} style={styles.label}>
                {label}
                <textarea
                  style={styles.textarea}
                  value={form[field]}
                  maxLength={5000}
                  required={required}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                />
                {field === "observations" && (
                  <WorkflowMicrophoneInput
                    language={language}
                    contextLabel="evaluation-observations"
                    disabled={loadState.status === "saving"}
                    setPage={setPage}
                    idleLabel="Add voice notes"
                    onTranscript={(transcript) => setForm((current) => ({
                      ...current,
                      observations: [current.observations.trim(), transcript.trim()].filter(Boolean).join("\n"),
                    }))}
                  />
                )}
              </label>
            ))}
            <details style={styles.advancedFields}>
              <summary style={styles.advancedSummary}>More evaluation details</summary>
              {[
                ["limitations", copy.limitations],
                ["internalNotes", copy.internalNotes],
              ].map(([field, label]) => (
                <label key={field} style={styles.label}>
                  {label}
                  <textarea
                    style={styles.textarea}
                    value={form[field]}
                    maxLength={5000}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                  />
                </label>
              ))}
            </details>
            <div style={styles.actions}>
              <button type="button" style={styles.primaryButton} disabled={loadState.status === "saving"} onClick={() => void saveEvaluation()}>
                {loadState.status === "saving" ? copy.saving : copy.saveEvaluation}
              </button>
              <button type="button" style={styles.secondaryButton} disabled={loadState.status === "saving"} onClick={() => {
                setEditing(false);
                setAssistantEvaluationEdit(null);
              }}>{copy.cancel}</button>
            </div>
          </div>
        )}
      </section>
      {findingsPresentation ? (
        <WorkCenterAccordion
          id="canonical-job-findings"
          icon="findingsLibrary"
          title={findingsPresentation.title}
          summary={findingsPresentation.summary}
          defaultOpen={
            findingsPresentation.defaultOpen || findingsReviewRequest > 0
          }
          autoOpenToken={`${findingsPresentation.autoOpenToken}:${findingsReviewRequest}`}
          nested
        >
          <CanonicalFindingsPanel
            enabled={environmentEnabled && sourceContext?.type === "ordinary_job"}
            evaluation={evaluation}
            setPage={setPage}
            language={language}
            availableActions={availableActions}
            onCanonicalChange={onCanonicalChange}
            assistantFindingDraft={assistantFindingDraft}
            assistantRecommendationDraft={assistantRecommendationDraft}
            onAssistantFindingDraftConsumed={() => setAssistantFindingDraft(null)}
            onAssistantRecommendationDraftConsumed={() => setAssistantRecommendationDraft(null)}
            onAssistantFindingReview={(item, action, editedValue) => reviewAssistantItem(item, action, editedValue)}
            onAssistantRecommendationReview={(item, action, editedValue) => reviewAssistantItem(item, action, editedValue)}
          />
        </WorkCenterAccordion>
      ) : (
        <CanonicalFindingsPanel
          enabled={environmentEnabled && sourceContext?.type === "ordinary_job"}
          evaluation={evaluation}
          setPage={setPage}
          language={language}
          availableActions={availableActions}
          onCanonicalChange={onCanonicalChange}
          assistantFindingDraft={assistantFindingDraft}
          assistantRecommendationDraft={assistantRecommendationDraft}
          onAssistantFindingDraftConsumed={() => setAssistantFindingDraft(null)}
          onAssistantRecommendationDraftConsumed={() => setAssistantRecommendationDraft(null)}
          onAssistantFindingReview={(item, action, editedValue) => reviewAssistantItem(item, action, editedValue)}
          onAssistantRecommendationReview={(item, action, editedValue) => reviewAssistantItem(item, action, editedValue)}
        />
      )}
    </>
  );
}

function EvaluationAssistantResult({
  result,
  language,
  canApplyEvaluation,
  onAddEvaluation,
  onEditEvaluation,
  onAddFinding,
  onAddRecommendation,
  onDismiss,
}) {
  const copy = getAskMeetroWorkflowCopy(language);
  const [dismissedIds, setDismissedIds] = useState([]);
  async function dismiss(item) {
    if (!item?.id || !await onDismiss(item)) return;
    setDismissedIds((current) => [...new Set([...current, item.id])]);
  }
  const groups = [
    [copy.observed, result.observed],
    [copy.professionalInput, result.professionalInput],
    [copy.needsVerification, result.needsVerification],
    [copy.suggested, [...result.inspectionSuggestions, ...result.measurementSuggestions]],
  ];
  return (
    <div style={styles.assistantResult}>
      <strong>{result.summary}</strong>
      {groups.map(([label, items]) => items.length > 0 && (
        <section key={label} style={styles.assistantGroup}>
          <h4 style={styles.assistantHeading}>{label}</h4>
          {items.map((item) => <p key={item.id} style={styles.message}>{item.text}</p>)}
        </section>
      ))}
      <div style={styles.actions}>
        {canApplyEvaluation && (
          <>
            <button type="button" style={styles.primaryButton} onClick={onAddEvaluation}>{copy.addToEvaluation}</button>
            <button type="button" style={styles.secondaryButton} onClick={onEditEvaluation}>{copy.edit}</button>
          </>
        )}
        {!dismissedIds.includes(result.evaluationDraft?.id) && (
          <button type="button" style={styles.secondaryButton} onClick={() => void dismiss(result.evaluationDraft)}>{copy.dismiss}</button>
        )}
      </div>
      {result.findingDrafts.filter((item) => !dismissedIds.includes(item.id)).map((item) => (
        <article key={item.id} style={styles.assistantDraft}>
          <p style={styles.message}>{item.text}</p>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} onClick={() => onAddFinding(item)}>Add to Evaluation</button>
            <button type="button" style={styles.secondaryButton} onClick={() => void dismiss(item)}>{copy.dismiss}</button>
          </div>
        </article>
      ))}
      {result.recommendationDrafts.filter((item) => !dismissedIds.includes(item.id)).map((item) => (
        <article key={item.id} style={styles.assistantDraft}>
          <p style={styles.message}>{item.text}</p>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} onClick={() => onAddRecommendation(item)}>Add to Evaluation</button>
            <button type="button" style={styles.secondaryButton} onClick={() => void dismiss(item)}>{copy.dismiss}</button>
          </div>
        </article>
      ))}
    </div>
  );
}

const button = { minHeight: 44, padding: "9px 14px", borderRadius: 6, fontWeight: 800, cursor: "pointer" };
const styles = {
  section: { display: "grid", gap: 16, padding: 16, border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff" },
  embeddedSection: { padding: "16px 0", border: 0, borderRadius: 0, background: "transparent" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "4px 0 0", fontSize: 20, letterSpacing: 0 },
  statusBadge: { padding: "6px 10px", border: "1px solid #94a3b8", borderRadius: 999, color: "#334155", background: "#f8fafc", fontSize: 12, fontWeight: 800 },
  concern: { display: "grid", gap: 5, padding: "12px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
  fieldLabel: { color: "#475569", fontSize: 12, fontWeight: 800 },
  readOnlyLabel: { color: "#166534", fontSize: 12 },
  message: { margin: 0, color: "#475569", lineHeight: 1.5 },
  error: { margin: 0, padding: 10, borderLeft: "3px solid #b91c1c", color: "#991b1b", background: "#fef2f2" },
  success: { margin: 0, padding: 10, borderLeft: "3px solid #15803d", color: "#166534", background: "#f0fdf4" },
  documentationReminder: { display: "grid", gap: 10, justifyItems: "start", padding: 12, border: "1px solid #d6b45b", borderRadius: 8, background: "#fffbeb", color: "#6b4f11" },
  savedDraftGuidance: { display: "grid", gap: 10, justifyItems: "start", padding: 12, border: "1px solid #86a991", borderRadius: 8, background: "#f0fdf4", color: "#174b2c" },
  emptyState: { display: "grid", gap: 12, justifyItems: "start" },
  readView: { display: "grid", gap: 14 },
  readField: { display: "grid", gap: 5 },
  readText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  form: { display: "grid", gap: 14 },
  advancedFields: { display: "grid", gap: 12, padding: 12, border: "1px solid #d7e0d8", borderRadius: 8 },
  advancedSummary: { color: "#334155", fontWeight: 800, cursor: "pointer" },
  label: { display: "grid", gap: 6, color: "#334155", fontWeight: 700 },
  textarea: { width: "100%", minHeight: 96, boxSizing: "border-box", resize: "vertical", padding: 10, border: "1px solid #94a3b8", borderRadius: 6, color: "#0f172a", background: "#ffffff", font: "inherit", lineHeight: 1.45 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  confirmation: { display: "grid", gap: 10, padding: 12, border: "1px solid #d97706", borderRadius: 8, background: "#fffbeb" },
  primaryButton: { ...button, border: "1px solid #1f5132", color: "#ffffff", background: "#1f5132" },
  secondaryButton: { ...button, border: "1px solid #94a3b8", color: "#334155", background: "#ffffff" },
  assistantResult: { display: "grid", gap: 12, minWidth: 0 },
  assistantGroup: { display: "grid", gap: 6, paddingLeft: 10, borderLeft: "3px solid #8cab95" },
  assistantHeading: { margin: 0, fontSize: 14, letterSpacing: 0 },
  assistantDraft: { display: "grid", gap: 8, padding: 10, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff" },
  mediaPanel: { display: "grid", gap: 8 },
  mediaMessage: { margin: 0, color: "#475569", lineHeight: 1.45 },
  mediaError: { margin: 0, color: "#991b1b", padding: 10, borderLeft: "3px solid #b91c1c", background: "#fef2f2" },
  photoReviewBlock: { display: "grid", gap: 8, border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, background: "#ffffff" },
  photoReviewTitle: { margin: 0, fontSize: 14, color: "#334155" },
  photoReviewCount: { margin: 0, color: "#475569", fontSize: 13 },
  photoPreviewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 },
  photoPreviewCard: { display: "grid", gap: 6, border: "1px solid #cbd5e1", borderRadius: 8, padding: 8, background: "#fff", minWidth: 0 },
  photoPreviewCardSelected: { borderColor: "#1f6a3a", background: "#f0fdf4" },
  photoPreviewImage: { width: "100%", height: 72, objectFit: "cover", borderRadius: 6, background: "#f1f5f9" },
  photoPreviewName: { margin: 0, fontSize: 12, color: "#334155", overflowWrap: "anywhere" },
  removeButton: { minHeight: 44, padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", cursor: "pointer", width: "100%" },
  selectedButton: { minHeight: 44, padding: "7px 10px", borderRadius: 6, border: "1px solid #1f6a3a", background: "#e9f4ec", color: "#174b2c", cursor: "pointer", width: "100%", fontWeight: 800 },
  mediaActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  hiddenInput: { display: "none" },
};
