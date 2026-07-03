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

function CompletedJobDetails({ setPage }) {
  const openedFromConversation = Boolean(getConversationOriginContext());
  const completedProject = JSON.parse(
    localStorage.getItem("lastCompletedProject") || "null"
  );
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
    localStorage.getItem("completedJobService") ||
    "Completed Job";

  const type =
    completedProject?.category ||
    completedProject?.source ||
    localStorage.getItem("completedJobType") ||
    "Service";

  const customer =
    completedProject?.homeownerName ||
    completedProject?.customerName ||
    completedProject?.customer ||
    completedProject?.username ||
    localStorage.getItem("completedJobCustomer") ||
    t("homeowner");

  const location =
    completedProject?.location ||
    localStorage.getItem("completedJobLocation") ||
    "Cape Coral, FL";

  const date =
    completedDate?.toLocaleDateString() ||
    localStorage.getItem("completedJobDate") ||
    "Today";

  const time =
    formatMessageTime(completedDate || localStorage.getItem("completedJobTime")) ||
    "";

  const rawAmount =
    completedProject?.finalAmount ||
    completedProject?.revenue ||
    completedProject?.amount ||
    completedProject?.acceptedQuote?.amount ||
    completedProject?.quote?.amount ||
    completedProject?.quote?.total ||
    localStorage.getItem("completedJobAmount") ||
    "0";

  const cleanAmount = Number(String(rawAmount).replace(/[^0-9.]/g, "")) || 0;
  const amount = `+$${cleanAmount}`;

  const rawMaterialCost =
    completedProject?.acceptedQuote?.materials ||
    localStorage.getItem("completedJobMaterialCost") ||
    "0";

  const materialCost = String(
    Math.max(Number(rawMaterialCost), 0)
  );

  const completionPhotos =
    completedProject?.photos ||
    completedProject?.completionPhotos ||
    completedProject?.finalPhotos ||
    completedProject?.completionRecord?.photos ||
    JSON.parse(localStorage.getItem("completedJobPhotos") || "[]");

  const rawCompletionNotes =
    completedProject?.acceptedQuote?.notes ||
    completedProject?.description ||
    localStorage.getItem("completedJobNotes") ||
    "Customer reported issue resolved and work completed successfully.";

  const completionNotes =
    String(rawCompletionNotes).toLowerCase().includes("after approval work starts")
      ? t("afterApprovalWorkStarts")
      : rawCompletionNotes;

  const businessName =
    completedProject?.professionalName ||
    completedProject?.businessName ||
    completedProject?.selectedProfessional ||
    completedProject?.acceptedQuote?.businessName ||
    completedProject?.quote?.businessName ||
    localStorage.getItem("businessName") ||
    "Business";
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

  const getProjectConversationId = () =>
    completedProject?.conversationId ||
    completedProject?.activeConversationId ||
    completedProject?.projectConversationId ||
    requestId;

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
    setCompletionApproved(true);
    setResolutionState("");
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
                  style={fileInput}
                  onChange={readConcernPhotos}
                />
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
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
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
  color: "#5b3df5",
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
  background: "#eef2ff",
  color: "#5b3df5",
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
background:"#5b3df5",
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

const section = {

  marginTop: "22px",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "18px",
};

export default CompletedJobDetails;
