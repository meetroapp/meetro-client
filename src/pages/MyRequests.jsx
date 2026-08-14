import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import EmergencyTimeline from "../components/EmergencyTimeline";
import HomeownerProfessionalResponseReview from "../components/HomeownerProfessionalResponseReview";
import HomeownerRequestModificationPanel from "../components/HomeownerRequestModificationPanel";
import { getLanguage, t } from "../utils/language";
import { addNotification } from "../utils/notifications";
import { authFetch } from "../utils/authFetch";
import {
  REQUEST_COLLECTION_STATUS,
  replaceCanonicalRequest,
  resolveHomeownerRequestCollection,
} from "../utils/requestLifecycleState";
import {
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";
import {
  isRequestPhotoUploadEnabled,
} from "../utils/requestPhotoMedia";
import {
  getHomeownerLifecycleStage,
  getAuthoritativeHomeownerRequestCounts,
  getHomeownerWorkflowPresentation,
  getHomeownerWorkflowTimeline,
  isRequestVisibleToHomeowner,
} from "../utils/homeownerLifecycle";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { saveSelectedActiveProject } from "../utils/workCenter";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import { getEmergencyRequests } from "../utils/emergencyApi";
import { createEmergencyRefreshCoordinator } from "../utils/emergencyRefreshCoordinator";
import { buildEmergencyRequestRoute } from "../utils/emergencyRoutes";
import { buildCanonicalConversationRoute } from "../utils/canonicalConversationMessaging";
import {
  getCanonicalConversationActionTarget,
} from "../utils/conversationActionRouting";
import {
  HISTORY_EMERGENCY_SUMMARY_STATUSES,
  getEmergencyResponsePresentation,
  getEmergencySpecialtyDisplayLabel,
} from "../utils/emergencySummary";
import {
  CONVERSATION_ACTION_STAGE,
  getConversationActionLabel,
} from "../utils/conversationActionLanguage";
import { formatLocaleDate } from "../utils/localeFormat";
import {
  getHomeownerRequestCardId,
  normalizeHomeownerRequestCardId,
  resolveHomeownerRequestById,
} from "../utils/homeownerRequestCardIdentity";
import { fetchCustomerJobQuotes } from "../utils/customerJobQuotesApi.js";

const UNSUPPORTED_WORKFLOW_STATUSES = new Set([
  "accepted",
  "approved",
  "quote_approved",
  "scheduled",
  "work_scheduled",
  "scheduled_work",
]);

function isUnsupportedApprovalOrScheduleStatus(value) {
  return UNSUPPORTED_WORKFLOW_STATUSES.has(String(value || "").toLowerCase());
}

function hasUnsupportedApprovalOrSchedule(record = {}) {
  if (
    isUnsupportedApprovalOrScheduleStatus(record.status) ||
    isUnsupportedApprovalOrScheduleStatus(record.quoteStatus) ||
    isUnsupportedApprovalOrScheduleStatus(record.workflowStage) ||
    isUnsupportedApprovalOrScheduleStatus(record.workflowStatus)
  ) {
    return true;
  }

  if (
    record.acceptedQuote ||
    record.acceptedAt ||
    record.acceptedBy ||
    record.scheduledAt ||
    record.appointmentDate ||
    record.linkedAppointment ||
    record.appointment ||
    record.schedule
  ) {
    return true;
  }

  return Array.isArray(record.quotesReceived)
    ? record.quotesReceived.some((quote) =>
        isUnsupportedApprovalOrScheduleStatus(quote?.status || quote?.quoteStatus)
      )
    : false;
}

function getTruthfulWorkflowRequest(request = {}) {
  if (!hasUnsupportedApprovalOrSchedule(request)) return request;

  return {
    ...request,
    status: Array.isArray(request.quotesReceived) && request.quotesReceived.length > 0 ? "quoted" : "pending",
    quoteStatus: "",
    workflowStage: "",
    workflowStatus: "",
    nextAction: "",
    acceptedQuote: null,
    acceptedAt: null,
    acceptedBy: null,
    selectedProfessional: request.selectedProfessional,
    scheduledAt: null,
    appointmentDate: null,
    linkedAppointment: null,
    appointment: null,
    schedule: null,
    quotesReceived: Array.isArray(request.quotesReceived)
      ? request.quotesReceived.map((quote) =>
          isUnsupportedApprovalOrScheduleStatus(quote?.status || quote?.quoteStatus)
            ? {
                ...quote,
                status: "pending",
                quoteStatus: "pending",
                workflowStage: "",
                nextAction: "",
                acceptedAt: null,
                acceptedBy: null,
              }
            : quote
        )
      : request.quotesReceived,
    projectTimeline: Array.isArray(request.projectTimeline)
      ? request.projectTimeline.filter(
          (item) => !String(item?.type || "").toLowerCase().includes("quoteaccepted")
        )
      : request.projectTimeline,
  };
}

function getApprovalSchedulingUnavailableCopy(language) {
  return {
    title:
      language === "es"
        ? "La aprobación de cotizaciones y la programación no están disponibles todavía."
        : "Quote approval and scheduling are not available yet.",
    body:
      language === "es"
        ? "Puedes revisar la cotización y continuar la conversación, pero Meetro todavía no guarda ni comparte aprobaciones o programación en producción."
        : "You can review the quote and continue the conversation, but Meetro does not yet save or share approvals or scheduling in production.",
  };
}

function PhotoStrip({ request, onPreview, language }) {
  const photos = [
    ...(Array.isArray(request.request_photos)
      ? request.request_photos.map((photo) => photo?.secure_url)
      : []),
    ...(Array.isArray(request.photos) ? request.photos : []),
    ...(request.image_url ? [request.image_url] : []),
  ].filter(Boolean);

  const uniquePhotos = [...new Set(photos)];
  const mainPhotoLabel = language === "es" ? "Foto principal" : "Main Photo";
  const getPhotoLabel = (index) =>
    language === "es" ? `Foto ${index + 1}` : `Photo ${index + 1}`;
  const photoCountLabel =
    uniquePhotos.length === 1
      ? language === "es"
        ? "foto"
        : "photo"
      : language === "es"
      ? "fotos"
      : "photos";

  if (uniquePhotos.length === 0) {
    return (
      <div style={galleryEmpty}>
        <div style={galleryEmptyIcon}>IMG</div>
        <strong>{t("noPhotosYet")}</strong>
        <span>{t("addPhotosHelp")}</span>
      </div>
    );
  }

  return (
    <div style={swipeGalleryWrap}>
      <div style={swipeGalleryHeader}>
        <strong>{t("projectPhotos")} ({uniquePhotos.length})</strong>
        <span>{t("tapAnyPhotoToView")}</span>
      </div>

      <div style={swipeGalleryRow}>
        {uniquePhotos.map((photo, index) => (
          <button
            key={photo + index}
            style={swipePhotoCard}
            onClick={() => onPreview(photo)}
            type="button"
          >
            <img src={photo} alt="" style={swipePhotoImage} />

            <div style={swipePhotoOverlay}>
              <span>{index === 0 ? mainPhotoLabel : getPhotoLabel(index)}</span>
            </div>
          </button>
        ))}

        {uniquePhotos.length > 4 && (
          <div style={swipeEndCard}>
            <strong>{uniquePhotos.length}</strong>
            <span>{photoCountLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatQuoteMoney(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && value.trim().startsWith("$")) return value.trim();

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `$${numeric.toLocaleString("en-US", {
      minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return String(value);
}

function getQuoteTotal(quote) {
  return (
    quote.amount ??
    quote.total ??
    quote.totalDue ??
    quote.totalPrice ??
    quote.customerTotal ??
    ""
  );
}

function getQuoteDeposit(quote) {
  return (
    quote.deposit ??
    quote.depositAmount ??
    quote.depositDue ??
    quote.requiredDeposit ??
    ""
  );
}

function getQuoteStatusLabel(quote, language) {
  const status = String(quote.status || quote.quoteStatus || "").toLowerCase();
  if (status === "accepted" || status === "approved") return t("quoteApproved", language);
  if (status === "revision_requested") return t("quoteRevisionRequested", language);
  if (status === "draft") return t("quoteDraft", language);
  if (status === "sent" || status === "pending" || status === "quoted") {
    return t("quotePendingDecision", language);
  }
  return t("quotePendingDecision", language);
}

function getQuotePhotos(quote) {
  const values = [
    quote.photos,
    quote.images,
    quote.imageUrls,
    quote.image_urls,
    quote.attachments,
    quote.media,
    quote.photoUrl,
    quote.image_url,
  ];

  return [
    ...new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.url || item?.src || item?.imageUrl || item?.image_url || item?.photoUrl || "";
        })
        .filter(Boolean)
    ),
  ];
}

function getQuotePdfUrl(quote) {
  return (
    quote.pdfUrl ||
    quote.proposalPdfUrl ||
    quote.documentUrl ||
    quote.downloadUrl ||
    quote.publicPdfUrl ||
    ""
  );
}

function getQuoteScopeText(quote) {
  return (
    quote.scopeOfWork ||
    quote.workToBePerformed ||
    quote.workSummary ||
    quote.projectSummary ||
    quote.description ||
    quote.summary ||
    ""
  );
}

function getQuoteMaterialsText(quote) {
  const materialFields =
    quote.materialsIncluded ||
    quote.materialsSummary ||
    quote.materialsDescription ||
    quote.materialLineItems ||
    quote.materialItems ||
    quote.lineItems ||
    quote.materials;

  if (Array.isArray(materialFields)) {
    return materialFields
      .map((item) => {
        if (typeof item === "string") return item;
        const description = item.description || item.name || item.title || item.label || "";
        const amount = item.amount ?? item.total ?? item.price ?? "";
        return [description, amount !== "" ? formatQuoteMoney(amount) : ""]
          .filter(Boolean)
          .join(" · ");
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof materialFields === "number") return formatQuoteMoney(materialFields);
  return materialFields || "";
}

function getQuoteNotesText(quote) {
  return quote.notes || quote.proposalNotes || quote.customerNotes || quote.additionalNotes || "";
}

function HomeownerWorkflowHub({
  request,
  language,
  linkedAppointment,
  onOpenConversation,
  onPrimaryAction,
  hideCommunicationAction = false,
}) {
  const workflow = getHomeownerWorkflowPresentation(request, language);
  const timeline = getHomeownerWorkflowTimeline(request, language);
  const hasQuote = Array.isArray(request.quotesReceived) && request.quotesReceived.length > 0;
  const hasPayment = Boolean(
    request.paymentStatus ||
      request.paymentRecord ||
      request.depositPaid ||
      request.acceptedQuote
  );
  const hasActiveWork = ["accepted", "scheduled", "active", "in_progress", "working", "started", "completed"].includes(
    String(request.status || "").toLowerCase()
  );
  const hasCompletion =
    String(request.status || "").toLowerCase() === "completed" ||
    Boolean(request.completionRecord);
  const visibleSections = [
    {
      key: "schedule",
      label: t("myRequestsScheduleVisit", language),
      visible: Boolean(linkedAppointment || request.scheduledAt || request.appointmentDate),
    },
    {
      key: "evaluation",
      label: t("myRequestsEvaluationSummary", language),
      visible: Boolean(request.evaluationSummary || request.evaluationNotes || request.evaluationCompletedAt),
    },
    {
      key: "quote",
      label: t("myRequestsQuoteProposal", language),
      visible: hasQuote,
    },
    {
      key: "payment",
      label: t("myRequestsPaymentDeposit", language),
      visible: hasPayment,
    },
    {
      key: "work",
      label: t("myRequestsActiveWork", language),
      visible: hasActiveWork,
    },
    {
      key: "completion",
      label: t("myRequestsCompletion", language),
      visible: hasCompletion,
    },
    {
      key: "history",
      label: t("myRequestsServiceHistory", language),
      visible: Boolean(request.closedAt || request.savedToHistory),
    },
  ].filter((section) => section.visible);
  const primaryIsConversation = workflow.primaryActionKey === "messageProfessional";
  const conversationActionStage = ["completion", "history"].includes(
    workflow.key
  )
    ? CONVERSATION_ACTION_STAGE.HISTORY
    : CONVERSATION_ACTION_STAGE.ACTIVE;
  const submittedOnly = workflow.key === "request";
  const hasAuthoritativeConversation = Boolean(
    !submittedOnly &&
      request.conversation_available === true &&
      getCanonicalConversationActionTarget(request).ok
  );
  const showPrimaryAction =
    !submittedOnly && (!primaryIsConversation || hasAuthoritativeConversation);

  return (
    <div style={workflowHubCard}>
      <div style={workflowHubHeader}>
        <div>
          <span style={workflowHubEyebrow}>
            {t("myRequestsWorkflow", language)}
          </span>
          <h3 style={workflowHubTitle}>{workflow.statusLabel}</h3>
        </div>
        <span style={workflowHubStatusBadge}>{workflow.progressHint}</span>
      </div>

      <div style={workflowHubNextStep}>
        <span>{t("myRequestsNextStep", language)}</span>
        <strong>{workflow.nextAction}</strong>
      </div>

      <div style={workflowTimelineRow}>
        {timeline.map((item) => (
          <span
            key={item.key}
            style={{
              ...workflowTimelinePill,
              ...(item.done ? workflowTimelinePillDone : {}),
              ...(item.current ? workflowTimelinePillCurrent : {}),
            }}
          >
            {item.label}
          </span>
        ))}
      </div>

      {visibleSections.length > 0 && (
        <div style={workflowSectionList}>
          {visibleSections.map((section) => (
            <span key={section.key} style={workflowSectionPill}>
              {section.label}
            </span>
          ))}
        </div>
      )}

      <div style={workflowHubActions}>
        {showPrimaryAction && <button
          type="button"
          style={workflowHubPrimaryButton}
          onClick={() =>
            primaryIsConversation
              ? onOpenConversation?.()
              : onPrimaryAction?.(workflow, request)
          }
        >
          {primaryIsConversation
            ? getConversationActionLabel(
                conversationActionStage,
                language
              )
            : workflow.primaryActionLabel}
        </button>}
        {!hideCommunicationAction && !submittedOnly && !primaryIsConversation && hasAuthoritativeConversation && (
          <button type="button" style={workflowHubSecondaryButton} onClick={onOpenConversation}>
            {getConversationActionLabel(
              conversationActionStage,
              language
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function EmergencyRequestCard({
  emergencyRequest,
  language,
  onOpen,
  onOpenConversation,
}) {
  const responsePresentation =
    getEmergencyResponsePresentation({
      status: emergencyRequest.status,
      language,
      availableResponseCount:
        emergencyRequest.availableResponseCount,
      hasSelectedProfessional:
        emergencyRequest.hasSelectedProfessional,
    });
  const lifecycleLabel =
    responsePresentation.statusLabel;
  const serviceLabel =
    getEmergencySpecialtyDisplayLabel(
      emergencyRequest.serviceSpecialty,
      language
    );
  const submittedAt =
    emergencyRequest.requestedAt ||
    emergencyRequest.createdAt;
  const submittedDate = formatLocaleDate(
    submittedAt,
    {
      dateStyle: "medium",
    },
    language
  );
  const hasActionableResponses =
    responsePresentation.hasActionableResponses;
  const selectedProfessionalName =
    emergencyRequest.hasSelectedProfessional === true
      ? emergencyRequest
          .selectedProfessionalBusinessName ||
        (language === "es"
          ? "Profesional Seleccionado"
          : "Selected Professional")
      : "";
  const canOpenConversation =
    emergencyRequest.conversationAvailable === true &&
    Number.isSafeInteger(
      emergencyRequest.conversationId
    ) &&
    emergencyRequest.conversationId > 0;
  const conversationActionStage =
    HISTORY_EMERGENCY_SUMMARY_STATUSES.includes(
      emergencyRequest.status
    )
      ? CONVERSATION_ACTION_STAGE.HISTORY
      : CONVERSATION_ACTION_STAGE.ACTIVE;
  return (
    <article
      className="meetro-visual-surface"
      style={emergencyRequestCard}
    >
      <div style={emergencyRequestHeader}>
        <span style={emergencyRequestBadge}>
          {language === "es" ? "Emergencia" : "Emergency"}
        </span>
        <span style={emergencyRequestService}>
          {serviceLabel}
        </span>
      </div>

      <h3 style={emergencyRequestTitle}>
        {emergencyRequest.title}
      </h3>
      <strong style={emergencyRequestLifecycle}>
        {lifecycleLabel}
      </strong>

      {selectedProfessionalName && (
        <strong style={emergencyRequestProfessional}>
          {selectedProfessionalName}
        </strong>
      )}

      {submittedDate && (
        <span style={emergencyRequestMeta}>
          {language === "es" ? "Enviada" : "Submitted"}{" "}
          {submittedDate}
        </span>
      )}

      <EmergencyTimeline
        emergencyRequest={emergencyRequest}
        language={language}
      />

      <div style={emergencyRequestActions}>
        {hasActionableResponses && (
          <button
            type="button"
            className="meetro-visual-primary-button"
            style={emergencyRequestAction}
            onClick={onOpen}
          >
            {responsePresentation.reviewActionLabel}
          </button>
        )}

        <button
          type="button"
          className={
            hasActionableResponses ||
            canOpenConversation
              ? ""
              : "meetro-visual-primary-button"
          }
          style={
            hasActionableResponses ||
            canOpenConversation
              ? emergencyRequestSecondaryAction
              : emergencyRequestAction
          }
          onClick={onOpen}
        >
          {language === "es"
            ? "Ver Solicitud de Emergencia"
            : "View Emergency Request"}
        </button>

        {canOpenConversation && (
          <button
            type="button"
            className="meetro-visual-primary-button"
            style={emergencyRequestAction}
            onClick={onOpenConversation}
          >
            {getConversationActionLabel(
              conversationActionStage,
              language
            )}
          </button>
        )}
      </div>
    </article>
  );
}

function MyRequests({ setPage, view = "list" }) {
  const language = getLanguage();
  const isDetailView = view === "detail";
  const requestPhotoUploadEnabled = isRequestPhotoUploadEnabled();
  const mediaUploadDeferred =
    isFriendsAndFamilyMediaDeferred() && !requestPhotoUploadEnabled;

  const [recoveryTick, setRecoveryTick] = useState(0);
  const [backendRequests, setBackendRequests] = useState([]);
  const [backendRequestStatus, setBackendRequestStatus] = useState(
    REQUEST_COLLECTION_STATUS.LOADING
  );
  const [requestReloadKey, setRequestReloadKey] = useState(0);
  const [requestMutationStatus, setRequestMutationStatus] = useState("idle");
  const [requestMutationError, setRequestMutationError] = useState("");
  const [customerQuoteDiscovery, setCustomerQuoteDiscovery] = useState(null);
  const customerQuoteDiscoveryEpochRef = useRef(0);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [
    emergencyRequestStatus,
    setEmergencyRequestStatus,
  ] = useState(REQUEST_COLLECTION_STATUS.LOADING);
  const [emergencyReloadKey, setEmergencyReloadKey] =
    useState(0);

  const handleCanonicalLifecycleLoaded = useCallback(
    ({ requestId, lifecycle }) => {
      const jobId = String(lifecycle?.job?.id || "").trim();
      if (!requestId || !jobId) {
        setCustomerQuoteDiscovery({
          status: "unavailable",
          requestId: requestId || null,
          jobId: null,
          quotes: null,
          errorCode: "CUSTOMER_JOB_ID_UNAVAILABLE",
        });
        return;
      }

      const epoch = ++customerQuoteDiscoveryEpochRef.current;
      setCustomerQuoteDiscovery({
        status: "loading",
        requestId,
        jobId,
        quotes: null,
        errorCode: "",
      });
      void fetchCustomerJobQuotes({ jobId, setPage })
        .then((quotes) => {
          if (epoch !== customerQuoteDiscoveryEpochRef.current) return;
          setCustomerQuoteDiscovery({
            status: "confirmed",
            requestId,
            jobId,
            quotes,
            errorCode: "",
          });
        })
        .catch((error) => {
          if (epoch !== customerQuoteDiscoveryEpochRef.current) return;
          setCustomerQuoteDiscovery({
            status: "unavailable",
            requestId,
            jobId,
            quotes: null,
            errorCode: String(error?.code || "CUSTOMER_JOB_QUOTES_FAILED"),
          });
        });
    },
    [setPage]
  );

  function readRequestArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getDurableHomeownerRequests() {
    if (!canReadLegacyWorkflowStorage()) return backendRequests;
    const primaryRequests = getStoredHomeownerRequests();
    if (primaryRequests.length > 0) return primaryRequests;

    const backupRequests = readRequestArray("meetroHomeownerRequestsBackup");
    if (backupRequests.length > 0) {
      localStorage.setItem("homeownerRequests", JSON.stringify(backupRequests));
      return backupRequests;
    }

    return [];
  }

  const requests = getDurableHomeownerRequests().filter((request) => {
    if (!isRequestVisibleToHomeowner(request)) {
      return false;
    }
    const hasId = request.requestId || request.id;
    const hasContent = request.title || request.description || request.service;
    return Boolean(hasId && hasContent);
  });

  useEffect(() => {
    async function recoverHomeownerRequests() {
      if (canReadLegacyWorkflowStorage()) return;

      setBackendRequestStatus(REQUEST_COLLECTION_STATUS.LOADING);

      try {
        const result = await authFetch("/posts", { cache: "no-store" }, setPage);
        const collection = resolveHomeownerRequestCollection(result);
        setBackendRequestStatus(collection.status);
        const recoveredRequests = collection.records;

        setBackendRequests(recoveredRequests);
      } catch (error) {
        console.error("Failed to recover homeowner requests", error);
        setBackendRequests([]);
        setBackendRequestStatus(REQUEST_COLLECTION_STATUS.UNAVAILABLE);
      }
    }

    recoverHomeownerRequests();
  }, [requestReloadKey, setPage]);

  useEffect(() => {
    const refreshCoordinator =
      createEmergencyRefreshCoordinator({
        load: async () => {
          const result = await getEmergencyRequests(
            {
              view: "active",
              limit: 25,
            },
            {
              setPage,
            }
          );
          if (!result.ok) {
            throw new Error(
              result.message ||
                "Emergency requests could not be loaded."
            );
          }

          return result.emergencyRequests;
        },
        onSuccess: (records) => {
          setEmergencyRequests(records);
          setEmergencyRequestStatus(
            records.length > 0
              ? REQUEST_COLLECTION_STATUS.READY
              : REQUEST_COLLECTION_STATUS.EMPTY
          );
        },
        onError: (_error, { hasConfirmedData }) => {
          if (!hasConfirmedData) {
            setEmergencyRequestStatus(
              REQUEST_COLLECTION_STATUS.UNAVAILABLE
            );
          }
        },
      });

    void refreshCoordinator.start();

    const handleVisibilityChange = () => {
      void refreshCoordinator.handleVisibilityChange();
    };
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      refreshCoordinator.stop();
    };
  }, [emergencyReloadKey, setPage]);

  void recoveryTick;

  const [selectedRequestId, setSelectedRequestId] = useState(() =>
    normalizeHomeownerRequestCardId(
      localStorage.getItem("selectedHomeownerRequestId")
    )
  );
  const [previewImage, setPreviewImage] = useState(null);
  const [revisionQuoteId, setRevisionQuoteId] = useState(null);
  const [revisionText, setRevisionText] = useState("");
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [cancellationCheckAt, setCancellationCheckAt] = useState(null);

  const pendingCancelRequest = pendingCancelId
    ? requests.find(
        (request) => String(request.requestId || request.id) === String(pendingCancelId)
      )
    : null;

  const acceptedAtTime = pendingCancelRequest?.acceptedAt
    ? new Date(pendingCancelRequest.acceptedAt).getTime()
    : pendingCancelRequest?.acceptedQuote?.acceptedAt
    ? new Date(pendingCancelRequest.acceptedQuote.acceptedAt).getTime()
    : null;

  const minutesSinceAccepted = acceptedAtTime && cancellationCheckAt
    ? Math.floor((cancellationCheckAt - acceptedAtTime) / 60000)
    : null;

  const isAcceptedCancellation =
    pendingCancelRequest?.status === "accepted" ||
    pendingCancelRequest?.acceptedQuote;

  const freeCancelWindowMinutes = 15;

  const cancellationFeeApplies =
    isAcceptedCancellation &&
    minutesSinceAccepted !== null &&
    minutesSinceAccepted > freeCancelWindowMinutes;

  // Preserve canonical collection order on the compact Work Center.
  const sortedRequests = [...requests];
  const selectedRequest = isDetailView
    ? resolveHomeownerRequestById(requests, selectedRequestId)
    : null;
  const visibleRequests = isDetailView
    ? selectedRequest
      ? [selectedRequest]
      : []
    : sortedRequests;

  function saveHomeownerRequests(updatedRequests, options = {}) {
    if (!canReadLegacyWorkflowStorage()) return false;
    try {
      localStorage.setItem("homeownerRequests", JSON.stringify(updatedRequests));
      localStorage.setItem(
        "meetroHomeownerRequestsBackup",
        JSON.stringify(updatedRequests)
      );

      const selectedRequestId =
        options.selectedRequestId || localStorage.getItem("selectedHomeownerRequestId");
      const selectedRequest = updatedRequests.find(
        (request) => String(request.requestId || request.id) === String(selectedRequestId)
      );

      if (selectedRequest) {
        localStorage.setItem("selectedHomeownerRequest", JSON.stringify(selectedRequest));
        localStorage.setItem(
          "selectedHomeownerRequestId",
          String(selectedRequest.requestId || selectedRequest.id)
        );
      }

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("meetro-messages-updated"));
      window.dispatchEvent(new Event("meetro-workcenter-updated"));
      setRecoveryTick((value) => value + 1);
      return true;
    } catch (error) {
      console.error("Failed to save homeowner requests", error);
      alert(
        language === "es"
          ? "No se pudieron guardar los cambios. Intenta quitar una foto o vuelve a intentarlo."
          : "We could not save these changes. Try removing a photo or try again."
      );
      return false;
    }
  }

  function updateQuoteHistories(quoteId, updater) {
    ["workCenterQuoteHistory", "meetroQuoteHistory", "quoteHistory"].forEach((key) => {
      try {
        const savedQuotes = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(savedQuotes)) return;

        const updatedQuotes = savedQuotes.map((savedQuote) =>
          String(savedQuote.quoteId) === String(quoteId)
            ? updater(savedQuote)
            : savedQuote
        );

        localStorage.setItem(key, JSON.stringify(updatedQuotes));
      } catch {
        return;
      }
    });
  }

  function openRequestConversation(request, quote = {}) {
    const requestId = request.requestId || request.id || quote.requestId || "";
    const target = getCanonicalConversationActionTarget(
      {
        conversationId:
          quote.conversationId ||
          quote.conversation_id ||
          request.conversationId ||
          request.conversation_id,
      },
      {
        returnPage: "myRequests",
        preferCommunicationCenterShell: true,
      }
    );

    if (!target.ok) {
      addNotification({
        type: "conversation_unavailable",
        title:
          language === "es"
            ? "Conversación no disponible"
            : "Conversation unavailable",
        message:
          language === "es"
            ? "Meetro no confirmó una conversación para esta solicitud todavía."
            : "Meetro has not confirmed a conversation for this request yet.",
        priority: "normal",
      });
      return;
    }

    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(request));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(request));
    localStorage.setItem("selectedQuoteRequestId", String(requestId));
    localStorage.setItem("activeConversationId", String(target.conversationId));
    localStorage.setItem("meetroConversationType", "canonical_conversation");
    localStorage.setItem(
      "activeConversationName",
      quote.businessName || request.selectedProfessional || request.businessName || "Professional"
    );
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: target.conversationId,
        conversationId: target.conversationId,
        conversation_id: target.conversationId,
        type: "work",
        category: "work",
        businessName:
          quote.businessName || request.selectedProfessional || request.businessName || "Professional",
        projectTitle: request.title || quote.projectTitle || "Service Request",
        requestId,
      })
    );
    localStorage.setItem("conversationReturnPage", "myRequests");
    localStorage.setItem("returnPage", "myRequests");
    setPage(target.route);
  }

  function openHomeownerWorkflow(request, workflow = {}) {
    if (!request) return;

    const requestId = request.requestId || request.id || workflow.quote?.requestId || "";
    const projectId =
      request.projectId ||
      request.jobId ||
      request.activeProjectId ||
      requestId;
    const conversationId =
      request.conversationId ||
      request.conversation_id ||
      workflow.quote?.conversationId ||
      workflow.quote?.conversation_id ||
      "";
    const projectRecord = {
      ...request,
      requestId,
      projectId,
      conversationId,
      activeConversationId: conversationId,
      selectedProfessional:
        request.selectedProfessional ||
        workflow.professionalName ||
        request.businessName ||
        request.professionalName ||
        "",
      workflowFocus: workflow.key || request.workflowStage || request.status || "",
    };

    localStorage.setItem("selectedHomeownerRequestId", String(requestId || projectId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(projectRecord));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(projectRecord));
    localStorage.setItem("selectedQuoteRequestId", String(requestId || projectId));
    localStorage.setItem("projectDetailsReturnPage", "myRequests");
    localStorage.setItem("homeownerProjectFocusStage", workflow.key || "");

    saveSelectedActiveProject({
      id: projectId,
      requestId,
      projectId,
      conversationId,
      stage: workflow.key || request.workflowStage || request.status || "",
      professionalName: projectRecord.selectedProfessional,
      project: projectRecord,
    });

    if (
      workflow.key === "completion" ||
      workflow.key === "history" ||
      ["completed", "closed", "closure_completed", "work_completed"].includes(
        String(request.status || "").toLowerCase()
      )
    ) {
      localStorage.setItem("lastCompletedProject", JSON.stringify(projectRecord));
      localStorage.setItem("completedJobViewMode", "homeowner");
      setPage("completedJobDetails");
      return;
    }

    openRequestConversation(projectRecord, workflow.quote || {});
  }

  function requestCancelProject(requestId) {
    setCancellationCheckAt(Date.now());
    setPendingCancelId(requestId);
  }

  async function confirmCancelProject() {
    if (!pendingCancelId) return;
    if (canReadLegacyWorkflowStorage()) return;
    setRequestMutationStatus("pending");
    setRequestMutationError("");
    try {
      const result = await authFetch(
        `/posts/${encodeURIComponent(pendingCancelId)}/cancel`,
        { method: "POST", body: JSON.stringify({}) },
        setPage
      );
      if (!result?.response?.ok || !result.data?.post) {
        setRequestMutationStatus("failed");
        setRequestMutationError(result?.data?.message || "The request could not be cancelled.");
        return;
      }
      setBackendRequests((records) => replaceCanonicalRequest(records, result.data.post));
      setRequestMutationStatus("confirmed");
      setPendingCancelId(null);
      setCancellationCheckAt(null);
    } catch {
      setRequestMutationStatus("failed");
      setRequestMutationError("The request could not be cancelled. Try again.");
    }
  }

  function restoreProject(requestId) {
    const updatedRequests = requests.map((request) => {
      const currentId = request.requestId || request.id;

      if (String(currentId) !== String(requestId)) return request;

      return {
        ...request,
        status: "pending",
        cancelledAt: null,
        restoredAt: new Date().toISOString(),
        projectTimeline: [
          {
            type: "restored",
            label: "Request restored",
            createdAt: new Date().toISOString(),
          },
          ...(Array.isArray(request.projectTimeline)
            ? request.projectTimeline
            : []),
        ],
      };
    });

    saveHomeownerRequests(updatedRequests, { selectedRequestId: requestId });
  }

  function goBackFromRequests() {
    const returnPage = localStorage.getItem("myRequestsReturnPage");

    if (returnPage === "projectDetails") {
      localStorage.removeItem("myRequestsReturnPage");
      if (localStorage.getItem("activeConversationId")) {
        localStorage.setItem("conversationReturnPage", "myRequests");
        setPage("conversationThread");
        return;
      }
      setPage("home");
      return;
    }

    setPage("home");
  }

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
      <button
        style={backButton}
        onClick={
          isDetailView ? () => setPage("myRequests") : goBackFromRequests
        }
      >
        {isDetailView
          ? language === "es"
            ? "Volver al Centro de Trabajo"
            : "Back to Work Center"
          : t("myRequestsBack", language)}
      </button>

      <div style={header}>
        <h1 style={title}>
          {isDetailView
            ? language === "es"
              ? "Detalles de la Solicitud"
              : "Request Details"
            : t("myRequestsTitle", language)}
        </h1>

        <p style={subtitle}>
          {isDetailView
            ? language === "es"
              ? "Consulta el historial, los participantes, las fotos y las respuestas profesionales."
              : "Review the request history, participants, photos, and professional responses."
            : t("myRequestsSubtitle", language)}
        </p>
      </div>

      {!isDetailView && (
        <section
          className="meetro-visual-hero"
          style={workCenterPerspectiveCard}
          aria-label={t("myRequestsPerspectiveTitle", language)}
        >
          <span style={workCenterPerspectiveEyebrow}>
            {t("myRequestsPerspectiveEyebrow", language)}
          </span>
          <strong style={workCenterPerspectiveTitle}>
            {t("myRequestsPerspectiveTitle", language)}
          </strong>
          <p style={workCenterPerspectiveText}>
            {t("myRequestsPerspectiveText", language)}
          </p>
        </section>
      )}

      {!isDetailView && emergencyRequestStatus ===
        REQUEST_COLLECTION_STATUS.LOADING && (
        <section
          style={emergencyRequestSection}
          aria-labelledby="emergency-requests-heading"
        >
          <h2
            id="emergency-requests-heading"
            style={emergencyRequestSectionTitle}
          >
            {language === "es"
              ? "Solicitudes de Emergencia"
              : "Emergency Requests"}
          </h2>
          <div
            className="meetro-visual-surface"
            style={emergencyRequestState}
            role="status"
          >
            {language === "es"
              ? "Cargando solicitudes de Emergencia…"
              : "Loading Emergency requests…"}
          </div>
        </section>
      )}

      {!isDetailView && emergencyRequestStatus ===
        REQUEST_COLLECTION_STATUS.UNAVAILABLE && (
        <section
          style={emergencyRequestSection}
          aria-labelledby="emergency-requests-heading"
        >
          <h2
            id="emergency-requests-heading"
            style={emergencyRequestSectionTitle}
          >
            {language === "es"
              ? "Solicitudes de Emergencia"
              : "Emergency Requests"}
          </h2>
          <div
            className="meetro-visual-surface"
            style={emergencyRequestState}
            role="alert"
          >
            <strong>
              {language === "es"
                ? "Las solicitudes de Emergencia no están disponibles."
                : "Emergency requests are unavailable."}
            </strong>
            <button
              type="button"
              style={emergencyRetryButton}
              onClick={() =>
                setEmergencyReloadKey((value) => value + 1)
              }
            >
              {language === "es" ? "Intentar de Nuevo" : "Try Again"}
            </button>
          </div>
        </section>
      )}

      {!isDetailView && emergencyRequestStatus ===
        REQUEST_COLLECTION_STATUS.READY &&
        emergencyRequests.length > 0 && (
          <section
            style={emergencyRequestSection}
            aria-labelledby="emergency-requests-heading"
          >
            <h2
              id="emergency-requests-heading"
              style={emergencyRequestSectionTitle}
            >
              {language === "es"
                ? "Solicitudes de Emergencia"
                : "Emergency Requests"}
            </h2>
            <div style={emergencyRequestGrid}>
              {emergencyRequests.map((emergencyRequest) => (
                <EmergencyRequestCard
                  key={emergencyRequest.emergencyRequestId}
                  emergencyRequest={emergencyRequest}
                  language={language}
                  onOpen={() =>
                    setPage(
                      buildEmergencyRequestRoute(
                        emergencyRequest.emergencyRequestId
                      )
                    )
                  }
                  onOpenConversation={() =>
                    setPage(
                      buildCanonicalConversationRoute(
                        emergencyRequest.conversationId,
                        "myRequests",
                        { shell: "communicationCenter" }
                      )
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}

      {requestMutationStatus === "pending" && (
        <div className="meetro-visual-surface" style={emptyCard} role="status">
          Saving request…
        </div>
      )}
      {requestMutationStatus === "failed" && (
        <div className="meetro-visual-surface" style={emptyCard} role="alert">
          <strong>Request not changed</strong>
          <p>{requestMutationError}</p>
        </div>
      )}
      {requestMutationStatus === "confirmed" && (
        <div className="meetro-visual-surface" style={emptyCard} role="status">
          Request saved.
        </div>
      )}

      {!canReadLegacyWorkflowStorage() && backendRequestStatus === REQUEST_COLLECTION_STATUS.LOADING ? (
        <div className="meetro-visual-empty-state" style={emptyCard} role="status">
          <h2>Loading requests…</h2>
        </div>
      ) : !canReadLegacyWorkflowStorage() && backendRequestStatus === REQUEST_COLLECTION_STATUS.UNAVAILABLE ? (
        <div className="meetro-visual-empty-state" style={emptyCard} role="alert">
          <div style={emptyIcon}>REQ</div>
          <h2>Requests unavailable</h2>
          <p>Meetro could not load your requests. Try again.</p>
          <button
            className="meetro-visual-primary-button"
            style={primaryButton}
            onClick={() => setRequestReloadKey((value) => value + 1)}
          >
            Try Again
          </button>
        </div>
      ) : isDetailView && !selectedRequest ? (
        <div
          className="meetro-visual-empty-state"
          style={emptyCard}
          role="alert"
          data-homeowner-request-detail-unavailable="true"
        >
          <div style={emptyIcon}>REQ</div>
          <h2>
            {language === "es"
              ? "Solicitud no disponible"
              : "Request unavailable"}
          </h2>
          <p>
            {language === "es"
              ? "No pudimos encontrar esta solicitud. Vuelve al Centro de Trabajo y selecciónala otra vez."
              : "Meetro could not find this request. Return to Work Center and choose it again."}
          </p>
          <button
            className="meetro-visual-primary-button"
            style={primaryButton}
            onClick={() => setPage("myRequests")}
          >
            {language === "es"
              ? "Volver al Centro de Trabajo"
              : "Back to Work Center"}
          </button>
        </div>
      ) : !isDetailView && sortedRequests.length === 0 ? (
        <div className="meetro-visual-empty-state" style={emptyCard}>
          <div style={emptyIcon}>REQ</div>

          <h2>{t("myRequestsEmptyTitle", language)}</h2>

          <p>
            {t("myRequestsEmptyText", language)}
          </p>

          <button className="meetro-visual-primary-button" style={primaryButton} onClick={() => setPage("upload")}>
            {t("myRequestsRequestHelp", language)}
          </button>
        </div>
      ) : (
        <div
          className={
            isDetailView
              ? "meetro-request-detail"
              : "meetro-responsive-grid meetro-grid-2"
          }
          style={isDetailView ? requestDetailLayout : list}
          data-homeowner-request-detail-view={isDetailView ? "true" : undefined}
        >
          {visibleRequests.map((request) => {
            const requestId = getHomeownerRequestCardId(request);
            const showsDedicatedDetail =
              isDetailView && requestId === selectedRequestId;
            const requestTitle =
              request.title ||
              request.category ||
              t("myRequestsServiceRequest", language);
            const requestDetailContentId = `homeowner-request-details-${encodeURIComponent(
              requestId
            )}`;
            const truthfulRequest = getTruthfulWorkflowRequest(request);
            const unsupportedWorkflow = truthfulRequest !== request;
            const unavailableCopy = getApprovalSchedulingUnavailableCopy(language);
            const lifecycle = getHomeownerLifecycleStage(truthfulRequest, language);
            const linkedAppointment = null;
            const hasQuoteReview =
              Array.isArray(truthfulRequest.quotesReceived) &&
              truthfulRequest.quotesReceived.length > 0;
            const conversationAvailable =
              getCanonicalConversationActionTarget(request).ok;

            const authoritativeCounts = getAuthoritativeHomeownerRequestCounts(request);

            return (
              <div
                className="meetro-visual-surface"
                style={{
                  ...requestCard,
                  ...(isDetailView ? dedicatedRequestDetail : {}),
                }}
                key={requestId}
                data-homeowner-request-id={requestId}
                data-homeowner-request-detail-id={
                  isDetailView ? requestId : undefined
                }
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={cardPillRow}>
                        <span style={statusPill}>{lifecycle.stageLabel}</span>

                        {isDetailView && (
                          <span style={selectedPill}>
                            {language === "es"
                              ? "Solicitud seleccionada"
                              : "Selected request"}
                          </span>
                        )}
                      </div>

                      <h3
                        style={{
                          margin: "10px 0 6px",
                          fontSize: 20,
                          lineHeight: 1.15,
                          color: "#111827",
                        }}
                      >
                        {requestTitle}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "#64748b",
                          fontSize: 14,
                          lineHeight: 1.45,
                        }}
                      >
                        {request.category ||
                          t("myRequestsService", language)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 18,
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.12)",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--meetro-color-charcoal, #172317)",
                      }}
                    >
                      {t("myRequestsNext", language)}
                    </span>

                    <strong
                      style={{
                        display: "block",
                        color: "#111827",
                        fontSize: 15,
                        lineHeight: 1.35,
                      }}
                    >
                      {lifecycle.nextStep}
                    </strong>
                  </div>

                  {authoritativeCounts && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {authoritativeCounts.views !== null && <span>{authoritativeCounts.views} {t("myRequestsViews", language)}</span>}
                    {authoritativeCounts.messages !== null && <span>{authoritativeCounts.messages} {t("myRequestsMessages", language)}</span>}
                    {authoritativeCounts.quotes !== null && <span>{authoritativeCounts.quotes} {t("myRequestsQuotes", language)}</span>}
                  </div>
                  )}

                  {!isDetailView && (
                    <button
                      type="button"
                      style={{
                        marginTop: 2,
                        width: "100%",
                        border: "1px solid rgba(99, 102, 241, 0.18)",
                        background: "#ffffff",
                        color: "var(--meetro-color-charcoal, #172317)",
                        borderRadius: 16,
                        padding: "12px 14px",
                        fontWeight: 900,
                        fontSize: 14,
                      }}
                      aria-label={
                        language === "es"
                          ? `Ver detalles de ${requestTitle}`
                          : `Review details for ${requestTitle}`
                      }
                      onClick={() => {
                        setSelectedRequestId(requestId);
                        localStorage.setItem(
                          "selectedHomeownerRequestId",
                          requestId
                        );
                        setPage("homeownerRequestDetails");
                      }}
                    >
                      {language === "es"
                        ? "Ver detalles"
                        : "Review Details"}
                    </button>
                  )}
                </div>

                {showsDedicatedDetail && (
                  <div
                    id={requestDetailContentId}
                    data-homeowner-request-details-id={requestId}
                    data-customer-job-quotes-status={
                      String(customerQuoteDiscovery?.requestId) ===
                      String(requestId)
                        ? customerQuoteDiscovery.status
                        : "idle"
                    }
                    data-customer-job-id={
                      String(customerQuoteDiscovery?.requestId) ===
                      String(requestId)
                        ? customerQuoteDiscovery.jobId || ""
                        : ""
                    }
                    data-customer-quotes-count={
                      String(customerQuoteDiscovery?.requestId) ===
                        String(requestId) &&
                      customerQuoteDiscovery?.status === "confirmed"
                        ? customerQuoteDiscovery.quotes.quotes.length
                        : ""
                    }
                    data-customer-quotes-summary={
                      String(customerQuoteDiscovery?.requestId) ===
                        String(requestId) &&
                      customerQuoteDiscovery?.status === "confirmed"
                        ? JSON.stringify(
                            customerQuoteDiscovery.quotes.quotes.map(
                              ({
                                quoteId,
                                businessStatus,
                                lineageLabel,
                                customerDecision,
                                actions,
                              }) => ({
                                quoteId,
                                businessStatus,
                                lineageLabel,
                                customerDecision,
                                actions,
                              })
                            )
                          )
                        : ""
                    }
                    data-customer-quotes-error={
                      String(customerQuoteDiscovery?.requestId) ===
                      String(requestId)
                        ? customerQuoteDiscovery.errorCode || ""
                        : ""
                    }
                    style={requestDetailContent}
                  >
                    <HomeownerWorkflowHub
                      request={truthfulRequest}
                      language={language}
                      linkedAppointment={linkedAppointment}
                      onOpenConversation={() => openRequestConversation(request)}
                      onPrimaryAction={(workflow) =>
                        workflow.key === "cancelled"
                          ? setPage("upload")
                          : openHomeownerWorkflow(truthfulRequest, workflow)
                      }
                      hideCommunicationAction={hasQuoteReview}
                    />

                    <div
                      style={{
                        marginTop: 14,
                        padding: 14,
                        borderRadius: 20,
                        background: "#f8fafc",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                      }}
                    >
                      <h3
                        style={{
                          margin: "0 0 8px",
                          fontSize: 16,
                          color: "#111827",
                        }}
                      >
                        {t("myRequestsDetails", language)}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 12px",
                          color: "#64748b",
                          fontSize: 14,
                          lineHeight: 1.45,
                        }}
                      >
                        {request.description || t("myRequestsNoDetails", language)}
                      </p>

                      <PhotoStrip
                        request={request}
                        onPreview={setPreviewImage}
                        language={language}
                      />
                    </div>

                    <HomeownerRequestModificationPanel
                      request={request}
                      language={language}
                      setPage={setPage}
                      mediaUploadDeferred={mediaUploadDeferred}
                      conversationAvailable={conversationAvailable}
                      onOpenConversation={() => openRequestConversation(request)}
                      onPreview={setPreviewImage}
                      onRequestChanged={(post) =>
                        setBackendRequests((records) =>
                          replaceCanonicalRequest(records, post)
                        )
                      }
                      onCanonicalRefresh={() =>
                        setRequestReloadKey((value) => value + 1)
                      }
                      onCanonicalLifecycleLoaded={
                        handleCanonicalLifecycleLoaded
                      }
                    />

                    <HomeownerProfessionalResponseReview
                      requestId={requestId}
                      language={language}
                      setPage={setPage}
                    />

                    {unsupportedWorkflow && (
                      <div style={workflowUnavailableCard}>
                        <strong style={workflowUnavailableTitle}>
                          {unavailableCopy.title}
                        </strong>
                        <p style={workflowUnavailableText}>
                          {unavailableCopy.body}
                        </p>
                      </div>
                    )}

                {Array.isArray(truthfulRequest.quotesReceived) &&
                  truthfulRequest.quotesReceived.length > 0 && (
                    <div style={quoteSection}>
                      <div style={quoteHeader}>
                        <div>
                          <h3 style={quoteTitle}>
                            {t("quoteReview", language)}
                          </h3>
                          <p style={quoteDate}>
                            {t("quoteReviewSubtitle", language)}
                          </p>
                        </div>

                        <span style={quoteCountBadge}>
                          {truthfulRequest.quotesReceived.length}
                        </span>
                      </div>

                      <div style={quoteList}>
                        {truthfulRequest.quotesReceived.map((quote) => (
                          <div
                            key={quote.quoteId}
                            style={quoteCard}
                          >
                            <div style={quoteTop}>
                              <div>
                                <strong style={quoteBusiness}>
                                  {quote.businessName || "Business"}
                                </strong>

                                <p style={quoteDate}>
                                  {quote.createdAt
                                    ? new Date(quote.createdAt).toLocaleDateString()
                                    : ""}
                                </p>
                              </div>

                              <div style={quotePrice}>
                                {formatQuoteMoney(getQuoteTotal(quote))}
                              </div>
                            </div>

                            <div style={quoteReviewSummary}>
                              <div style={quoteSummaryItem}>
                                <span>{t("totalPrice", language)}</span>
                                <strong>{formatQuoteMoney(getQuoteTotal(quote))}</strong>
                              </div>

                              <div style={quoteSummaryItem}>
                                <span>{t("deposit", language)}</span>
                                <strong>
                                  {getQuoteDeposit(quote)
                                    ? formatQuoteMoney(getQuoteDeposit(quote))
                                    : t("noDepositRequired", language)}
                                </strong>
                              </div>

                              <div style={quoteSummaryItem}>
                                <span>{t("estimatedTimeline", language)}</span>
                                <strong>{quote.timeline || quote.estimatedTimeline || t("timelinePending", language)}</strong>
                              </div>

                              <div style={quoteSummaryItem}>
                                <span>{t("quoteStatus", language)}</span>
                                <strong>{getQuoteStatusLabel(quote, language)}</strong>
                              </div>
                            </div>

                            <div style={quoteScopeCard}>
                              <span style={quoteScopeEyebrow}>
                                {t("scopeOfWork", language)}
                              </span>

                              <div style={quoteScopeBlock}>
                                <strong>{t("workToBePerformed", language)}</strong>
                                <p>
                                  {getQuoteScopeText(quote) ||
                                    quote.notes ||
                                    t("scopeNotListed", language)}
                                </p>
                              </div>

                              <div style={quoteScopeBlock}>
                                <strong>{t("materialsIncluded", language)}</strong>
                                <p>
                                  {getQuoteMaterialsText(quote) ||
                                    t("materialsNotListed", language)}
                                </p>
                              </div>

                              <div style={quoteScopeBlock}>
                                <strong>{t("quoteNotes", language)}</strong>
                                <p>
                                  {getQuoteNotesText(quote) ||
                                    t("notesNotAdded", language)}
                                </p>
                              </div>
                            </div>

                            {getQuotePhotos(quote).length > 0 && (
                              <div style={quotePhotoSection}>
                                <div style={swipeGalleryHeader}>
                                  <strong>
                                    {t("quotePhotos", language)} ({getQuotePhotos(quote).length})
                                  </strong>
                                  <span>{t("tapAnyPhotoToView", language)}</span>
                                </div>

                                <div style={quotePhotoRow}>
                                  {getQuotePhotos(quote).map((photo, index) => (
                                    <button
                                      type="button"
                                      key={`${photo}-${index}`}
                                      style={quotePhotoButton}
                                      onClick={() => setPreviewImage(photo)}
                                    >
                                      <img
                                        src={photo}
                                        alt=""
                                        style={swipePhotoImage}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!["completed", "cancelled"].includes(request.status) && (
                            <div style={quoteDecisionPanel}>
                              <button
                                type="button"
                                style={quoteMessageButton}
                                onClick={() => openRequestConversation(request, quote)}
                              >
                                {getConversationActionLabel(
                                  CONVERSATION_ACTION_STAGE.ACTIVE,
                                  language
                                )}
                              </button>

                              <div style={quoteUnavailableNotice}>
                                <strong>{unavailableCopy.title}</strong>
                                <span>{unavailableCopy.body}</span>
                              </div>

                              <div style={quoteSecondaryActions}>
                                <button
                                  type="button"
                                  style={quoteSecondaryButton}
                                  onClick={() => {
                                    setRevisionQuoteId(
                                      revisionQuoteId === quote.quoteId
                                        ? null
                                        : quote.quoteId
                                    );

                                    setRevisionText(quote.revisionNote || "");
                                  }}
                                >
                                  {quote.status === "revision_requested"
                                    ? t("changesRequested", language)
                                    : t("requestChanges", language)}
                                </button>

                                {getQuotePdfUrl(quote) && (
                                  <button
                                    type="button"
                                    style={quoteSecondaryButton}
                                    onClick={() =>
                                      window.open(
                                        getQuotePdfUrl(quote),
                                        "_blank",
                                        "noopener,noreferrer"
                                      )
                                    }
                                  >
                                    {t("downloadPdf", language)}
                                  </button>
                                )}
                              </div>
                            </div>
                            )}

                            {revisionQuoteId === quote.quoteId && (
                              <div style={revisionBox}>
                                <textarea
                                  style={revisionTextarea}
                                  placeholder={
                                    language === "es"
                                      ? "Explica qué cambios quieres..."
                                      : "Explain what changes you want..."
                                  }
                                  value={revisionText}
                                  onChange={(e) =>
                                    setRevisionText(e.target.value)
                                  }
                                />

                                <div style={revisionButtonRow}>
                                  <button
                                    style={sendRevisionButton}
                                    onClick={() => {
                                      if (!revisionText.trim()) return;
                                      const revisionRequestedAt = new Date().toISOString();

                                      const updatedRequests = requests.map((item) => {
                                        const itemId = item.requestId || item.id;

                                        if (String(itemId) !== String(requestId)) return item;

                                        const updatedQuotes = Array.isArray(item.quotesReceived)
                                          ? item.quotesReceived.map((savedQuote) =>
                                              savedQuote.quoteId === quote.quoteId
                                                ? {
                                                    ...savedQuote,
                                                    status: "revision_requested",
                                                    quoteStatus: "revision_requested",
                                                    revisionNote: revisionText.trim(),
                                                    revisionRequestedAt,
                                                    requestId:
                                                      savedQuote.requestId || requestId,
                                                    conversationId:
                                                      savedQuote.conversationId ||
                                                      item.conversationId ||
                                                      requestId,
                                                  }
                                                : savedQuote
                                            )
                                          : [];

                                        return {
                                          ...item,
                                          status: "quoted",
                                          quotesReceived: updatedQuotes,
                                          lastQuoteRevisionNote: revisionText.trim(),
                                          lastQuoteRevisionAt: revisionRequestedAt,
                                        };
                                      });

                                      if (
                                        !saveHomeownerRequests(updatedRequests, {
                                          selectedRequestId: requestId,
                                        })
                                      ) {
                                        return;
                                      }

                                      updateQuoteHistories(quote.quoteId, (savedQuote) => ({
                                        ...savedQuote,
                                        status: "revision_requested",
                                        quoteStatus: "revision_requested",
                                        revisionNote: revisionText.trim(),
                                        revisionRequestedAt,
                                        requestId: savedQuote.requestId || requestId,
                                        conversationId:
                                          savedQuote.conversationId ||
                                          quote.conversationId ||
                                          requestId,
                                      }));

                                      addNotification({
                                        type: "quote_revision_requested",
                                        title:
                                          language === "es"
                                            ? "Cambios solicitados"
                                            : "Quote revision requested",
                                        message: revisionText.trim(),
                                        priority: "high",
                                        targetRole: "professional",
                                        requestId,
                                        quoteId: quote.quoteId || "",
                                      });

                                      setRevisionQuoteId(null);
                                      setRevisionText("");
                                    }}
                                  >
                                    {language === "es"
                                      ? "Enviar Solicitud"
                                      : "Send Request"}
                                  </button>

                                  <button
                                    style={cancelRevisionButton}
                                    onClick={() => {
                                      setRevisionQuoteId(null);
                                      setRevisionText("");
                                    }}
                                  >
                                    {language === "es" ? "Cancelar" : "Cancel"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {request.status === "completed" && (
                  <div style={completedStateBox}>
                    <div>
                      <strong>
                         {language === "es"
                          ? "Trabajo completado"
                          : "Work completed"}
                      </strong>

                      <p>
                        {request.reviewSubmitted
                          ? language === "es"
                            ? "Reseña enviada. Este servicio está guardado en tu historial."
                            : t("reviewSubmittedHistoryText")
                          : language === "es"
                          ? "Trabajo completado. El Cierre aún puede estar pendiente. Puedes revisar el registro o dejar una reseña."
                          : "Work completed. Closure may still be pending. You can view the record or leave a review."}
                      </p>
                    </div>

                    <button
                      style={completedPrimaryButton}
                      onClick={() => {
                        localStorage.setItem(
                          "lastCompletedProject",
                          JSON.stringify(request)
                        );

                        localStorage.setItem(
                          "completedJobViewMode",
                          "homeowner"
                        );

                        setPage("completedJobDetails");
                      }}
                    >
                      {language === "es"
                        ? "Ver Registro"
                        : t("viewCompletedRecord")}
                    </button>

                    {!request.reviewSubmitted && (
                      <button
                        style={completedReviewButton}
                        onClick={() => {
                          localStorage.setItem(
                            "lastCompletedProject",
                            JSON.stringify(request)
                          );

                          localStorage.setItem(
                            "selectedProfessionalName",
                            request.selectedProfessional || "Professional"
                          );

                          localStorage.setItem(
                            "completedJobViewMode",
                            "homeowner"
                          );

                          setPage("myRequests");
                        }}
                      >
                         {language === "es"
                          ? "Dejar Reseña"
                          : t("leaveReview")}
                      </button>
                    )}
                  </div>
                )}

                  <div style={actionRow}>
                    {request.status === "completed" ? (
                      <>
                        {request.needsReview && (
                          <button
                            style={reviewButton}
                            onClick={() => {
                              localStorage.setItem(
                                "emergencyNeedsReview",
                                "true"
                              );

                              localStorage.setItem(
                                "selectedProfessionalId",
                                request.acceptedQuote?.businessId || ""
                              );

                              localStorage.setItem(
                                "selectedProfessionalName",
                                request.selectedProfessional || "Professional"
                              );

                              setPage("myRequests");
                            }}
                          >
                             {language === "es"
                              ? "Revisar Finalización"
                              : "Review Completion"}
                          </button>
                        )}
                      </>
                    ) : (
                      request.status === "cancelled" && canReadLegacyWorkflowStorage() ? (
                        <button
                          style={primaryButton}
                          onClick={() => restoreProject(requestId)}
                        >
                          {language === "es"
                            ? "Restaurar Solicitud"
                            : "Restore Request"}
                        </button>
                      ) : request.status === "cancelled" ? (
                        <p role="status" style={cancelledRequestNotice}>
                          {language === "es"
                            ? "Solicitud cancelada. La restauración no está disponible."
                            : "Request cancelled. Restore is not available."}
                        </p>
                      ) : (
                        <button
                          style={dangerButton}
                          onClick={() => requestCancelProject(requestId)}
                        >
                          {language === "es"
                            ? request.status === "accepted"
                              ? "Cancelar Servicio"
                              : "Cancelar Solicitud"
                            : request.status === "accepted"
                            ? "Cancel Service"
                            : "Cancel Request"}
                        </button>
                      )
                    )}
                  </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewImage && (
        <div
          style={imageModal}
          onClick={() => setPreviewImage(null)}
        >
          <button
            style={closePreview}
            type="button"
            onClick={() => setPreviewImage(null)}
          >
            ×
          </button>

          <div
            style={imagePreviewShell}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt=""
              style={largePreviewImage}
            />
          </div>
        </div>
      )}

      {pendingCancelId && (
        <div style={confirmOverlay}>
          <div style={confirmCard}>
            <div style={confirmIcon}>!</div>

            <h3 style={confirmTitle}>
              {isAcceptedCancellation
                ? language === "es"
                  ? "¿Cancelar servicio aceptado?"
                  : "Cancel accepted service?"
                : language === "es"
                ? "¿Cancelar esta solicitud?"
                : "Cancel this request?"}
            </h3>

            <p style={confirmText}>
              {isAcceptedCancellation
                ? cancellationFeeApplies
                  ? language === "es"
                    ? "La ventana gratuita de cancelación ya pasó. Puede aplicar una tarifa de cancelación porque el profesional ya fue seleccionado."
                    : "The free cancellation window has passed. A cancellation fee may apply because the professional was already selected."
                  : language === "es"
                  ? `Estás dentro de la ventana gratuita de ${freeCancelWindowMinutes} minutos. Puedes cancelar sin tarifa por ahora.`
                  : `You are within the ${freeCancelWindowMinutes}-minute free cancellation window. You can cancel without a fee for now.`
                : language === "es"
                ? "Esta acción ocultará la solicitud de tus solicitudes activas y de las oportunidades profesionales."
                : "This will remove the request from your active requests and hide it from professional leads."}
            </p>

            <div style={confirmActions}>
              <button
                style={confirmKeepButton}
                onClick={() => {
                  setPendingCancelId(null);
                  setCancellationCheckAt(null);
                }}
              >
                {t("myRequestsKeepRequest", language)}
              </button>

              <button
                style={confirmCancelButton}
                onClick={confirmCancelProject}
                disabled={requestMutationStatus === "pending"}
              >
                {t("myRequestsYesCancel", language)}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="myRequests" />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background: "var(--meetro-gradient-community-page)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "980px",
  margin: "0 auto",
};

const backButton = {
  border: "none",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
};

const header = {
  textAlign: "center",
  margin: "18px 0 24px",
};

const title = {
  fontSize: "38px",
  fontWeight: "900",
  margin: "0 0 8px",
  color: "var(--meetro-color-ink)",
};

const subtitle = {
  color: "var(--meetro-color-muted)",
  fontWeight: "700",
  lineHeight: 1.5,
  maxWidth: "640px",
  margin: "0 auto",
};

const workCenterPerspectiveCard = {
  maxWidth: "760px",
  margin: "0 auto 18px",
  padding: "16px 18px",
  borderRadius: "22px",
  background: "linear-gradient(135deg, var(--meetro-color-forest), var(--meetro-color-forest-deep))",
  border: "1px solid rgba(255, 253, 248, 0.16)",
  boxShadow: "var(--meetro-shadow-lifted)",
  textAlign: "left",
};

const workCenterPerspectiveEyebrow = {
  display: "block",
  marginBottom: "6px",
  color: "var(--meetro-color-wood)",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const workCenterPerspectiveTitle = {
  display: "block",
  color: "var(--meetro-color-paper)",
  fontSize: "17px",
  lineHeight: 1.25,
  fontWeight: 950,
};

const workCenterPerspectiveText = {
  margin: "6px 0 0",
  color: "var(--meetro-color-sage)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const emergencyRequestSection = {
  margin: "0 auto 20px",
};

const emergencyRequestSectionTitle = {
  margin: "0 0 12px",
  color: "var(--meetro-color-ink)",
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 950,
};

const emergencyRequestGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: "14px",
};

const emergencyRequestCard = {
  minWidth: 0,
  padding: "20px",
  borderRadius: "24px",
  border: "1px solid #fecaca",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
  display: "grid",
  gap: "10px",
};

const emergencyRequestHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "8px",
};

const emergencyRequestBadge = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#fef2f2",
  color: "#991b1b",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const emergencyRequestService = {
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: 850,
};

const emergencyRequestTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const emergencyRequestLifecycle = {
  color: "#7f1d1d",
  fontSize: "14px",
  lineHeight: 1.4,
};

const emergencyRequestProfessional = {
  minWidth: 0,
  color: "var(--meetro-color-forest)",
  fontSize: "15px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const emergencyRequestMeta = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.4,
};

const emergencyRequestActions = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "8px",
};

const emergencyRequestAction = {
  width: "100%",
  minWidth: 0,
  minHeight: "44px",
  marginTop: "4px",
  border: "none",
  borderRadius: "16px",
  padding: "12px 14px",
  background: "var(--meetro-color-forest)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const emergencyRequestSecondaryAction = {
  ...emergencyRequestAction,
  border: "1px solid var(--meetro-color-forest)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
};

const emergencyRequestState = {
  padding: "16px",
  borderRadius: "20px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
};

const emergencyRetryButton = {
  minHeight: "44px",
  border: "1px solid var(--meetro-color-forest)",
  borderRadius: "14px",
  padding: "10px 14px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  fontWeight: 900,
  cursor: "pointer",
};

const emptyCard = {
  maxWidth: "520px",
  margin: "0 auto",
  background: "var(--meetro-surface-warm)",
  borderRadius: "28px",
  padding: "28px",
  textAlign: "center",
  boxShadow: "var(--meetro-shadow-soft)",
};

const emptyIcon = {
  fontSize: "46px",
};

const list = {
  maxWidth: "100%",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: "16px",
  alignItems: "start",
  minWidth: 0,
  overflowX: "hidden",
};

const requestDetailLayout = {
  width: "100%",
  maxWidth: "760px",
  margin: "0 auto",
  minWidth: 0,
};

const requestDetailContent = {
  minWidth: 0,
};

const requestCard = {
  background: "var(--meetro-surface-paper)",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "var(--meetro-shadow-soft)",
  border: "1px solid var(--meetro-color-line)",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const dedicatedRequestDetail = {
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-lifted)",
};

const workflowHubCard = {
  marginTop: "14px",
  padding: "16px",
  borderRadius: "22px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
  display: "grid",
  gap: "13px",
};

const workflowHubHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const workflowHubEyebrow = {
  display: "block",
  color: "var(--meetro-color-forest)",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "5px",
};

const workflowHubTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: "950",
};

const workflowHubStatusBadge = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: "999px",
  padding: "6px 9px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "12px",
  fontWeight: "900",
};

const workflowHubNextStep = {
  padding: "12px 14px",
  borderRadius: "18px",
  background: "rgba(238, 244, 234, 0.78)",
  border: "1px solid var(--meetro-color-line)",
  display: "grid",
  gap: "4px",
};

const workflowTimelineRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
};

const workflowTimelinePill = {
  display: "inline-flex",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "6px 8px",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  fontSize: "10px",
  fontWeight: "900",
};

const workflowTimelinePillDone = {
  borderColor: "#bbf7d0",
  background: "#f0fdf4",
  color: "#047857",
};

const workflowTimelinePillCurrent = {
  borderColor: "var(--meetro-color-forest)",
  background: "rgba(238, 244, 234, 0.85)",
  color: "var(--meetro-color-forest)",
};

const workflowSectionList = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const workflowSectionPill = {
  display: "inline-flex",
  borderRadius: "12px",
  padding: "8px 10px",
  background: "var(--meetro-surface-warm)",
  border: "1px solid #e2e8f0",
  color: "var(--meetro-color-ink)",
  fontSize: "12px",
  fontWeight: "850",
};

const workflowHubActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "9px",
};

const workflowHubPrimaryButton = {
  border: "none",
  borderRadius: "16px",
  padding: "13px 14px",
  background: "var(--meetro-gradient-community-action)",
  color: "var(--meetro-color-paper)",
  fontSize: "14px",
  fontWeight: "950",
};

const workflowHubSecondaryButton = {
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "13px 14px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  fontSize: "14px",
  fontWeight: "950",
};

const cardPillRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const statusPill = {
  display: "inline-flex",
  background: "var(--meetro-color-sage)",
  color: "var(--meetro-color-forest)",
  padding: "7px 11px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const selectedPill = {
  display: "inline-flex",
  background: "#ecfdf5",
  color: "#047857",
  padding: "7px 11px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const swipeGalleryWrap = {
  width: "100%",
  display: "grid",
  gap: "12px",
};

const swipeGalleryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "900",
  marginBottom: "8px",
};

const swipeGalleryRow = {
  display: "flex",
  gap: "16px",
  overflowX: "auto",
  padding: "4px 2px 10px",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
};

const swipePhotoCard = {
  position: "relative",
  width: "140px",
  height: "150px",
  border: "none",
  borderRadius: "18px",
  overflow: "hidden",
  padding: 0,
  cursor: "pointer",
  flex: "0 0 auto",
  scrollSnapAlign: "start",
  background: "#111827",
  boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
};

const swipePhotoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const swipePhotoOverlay = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "28px 10px 10px",
  background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent)",
  color: "white",
  fontSize: "13px",
  fontWeight: "900",
  textAlign: "left",
};

const swipeEndCard = {
  width: "110px",
  height: "150px",
  borderRadius: "24px",
  flex: "0 0 auto",
  scrollSnapAlign: "start",
  background: "linear-gradient(135deg,#f3f0ff,var(--meetro-surface-sage, #eef4ea))",
  border: "1px dashed #c4b5fd",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
};

const galleryEmpty = {
  minHeight: "150px",
  borderRadius: "18px",
  background: "linear-gradient(135deg,#f8fafc,#f3f0ff)",
  border: "1px dashed #c4b5fd",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: "6px",
  color: "#475569",
  padding: "16px",
};

const galleryEmptyIcon = {
  fontSize: "34px",
};

const workflowUnavailableCard = {
  marginTop: 14,
  padding: 16,
  borderRadius: 20,
  background: "var(--meetro-surface-paper, #fffaf0)",
  border: "1px solid rgba(116, 86, 48, 0.22)",
  color: "var(--meetro-color-charcoal, #172317)",
  boxShadow: "0 10px 24px rgba(46, 74, 53, 0.08)",
};

const workflowUnavailableTitle = {
  display: "block",
  marginBottom: 6,
  fontSize: 15,
  lineHeight: 1.3,
  fontWeight: 950,
};

const workflowUnavailableText = {
  margin: 0,
  color: "var(--meetro-color-coffee, #5f4b3b)",
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 750,
};

const imageModal = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.82)",
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const imagePreviewShell = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const largePreviewImage = {
  width: "100%",
  maxWidth: "calc(100% - 32px)",
  maxHeight: "84vh",
  objectFit: "contain",
  borderRadius: "24px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
  background: "white",
};

const closePreview = {
  position: "fixed",
  top: "22px",
  right: "22px",
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "none",
  background: "white",
  color: "#111827",
  fontSize: "28px",
  fontWeight: "900",
  cursor: "pointer",
};

const quoteSection = {
  marginBottom: "16px",
};

const quoteHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const quoteTitle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: "900",
  color: "#111827",
};

const quoteCountBadge = {
  background: "#ede9fe",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: "900",
};

const quoteList = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const quoteCard = {
  background: "#ffffff",
  border: "1px solid #e9e5ff",
  borderRadius: "18px",
  padding: "14px",
  boxShadow: "0 6px 16px rgba(15,23,42,0.04)",
};

const quoteTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
  gap: "10px",
};

const quoteBusiness = {
  fontSize: "15px",
  color: "#111827",
  fontWeight: "900",
};

const quoteDate = {
  margin: "2px 0 0",
  color: "#475569",
  fontSize: "11px",
};

const quotePrice = {
  fontSize: "22px",
  fontWeight: "950",
  color: "var(--meetro-color-forest, #1f4d34)",
  letterSpacing: "-0.03em",
};

const quoteReviewSummary = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const quoteSummaryItem = {
  background: "#f8fafc",
  borderRadius: "16px",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  color: "#111827",
};

const quoteScopeCard = {
  background: "#faf9ff",
  border: "1px solid #ede9fe",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "14px",
  display: "grid",
  gap: "12px",
};

const quoteScopeEyebrow = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const quoteScopeBlock = {
  color: "#111827",
  display: "grid",
  gap: "5px",
  lineHeight: 1.5,
  whiteSpace: "pre-line",
};

const quotePhotoSection = {
  marginBottom: "14px",
};

const quotePhotoRow = {
  display: "flex",
  gap: "12px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  padding: "2px 2px 8px",
};

const quotePhotoButton = {
  position: "relative",
  width: "132px",
  height: "112px",
  flex: "0 0 auto",
  scrollSnapAlign: "start",
  border: "none",
  borderRadius: "16px",
  overflow: "hidden",
  padding: 0,
  background: "#111827",
  cursor: "pointer",
};

const quoteDecisionPanel = {
  display: "grid",
  gap: "10px",
};

const quoteUnavailableNotice = {
  display: "grid",
  gap: 5,
  border: "1px solid rgba(116, 86, 48, 0.22)",
  background: "var(--meetro-surface-paper, #fffaf0)",
  color: "var(--meetro-color-charcoal, #172317)",
  borderRadius: 16,
  padding: "12px 14px",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 800,
};

const quoteMessageButton = {
  border: "1px solid #d8d4fe",
  background: "#ffffff",
  color: "#4f28e8",
  borderRadius: "16px",
  padding: "13px 14px",
  fontWeight: "950",
  cursor: "pointer",
};

const quoteSecondaryActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: "9px",
};

const quoteSecondaryButton = {
  border: "1px solid #d8d4fe",
  background: "#ffffff",
  color: "#4f28e8",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const revisionBox = {
  marginTop: "10px",
  border: "1px solid #fde68a",
  background: "#fffdf7",
  borderRadius: "16px",
  padding: "12px",
};

const revisionTextarea = {
  width: "100%",
  minHeight: "100px",
  borderRadius: "14px",
  border: "1px solid #d8d4fe",
  padding: "14px",
  fontSize: "16px",
  resize: "vertical",
  outline: "none",
  boxSizing: "border-box",
};

const revisionButtonRow = {
  display: "flex",
  gap: "10px",
  marginTop: "12px",
};

const sendRevisionButton = {
  flex: 1,
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const cancelRevisionButton = {
  flex: 1,
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#475569",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
  maxWidth: "100%",
  minWidth: 0,
};

const completedStateBox = {
  marginTop: "18px",
  background: "linear-gradient(135deg,#f8fafc,#ffffff)",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  display: "grid",
  gap: "14px",
  color: "#111827",
  boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
};

const completedReviewButton = {
  width: "100%",
  border: "1px solid #facc15",
  background: "#fefce8",
  color: "#854d0e",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const completedPrimaryButton = {
  width: "100%",
  border: "none",
  background: "#111827",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const reviewButton = {
  width: "100%",
  border: "1px solid #facc15",
  background: "#fefce8",
  color: "#854d0e",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(250,204,21,0.16)",
};

const dangerButton = {
  width: "100%",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#be123c",
  borderRadius: "16px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const cancelledRequestNotice = {
  width: "100%",
  margin: 0,
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: 800,
  lineHeight: 1.4,
  boxSizing: "border-box",
};

const primaryButton = {
  border: "none",
  background: "var(--meetro-gradient-community-action)",
  color: "var(--meetro-color-paper)",
  borderRadius: "16px",
  padding: "14px 18px",
  fontWeight: "900",
  cursor: "pointer",
};

const confirmOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  background: "rgba(15,23,42,0.62)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const confirmCard = {
  width: "100%",
  maxWidth: "390px",
  background: "white",
  borderRadius: "28px",
  padding: "24px",
  textAlign: "center",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const confirmIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "#fff7ed",
  color: "#ea580c",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 14px",
  fontSize: "28px",
};

const confirmTitle = {
  margin: "0 0 10px",
  fontSize: "22px",
  fontWeight: "950",
  color: "#111827",
};

const confirmText = {
  margin: "0 0 20px",
  color: "#475569",
  lineHeight: 1.5,
  fontWeight: "700",
};

const confirmActions = {
  display: "grid",
  gap: "10px",
};

const confirmKeepButton = {
  border: "none",
  borderRadius: "16px",
  padding: "13px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const confirmCancelButton = {
  border: "1px solid #fecaca",
  borderRadius: "16px",
  padding: "13px",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: "900",
  cursor: "pointer",
};


export default MyRequests;
