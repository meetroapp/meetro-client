import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, t } from "../utils/language";
import { formatScheduleTime } from "../utils/displayTime";
import { addNotification } from "../utils/notifications";
import { authFetch } from "../utils/authFetch";
import {
  getHomeownerLifecycleStage,
  getHomeownerWorkflowPresentation,
  getHomeownerWorkflowTimeline,
  isRequestVisibleToHomeowner,
} from "../utils/homeownerLifecycle";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { saveActiveJobSnapshot, saveActiveWorkSnapshot } from "../utils/workCenter";

function PhotoStrip({ request, onPreview, language }) {
  const photos = [
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

function EditPhotoManager({
  photos,
  uploading,
  onUpload,
  onRemove,
  onPreview,
  language,
}) {
  const mainPhotoLabel = language === "es" ? "Foto principal" : "Main Photo";
  const getPhotoLabel = (index) =>
    language === "es" ? `Foto ${index + 1}` : `Photo ${index + 1}`;

  return (
    <div style={editPhotoManager}>
      <div style={swipeGalleryHeader}>
        <strong>
          {language === "es"
            ? `${t("projectPhotos")} (${photos.length})`
            : `${t("projectPhotos")} (${photos.length})`}
        </strong>

        <button
          type="button"
          style={addPhotoButton}
          onClick={() => document.getElementById("editPhotoInput").click()}
          disabled={uploading}
        >
          {uploading ? t("uploading") : t("addPhotos")}
        </button>
      </div>

      <input
        id="editPhotoInput"
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        style={{ display: "none" }}
      />

      {photos.length === 0 ? (
        <div style={galleryEmpty}>
          <div style={galleryEmptyIcon}>IMG</div>
          <strong>{t("noPhotosYet")}</strong>
          <span>
            {language === "es"
              ? t("addPhotosHelp")
              : t("addPhotosHelp")}
          </span>
        </div>
      ) : (
        <div style={swipeGalleryRow}>
          {photos.map((photo, index) => (
            <div key={photo + index} style={editPhotoCard}>
              <button
                type="button"
                style={editPhotoPreviewButton}
                onClick={() => onPreview(photo)}
              >
                <img src={photo} alt="" style={swipePhotoImage} />
              </button>

              <button
                type="button"
                style={deletePhotoButton}
                onClick={() => onRemove(index)}
              >
                ×
              </button>

              <span style={swipePhotoOverlay}>
                {index === 0 ? mainPhotoLabel : getPhotoLabel(index)}
              </span>
            </div>
          ))}
        </div>
      )}
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
        <button
          type="button"
          style={workflowHubPrimaryButton}
          onClick={() =>
            primaryIsConversation
              ? onOpenConversation?.()
              : onPrimaryAction?.(workflow, request)
          }
        >
          {workflow.primaryActionLabel}
        </button>
        {!hideCommunicationAction && !primaryIsConversation && (
          <button type="button" style={workflowHubSecondaryButton} onClick={onOpenConversation}>
            {t("myRequestsMessageProfessional", language)}
          </button>
        )}
      </div>
    </div>
  );
}

function MyRequests({ setPage }) {
  const language = getLanguage();

  const [recoveryTick, setRecoveryTick] = useState(0);

  function readRequestArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getDurableHomeownerRequests() {
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
      if (requests.length > 0) return;

      try {
        const result = await authFetch("/posts", {}, setPage);

        if (!result?.response?.ok) return;

        const data = result.data || {};
        const posts = Array.isArray(data) ? data : data.posts || [];

        const currentUserId = localStorage.getItem("userId");
        const currentUserEmail = localStorage.getItem("userEmail");

        const recoveredRequests = posts
          .filter((post) => {
            const sameUserId =
              currentUserId &&
              String(post.user_id || post.userId || "") === String(currentUserId);

            const sameEmail =
              currentUserEmail &&
              String(post.email || post.user_email || "").toLowerCase() ===
                String(currentUserEmail).toLowerCase();

            const looksLikeHomeownerQuoteRequest =
              String(post.post_type || post.type || "").includes("quote_request") ||
              String(post.status || "").toLowerCase() === "open";

            return sameUserId || sameEmail || looksLikeHomeownerQuoteRequest;
          })
          .map((post) => ({
            id: post.id,
            requestId: post.id,
            source: "backend-post-recovery",
            title: post.title || post.project_title || "Service Request",
            description: post.description || post.project_description || "",
            category: post.category || "handyman",
            location: post.location || "Local Area",
            photos: Array.isArray(post.photos) ? post.photos : [],
            image_url: post.image_url || "",
            status: post.status || "open",
            createdAt: post.created_at || post.createdAt || new Date().toISOString(),
            viewedByBusinesses: [],
            quotesReceived: [],
            messagesCount: 0,
          }));

        if (recoveredRequests.length === 0) return;

        localStorage.setItem(
          "homeownerRequests",
          JSON.stringify(recoveredRequests)
        );

        localStorage.setItem(
          "meetroHomeownerRequestsBackup",
          JSON.stringify(recoveredRequests)
        );

        setRecoveryTick((tick) => tick + 1);
      } catch (error) {
        console.error("Failed to recover homeowner requests", error);
      }
    }

    recoverHomeownerRequests();
  }, [requests.length, setPage]);

  void recoveryTick;

  const selectedId = localStorage.getItem("selectedHomeownerRequestId");
  const [previewImage, setPreviewImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [revisionQuoteId, setRevisionQuoteId] = useState(null);
  const [revisionText, setRevisionText] = useState("");
  const [acceptQuoteId, setAcceptQuoteId] = useState(null);
  const [nextStepsQuoteId, setNextStepsQuoteId] = useState(null);
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    photos: [],
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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

  const minutesSinceAccepted = acceptedAtTime
    ? Math.floor((Date.now() - acceptedAtTime) / 60000)
    : null;

  const isAcceptedCancellation =
    pendingCancelRequest?.status === "accepted" ||
    pendingCancelRequest?.acceptedQuote;

  const freeCancelWindowMinutes = 15;

  const cancellationFeeApplies =
    isAcceptedCancellation &&
    minutesSinceAccepted !== null &&
    minutesSinceAccepted > freeCancelWindowMinutes;

  const sortedRequests = [...requests].sort((a, b) => {
    const aSelected = (a.requestId || a.id) === selectedId ? 1 : 0;
    const bSelected = (b.requestId || b.id) === selectedId ? 1 : 0;
    return bSelected - aSelected;
  });

  function getStatusLabel(status) {
    const value = status || "pending";

    if (language === "es") {
      return value
        .replace("pending", "Esperando respuesta profesional")
        .replace("Awaiting Quotes", "Esperando respuesta profesional")
        .replace("viewed", "Visto por profesionales")
        .replace("quoted", "Cotización recibida")
        .replace("messaged", "Mensaje recibido")
        .replace("accepted", "Cotización aceptada")
        .replace("scheduled", "Programado")
        .replace("active", "En progreso")
        .replace("completed", "Completado")
        .replace("cancelled", "Cancelado");
    }

    return value
      .replace("pending", "Awaiting professional response")
      .replace("Awaiting Quotes", "Awaiting professional response")
      .replace("viewed", "Viewed by professionals")
      .replace("quoted", "Quote received")
      .replace("messaged", "Message received")
      .replace("accepted", "Quote accepted")
      .replace("scheduled", "Scheduled")
      .replace("active", "In progress")
      .replace("completed", "Completed")
      .replace("cancelled", "Cancelled");
  }

  function getCount(value) {
    return Array.isArray(value) ? value.length : value || 0;
  }

  function saveHomeownerRequests(updatedRequests, options = {}) {
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
      } catch {}
    });
  }

  function getBusinessScheduleItems() {
    try {
      const savedSchedule = JSON.parse(
        localStorage.getItem("meetro_business_schedule") || "[]"
      );
      return Array.isArray(savedSchedule) ? savedSchedule : [];
    } catch {
      return [];
    }
  }

  function getAppointmentStatus(appointment = {}) {
    const rawStatus =
      appointment.customerConfirmationStatus ||
      appointment.confirmationStatus ||
      appointment.workflowStatus ||
      appointment.status ||
      "";
    const normalizedStatus = String(rawStatus).toLowerCase();

    if (
      normalizedStatus === "confirmed" ||
      normalizedStatus.includes("appointment_confirmed")
    ) {
      return "confirmed";
    }

    if (
      normalizedStatus === "change_requested" ||
      normalizedStatus.includes("change_requested") ||
      normalizedStatus.includes("reschedule")
    ) {
      return "change_requested";
    }

    if (normalizedStatus.includes("cancel")) {
      return "cancelled";
    }

    return "pending_customer_confirmation";
  }

  function getAppointmentStatusLabel(status) {
    if (status === "confirmed") {
      return language === "es" ? "Cita confirmada" : "Appointment confirmed";
    }

    if (status === "change_requested") {
      return language === "es"
        ? "Cambio de horario solicitado"
        : "Different time requested";
    }

    if (status === "cancelled") {
      return language === "es" ? "Cita cancelada" : "Appointment cancelled";
    }

    return language === "es"
      ? "Esperando confirmación"
      : "Waiting for confirmation";
  }

  function getLinkedAppointment(request) {
    const requestId = String(request.requestId || request.id || "");
    const requestConversationId = String(
      request.conversationId || request.activeConversationId || ""
    );
    const requestTitle = String(request.title || request.projectTitle || "").toLowerCase();
    const requestAppointment =
      request.linkedAppointment || request.appointment || request.schedule;

    const scheduleItems = getBusinessScheduleItems();
    const linkedSchedule = scheduleItems.find((item) => {
      const itemRequestId = String(
        item.requestId ||
          item.selectedHomeownerRequestId ||
          item.quoteRequestId ||
          item.selectedHomeownerRequest?.requestId ||
          item.selectedHomeownerRequest?.id ||
          ""
      );
      const itemConversationId = String(
        item.conversationId ||
          item.activeConversationId ||
          item.projectConversationId ||
          ""
      );
      const itemTitle = String(
        item.requestTitle || item.projectTitle || item.title || ""
      ).toLowerCase();

      return (
        (requestId && itemRequestId && itemRequestId === requestId) ||
        (requestConversationId &&
          itemConversationId &&
          itemConversationId === requestConversationId) ||
        (requestTitle && itemTitle && itemTitle === requestTitle)
      );
    });

    return linkedSchedule || requestAppointment || null;
  }

  function updateConversationScheduleMessage(appointment, confirmationStatus, statusLabel) {
    const conversationId =
      appointment.conversationId ||
      appointment.activeConversationId ||
      appointment.projectConversationId ||
      "";
    if (!conversationId) return;

    try {
      const storageKey = `meetro_conversation_${conversationId}`;
      const storedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(storedMessages)) return;

      const updatedAt = new Date().toISOString();
      const appointmentId = appointment.id || appointment.scheduleId || "";
      const updatedMessages = storedMessages.map((message) => {
        const messageAppointmentId =
          message.schedule?.id || message.scheduleId || message.appointmentId || "";
        if (
          message.type !== "schedule" ||
          (appointmentId && String(messageAppointmentId) !== String(appointmentId))
        ) {
          return message;
        }

        const updatedSchedule = {
          ...(message.schedule || {}),
          customerConfirmationStatus: confirmationStatus,
          confirmationStatus,
          confirmationStatusLabel: statusLabel,
          workflowStatus:
            confirmationStatus === "confirmed"
              ? "appointment_confirmed"
              : "appointment_change_requested",
          confirmedAt:
            confirmationStatus === "confirmed"
              ? updatedAt
              : message.schedule?.confirmedAt,
          changeRequestedAt:
            confirmationStatus === "change_requested"
              ? updatedAt
              : message.schedule?.changeRequestedAt,
          updatedAt,
        };

        return {
          ...message,
          customerConfirmationStatus: confirmationStatus,
          confirmationStatus,
          status: confirmationStatus,
          subtitle: `${updatedSchedule.date || ""} • ${
            formatScheduleTime(updatedSchedule.time || "")
          } • ${statusLabel}`,
          text:
            confirmationStatus === "confirmed"
              ? language === "es"
                ? "Cita confirmada. El profesional verá esta actualización."
                : "Appointment confirmed. The professional will see this update."
              : language === "es"
              ? "Solicitaste otro horario. Envía un mensaje con tu disponibilidad."
              : "You requested a different time. Send a message with your availability.",
          schedule: updatedSchedule,
          updatedAt,
        };
      });

      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
    } catch {}
  }

  function updateLinkedAppointmentStatus(request, appointment, confirmationStatus) {
    const statusLabel = getAppointmentStatusLabel(confirmationStatus);
    const updatedAt = new Date().toISOString();
    const appointmentId = appointment.id || appointment.scheduleId || "";

    const updateAppointment = (item = {}) => ({
      ...item,
      customerConfirmationStatus: confirmationStatus,
      confirmationStatus,
      confirmationStatusLabel: statusLabel,
      workflowStatus:
        confirmationStatus === "confirmed"
          ? "appointment_confirmed"
          : "appointment_change_requested",
      confirmedAt:
        confirmationStatus === "confirmed" ? updatedAt : item.confirmedAt,
      changeRequestedAt:
        confirmationStatus === "change_requested" ? updatedAt : item.changeRequestedAt,
      updatedAt,
    });

    const updatedSchedule = getBusinessScheduleItems().map((item) =>
      appointmentId && String(item.id) === String(appointmentId)
        ? updateAppointment(item)
        : item
    );

    if (updatedSchedule.length > 0) {
      localStorage.setItem("meetro_business_schedule", JSON.stringify(updatedSchedule));
    }

    const requestId = request.requestId || request.id;
    const updatedAppointment = updateAppointment(appointment);
    const updatedRequests = requests.map((item) => {
      const itemId = item.requestId || item.id;
      if (String(itemId) !== String(requestId)) return item;

      return {
        ...item,
        status: ["completed", "cancelled"].includes(item.status)
          ? item.status
          : "scheduled",
        workflowStage:
          confirmationStatus === "confirmed"
            ? "scheduled"
            : item.workflowStage || "scheduling",
        nextAction:
          confirmationStatus === "confirmed"
            ? "evaluation"
            : "coordinate_schedule",
        linkedAppointment: updatedAppointment,
        appointmentStatus: confirmationStatus,
        appointmentStatusLabel: statusLabel,
        scheduledAt: item.scheduledAt || updatedAt,
        conversationId:
          item.conversationId ||
          updatedAppointment.conversationId ||
          updatedAppointment.activeConversationId ||
          requestId,
      };
    });

    if (!saveHomeownerRequests(updatedRequests, { selectedRequestId: requestId })) return;

    updateConversationScheduleMessage(updatedAppointment, confirmationStatus, statusLabel);

    addNotification({
      type:
        confirmationStatus === "confirmed"
          ? "appointment_confirmed"
          : "appointment_change_requested",
      title: statusLabel,
      message:
        confirmationStatus === "confirmed"
          ? language === "es"
            ? "El cliente confirmó la cita."
            : "The customer confirmed the appointment."
          : language === "es"
          ? "El cliente solicitó otro horario."
          : "The customer requested a different time.",
      priority: "high",
      targetRole: "professional",
      requestId,
      scheduleId: appointmentId,
      conversationId:
        updatedAppointment.conversationId ||
        updatedAppointment.activeConversationId ||
        "",
    });

    window.dispatchEvent(new Event("meetro-messages-updated"));
    window.dispatchEvent(new Event("meetro-workcenter-updated"));

    if (confirmationStatus === "change_requested") {
      openRequestConversation(updatedRequests.find(
        (item) => String(item.requestId || item.id) === String(requestId)
      ) || request, updatedAppointment);
    }
  }

  function stageAcceptedQuoteForWork(request, acceptedQuote) {
    const requestId = request.requestId || request.id || acceptedQuote.quoteId || "";
    const quoteId = acceptedQuote.quoteId || acceptedQuote.id || "";
    const conversationId =
      acceptedQuote.conversationId ||
      request.conversationId ||
      request.activeConversationId ||
      requestId;
    const service = request.title || acceptedQuote.projectTitle || acceptedQuote.title || "Approved Service";
    const location = request.location || acceptedQuote.location || "";

    saveActiveWorkSnapshot({
      requestId,
      quoteId,
      conversationId,
      status: "accepted",
      stage: "approved",
      service,
      location,
      type: "quote_approved",
      source: "my_requests_quote_acceptance",
    });

    saveActiveJobSnapshot({
      id: quoteId || requestId,
      jobId: quoteId || requestId,
      conversationId,
      service,
      location,
      status: "accepted",
      customer:
        request.homeownerName ||
        request.customerName ||
        acceptedQuote.homeownerName ||
        acceptedQuote.customerName ||
        "Customer",
    });
  }

  function openRequestConversation(request, quote = {}) {
    const requestId = request.requestId || request.id || quote.requestId || "";
    const conversationId =
      quote.conversationId ||
      request.conversationId ||
      request.activeConversationId ||
      requestId;

    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(request));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(request));
    localStorage.setItem("selectedQuoteRequestId", String(requestId || conversationId));
    localStorage.setItem("activeConversationId", String(conversationId));
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem(
      "activeConversationName",
      quote.businessName || request.selectedProfessional || request.businessName || "Professional"
    );
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: conversationId,
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
    setPage("conversationThread");
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
      request.activeConversationId ||
      request.projectConversationId ||
      workflow.quote?.conversationId ||
      requestId;
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

  function startEdit(request) {
    setEditingId(request.requestId || request.id);
    setEditForm({
      title: request.title || "",
      description: request.description || "",
      location: request.location || "",
      photos: [
        ...(Array.isArray(request.photos) ? request.photos : []),
        ...(request.image_url ? [request.image_url] : []),
      ].filter(Boolean),
    });
  }

  useEffect(() => {
    if (localStorage.getItem("meetroOpenHomeownerRequestEdit") !== "true") {
      return;
    }

    const selectedRequest = requests.find(
      (request) =>
        String(request.requestId || request.id) === String(selectedId)
    );

    if (
      !selectedRequest ||
      ["completed", "cancelled"].includes(selectedRequest.status)
    ) {
      return;
    }

    localStorage.removeItem("meetroOpenHomeownerRequestEdit");
    startEdit(selectedRequest);
  }, [requests, selectedId]);

  function saveEdit(requestId) {
    const updatedRequests = requests.map((request) => {
      const currentId = request.requestId || request.id;

      if (String(currentId) !== String(requestId)) return request;

      const updatedPhotos = [...new Set(editForm.photos)];

      return {
        ...request,
        title: editForm.title.trim() || request.title,
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        photos: updatedPhotos,
        photoRecords: updatedPhotos.map((photo) => {
          const existingRecord = Array.isArray(request.photoRecords)
            ? request.photoRecords.find((record) => record.url === photo)
            : null;

          return (
            existingRecord || {
              url: photo,
              tag: "progress",
              caption: "",
              createdAt: new Date().toISOString(),
            }
          );
        }),
        image_url: updatedPhotos[0] || "",
        updatedAt: new Date().toISOString(),
      };
    });

    if (!saveHomeownerRequests(updatedRequests, { selectedRequestId: requestId })) return;
    setEditingId(null);
  }

  async function handleEditPhotoUpload(event) {
    try {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      setUploadingPhotos(true);

      const uploadedUrls = [];

      for (const file of files) {
        const formData = new FormData();

        formData.append("file", file);
        formData.append("upload_preset", "meetro_uploads");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/djcw4tk28/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setEditForm((current) => ({
          ...current,
          photos: [...new Set([...current.photos, ...uploadedUrls])],
        }));
      }
    } catch (error) {
      console.error(error);
      alert(language === "es" ? "Error al subir fotos." : "Photo upload error.");
    } finally {
      setUploadingPhotos(false);
      event.target.value = "";
    }
  }

  function removeEditPhoto(indexToRemove) {
    setEditForm((current) => ({
      ...current,
      photos: current.photos.filter((_, index) => index !== indexToRemove),
    }));
  }

  function requestCancelProject(requestId) {
    setPendingCancelId(requestId);
  }

  function confirmCancelProject() {
    if (!pendingCancelId) return;

    const updatedRequests = requests.map((request) => {
      const currentId = request.requestId || request.id;

      if (String(currentId) !== String(pendingCancelId)) return request;

      return {
        ...request,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancellationFeeApplies,
        cancellationPolicyNote: cancellationFeeApplies
          ? "Cancellation fee may apply because the free cancellation window passed."
          : isAcceptedCancellation
          ? "Cancelled within free cancellation window."
          : "Cancelled before quote acceptance.",
        projectTimeline: [
          {
            type: "cancelled",
            label: cancellationFeeApplies
              ? "Request cancelled - cancellation fee may apply"
              : "Request cancelled",
            createdAt: new Date().toISOString(),
            cancellationFeeApplies,
            freeCancelWindowMinutes,
          },
          ...(Array.isArray(request.projectTimeline)
            ? request.projectTimeline
            : []),
        ],
      };
    });

    if (!saveHomeownerRequests(updatedRequests, { selectedRequestId: requestId })) return;
    setEditingId(null);
    setPendingCancelId(null);
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

  function getCreatedDate(request) {
    return request.createdAt
      ? new Date(request.createdAt).toLocaleDateString(
          language === "es" ? "es-US" : "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )
      : language === "es"
      ? "Fecha pendiente"
      : "Date pending";
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
    <div className="app-page meetro-responsive-page" style={page}>
      <button style={backButton} onClick={goBackFromRequests}>
        {t("myRequestsBack", language)}
      </button>

      <div style={header}>
        <h1 style={title}>
          {t("myRequestsTitle", language)}
        </h1>

        <p style={subtitle}>
          {t("myRequestsSubtitle", language)}
        </p>
      </div>

      {sortedRequests.length === 0 ? (
        <div style={emptyCard}>
          <div style={emptyIcon}>REQ</div>

          <h2>{t("myRequestsEmptyTitle", language)}</h2>

          <p>
            {t("myRequestsEmptyText", language)}
          </p>

          <button style={primaryButton} onClick={() => setPage("upload")}>
            {t("myRequestsRequestHelp", language)}
          </button>
        </div>
      ) : (
        <div className="meetro-responsive-grid meetro-grid-2" style={list}>
          {sortedRequests.map((request) => {
            const requestId = request.requestId || request.id;
            const isSelected = requestId === selectedId;
            const lifecycle = getHomeownerLifecycleStage(request, language);
            const linkedAppointment = getLinkedAppointment(request);
            const appointmentStatus = linkedAppointment
              ? getAppointmentStatus(linkedAppointment)
              : "";
            const appointmentStatusLabel = linkedAppointment
              ? getAppointmentStatusLabel(appointmentStatus)
              : "";
            const hasQuoteReview =
              Array.isArray(request.quotesReceived) && request.quotesReceived.length > 0;

            const viewsCount = getCount(request.viewedByBusinesses);
            const quotesCount = getCount(request.quotesReceived);

            return (
              <div
                className={isSelected ? "meetro-selected-card" : ""}
                style={{
                  ...requestCard,
                  ...(isSelected ? selectedRequestCard : {}),
                }}
                key={requestId || request.createdAt}
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

                        {isSelected && (
                          <span style={selectedPill}>
                            {t("myRequestsSelected", language)}
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
                        {request.title ||
                          request.category ||
                          t("myRequestsServiceRequest", language)}
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
                        color: "#4f46e5",
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
                    <span>{viewsCount} {t("myRequestsViews", language)}</span>
                    <span>{request.messagesCount || 0} {t("myRequestsMessages", language)}</span>
                    <span>{quotesCount} {t("myRequestsQuotes", language)}</span>
                  </div>

                  <button
                    type="button"
                    style={{
                      marginTop: 2,
                      width: "100%",
                      border: "1px solid rgba(99, 102, 241, 0.18)",
                      background: isSelected ? "rgba(99, 102, 241, 0.08)" : "#ffffff",
                      color: "#4f46e5",
                      borderRadius: 16,
                      padding: "12px 14px",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                    onClick={() => {
                      if (isSelected) {
                        localStorage.removeItem("selectedHomeownerRequestId");
                      } else {
                        localStorage.setItem("selectedHomeownerRequestId", requestId);
                      }

                      setRecoveryTick((value) => value + 1);
                    }}
                  >
                    {isSelected
                      ? language === "es"
                        ? "Ocultar detalles"
                        : "Hide Details"
                      : language === "es"
                      ? "Ver detalles"
                      : "Review Details"}
                  </button>
                </div>

                {isSelected && (
                  <>
                    <HomeownerWorkflowHub
                      request={request}
                      language={language}
                      linkedAppointment={linkedAppointment}
                      onOpenConversation={() => openRequestConversation(request)}
                      onPrimaryAction={(workflow) =>
                        openHomeownerWorkflow(request, workflow)
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

                      {editingId === requestId && !["completed", "cancelled"].includes(request.status) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                          <input
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            placeholder={t("myRequestsTitlePlaceholder", language)}
                            style={input}
                          />

                          <textarea
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder={t("myRequestsDetailsPlaceholder", language)}
                            style={{ ...textarea, minHeight: 110 }}
                          />

                          <input
                            value={editForm.location}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                location: event.target.value,
                              }))
                            }
                            placeholder={t("myRequestsLocationPlaceholder", language)}
                            style={input}
                          />
                        </div>
                      ) : (
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
                      )}

                      {editingId === requestId && !["completed", "cancelled"].includes(request.status) ? (
                        <EditPhotoManager
                          photos={editForm.photos}
                          uploading={uploadingPhotos}
                          onUpload={handleEditPhotoUpload}
                          onRemove={removeEditPhoto}
                          onPreview={setPreviewImage}
                          language={language}
                        />
                      ) : (
                        <PhotoStrip
                          request={request}
                          onPreview={setPreviewImage}
                          language={language}
                        />
                      )}
                    </div>

	                    {request.status === "accepted" && request.acceptedQuote && (
	                  <div style={acceptedNotice}>
                    <div style={acceptedCheck}>✓</div>

                    <div>
                      <strong style={acceptedNoticeTitle}>
                        {t("myRequestsQuoteAccepted", language)}
                      </strong>

                      <p style={acceptedNoticeText}>
                        {t("myRequestsSelectedProfessionalNotice", language).replace(
                          "{professional}",
                          request.selectedProfessional ||
                            t("myRequestsFallbackProfessional", language)
                        )}
                      </p>

                      <div style={acceptedNoticeMeta}>
                        <span>
                          {t("myRequestsAcceptedTotal", language)}
                        </span>

                        <strong>${request.acceptedQuote.amount || 0}</strong>
                      </div>
                    </div>
	                  </div>
	                )}

                {linkedAppointment && (
                  <div style={scheduleSummaryCard}>
                    <div style={scheduleSummaryHeader}>
                      <div>
                        <span style={scheduleSummaryEyebrow}>
                          {t("myRequestsLinkedAppointment", language)}
                        </span>
                        <h3 style={scheduleSummaryTitle}>
                          {linkedAppointment.title ||
                            t("myRequestsScheduledEvaluation", language)}
                        </h3>
                      </div>

                      <span
                        style={{
                          ...scheduleSummaryStatus,
                          ...(appointmentStatus === "confirmed"
                            ? scheduleSummaryStatusConfirmed
                            : appointmentStatus === "change_requested"
                            ? scheduleSummaryStatusAttention
                            : {}),
                        }}
                      >
                        {appointmentStatusLabel}
                      </span>
                    </div>

                    <div style={scheduleSummaryGrid}>
                      <div style={scheduleSummaryItem}>
                        <span>{t("myRequestsDate", language)}</span>
                        <strong>{linkedAppointment.date || "—"}</strong>
                      </div>

                      <div style={scheduleSummaryItem}>
                        <span>{t("myRequestsTime", language)}</span>
                        <strong>{formatScheduleTime(linkedAppointment.time || "") || "—"}</strong>
                      </div>

                      <div style={scheduleSummaryItem}>
                        <span>{t("myRequestsProfessional", language)}</span>
                        <strong>
                          {linkedAppointment.businessName ||
                            request.selectedProfessional ||
                            request.businessName ||
                            "Professional"}
                        </strong>
                      </div>

                      <div style={scheduleSummaryItem}>
                        <span>{t("myRequestsLocation", language)}</span>
                        <strong>
                          {linkedAppointment.location || request.location || "—"}
                        </strong>
                      </div>
                    </div>

                    {linkedAppointment.notes && (
                      <p style={scheduleSummaryNotes}>{linkedAppointment.notes}</p>
                    )}

                    <div style={scheduleSummaryActions}>
                      {appointmentStatus === "pending_customer_confirmation" && (
                        <>
                          <button
                            type="button"
                            style={scheduleConfirmButton}
                            onClick={() =>
                              updateLinkedAppointmentStatus(
                                request,
                                linkedAppointment,
                                "confirmed"
                              )
                            }
                          >
                            {language === "es"
                              ? "Confirmar cita"
                              : "Confirm appointment"}
                          </button>

                          <button
                            type="button"
                            style={scheduleDifferentTimeButton}
                            onClick={() =>
                              updateLinkedAppointmentStatus(
                                request,
                                linkedAppointment,
                                "change_requested"
                              )
                            }
                          >
                            {language === "es"
                              ? "Pedir otro horario"
                              : "Request different time"}
                          </button>
                        </>
                      )}

                      {appointmentStatus === "change_requested" && !hasQuoteReview && (
                        <button
                          type="button"
                          style={scheduleDifferentTimeButton}
                          onClick={() => openRequestConversation(request, linkedAppointment)}
                        >
                          {language === "es"
                            ? "Enviar disponibilidad"
                            : "Send availability"}
                        </button>
                      )}

                      {!hasQuoteReview && (
                        <button
                          type="button"
                          style={scheduleConversationButton}
                          onClick={() => openRequestConversation(request, linkedAppointment)}
                        >
                          {language === "es"
                            ? "Continuar conversación"
                            : "Continue Conversation"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {Array.isArray(request.quotesReceived) &&
                  request.quotesReceived.length > 0 && (
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
                          {request.quotesReceived.length}
                        </span>
                      </div>

                      <div style={quoteList}>
                        {request.quotesReceived.map((quote) => (
                          <div
                            key={quote.quoteId}
                            style={{
                              ...quoteCard,
                              ...(quote.status === "accepted" ? acceptedQuoteCard : {}),
                            }}
                          >
                            {quote.status === "accepted" && (
                              <div style={acceptedQuoteBanner}>
                                ✓ {t("selectedQuote", language)}
                              </div>
                            )}

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
                                {t("messageProfessional", language)}
                              </button>

                              <button
                                style={
                                  quote.status === "accepted"
                                    ? acceptedStatusPill
                                    : acceptQuoteButton
                                }
                                disabled={quote.status === "accepted"}
                                onClick={() => {
                                  if (quote.status === "accepted") return;

                                  setAcceptQuoteId(
                                    acceptQuoteId === quote.quoteId
                                      ? null
                                      : quote.quoteId
                                  );
                                }}
                              >
                                {quote.status === "accepted"
                                  ? `✓ ${t("quoteApproved", language)}`
                                  : t("approveQuote", language)}
                              </button>

                              <div style={quoteSecondaryActions}>
                                <button
                                  type="button"
                                  style={quoteSecondaryButton}
                                  onClick={() => {
                                    if (quote.status === "accepted") {
                                      localStorage.setItem(
                                        "selectedConversation",
                                        JSON.stringify({
                                          businessName:
                                            quote.businessName || "Business",
                                          projectTitle:
                                            request.title || "Service",
                                        })
                                      );

                                      setNextStepsQuoteId(
                                        nextStepsQuoteId === quote.quoteId
                                          ? null
                                          : quote.quoteId
                                      );
                                      return;
                                    }

                                    setRevisionQuoteId(
                                      revisionQuoteId === quote.quoteId
                                        ? null
                                        : quote.quoteId
                                    );

                                    setRevisionText(quote.revisionNote || "");
                                  }}
                                >
                                  {quote.status === "accepted"
                                    ? t("viewNextSteps", language)
                                    : quote.status === "revision_requested"
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

                            {acceptQuoteId === quote.quoteId && (
                              <div style={acceptConfirmBox}>
                                <div style={acceptConfirmIcon}>✓</div>

                                <div style={{ flex: 1 }}>
                                  <strong style={acceptConfirmTitle}>
                                    {language === "es"
                                      ? "Aceptar esta cotización"
                                      : "Accept this quote"}
                                  </strong>

                                  <p style={acceptConfirmText}>
                                    {language === "es"
                                      ? "Estás seleccionando este profesional para continuar con tu servicio."
                                      : "You are selecting this professional to continue with your service."}
                                  </p>

                                  <div style={acceptConfirmSummary}>
                                    <span>
                                      {quote.businessName || "Business"}
                                    </span>
                                    <strong>${quote.amount || 0}</strong>
                                  </div>

                                  <div style={acceptConfirmActions}>
                                    <button
                                      style={confirmAcceptButton}
                                      onClick={() => {
                                        const acceptedAt = new Date().toISOString();
                                        const updatedRequests = requests.map((item) => {
                                          const itemId = item.requestId || item.id;

                                          if (String(itemId) !== String(requestId)) return item;

                                          const updatedQuotes = Array.isArray(item.quotesReceived)
                                            ? item.quotesReceived.map((savedQuote) => ({
                                                ...savedQuote,
                                                status:
                                                  savedQuote.quoteId === quote.quoteId
                                                    ? "accepted"
                                                    : "not_selected",
                                                quoteStatus:
                                                  savedQuote.quoteId === quote.quoteId
                                                    ? "accepted"
                                                    : savedQuote.quoteStatus,
                                                workflowStage:
                                                  savedQuote.quoteId === quote.quoteId
                                                    ? "approved"
                                                    : savedQuote.workflowStage,
                                                nextAction:
                                                  savedQuote.quoteId === quote.quoteId
                                                    ? "move_to_active"
                                                    : savedQuote.nextAction,
                                                acceptedAt:
                                                  savedQuote.quoteId === quote.quoteId
                                                    ? acceptedAt
                                                    : savedQuote.acceptedAt,
                                                acceptedBy:
                                                  savedQuote.quoteId === quote.quoteId
                                                    ? "customer"
                                                    : savedQuote.acceptedBy,
                                              }))
                                            : [];

                                          const acceptedQuote = {
                                            ...quote,
                                            status: "accepted",
                                            quoteStatus: "accepted",
                                            workflowStage: "approved",
                                            nextAction: "move_to_active",
                                            acceptedAt,
                                            acceptedBy: "customer",
                                            requestId,
                                            conversationId:
                                              quote.conversationId ||
                                              item.conversationId ||
                                              requestId,
                                          };

                                          return {
                                            ...item,
                                            status: "accepted",
                                            workflowStage: "approved",
                                            nextAction: "move_to_active",
                                            quotesReceived: updatedQuotes,
                                            acceptedQuote,
                                            selectedProfessional:
                                              quote.businessName || "Business",
                                            acceptedAt,
                                            acceptedBy: "customer",
                                            conversationId:
                                              item.conversationId ||
                                              quote.conversationId ||
                                              requestId,
                                            projectTimeline: [
                                              {
                                                type: "quoteAccepted",
                                                label: `Quote accepted from ${quote.businessName || "Business"}`,
                                                createdAt: acceptedAt,
                                                quoteId: quote.quoteId || "",
                                                amount: quote.amount || "",
                                                businessName: quote.businessName || "",
                                              },
                                              ...(Array.isArray(item.projectTimeline)
                                                ? item.projectTimeline
                                                : []),
                                            ],
                                          };
                                        });

                                        const updatedRequest = updatedRequests.find(
                                          (item) => String(item.requestId || item.id) === String(requestId)
                                        );
                                        const acceptedQuote =
                                          updatedRequest?.acceptedQuote || {
                                            ...quote,
                                            status: "accepted",
                                            quoteStatus: "accepted",
                                            workflowStage: "approved",
                                            nextAction: "move_to_active",
                                            acceptedAt,
                                            acceptedBy: "customer",
                                            requestId,
                                            conversationId:
                                              quote.conversationId ||
                                              updatedRequest?.conversationId ||
                                              requestId,
                                          };

                                        if (
                                          !saveHomeownerRequests(updatedRequests, {
                                            selectedRequestId: requestId,
                                          })
                                        ) {
                                          return;
                                        }

                                        addNotification({
                                          type: "quote_accepted",
                                          title:
                                            language === "es"
                                              ? "Cotización aceptada"
                                              : "Quote accepted",
                                          message:
                                            language === "es"
                                              ? `El cliente aceptó la cotización de $${quote.amount || 0}.`
                                              : `The customer accepted your $${quote.amount || 0} quote.`,
                                          priority: "high",
                                          targetRole: "professional",
                                          requestId,
                                          quoteId: quote.quoteId || "",
                                        });

                                        updateQuoteHistories(quote.quoteId, (savedQuote) => ({
                                          ...savedQuote,
                                          status: "accepted",
                                          quoteStatus: "accepted",
                                          workflowStage: "approved",
                                          nextAction: "move_to_active",
                                          acceptedAt,
                                          acceptedBy: "customer",
                                          requestId: savedQuote.requestId || requestId,
                                          conversationId:
                                            savedQuote.conversationId ||
                                            acceptedQuote.conversationId ||
                                            requestId,
                                        }));

                                        if (updatedRequest) {
                                          stageAcceptedQuoteForWork(updatedRequest, acceptedQuote);
                                        }

                                        setAcceptQuoteId(null);
                                      }}
                                    >
                                      {language === "es"
                                        ? "Confirmar Aceptación"
                                        : "Confirm Acceptance"}
                                    </button>

                                    <button
                                      style={cancelAcceptButton}
                                      onClick={() => setAcceptQuoteId(null)}
                                    >
                                      {language === "es" ? "Cancelar" : "Cancel"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {nextStepsQuoteId === quote.quoteId && (
                              <div style={nextStepsBox}>
                                <div style={nextStepsHeader}>
                                  <span style={nextStepsIcon}>OK</span>
                                  <div>
                                    <strong>
                                      {language === "es"
                                        ? "Próximos pasos"
                                        : "Service Next Steps"}
                                    </strong>
                                    <p>
                                      {language === "es"
                                        ? "Tu cotización fue aceptada. Ahora puedes coordinar con el profesional."
                                        : "Your quote was accepted. You can now coordinate with the professional."}
                                    </p>
                                  </div>
                                </div>

                                <div
                                  style={
                                    request.status === "scheduled"
                                      ? scheduledStatus
                                      : nextStepsStatus
                                  }
                                >
                                  <span
                                    style={
                                      request.status === "scheduled"
                                        ? scheduledStatusDot
                                        : nextStepsStatusDot
                                    }
                                  ></span>

                                  <strong>
                                    {request.status === "scheduled"
                                      ? language === "es"
                                        ? "Servicio programado"
                                        : "Service Scheduled"
                                      : language === "es"
                                      ? "Servicio en programación"
                                      : "Service entering scheduling"}
                                  </strong>
                                </div>

                                <div style={nextStepsList}>
                                  <div
                                    style={
                                      request.status === "scheduled"
                                        ? completedStepItem
                                        : nextStepItem
                                    }
                                  >
                                    {request.status === "scheduled" ? "" : "1."}{" "}
                                    {language === "es"
                                      ? "Confirmar fecha de inicio"
                                      : "Confirm start date"}
                                  </div>

                                  <div style={nextStepItem}>
                                    {request.status === "scheduled" ? "" : "2."}{" "}
                                    {language === "es"
                                      ? "Servicio programado"
                                      : "Service scheduled"}
                                  </div>

                                  <div style={pendingStepItem}>
                                    {" "}
                                    {language === "es"
                                      ? "Coordinar materiales y acceso"
                                      : "Coordinate materials and access"}
                                  </div>

                                  <div style={pendingStepItem}>
                                    {" "}
                                    {language === "es"
                                      ? "Seguir progreso del servicio"
                                      : "Track service progress"}
                                  </div>
                                </div>

                                <div style={nextStepsActionGrid}>
                                  <button
                                    style={nextPrimaryButton}
                                    onClick={() => {
                                      const updatedRequests = requests.map((item) => {
                                        const itemId = item.requestId || item.id;

                                        if (String(itemId) !== String(requestId)) return item;

                                        return {
                                          ...item,
                                          status: "scheduled",
                                          workflowStage: "scheduled",
                                          nextAction: "evaluation",
                                          scheduledAt: new Date().toISOString(),
                                        };
                                      });

                                      saveHomeownerRequests(updatedRequests, {
                                        selectedRequestId: requestId,
                                      });
                                    }}
                                  >
                                    {request.status === "scheduled"
                                      ? language === "es"
                                        ? "Programado"
                                        : "Scheduled"
                                      : language === "es"
                                      ? "Coordinar programación"
                                      : "Coordinate Scheduling"}
                                  </button>

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

                          setPage("emergencyComplete");
                        }}
                      >
                         {language === "es"
                          ? "Dejar Reseña"
                          : t("leaveReview")}
                      </button>
                    )}
                  </div>
                )}

                {editingId === requestId && !["completed", "cancelled"].includes(request.status) ? (
                  <div style={actionRow}>
                    <button
                      style={primaryButton}
                      onClick={() => saveEdit(requestId)}
                    >
                      {t("myRequestsSaveChanges", language)}
                    </button>

                    <button
                      style={secondaryButton}
                      onClick={() => setEditingId(null)}
                    >
                      {t("myRequestsCancelEdit", language)}
                    </button>
                  </div>
                ) : (
                  <div style={actionRow}>
                    {!["completed", "cancelled"].includes(request.status) && (
                      <button
                        style={secondaryButton}
                        onClick={() => {
                          localStorage.setItem("selectedHomeownerRequestId", requestId);

                          localStorage.setItem(
                            "selectedChangeOrderRequest",
                            JSON.stringify(request)
                          );

                          localStorage.setItem(
                            "selectedHomeownerRequest",
                            JSON.stringify(request)
                          );

                          localStorage.setItem(
                            "selectedHomeownerRequestId",
                            requestId
                          );

                          if (request.status === "accepted") {
                            setPage("changeOrderRequest");
                            return;
                          }

                          startEdit(request);
                          return;
                        }}
                      >
                        {request.status === "accepted"
                          ? language === "es"
                            ? "Solicitar Cambio"
                            : "Request Service Change"
                          : language === "es"
                          ? "Editar Solicitud"
                          : "Edit Request"}
                      </button>
                    )}

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

                              setPage("emergencyComplete");
                            }}
                          >
                             {language === "es"
                              ? "Revisar Finalización"
                              : "Review Completion"}
                          </button>
                        )}
                      </>
                    ) : (
                      request.status === "cancelled" ? (
                        <button
                          style={primaryButton}
                          onClick={() => restoreProject(requestId)}
                        >
                          {language === "es"
                            ? "Restaurar Solicitud"
                            : "Restore Request"}
                        </button>
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
                    )}
                  </>
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
                onClick={() => setPendingCancelId(null)}
              >
                {t("myRequestsKeepRequest", language)}
              </button>

              <button
                style={confirmCancelButton}
                onClick={confirmCancelProject}
              >
                {t("myRequestsYesCancel", language)}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "980px",
  margin: "0 auto",
};

const backButton = {
  border: "none",
  background: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
};

const header = {
  textAlign: "center",
  margin: "18px 0 24px",
};

const eyebrow = {
  margin: "0 0 8px",
  color: "#5b3df5",
  fontWeight: "900",
};

const title = {
  fontSize: "38px",
  fontWeight: "900",
  margin: "0 0 8px",
  color: "#111827",
};

const subtitle = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
  maxWidth: "640px",
  margin: "0 auto",
};

const emptyCard = {
  maxWidth: "520px",
  margin: "0 auto",
  background: "white",
  borderRadius: "28px",
  padding: "28px",
  textAlign: "center",
  boxShadow: "0 14px 34px rgba(15,23,42,.06)",
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
  minWidth: 0,
  overflowX: "hidden",
};

const miniTimeline = {
  marginTop: "12px",
  display: "grid",
  gap: "8px",
  background: "#f8f7ff",
  border: "1px solid #ede9fe",
  borderRadius: "18px",
  padding: "10px",
};

const miniTimelineItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const miniTimelineDot = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  boxShadow: "0 4px 10px rgba(91,61,245,0.08)",
  flexShrink: 0,
};

const miniTimelineLabel = {
  display: "block",
  fontSize: "12px",
  fontWeight: "900",
  color: "#111827",
};

const miniTimelineDate = {
  margin: "2px 0 0",
  fontSize: "11px",
  fontWeight: "800",
  color: "#475569",
};

const requestCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 14px 34px rgba(15,23,42,.07)",
  border: "1px solid #eef2ff",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const selectedRequestCard = {
  border: "2px solid #a78bfa",
  boxShadow: "0 18px 42px rgba(91,61,245,.14)",
};

const workflowHubCard = {
  marginTop: "14px",
  padding: "16px",
  borderRadius: "22px",
  border: "1px solid #dfe6f1",
  background: "#ffffff",
  boxShadow: "0 12px 30px rgba(15,23,42,.06)",
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
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "5px",
};

const workflowHubTitle = {
  margin: 0,
  color: "#050812",
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
  background: "#f7f4ff",
  border: "1px solid #ddd6fe",
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
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "900",
};

const workflowTimelinePillDone = {
  borderColor: "#bbf7d0",
  background: "#f0fdf4",
  color: "#047857",
};

const workflowTimelinePillCurrent = {
  borderColor: "#8b7cff",
  background: "#f7f4ff",
  color: "#4f28e8",
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
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
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
  background: "linear-gradient(135deg,#5b3df5,#4f28e8)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "950",
};

const workflowHubSecondaryButton = {
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "13px 14px",
  background: "#ffffff",
  color: "#371ce4",
  fontSize: "14px",
  fontWeight: "950",
};

const requestSplit = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "18px",
  alignItems: "stretch",
};

const requestMainPanel = {
  background: "white",
  borderRadius: "22px",
  minWidth: 0,
  maxWidth: "100%",
};

const requestMediaPanel = {
  background: "#f8fafc",
  border: "1px solid #eef2ff",
  borderRadius: "22px",
  padding: "18px",
  minWidth: 0,
};

const mediaHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  marginBottom: "12px",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "900",
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  minWidth: 0,
};

const cardPillRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const statusPill = {
  display: "inline-flex",
  background: "#eef2ff",
  color: "#5b3df5",
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

const cardTitle = {
  fontSize: "24px",
  margin: "12px 0 6px",
  color: "#111827",
};

const cardText = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
};

const dateText = {
  color: "#475569",
  fontWeight: "800",
  fontSize: "13px",
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
  background: "linear-gradient(135deg,#f3f0ff,#eef2ff)",
  border: "1px dashed #c4b5fd",
  color: "#5b3df5",
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

const scheduleSummaryCard = {
  marginTop: 14,
  padding: 16,
  borderRadius: 22,
  background: "linear-gradient(135deg,#eff6ff,#f8fafc)",
  border: "1px solid #bfdbfe",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.08)",
};

const scheduleSummaryHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const scheduleSummaryEyebrow = {
  display: "block",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 4,
};

const scheduleSummaryTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 950,
};

const scheduleSummaryStatus = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "7px 10px",
  background: "#fff7ed",
  color: "#c2410c",
  border: "1px solid #fed7aa",
  fontSize: 12,
  fontWeight: 950,
};

const scheduleSummaryStatusConfirmed = {
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #bbf7d0",
};

const scheduleSummaryStatusAttention = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
};

const scheduleSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};

const scheduleSummaryItem = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 12,
  borderRadius: 16,
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(191, 219, 254, 0.72)",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 900,
};

const scheduleSummaryNotes = {
  margin: "12px 0 0",
  padding: 12,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid #dbeafe",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 700,
};

const scheduleSummaryActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const scheduleConfirmButton = {
  border: "none",
  borderRadius: 16,
  padding: "12px 14px",
  background: "#16a34a",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
};

const scheduleDifferentTimeButton = {
  border: "1px solid #fed7aa",
  borderRadius: 16,
  padding: "12px 14px",
  background: "#fff7ed",
  color: "#c2410c",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
};

const scheduleConversationButton = {
  border: "1px solid #bfdbfe",
  borderRadius: 16,
  padding: "12px 14px",
  background: "#ffffff",
  color: "#2563eb",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
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

const metricsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3,1fr)",
  gap: "10px",
  margin: "16px 0",
};

const metricBox = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "14px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  color: "#111827",
  fontWeight: "900",
};

const quoteAlertMetricBox = {
  ...metricBox,
  background: "linear-gradient(135deg,#f5f3ff,#ffffff)",
  border: "2px solid #8b5cf6",
  color: "#5b3df5",
  boxShadow: "0 0 0 4px rgba(91,61,245,0.10), 0 0 28px rgba(91,61,245,0.35)",
};

const quoteAlertText = {
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "900",
};

const timelineBox = {
  display: "flex",
  gap: "12px",
  background: "#faf9ff",
  border: "1px solid #ede9fe",
  borderRadius: "20px",
  padding: "14px",
  color: "#4c1d95",
  marginBottom: "14px",
};

const timelineDot = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#5b3df5",
  marginTop: "5px",
  flexShrink: 0,
};

const acceptedMiniText = {
  color: "#047857",
  fontSize: "11px",
  fontWeight: "900",
};

const acceptedNotice = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  border: "1px solid #86efac",
  borderRadius: "18px",
  padding: "12px",
  marginBottom: "12px",
  boxShadow: "0 8px 20px rgba(16,185,129,0.08)",
};

const acceptedCheck = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  background: "#16a34a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "16px",
  flexShrink: 0,
};

const acceptedNoticeTitle = {
  display: "block",
  color: "#065f46",
  fontSize: "15px",
  marginBottom: "2px",
};

const acceptedNoticeText = {
  margin: "0 0 6px",
  color: "#047857",
  fontWeight: "700",
  lineHeight: 1.35,
  fontSize: "12px",
};

const acceptedNoticeMeta = {
  background: "white",
  border: "1px solid #bbf7d0",
  borderRadius: "12px",
  padding: "8px 10px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  color: "#065f46",
  fontWeight: "900",
  fontSize: "12px",
};

const acceptedQuoteCard = {
  border: "2px solid #22c55e",
  boxShadow: "0 12px 30px rgba(34,197,94,0.14)",
};

const acceptedQuoteBanner = {
  background: "#dcfce7",
  color: "#047857",
  borderRadius: "999px",
  padding: "6px 10px",
  display: "inline-flex",
  fontWeight: "900",
  marginBottom: "10px",
  fontSize: "11px",
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
  color: "#5b3df5",
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
  color: "#5b3df5",
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
  color: "#5b3df5",
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

const acceptQuoteButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 0 0 4px rgba(91,61,245,0.12), 0 0 30px rgba(91,61,245,0.45)",
};

const rejectQuoteButton = {
  border: "1px solid #fca5a5",
  background: "#fff5f5",
  color: "#dc2626",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const acceptConfirmBox = {
  marginTop: "10px",
  border: "1px solid #ddd6fe",
  background: "#faf7ff",
  borderRadius: "16px",
  padding: "12px",
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
};

const acceptConfirmIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "#5b3df5",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0,
};

const acceptConfirmTitle = {
  display: "block",
  fontSize: "18px",
  color: "#111827",
  marginBottom: "4px",
};

const acceptConfirmText = {
  margin: "0 0 12px",
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
};

const acceptConfirmSummary = {
  background: "white",
  border: "1px solid #ede9fe",
  borderRadius: "16px",
  padding: "12px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#111827",
  fontWeight: "900",
  marginBottom: "12px",
};

const acceptConfirmActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const confirmAcceptButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const cancelAcceptButton = {
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#475569",
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
  background: "#5b3df5",
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

const nextStepsBox = {
  marginTop: "10px",
  border: "1px solid #dbeafe",
  background: "linear-gradient(135deg,#f8fbff,#ffffff)",
  borderRadius: "16px",
  padding: "12px",
};

const nextStepsHeader = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "12px",
};

const nextStepsIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  background: "#16a34a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const scheduledStatus = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#ecfdf5",
  border: "1.5px solid #22c55e",
  borderRadius: "999px",
  padding: "10px 14px",
  marginBottom: "14px",
  color: "#047857",
  fontWeight: "900",
  boxShadow: "0 8px 22px rgba(34,197,94,0.14)",
};

const scheduledStatusDot = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "#16a34a",
};

const nextStepsStatus = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "white",
  border: "1px solid #bbf7d0",
  borderRadius: "999px",
  padding: "10px 14px",
  marginBottom: "14px",
  color: "#047857",
  fontWeight: "900",
};

const nextStepsStatusDot = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "#16a34a",
};

const nextStepsActionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const nextPrimaryButton = {
  border: "none",
  background: "#16a34a",
  color: "white",
  borderRadius: "14px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const nextSecondaryButton = {
  border: "1px solid #bbf7d0",
  background: "white",
  color: "#047857",
  borderRadius: "14px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const nextStepsList = {
  display: "grid",
  gap: "8px",
};


const input = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  color: "#111827",
  background: "#ffffff",
  outline: "none",
};

const textarea = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  color: "#111827",
  background: "#ffffff",
  outline: "none",
  resize: "vertical",
};

const completedStepItem = {
  background: "#ecfdf5",
  border: "1px solid #86efac",
  borderRadius: "14px",
  padding: "12px 14px",
  fontWeight: "900",
  color: "#047857",
};

const pendingStepItem = {
  background: "#ffffff",
  border: "1px solid #d1fae5",
  borderRadius: "14px",
  padding: "12px 14px",
  fontWeight: "800",
  color: "#065f46",
};

const nextStepItem = {
  background: "white",
  border: "1px solid #bbf7d0",
  borderRadius: "14px",
  padding: "10px 12px",
  fontWeight: "900",
};

const nextStepsButton = {
  border: "none",
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 0 0 4px rgba(34,197,94,0.12), 0 12px 26px rgba(34,197,94,0.25)",
};

const disabledQuoteButton = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#475569",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "not-allowed",
};

const editBox = {
  display: "grid",
  gap: "10px",
  marginTop: "12px",
};

const editLabel = {
  fontSize: "13px",
  fontWeight: "900",
  color: "#111827",
};

const editInput = {
  width: "100%",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid #dbeafe",
  fontSize: "16px",
  boxSizing: "border-box",
};

const editTextarea = {
  ...editInput,
  minHeight: "90px",
  resize: "vertical",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
  maxWidth: "100%",
  minWidth: 0,
};

const acceptedStatusPill = {
  border: "none",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "999px",
  padding: "14px",
  fontWeight: "900",
  cursor: "default",
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

const completedProjectButton = {
  width: "100%",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#111827",
  borderRadius: "20px",
  padding: "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
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

const editPhotoManager = {
  display: "grid",
  gap: "12px",
};

const addPhotoButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "9px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const editPhotoCard = {
  position: "relative",
  width: "140px",
  height: "150px",
  borderRadius: "18px",
  overflow: "hidden",
  flex: "0 0 auto",
  scrollSnapAlign: "start",
  background: "#111827",
  boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
};

const editPhotoPreviewButton = {
  width: "100%",
  height: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
};

const deletePhotoButton = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(239,68,68,0.95)",
  color: "white",
  fontSize: "20px",
  fontWeight: "900",
  cursor: "pointer",
  zIndex: 2,
};

const primaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "16px",
  padding: "14px 18px",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryButton = {
  width: "100%",
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: "16px",
  padding: "13px",
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
  background: "#5b3df5",
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
