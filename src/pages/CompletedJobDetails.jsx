import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { t } from "../utils/language";
import { shareCompletionRecord } from "../utils/completionShare";
import { saveProfessionalReview } from "../utils/reviewStorage";
import { formatMessageTime } from "../utils/displayTime";
import {
  moveJobToHistory,
  updateProjectLifecycleState,
} from "../utils/projectLifecycleSync";
import {
  getConversationOriginContext,
  restoreConversationOriginContext,
} from "../utils/conversationOrigin";
import {
  buildTimelineClosureOffer,
  createTimelineMomentFromClosedProject,
  getTimelineMomentsForProject,
  readTimelineMoments,
  TIMELINE_MOMENT_STATUSES,
} from "../utils/meetroTimeline";
import {
  getMediaDeferredCopy,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";
import {
  getDisplayPhotoUrl,
  getMomentPreviewPhotos,
  normalizeCompletedJobRecord,
} from "../utils/completedJobDetails";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function CompletedJobDetails({ setPage, completedRecord = null }) {
  const language = localStorage.getItem("language") || "en";
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();
  const mediaDeferredCopy = getMediaDeferredCopy(language);
  const openedFromConversation = Boolean(getConversationOriginContext());
  const completedProject = normalizeCompletedJobRecord(completedRecord);
  const [savedReview, setSavedReview] = useState(completedProject?.review || null);
  const [completionApproved, setCompletionApproved] = useState(
    Boolean(
      completedProject?.completionApproved ||
        completedProject?.homeownerCompletionApproved
    )
  );
  const [resolveTogetherOpen, setResolveTogetherOpen] = useState(
    String(completedProject?.status || "").toLowerCase() === "needs_resolution" ||
      Boolean(completedProject?.completionConcern)
  );
  const [resolutionState, setResolutionState] = useState(
    completedProject?.resolutionState ||
      (completedProject?.completionConcern ? "needs_resolution" : "")
  );
  const [concernType, setConcernType] = useState("work_correction");
  const [concernDetails, setConcernDetails] = useState("");
  const [concernResolution, setConcernResolution] = useState("");
  const [concernPhotos, setConcernPhotos] = useState([]);
  const [concernError, setConcernError] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [timelineMomentNotice, setTimelineMomentNotice] = useState("");
  const [timelineOfferDismissed, setTimelineOfferDismissed] = useState(false);
  const [timelineOfferProject, setTimelineOfferProject] = useState(null);
  const [createdTimelineMoment, setCreatedTimelineMoment] = useState(null);
  const [momentPreviewTitle, setMomentPreviewTitle] = useState("");
  const [momentPreviewReflection, setMomentPreviewReflection] = useState("");
  const [momentCoverPhotoIndex, setMomentCoverPhotoIndex] = useState(0);

  if (!completedProject) {
    const isBusinessMode =
      localStorage.getItem("activeAccountMode") === "business" ||
      localStorage.getItem("accountType") === "professional";
    const returnFromUnavailableRecord = () => {
      if (isBusinessMode) {
        localStorage.setItem("meetroWorkCenterTab", "history");
        localStorage.setItem("activeWorkCenterTab", "history");
        setPage("contractorDashboard");
        return;
      }
      setPage("home");
    };

    return (
      <div className="app-page meetro-readable-page" style={page}>
        <main style={unavailableCard} aria-labelledby="completed-record-unavailable-title">
          <h1 id="completed-record-unavailable-title" style={unavailableTitle}>
            {t("completedJobDetailsUnavailable")}
          </h1>
          <p style={unavailableCopy}>{t("completedJobDetailsUnavailableBody")}</p>
          <button
            type="button"
            style={primaryButton}
            onClick={returnFromUnavailableRecord}
          >
            {isBusinessMode ? t("returnToWorkCenter") : t("backHome")}
          </button>
        </main>
        <BottomNav
          setPage={setPage}
          currentPage={isBusinessMode ? "contractorDashboard" : "home"}
        />
      </div>
    );
  }

  const completedDateValue =
    completedProject?.completedAt ||
    completedProject?.closedAt ||
    completedProject?.closeDate ||
    "";
  const completedDate = completedDateValue
    ? new Date(completedDateValue)
    : null;

  const service =
    completedProject?.title ||
    completedProject?.service ||
    "";

  const type =
    completedProject?.category ||
    completedProject?.source ||
    "";

  const customer =
    completedProject?.homeownerName ||
    completedProject?.customerName ||
    completedProject?.customer ||
    completedProject?.username ||
    "";

  const location =
    completedProject?.location ||
    "";

  const date =
    completedDate?.toLocaleDateString() || "";

  const time =
    formatMessageTime(completedDate) || "";

  const rawAmount =
    completedProject?.finalAmount ||
    completedProject?.revenue ||
    completedProject?.amount ||
    completedProject?.acceptedQuote?.amount ||
    completedProject?.quote?.amount ||
    completedProject?.quote?.total ||
    "";

  const cleanAmount = Number(String(rawAmount).replace(/[^0-9.]/g, "")) || 0;
  const amount = rawAmount === "" ? "" : `+$${cleanAmount}`;

  const rawMaterialCost =
    completedProject?.acceptedQuote?.materials || "";

  const materialCost = String(
    Math.max(Number(rawMaterialCost), 0)
  );

  const completionPhotos =
    safeArray(completedProject?.photos).length > 0
      ? safeArray(completedProject?.photos)
      : safeArray(completedProject?.completionPhotos).length > 0
      ? safeArray(completedProject?.completionPhotos)
      : safeArray(completedProject?.finalPhotos).length > 0
      ? safeArray(completedProject?.finalPhotos)
      : safeArray(completedProject?.completionRecord?.photos).length > 0
      ? safeArray(completedProject?.completionRecord?.photos)
      : [];

  const rawCompletionNotes =
    completedProject?.acceptedQuote?.notes ||
    completedProject?.description || "";

  const completionNotes =
    String(rawCompletionNotes).toLowerCase().includes("after approval work starts")
      ? t("afterApprovalWorkStarts")
      : rawCompletionNotes;

  const businessName =
    completedProject?.professionalName ||
    completedProject?.businessName ||
    completedProject?.selectedProfessional ||
    completedProject?.acceptedQuote?.businessName ||
    completedProject?.quote?.businessName || "";
  const submittedReview = savedReview || completedProject?.review || null;
  const requestId =
    completedProject?.requestId ||
    completedProject?.jobId ||
    completedProject?.projectId ||
    completedProject?.id ||
    completedProject?.historyId ||
    "";
  const completionSummary =
    completedProject?.completionSummary ||
    completedProject?.completedWorkSummary ||
    completedProject?.workCompletedSummary ||
    completedProject?.completionRecord?.summary ||
    completionNotes;
  const receiptUrl =
    completedProject?.receiptUrl ||
    completedProject?.invoiceUrl ||
    completedProject?.receipt?.url ||
    completedProject?.invoice?.url ||
    "";

  const accountType = localStorage.getItem("accountType") || "homeowner";
  const activeMode = localStorage.getItem("activeAccountMode") || "personal";

  const completedJobViewMode =
    localStorage.getItem("completedJobViewMode") || "";
  const isHistoryMode = completedJobViewMode === "homeownerHistory";

  const isHomeownerView =
    completedJobViewMode === "homeowner" ||
    completedJobViewMode === "homeownerHistory" ||
    (
      activeMode !== "business" &&
      accountType !== "professional"
    );
  const isClosureVerified =
    Boolean(completedProject?.closedAt || completedProject?.closureDecisionRef) ||
    String(
      completedProject?.closureStatus ||
        completedProject?.closure_status ||
        ""
    ).toLowerCase() === "closed";

  function getProjectConversationId() {
    return (
      completedProject?.conversationId ||
      completedProject?.activeConversationId ||
      completedProject?.projectConversationId ||
      requestId
    );
  }

  const buildTimelineSourceProject = (sourceProject = {}) => ({
    ...(sourceProject || {}),
    projectId:
      sourceProject.projectId ||
      sourceProject.requestId ||
      sourceProject.jobId ||
      requestId,
    relationshipId:
      sourceProject.relationshipId ||
      sourceProject.customerRelationshipId ||
      sourceProject.conversationId ||
      getProjectConversationId(),
    conversationId: sourceProject.conversationId || getProjectConversationId(),
    customerName: sourceProject.customerName || sourceProject.customer || customer,
    businessName: sourceProject.businessName || businessName,
    projectTitle: sourceProject.projectTitle || sourceProject.title || service,
    projectCategory: sourceProject.projectCategory || sourceProject.category || type,
    completionDate:
      sourceProject.completionDate ||
      sourceProject.completedAt ||
      sourceProject.completionApprovedAt ||
      completedDate?.toISOString?.() ||
      "",
    closureDate:
      sourceProject.closureDate ||
      sourceProject.closedAt ||
      sourceProject.closeDate ||
      "",
  });

  const timelineSourceProject = timelineOfferProject || buildTimelineSourceProject(completedProject || {});
  const storedTimelineMoment = getTimelineMomentsForProject(
    readTimelineMoments(localStorage),
    timelineSourceProject.projectId || requestId
  )[0];
  const existingTimelineMoment = createdTimelineMoment || storedTimelineMoment || null;
  const timelineClosureOffer =
    !isHomeownerView && !timelineOfferDismissed && !existingTimelineMoment
      ? buildTimelineClosureOffer(timelineSourceProject)
      : { eligible: false };
  const timelinePreviewMoment = timelineClosureOffer.offer?.momentPreview || null;
  const timelinePreviewPhotos = getMomentPreviewPhotos(
    timelinePreviewMoment,
    completionPhotos
  );
  const selectedMomentPhoto =
    timelinePreviewPhotos[
      Math.min(momentCoverPhotoIndex, Math.max(timelinePreviewPhotos.length - 1, 0))
    ] || null;
  const selectedMomentPhotoUrl = getDisplayPhotoUrl(selectedMomentPhoto);
  const printedMomentTitle =
    momentPreviewTitle ||
    timelinePreviewMoment?.projectTitle ||
    service ||
    "Completed Project";
  const printedMomentReflection =
    momentPreviewReflection ||
    timelinePreviewMoment?.generatedMessage ||
    "This completed work became part of a relationship, a promise kept, and a story worth remembering.";

  const shareRecord = () =>
    shareCompletionRecord(completedProject || {
      title: service,
      service,
      customer,
      location,
      amount: cleanAmount,
      materialCost,
      notes: completionNotes,
      completedAt: completedDate?.toISOString(),
    }, {
      fallbackToPrint: true,
    });

  const syncCompletionRecord = (projectRecord, options = {}) => {
    localStorage.setItem("lastCompletedProject", JSON.stringify(projectRecord));
    updateCompletionRecordInStorage("homeownerRequests", projectRecord, options);
    updateCompletionRecordInStorage("completedProjects", projectRecord, options);

    if (options.savedToHistory === false) {
      updateProjectLifecycleState(
        projectRecord,
        projectRecord.workflowStatus || projectRecord.status || "completed",
        {
          ...projectRecord,
          conversationId: getProjectConversationId(),
          title: service,
          service,
          customerName: customer,
          businessName,
        }
      );
      return;
    }

    if (options.savedToHistory) {
      moveJobToHistory(projectRecord, {
        ...projectRecord,
        conversationId: getProjectConversationId(),
        title: service,
        service,
        customerName: customer,
        businessName,
        closedAt:
          projectRecord.closedAt ||
          projectRecord.completionApprovedAt ||
          new Date().toISOString(),
      });
    }
  };

  const appendProjectConversationMessage = (message) => {
    const conversationId = getProjectConversationId();
    if (!conversationId) return;

    const storageKey = `meetro_conversation_${conversationId}`;
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const createdAt = message.createdAt || new Date().toISOString();
    const nextMessage = {
      id: message.id || `completion-resolution-${Date.now()}`,
      type: message.type || "workflow_resolution",
      sender: message.sender || "homeowner",
      role: message.role || "homeowner",
      time: formatMessageTime(new Date(createdAt)),
      createdAt,
      requestId,
      projectTitle: service,
      ...message,
    };

    localStorage.setItem(storageKey, JSON.stringify([...existingMessages, nextMessage]));
    localStorage.setItem(`meetro_conversation_saved_${conversationId}`, "true");
    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "false");

    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );
    const existingConversation = registry.find(
      (item) => String(item.id) === String(conversationId)
    );
    const nextConversation = {
      ...(existingConversation || {}),
      id: conversationId,
      project_title: service,
      projectTitle: service,
      businessName,
      homeownerName: customer,
      status: t("needsResolution"),
      resolutionStatus: "needs_resolution",
      conversation_type: existingConversation?.conversation_type || "standard",
      workflowLabel: t("needsResolution"),
      unread: true,
      lastMessage: nextMessage.text || nextMessage.title || t("needsResolution"),
      updatedAt: createdAt,
    };

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify([
        nextConversation,
        ...registry.filter((item) => String(item.id) !== String(conversationId)),
      ])
    );
    window.dispatchEvent(new Event("meetro-messages-updated"));
  };

  const confirmCompletion = () => {
    const approvedAt = new Date().toISOString();
    const approvedProject = {
      ...(completedProject || {}),
      requestId,
      id: completedProject?.id || requestId,
      status: "completed",
      completionApproved: true,
      homeownerCompletionApproved: true,
      completionApprovedAt: approvedAt,
      completedAt: completedProject?.completedAt || approvedAt,
      savedToHistory: true,
    };

    syncCompletionRecord(approvedProject, { savedToHistory: true });
    setTimelineOfferProject(
      buildTimelineSourceProject({
        ...approvedProject,
        status: "closed",
        workflowStatus: "closed",
        workStatus: "closed",
        closureStatus: "closed",
        closedAt: approvedAt,
        closeDate: approvedAt,
      })
    );
    setTimelineOfferDismissed(false);
    setCompletionApproved(true);
    setResolutionState("");
  };

  const preserveMeetroMoment = () => {
    const result = createTimelineMomentFromClosedProject(timelineSourceProject, {
      storage: localStorage,
      projectTitle: printedMomentTitle,
      thankYouMessage: printedMomentReflection,
      momentReflection: printedMomentReflection,
      coverPhoto: selectedMomentPhoto,
    });

    if (!result.created) {
      setTimelineMomentNotice("Close the project before preserving a Meetro Moment.");
      return;
    }

    setCreatedTimelineMoment(result.moment);
    setTimelineMomentNotice(
      result.moment.status === TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION
        ? "Meetro Moment is waiting for customer confirmation."
        : "Meetro Moment preserved."
    );
  };

  const dismissMeetroMomentOffer = () => {
    setTimelineOfferDismissed(true);
    setTimelineMomentNotice("");
  };

  const openProjectConversation = (context = "completion") => {
    if (restoreConversationOriginContext(setPage)) return;

    const conversationId = getProjectConversationId();

    localStorage.setItem("selectedHomeownerRequestId", String(requestId || conversationId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(completedProject || {}));
    localStorage.setItem("activeConversationId", String(conversationId));
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem("activeConversationName", isHomeownerView ? businessName : customer);
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: conversationId,
        type: "work",
        category: "work",
        businessName,
        participantName: isHomeownerView ? businessName : customer,
        homeownerName: customer,
        projectTitle: service,
        requestId,
        source: context === "resolution" ? "resolve_together" : "completion_review",
      })
    );
    localStorage.setItem("conversationReturnPage", "completedJobDetails");
    localStorage.setItem("returnPage", "completedJobDetails");
    setPage("conversationThread");
  };

  const readConcernPhotos = (event) => {
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language,
        onDeferred: setConcernError,
      })
    ) {
      return;
    }

    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setConcernPhotos((photos) => [
          ...photos,
          {
            id: `concern-photo-${Date.now()}-${photos.length}`,
            name: file.name,
            dataUrl: reader.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };

  const submitResolveTogether = () => {
    if (!concernDetails.trim() || !concernResolution.trim()) {
      setConcernError(t("resolveTogetherRequired"));
      return;
    }

    const concernAt = new Date().toISOString();
    const concernPayload = {
      type: concernType,
      typeLabel: t(resolveConcernTypeKey(concernType)),
      whatHappened: concernDetails.trim(),
      desiredResolution: concernResolution.trim(),
      photos: concernPhotos,
      createdAt: concernAt,
    };
    const concernProject = {
      ...(completedProject || {}),
      requestId,
      id: completedProject?.id || requestId,
      status: "needs_resolution",
      workflowStatus: "needs_resolution",
      resolutionState: "needs_resolution",
      completionConcern: concernPayload,
      completionConcernReported: true,
      completionConcernReportedAt: concernAt,
      needsAttention: true,
      projectTimeline: [
        {
          type: "completionConcernReported",
          label: t("customerConcernSubmitted"),
          createdAt: concernAt,
        },
        ...(Array.isArray(completedProject?.projectTimeline)
          ? completedProject.projectTimeline
          : []),
      ],
    };

    syncCompletionRecord(concernProject, { savedToHistory: false });
    updateProjectLifecycleState(concernProject, "needs_resolution", {
      conversationId: getProjectConversationId(),
      title: service,
      service,
      customerName: customer,
      businessName,
      resolutionStatus: "needs_resolution",
      lastMessage: t("customerConcernSubmitted"),
      updatedAt: concernAt,
    });
    appendProjectConversationMessage({
      sender: "homeowner",
      role: "homeowner",
      title: t("resolveTogether"),
      text: `${t("customerConcernSubmitted")}: ${concernPayload.typeLabel}. ${concernPayload.whatHappened}`,
      subtitle: concernPayload.desiredResolution,
      resolutionStatus: "needs_resolution",
      concern: concernPayload,
      createdAt: concernAt,
    });
    setConcernError("");
    setResolveTogetherOpen(false);
    setResolutionState("needs_resolution");
  };

  const openResolveTogether = () => {
    setConcernError("");
    setResolveTogetherOpen(true);

    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      document
        .getElementById("completion-concern-flow")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const markResolutionCorrected = () => {
    const resolvedAt = new Date().toISOString();
    const resolvedProject = {
      ...(completedProject || {}),
      requestId,
      id: completedProject?.id || requestId,
      status: "correction_submitted",
      workflowStatus: "correction_submitted",
      resolutionState: "correction_submitted",
      correctedAt: resolvedAt,
      needsAttention: true,
      projectTimeline: [
        {
          type: "completionCorrectionSubmitted",
          label: t("markedCorrectedResolved"),
          createdAt: resolvedAt,
        },
        ...(Array.isArray(completedProject?.projectTimeline)
          ? completedProject.projectTimeline
          : []),
      ],
    };

    syncCompletionRecord(resolvedProject, { savedToHistory: false });
    updateProjectLifecycleState(resolvedProject, "corrected_resolved", {
      conversationId: getProjectConversationId(),
      title: service,
      service,
      customerName: customer,
      businessName,
      resolutionStatus: "corrected_resolved",
      lastMessage: t("markedCorrectedResolved"),
      updatedAt: resolvedAt,
    });
    appendProjectConversationMessage({
      sender: "business",
      role: "business",
      title: t("markedCorrectedResolved"),
      text: t("correctionSubmittedMessage"),
      resolutionStatus: "correction_submitted",
      createdAt: resolvedAt,
    });
    setResolutionState("correction_submitted");
  };

  const closeAfterResolution = () => {
    const closedAt = new Date().toISOString();
    const closedProject = {
      ...(completedProject || {}),
      requestId,
      id: completedProject?.id || requestId,
      status: "completed",
      workflowStatus: "completed",
      resolutionState: "resolved",
      resolutionClosedAt: closedAt,
      completionApproved: true,
      homeownerCompletionApproved: true,
      completionApprovedAt: closedAt,
      savedToHistory: true,
      needsAttention: false,
    };

    syncCompletionRecord(closedProject, { savedToHistory: true });
    moveJobToHistory(closedProject, {
      conversationId: getProjectConversationId(),
      title: service,
      service,
      customerName: customer,
      businessName,
      resolutionStatus: "resolved",
      lastMessage: t("resolutionConfirmed"),
      closedAt,
      updatedAt: closedAt,
    });
    appendProjectConversationMessage({
      sender: "homeowner",
      role: "homeowner",
      title: t("resolutionConfirmed"),
      text: t("resolutionConfirmedMessage"),
      resolutionStatus: "resolved",
      createdAt: closedAt,
    });
    setCompletionApproved(true);
    setResolutionState("resolved");
  };

  const stillNeedsAttention = () => {
    const updatedAt = new Date().toISOString();
    appendProjectConversationMessage({
      sender: "homeowner",
      role: "homeowner",
      title: t("stillNeedsAttention"),
      text: t("stillNeedsAttentionMessage"),
      resolutionStatus: "needs_resolution",
      createdAt: updatedAt,
    });
    setResolutionState("needs_resolution");
  };

  const saveReview = () => {
    if (!isHomeownerView || submittedReview) return;

    const requestId =
      completedProject?.requestId ||
      completedProject?.jobId ||
      completedProject?.projectId ||
      completedProject?.id ||
      completedProject?.historyId ||
      "";
    const review = saveProfessionalReview({
      professionalId:
        completedProject?.professionalId ||
        completedProject?.businessId ||
        completedProject?.contractorId ||
        businessName,
      professionalName: businessName,
      customerDisplayName: customer,
      service,
      jobId: requestId,
      requestId,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date().toISOString(),
      source: "homeowner_service_history",
    });

    if (!review) return;

    const reviewedProject = {
      ...(completedProject || {}),
      review,
      reviewSubmitted: true,
      reviewSubmittedAt: review.createdAt,
    };

    localStorage.setItem("lastCompletedProject", JSON.stringify(reviewedProject));
    updateReviewedRecordInStorage("completedProjects", reviewedProject);
    updateReviewedRecordInStorage("homeownerRequests", reviewedProject);
    setSavedReview(review);
  };

  if (!isHomeownerView && timelineClosureOffer.eligible) {
    return (
      <div className="app-page meetro-readable-page" style={momentPreviewPage}>
        <button
          type="button"
          style={momentPreviewBack}
          onClick={dismissMeetroMomentOffer}
        >
          Keep in History
        </button>

        <main style={momentPreviewShell} aria-label="Meetro Moment preview">
          <section style={momentPhotoCanvas}>
            {selectedMomentPhotoUrl ? (
              <img src={selectedMomentPhotoUrl} alt="" style={momentCanvasImage} />
            ) : (
              <div style={momentCanvasFallback}>
                <span>Verified Meetro Moment</span>
              </div>
            )}
            <div style={momentCanvasShade} />
            <div style={momentCanvasStory}>
              <span style={momentPrintedBadge}>Verified Meetro Moment</span>
              <h1
                style={momentPrintedTitle}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Moment title"
                onBlur={(event) => {
                  const nextValue = event.currentTarget.textContent.trim();
                  setMomentPreviewTitle(nextValue || timelinePreviewMoment?.projectTitle || service);
                }}
              >
                {printedMomentTitle}
              </h1>
              <p style={momentPrintedMeta}>
                {[date, customer, businessName].filter(Boolean).join(" · ")}
              </p>
              <p
                style={momentPrintedReflection}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Moment reflection"
                onBlur={(event) => {
                  const nextValue = event.currentTarget.textContent.trim();
                  setMomentPreviewReflection(nextValue || printedMomentReflection);
                }}
              >
                {printedMomentReflection}
              </p>
            </div>
          </section>

          {timelinePreviewPhotos.length > 1 && (
            <section style={momentPhotoStrip} aria-label="Moment photographs">
              <p style={momentPhotoHint}>
                Swipe through the photographs. Tap the one that feels like the memory.
              </p>
              <div style={momentPhotoScroller}>
                {timelinePreviewPhotos.map((photo, index) => {
                  const photoUrl = getDisplayPhotoUrl(photo);
                  return (
                    <button
                      key={photo.id || photo.dataUrl || photo.url || photoUrl || index}
                      type="button"
                      style={
                        index === momentCoverPhotoIndex
                          ? momentPhotoThumbActive
                          : momentPhotoThumb
                      }
                      onClick={() => setMomentCoverPhotoIndex(index)}
                      aria-label={`Use photograph ${index + 1}`}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt="" style={momentPhotoThumbImage} />
                      ) : (
                        <span />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <p style={momentKeepsakeLine}>
            Completed {date} with {customer} and {businessName}
            {timelinePreviewMoment?.warranty ? " · Warranty included" : ""}
          </p>

          {timelineMomentNotice && (
            <p style={momentPreviewNotice}>{timelineMomentNotice}</p>
          )}

          <div style={momentPreviewActions}>
            <button type="button" style={momentPreserveButton} onClick={preserveMeetroMoment}>
              Preserve Meetro Moment
            </button>
            <button type="button" style={momentQuietButton} onClick={dismissMeetroMomentOffer}>
              Keep in History
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isHomeownerView) {
    const isReadOnlyHistory =
      isHistoryMode &&
      Boolean(
        completionApproved ||
          completedProject?.savedToHistory ||
          completedProject?.closedAt ||
          completedProject?.closureStatus === "closed"
      );
    const hasCompletionDetails =
      Boolean(completionNotes) ||
      completionPhotos.length > 0 ||
      Boolean(materialCost && Number(materialCost) > 0) ||
      Boolean(receiptUrl);

    return (
      <div className="app-page meetro-readable-page" style={page}>
        <button
          style={backButton}
          onClick={() => {
            if (restoreConversationOriginContext(setPage)) return;
            setPage("projectDetails");
          }}
        >
          {openedFromConversation ? "× Close" : `← ${t("backToProjectJourney")}`}
        </button>

        <div style={completionHeader}>
          <span style={typePill}>{t("completionReview")}</span>
          <h1 style={title}>{service}</h1>
          <p style={subtitle}>{businessName}</p>
        </div>

        <div style={card}>
          <section style={completionSummaryCard}>
            <div>
              <span style={sectionEyebrow}>{t("completionSummary")}</span>
              <h2 style={completionStatusTitle}>
                {completionApproved
                  ? t("completionApproved")
                  : t("completionReadyForReview")}
              </h2>
              <p style={completionSummaryText}>
                {completionSummary ||
                  t("completionDetailsEmpty")}
              </p>
            </div>

            <div style={infoGrid}>
              <div style={infoBox}>
                <span>{t("dateCompleted")}</span>
                <strong>{date}</strong>
              </div>
              <div style={infoBox}>
                <span>{t("professional")}</span>
                <strong>{businessName}</strong>
              </div>
              <div style={infoBox}>
                <span>{t("completionStatus")}</span>
                <strong>
                  {completionApproved
                    ? t("confirmedComplete")
                    : t("awaitingYourReview")}
                </strong>
              </div>
            </div>
          </section>

          <section style={section}>
            <h2>{t("completionDetails")}</h2>
            {hasCompletionDetails ? (
              <div style={detailsGrid}>
                <div style={detailBlock}>
                  <strong>{t("workCompletedNotes")}</strong>
                  <p>{completionNotes || t("notesNotAdded")}</p>
                </div>

                <div style={detailBlock}>
                  <strong>{t("materialsReceiptSummary")}</strong>
                  <div style={miniRow}>
                    <span>{t("totalCharged")}</span>
                    <strong>{amount}</strong>
                  </div>
                  <div style={miniRow}>
                    <span>{t("materialCost")}</span>
                    <strong>${materialCost}</strong>
                  </div>
                  {receiptUrl && (
                    <button
                      type="button"
                      style={secondaryButton}
                      onClick={() => window.open(receiptUrl, "_blank", "noopener,noreferrer")}
                    >
                      {t("viewReceipt")}
                    </button>
                  )}
                </div>

                <div style={detailBlock}>
                  <strong>{t("finalPhotos")}</strong>
                  {completionPhotos.length === 0 ? (
                    <div style={photoNotice}>{t("completionDetailsEmpty")}</div>
                  ) : (
                    <div style={photoGrid}>
                      {completionPhotos.map((photo, index) => (
                        <div key={photo.id || photo.dataUrl || photo.url || index} style={photoBox}>
                          <img
                            src={photo.dataUrl || photo.url || photo}
                            alt=""
                            style={photoImage}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={photoNotice}>{t("completionDetailsEmpty")}</div>
            )}
          </section>

          <section style={section}>
            <h2>
              {isReadOnlyHistory
                ? t("homeServiceHistoryTitle")
                : resolutionState === "correction_submitted"
                ? t("isThisResolved")
                : t("wasWorkCompletedSatisfaction")}
            </h2>
            {isReadOnlyHistory ? (
              <p style={completionSummaryText}>
                {t("completedProjectRecord")}
              </p>
            ) : resolutionState === "needs_resolution" ? (
              <div style={resolutionNotice}>
                <strong>{t("needsResolution")}</strong>
                <p>{t("needsResolutionHomeownerText")}</p>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => openProjectConversation("resolution")}
                >
                  {t("continueConversation")}
                </button>
              </div>
            ) : resolutionState === "correction_submitted" ? (
              <div style={decisionActions}>
                <p style={completionSummaryText}>{t("professionalMarkedResolved")}</p>
                <button
                  type="button"
                  style={primaryButton}
                  onClick={closeAfterResolution}
                >
                  {t("yesCloseProject")}
                </button>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={stillNeedsAttention}
                >
                  {t("stillNeedsAttention")}
                </button>
              </div>
            ) : (
              <div style={decisionActions}>
                <button
                  type="button"
                  style={primaryButton}
                  onClick={confirmCompletion}
                  disabled={completionApproved}
                >
                  {completionApproved
                    ? t("confirmedComplete")
                    : t("yesEverythingLooksGood")}
                </button>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={openResolveTogether}
                >
                  {t("iHaveAConcern")}
                </button>
              </div>
            )}
          </section>

          {resolveTogetherOpen && !completionApproved && resolutionState !== "needs_resolution" && (
            <section id="completion-concern-flow" style={resolveCard}>
              <div>
                <span style={sectionEyebrow}>{t("resolveTogether")}</span>
                <h2 style={completionStatusTitle}>{t("resolveTogether")}</h2>
                <p style={completionSummaryText}>{t("resolveTogetherSubtitle")}</p>
              </div>

              <label style={formLabel}>
                {t("concernType")}
                <select
                  style={formControl}
                  value={concernType}
                  onChange={(event) => setConcernType(event.target.value)}
                >
                  {CONCERN_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={formLabel}>
                {t("whatHappened")}
                <textarea
                  style={reviewTextarea}
                  value={concernDetails}
                  onChange={(event) => setConcernDetails(event.target.value)}
                  placeholder={t("whatHappenedPlaceholder")}
                />
              </label>

              <label style={formLabel}>
                {t("whatWouldMakeRight")}
                <textarea
                  style={reviewTextarea}
                  value={concernResolution}
                  onChange={(event) => setConcernResolution(event.target.value)}
                  placeholder={t("whatWouldMakeRightPlaceholder")}
                />
              </label>

              <label style={formLabel}>
                {t("addPhotosOptional")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={mediaUploadDeferred}
                  style={
                    mediaUploadDeferred
                      ? { ...fileInput, ...disabledFileInput }
                      : fileInput
                  }
                  onChange={readConcernPhotos}
                />
                {mediaUploadDeferred && (
                  <span style={deferredPhotoHelp}>{mediaDeferredCopy.detail}</span>
                )}
              </label>

              {concernPhotos.length > 0 && (
                <div style={photoGrid}>
                  {concernPhotos.map((photo) => (
                    <div key={photo.id} style={photoBox}>
                      <img src={photo.dataUrl} alt="" style={photoImage} />
                    </div>
                  ))}
                </div>
              )}

              {concernError && <p style={errorText}>{concernError}</p>}

              <div style={decisionActions}>
                <button type="button" style={primaryButton} onClick={submitResolveTogether}>
                  {t("submitConcern")}
                </button>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => setResolveTogetherOpen(false)}
                >
                  {t("cancel")}
                </button>
              </div>
            </section>
          )}

          {completionApproved && (
            <section style={section}>
              <h2>{t("leaveReview")}</h2>
              {submittedReview ? (
                <p>{`${submittedReview.rating} · ${submittedReview.comment}`}</p>
              ) : (
                <div style={reviewForm}>
                  <strong>{t("rateYourExperience")}</strong>
                  <div style={starRow} aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        style={star <= reviewRating ? activeStarButton : starButton}
                        onClick={() => setReviewRating(star)}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      >
                        {star}
                      </button>
                    ))}
                  </div>
                  <textarea
                    style={reviewTextarea}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder={t("shareShortComment")}
                  />
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={saveReview}
                  >
                    {t("saveReview")}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <BottomNav setPage={setPage} currentPage="home" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-readable-page" style={page}>
      <style>
        {`
          @media print {

            html,body{
              margin:0 !important;
              padding:0 !important;
              height:auto !important;
            }

            button{
              display:none !important;
            }

            .bottom-nav,
            nav{
              display:none !important;
            }

            body{
              zoom:.82;
              overflow:hidden !important;
              background:white !important;
            }

            *{
              page-break-inside:avoid;
            }

            nav,
            [data-bottom-nav],
            .bottom-nav {
              display: none !important;
            }

            body {
              background: white !important;
            }
          }
        `}
      </style>
      <button
        style={backButton}
        onClick={() => {
          if (restoreConversationOriginContext(setPage)) return;
          setPage(isHomeownerView ? "home" : "contractorDashboard");
        }}
      >
        {openedFromConversation
          ? "× Close"
          : `← ${isHomeownerView ? t("backHome") : t("backToWorkCenter")}`}
      </button>

      <div style={printHeader}>
        <strong>{isHomeownerView ? t("completedWork") : businessName}</strong>
        <span>
          {isHomeownerView ? t("completedProjectRecord") : t("completedJobReport")}
        </span>
      </div>

      <div style={card}>
        <div style={topRow}>
          <div>
            <span style={typePill}>{type}</span>
            <h1 style={title}>{service}</h1>
            <p style={subtitle}>{customer}</p>
          </div>

          <div style={amountBox}>{amount}</div>
        </div>

        <div style={infoGrid}>
          <div style={infoBox}>
            <span>{t("location")}</span>
            <strong>{location}</strong>
          </div>

          <div style={infoBox}>
            <span>{t("date")}</span>
            <strong>{date}</strong>
          </div>

          <div style={infoBox}>
            <span>{t("time")}</span>
            <strong>{time}</strong>
          </div>

          <div style={infoBox}>
            <span>{t("status")}</span>
            <strong> {t("completed")}</strong>
          </div>
        </div>

        <div style={detailsGrid}>

          <div style={section}>
            <h2>{t("jobNotes")}</h2>
            <p>{completionNotes}</p>
          </div>

          <div style={section}>
            <h2>{isHomeownerView ? t("projectSummary") : t("paymentSummary")}</h2>

            <div style={miniRow}>
              <span>{t("totalCharged")}</span>
              <strong>{amount}</strong>
            </div>

            <div style={miniRow}>
              <span>{t("materialCost")}</span>
              <strong>${materialCost}</strong>
            </div>

            <div style={miniRow}>
              <span>
                {isHomeownerView
                  ? t("closureStatus")
                  : "Payment Status"}
              </span>

              <strong>
                {isHomeownerView
                  ? isClosureVerified
                    ? t("closureVerified")
                    : t("closureReviewPending")
                  : completedProject?.paymentReceived === "yes"
                  ? "Paid"
                  : completedProject?.paymentReceived === "partial"
                  ? "Partial"
                  : "Pending"}
              </strong>
            </div>

          </div>

          <div style={section}>
            <h2>{t("photos")}</h2>

            {completionPhotos.length === 0 ? (
              <div style={photoNotice}>
                {isHomeownerView
                  ? "No completion photos were added yet."
                  : "No completion photos were added to this job record yet."}
              </div>
            ) : (
              <div style={photoGrid}>
                {completionPhotos.map((photo) => (
                  <div key={photo.id || photo.dataUrl} style={photoBox}>
                    <img
                      src={photo.dataUrl || photo.url}
                      alt=""
                      style={photoImage}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={section}>
            <h2>{isHomeownerView ? t("customerReview") : "Customer Feedback"}</h2>
            {!isHomeownerView && (resolutionState || completedProject?.completionConcern) ? (
              <div style={resolutionNotice}>
                <strong>{t("customerConcernSubmitted")}</strong>
                <p>
                  {completedProject?.completionConcern?.typeLabel ||
                    t(resolveConcernTypeKey(completedProject?.completionConcern?.type))}
                </p>
                {completedProject?.completionConcern?.whatHappened && (
                  <p>{completedProject.completionConcern.whatHappened}</p>
                )}
                <div style={decisionActions}>
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => openProjectConversation("resolution")}
                  >
                    {t("messageCustomer")}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      localStorage.setItem("meetroWorkCenterTab", "schedule");
                      setPage("contractorDashboard");
                    }}
                  >
                    {t("scheduleFollowUp")}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={markResolutionCorrected}
                  >
                    {t("markedCorrectedResolved")}
                  </button>
                </div>
              </div>
            ) : submittedReview ? (
              <p>{` ${submittedReview.rating} · ${submittedReview.comment}`}</p>
            ) : isHomeownerView ? (
              <div style={reviewForm}>
                <strong>{t("rateYourExperience")}</strong>
                <div style={starRow} aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={star <= reviewRating ? activeStarButton : starButton}
                      onClick={() => setReviewRating(star)}
                      aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
                <textarea
                  style={reviewTextarea}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder={t("shareShortComment")}
                />
                <button
                  type="button"
                  style={primaryButton}
                  onClick={saveReview}
                >
                  {t("saveReview")}
                </button>
              </div>
            ) : (
              <p>Customer review pending</p>
            )}
          </div>

        </div>

        {!isHomeownerView && existingTimelineMoment && (
          <section style={timelineMomentCard}>
            <div>
              <span style={sectionEyebrow}>Verified Meetro Moment</span>
              <h2 style={timelineMomentTitle}>Meetro Moments</h2>
              <p style={completionSummaryText}>
                {existingTimelineMoment.status ===
                TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION
                  ? "This Meetro Moment is pending customer confirmation before public display."
                  : "This completed project is part of your Meetro Moments."}
              </p>
            </div>
            {timelineMomentNotice && (
              <p style={timelineMomentNoticeStyle}>{timelineMomentNotice}</p>
            )}
          </section>
        )}

        {!openedFromConversation && (
        <div style={actionGrid}>
          {isHomeownerView ? (
            <>
              <button
                style={primaryButton}
                onClick={() => setPage("myRequests")}
              >
                {t("viewMyRequests")}
              </button>

              <button
                style={secondaryButton}
                onClick={() => openProjectConversation("completion_review")}
              >
                {t("messageProfessional")}
              </button>

              <button
                style={printButton}
                onClick={shareRecord}
              >
                {t("shareRecord")}
              </button>

              <button
                style={pdfButton}
                onClick={() => setPage("home")}
              >
                {t("backHome")}
              </button>
            </>
          ) : (
            <>
              <button
                style={primaryButton}
                onClick={() => {
                  localStorage.setItem("meetroWorkCenterTab", "completed");
                  setPage("contractorDashboard");
                }}
              >
                Back to Completed Work
              </button>

              <button
                style={secondaryButton}
                onClick={() => openProjectConversation("completion_review")}
              >
                Continue Conversation
              </button>

              <button
                style={printButton}
                onClick={shareRecord}
              >
                {t("shareRecord")}
              </button>

              {/* PDF export hidden until invoice PDF generation is production-ready. */}
            </>
          )}
        </div>
        )}
      </div>

      <BottomNav
        setPage={setPage}
        currentPage={isHomeownerView ? "home" : "businessDashboard"}
      />
    </div>
  );
}

function recordIdentity(record = {}) {
  return [
    record.requestId,
    record.jobId,
    record.projectId,
    record.id,
    record.historyId,
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

function updateReviewedRecordInStorage(key, reviewedProject) {
  try {
    const records = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(records)) return;

    const reviewedIds = recordIdentity(reviewedProject);
    if (!reviewedIds.length) return;

    const nextRecords = records.map((record) => {
      const matches = recordIdentity(record).some((id) => reviewedIds.includes(id));
      return matches
        ? {
            ...record,
            review: reviewedProject.review,
            reviewSubmitted: true,
            reviewSubmittedAt: reviewedProject.reviewSubmittedAt,
          }
        : record;
    });

    localStorage.setItem(key, JSON.stringify(nextRecords));
  } catch {
    // Review sync is best-effort for local TestFlight storage.
  }
}

const CONCERN_TYPES = [
  { value: "work_correction", labelKey: "concernWorkCorrection" },
  { value: "incomplete_work", labelKey: "concernIncompleteWork" },
  { value: "payment_question", labelKey: "concernPaymentQuestion" },
  { value: "schedule_follow_up", labelKey: "concernScheduleFollowUp" },
  { value: "communication", labelKey: "concernCommunication" },
  { value: "other", labelKey: "concernOther" },
];

function resolveConcernTypeKey(value = "") {
  return (
    CONCERN_TYPES.find((type) => type.value === value)?.labelKey ||
    "concernOther"
  );
}

function updateCompletionRecordInStorage(key, projectRecord, options = {}) {
  try {
    const records = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(records)) return;

    const projectIds = recordIdentity(projectRecord);
    const nextRecord = {
      ...projectRecord,
      savedToHistory:
        options.savedToHistory === undefined
          ? projectRecord.savedToHistory
          : options.savedToHistory,
    };

    const foundMatch = records.some((record) =>
      recordIdentity(record).some((id) => projectIds.includes(id))
    );

    const nextRecords = foundMatch
      ? records.map((record) =>
          recordIdentity(record).some((id) => projectIds.includes(id))
            ? { ...record, ...nextRecord }
            : record
        )
      : key === "completedProjects" && options.savedToHistory !== false
      ? [nextRecord, ...records]
      : records;

    localStorage.setItem(key, JSON.stringify(nextRecords));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // Completion sync is best-effort for local TestFlight storage.
  }
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#f8fafc,var(--meetro-surface-sage, #eef4ea))",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 16px) max(14px, env(safe-area-inset-right, 0px)) calc(164px + env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
  scrollPaddingBottom: "calc(190px + env(safe-area-inset-bottom, 0px))",
};

const backButton = {
  position: "sticky",
  top: "14px",
  zIndex: 50,
  border: "none",
  background: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "18px",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
};

const printHeader = {
  maxWidth: "850px",
  margin: "0 auto 14px",
  background: "white",
  borderRadius: "18px",
  padding: "14px 18px",
  boxShadow: "0 8px 20px rgba(15,23,42,.05)",
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "6px",
  fontWeight: "900",
  color: "#111827",
};

const card = {
  maxWidth: "850px",
  margin: "0 auto calc(90px + env(safe-area-inset-bottom, 0px))",
  background: "white",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
};

const unavailableCard = {
  ...card,
  marginTop: "clamp(48px, 18vh, 160px)",
  display: "grid",
  gap: "16px",
  textAlign: "center",
};

const unavailableTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "clamp(24px, 5vw, 32px)",
};

const unavailableCopy = {
  margin: 0,
  color: "#64748b",
  lineHeight: 1.6,
};

const completionHeader = {
  maxWidth: "850px",
  margin: "0 auto 14px",
  background: "white",
  borderRadius: "20px",
  padding: "16px",
  boxShadow: "0 10px 26px rgba(15,23,42,.06)",
};

const completionSummaryCard = {
  display: "grid",
  gap: "14px",
  background: "linear-gradient(135deg,#f7f4ff,#ffffff)",
  border: "1px solid #ddd6fe",
  borderRadius: "22px",
  padding: "16px",
};

const sectionEyebrow = {
  display: "block",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const completionStatusTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "24px",
  lineHeight: 1.12,
  fontWeight: "950",
};

const completionSummaryText = {
  margin: 0,
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: "750",
};

const topRow = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "6px",
  gap: "18px",
  marginBottom: "22px",
};

const typePill = {
  display: "inline-flex",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "900",
};

const title = {
  fontSize: "22px",
  margin: "10px 0 4px",
  lineHeight: 1.1,
  color: "#111827",
  fontWeight: "900",
};

const subtitle = {
  color: "#475569",
  fontWeight: "800",
};

const amountBox = {
  color: "#15803d",
  fontSize: "26px",
  fontWeight: "900",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const infoBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#475569",
};


const detailsGrid={
display:"grid",
gridTemplateColumns:"1fr",
gap:"14px",
marginTop:"22px",
};

const detailBlock = {
  display: "grid",
  gap: "8px",
  color: "#111827",
};

const miniRow={
display:"grid",
gridTemplateColumns:"1fr auto",
gap:"10px",
padding:"10px 0",
borderBottom:"1px solid #e5e7eb",
fontWeight:"800",
};

const photoNotice = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#475569",
  borderRadius: "18px",
  padding: "22px",
  textAlign: "center",
  fontWeight: "800",
};

const photoGrid={
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"12px",
};

const photoBox={
height:"130px",
borderRadius:"16px",
background:"#e5e7eb",
overflow:"hidden",
};

const photoImage={
width:"100%",
height:"100%",
objectFit:"cover",
display:"block",
};

const reviewForm = {
  display: "grid",
  gap: "12px",
};

const starRow = {
  display: "flex",
  gap: "8px",
};

const starButton = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#94a3b8",
  fontSize: "20px",
  cursor: "pointer",
};

const activeStarButton = {
  ...starButton,
  background: "#fef3c7",
  border: "1px solid #fbbf24",
  color: "#d97706",
};

const reviewTextarea = {
  width: "100%",
  minHeight: "92px",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "12px",
  fontSize: "15px",
  fontWeight: "700",
  boxSizing: "border-box",
  resize: "vertical",
};

const actionGrid={
display:"grid",
gridTemplateColumns:"1fr",
gap:"12px",
marginTop:"20px",
};

const decisionActions = {
  display: "grid",
  gap: "10px",
  position: "relative",
  zIndex: 10001,
  pointerEvents: "auto",
  isolation: "isolate",
};

const resolveCard = {
  marginTop: "18px",
  display: "grid",
  gap: "14px",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "22px",
  padding: "18px",
};

const resolutionNotice = {
  display: "grid",
  gap: "10px",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#7c2d12",
  borderRadius: "18px",
  padding: "16px",
  fontWeight: "800",
};

const formLabel = {
  display: "grid",
  gap: "8px",
  color: "#111827",
  fontWeight: "900",
};

const formControl = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "12px",
  fontSize: "15px",
  fontWeight: "800",
  boxSizing: "border-box",
  background: "white",
};

const fileInput = {
  width: "100%",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "12px",
  background: "white",
  boxSizing: "border-box",
};

const disabledFileInput = {
  background: "#f1f5f9",
  color: "#64748b",
  cursor: "not-allowed",
};

const deferredPhotoHelp = {
  display: "block",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.4,
};

const errorText = {
  margin: 0,
  color: "#b91c1c",
  fontWeight: "900",
};

const pdfButton={
border:"none",
borderRadius:"16px",
padding:"14px",
background:"#15803d",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const printButton={
border:"none",
borderRadius:"16px",
padding:"14px",
background:"#111827",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const primaryButton={
border:"none",
borderRadius:"16px",
padding:"14px",
background:"var(--meetro-color-forest, #1f4d34)",
color:"white",
fontWeight:"900",
cursor:"pointer",
position:"relative",
zIndex:1,
pointerEvents:"auto",
touchAction:"manipulation",
WebkitTapHighlightColor:"transparent",
};

const secondaryButton={
border:"1px solid #e5e7eb",
borderRadius:"16px",
padding:"14px",
background:"white",
fontWeight:"900",
cursor:"pointer",
position:"relative",
zIndex:1,
pointerEvents:"auto",
touchAction:"manipulation",
WebkitTapHighlightColor:"transparent",
};

const issueButton = {
  ...secondaryButton,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#c2410c",
};

const timelineMomentCard = {
  marginTop: "22px",
  background: "linear-gradient(135deg, rgba(248,250,252,0.96), rgba(238,242,255,0.9))",
  borderRadius: "20px",
  padding: "18px",
  border: "1px solid rgba(99,102,241,0.18)",
  boxShadow: "0 14px 34px rgba(79,70,229,0.08)",
  display: "grid",
  gap: "14px",
};

const timelineMomentTitle = {
  margin: "6px 0",
  color: "#111827",
  fontSize: "1.35rem",
};

const timelineMomentNoticeStyle = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.72)",
  color: "#4338ca",
  fontWeight: 800,
};

const momentPreviewPage = {
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at 18% 8%, rgba(245,158,11,0.16), transparent 30%), linear-gradient(180deg,#fffaf0,#f8fafc 58%,var(--meetro-surface-sage, #eef4ea))",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 16px) max(14px, env(safe-area-inset-right, 0px)) calc(34px + env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left, 0px))",
};

const momentPreviewBack = {
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(255,255,255,0.72)",
  color: "#334155",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  margin: "0 auto 14px",
  display: "block",
};

const momentPreviewShell = {
  width: "min(100%, 980px)",
  margin: "0 auto",
  display: "grid",
  gap: "16px",
};

const momentPhotoCanvas = {
  position: "relative",
  minHeight: "min(72vh, 680px)",
  borderRadius: "34px",
  overflow: "hidden",
  background: "#111827",
  boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
};

const momentCanvasImage = {
  width: "100%",
  height: "100%",
  minHeight: "inherit",
  objectFit: "cover",
  display: "block",
};

const momentCanvasFallback = {
  minHeight: "inherit",
  display: "grid",
  placeItems: "center",
  color: "#fef3c7",
  fontSize: "1.6rem",
  fontWeight: 950,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(88,28,135,0.78))",
};

const momentCanvasShade = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.72), rgba(15,23,42,0.28) 44%, rgba(15,23,42,0.08)), linear-gradient(0deg, rgba(15,23,42,0.62), transparent 45%)",
};

const momentCanvasStory = {
  position: "absolute",
  left: "clamp(22px, 6vw, 64px)",
  right: "clamp(22px, 16vw, 220px)",
  bottom: "clamp(26px, 8vw, 72px)",
  color: "white",
  display: "grid",
  gap: "12px",
};

const momentPrintedBadge = {
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.24)",
  fontSize: "0.72rem",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const momentPrintedTitle = {
  margin: 0,
  maxWidth: "720px",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "clamp(2.1rem, 6vw, 4.7rem)",
  lineHeight: 1.02,
  fontWeight: 800,
  textShadow: "0 12px 36px rgba(0,0,0,0.38)",
  outline: "none",
  cursor: "text",
};

const momentPrintedMeta = {
  margin: 0,
  color: "rgba(255,255,255,0.86)",
  fontSize: "clamp(0.92rem, 2.2vw, 1.12rem)",
  lineHeight: 1.45,
  fontWeight: 800,
};

const momentPrintedReflection = {
  margin: 0,
  maxWidth: "620px",
  color: "rgba(255,255,255,0.94)",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "clamp(1.1rem, 2.8vw, 1.7rem)",
  lineHeight: 1.42,
  outline: "none",
  cursor: "text",
};

const momentPhotoStrip = {
  display: "grid",
  gap: "10px",
};

const momentPhotoHint = {
  margin: 0,
  color: "#64748b",
  fontWeight: 800,
  textAlign: "center",
};

const momentPhotoScroller = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "2px 2px 8px",
};

const momentPhotoThumb = {
  flex: "0 0 82px",
  height: "70px",
  border: "2px solid rgba(255,255,255,0.72)",
  borderRadius: "18px",
  overflow: "hidden",
  padding: 0,
  background: "rgba(255,255,255,0.74)",
  boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  cursor: "pointer",
};

const momentPhotoThumbActive = {
  ...momentPhotoThumb,
  border: "3px solid #d97706",
  boxShadow: "0 14px 34px rgba(217,119,6,0.24)",
};

const momentPhotoThumbImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const momentKeepsakeLine = {
  margin: "0 auto",
  width: "fit-content",
  maxWidth: "100%",
  color: "#334155",
  background: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: "999px",
  padding: "12px 16px",
  fontWeight: 900,
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const momentPreviewNotice = {
  margin: 0,
  color: "#4338ca",
  background: "rgba(255,255,255,0.76)",
  borderRadius: "18px",
  padding: "12px 14px",
  fontWeight: 900,
  textAlign: "center",
};

const momentPreviewActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "10px",
};

const momentPreserveButton = {
  border: "none",
  borderRadius: "20px",
  padding: "16px",
  background: "linear-gradient(135deg,#d97706,#f59e0b)",
  color: "white",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 18px 38px rgba(217,119,6,0.24)",
};

const momentQuietButton = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: "20px",
  padding: "16px",
  background: "rgba(255,255,255,0.72)",
  color: "#334155",
  fontWeight: 950,
  cursor: "pointer",
};

const section = {

  marginTop: "22px",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "18px",
};

export default CompletedJobDetails;
