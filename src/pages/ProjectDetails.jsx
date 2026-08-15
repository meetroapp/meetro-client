import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import CustomerQuoteReviewPanel from "../components/CustomerQuoteReviewPanel.jsx";
import CustomerProjectAssessment from "../components/CustomerProjectAssessment.jsx";
import API_URL from "../api";
import { getLanguage, t } from "../utils/language";
import { formatMessageTime } from "../utils/displayTime";
import {
  getHomeownerProjectJourney,
  getHomeownerProjectTimelineEvents,
} from "../utils/homeownerProjectJourney";
import {
  getActiveJobSnapshot,
  getJobRecord,
  getSelectedActiveProject,
  saveSelectedActiveProject,
} from "../utils/workCenter";
import { isProfessionalSession } from "../utils/session";
import {
  getConversationOriginContext,
  restoreConversationOriginContext,
} from "../utils/conversationOrigin";
import {
  buildRequestCompanionContext,
  clearRequestCompanionContext,
  writeRequestCompanionContext,
} from "../utils/requestCompanionContext";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import {
  CONVERSATION_ACTION_STAGE,
  getConversationActionLabel,
} from "../utils/conversationActionLanguage";
import {
  getCanonicalConversationActionId,
  getCanonicalConversationActionTarget,
} from "../utils/conversationActionRouting";
import { fetchHomeownerRequestModification } from "../utils/homeownerRequestModificationApi.js";
import {
  HOMEOWNER_REQUEST_MODIFICATION_ENTRY,
  getHomeownerRequestModificationEntry,
} from "../utils/homeownerRequestModificationPolicy.js";
import { fetchCustomerJobQuotes } from "../utils/customerJobQuotesApi.js";
import { fetchCustomerQuoteDetail } from "../utils/customerQuoteDetailApi.js";
import { decideCustomerQuote } from "../utils/customerQuoteDecisionApi.js";

const UNSUPPORTED_COMPLETION_CLOSURE_STATUSES = new Set([
  "completed",
  "complete",
  "work_completed",
  "closed",
  "closure",
  "closure_completed",
  "history",
  "archived",
]);

function normalizeWorkflowValue(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function isUnsupportedCompletionOrClosureStatus(value = "") {
  return UNSUPPORTED_COMPLETION_CLOSURE_STATUSES.has(normalizeWorkflowValue(value));
}

function isCompletionOrClosureRecord(record = {}) {
  const values = [
    record.status,
    record.workflowStatus,
    record.workflowStage,
    record.workflowType,
    record.type,
    record.title,
  ];

  return values.some((value) => /completion|complete|completed|closure|closeout|closed|history/i.test(String(value || "")));
}

function hasUnsupportedCompletionOrClosure(project = {}, records = []) {
  if (!project) return false;

  const statusValues = [
    project.status,
    project.workflowStatus,
    project.workflowStage,
    project.closureStatus,
    project.completionStatus,
  ];

  return Boolean(
    statusValues.some(isUnsupportedCompletionOrClosureStatus) ||
      project.completedAt ||
      project.closedAt ||
      project.closeDate ||
      project.closureDate ||
      project.closureDecisionRef ||
      project.needsReview ||
      (Array.isArray(records) && records.some(isCompletionOrClosureRecord))
  );
}

function getTruthfulProjectDetailsRecord(project = null) {
  if (!project) return project;
  if (!hasUnsupportedCompletionOrClosure(project)) return project;

  const fallbackStatus =
    normalizeWorkflowValue(project.status) === "scheduled"
      ? "scheduled"
      : normalizeWorkflowValue(project.status) === "active"
      ? "active"
      : "active";

  return {
    ...project,
    status: fallbackStatus,
    workflowStatus: project.workflowStatus ? "active" : project.workflowStatus,
    workflowStage: project.workflowStage ? "active" : project.workflowStage,
    closureStatus: null,
    completionStatus: null,
    completedAt: null,
    closedAt: null,
    closeDate: null,
    closureDate: null,
    closureDecisionRef: null,
    needsReview: false,
    revenue: null,
    finalAmount: null,
  };
}

function getTruthfulJobRecords(records = []) {
  return Array.isArray(records)
    ? records.filter((record) => !isCompletionOrClosureRecord(record))
    : [];
}

function getCompletionClosureUnavailableCopy(language = "en") {
  if (language === "es") {
    return {
      title: "La finalización y el cierre del proyecto aún no están disponibles.",
      body:
        "Puedes revisar los detalles del trabajo y continuar la conversación, pero Meetro todavía no guarda finalización, cierre, historial ni ingresos como estado de producción.",
    };
  }

  return {
    title: "Project completion and closure are not available yet.",
    body:
      "You can review the work details and continue the conversation, but Meetro does not yet save completion, closure, history, or revenue as production state.",
  };
}

function ProjectDetails({ setPage }) {
  const activeJobSnapshot = useMemo(() => getActiveJobSnapshot(), []);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobRecords, setJobRecords] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [expandedPhoto, setExpandedPhoto] = useState("");
  const [expandedPhotos, setExpandedPhotos] = useState([]);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [showGalleryGrid, setShowGalleryGrid] = useState(false);
  const [language, setLanguage] = useState(getLanguage());
  const [workflowUnavailableNotice, setWorkflowUnavailableNotice] = useState(false);
  const [customerQuoteDiscovery, setCustomerQuoteDiscovery] = useState({
    status: "idle",
    requestId: null,
    jobId: null,
    quotes: null,
    errorCode: "",
  });
  const [customerQuoteDetail, setCustomerQuoteDetail] = useState({
    status: "idle",
    quoteId: null,
    detail: null,
    errorCode: "",
  });
  const [selectedCustomerQuoteId, setSelectedCustomerQuoteId] = useState("");
  const [requestModificationState, setRequestModificationState] = useState({
    status: "idle",
    requestId: null,
    jobId: "",
    requestRelationshipId: "",
    authority: null,
    errorCode: "",
  });
  const customerQuoteAutoOpenRef = useRef(false);

  const activeProjectData = getSelectedActiveProject();
  const openedFromConversation = Boolean(getConversationOriginContext());
  const projectDetailsReturnPageValue =
    localStorage.getItem("projectDetailsReturnPage") || "";
  const hasProfessionalAuthority = isProfessionalSession();

  const isProfessionalProject =
    hasProfessionalAuthority &&
    projectDetailsReturnPageValue === "contractorDashboard";

  const isBusinessLeadReviewPage =
    hasProfessionalAuthority &&
    (projectDetailsReturnPageValue === "businessLeads" ||
      projectDetailsReturnPageValue === "businessDashboard");

  const truthfulJobRecords = useMemo(() => getTruthfulJobRecords(jobRecords), [jobRecords]);
  const hasUnsupportedWorkflow = useMemo(
    () => hasUnsupportedCompletionOrClosure(post, jobRecords),
    [post, jobRecords]
  );
  const projectForPresentation = useMemo(
    () => getTruthfulProjectDetailsRecord(post),
    [post]
  );
  const unavailableCopy = useMemo(
    () => getCompletionClosureUnavailableCopy(language),
    [language]
  );
  const requestModificationEntry = getHomeownerRequestModificationEntry(
    requestModificationState.authority
  );

  const memoryStats = {
    updates: truthfulJobRecords.filter((item) => item.type === "update").length,
    photos: truthfulJobRecords.filter((item) => item.type === "photoWorkflow").length,
    approvals: truthfulJobRecords.filter((item) => item.type === "approval").length,
    payments: truthfulJobRecords.filter((item) => item.type === "payment").length,
    materials: truthfulJobRecords.filter((item) => item.type === "materials").length,
    issues: jobRecords.filter(
      (item) => item.workflowType === "issue" || item.title?.toLowerCase().includes("issue")
    ).length,
  };

  const latestActivity = truthfulJobRecords[0] || null;

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(getLanguage());

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
    };
  }, []);

  function openProjectConversation() {
    if (restoreConversationOriginContext(setPage)) return;

    if (!post) return;

    const requestId = post.requestId || post.id || "";
    const target = getCanonicalConversationActionTarget(post, {
      returnPage: "projectDetails",
      preferCommunicationCenterShell: true,
    });

    if (!target.ok) {
      setWorkflowUnavailableNotice(true);
      return;
    }

    const professionalName =
      post.selectedProfessional ||
      post.businessName ||
      post.professionalName ||
      "Professional";

    localStorage.setItem(
      "selectedHomeownerRequestId",
      String(requestId || target.conversationId)
    );
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(post));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(post));
    localStorage.setItem("activeConversationId", String(target.conversationId));
    localStorage.setItem("activeConversationName", professionalName);
    localStorage.setItem("meetroConversationType", "canonical_conversation");
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: target.conversationId,
        conversationId: target.conversationId,
        conversation_id: target.conversationId,
        type: "work",
        category: "work",
        businessName: professionalName,
        projectTitle: post.title || post.category || t("homeServiceRequest", language),
        requestId,
      })
    );
    localStorage.setItem("conversationReturnPage", "projectDetails");
    localStorage.setItem("returnPage", "projectDetails");
    setPage(target.route);
  }

  function handleJourneyPrimaryAction(actionKey) {
    if (!post) return;

    const requestId = post.requestId || post.id || "";
    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(post));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(post));

    if (
      actionKey === "leaveReview" ||
      actionKey === "reviewCompletion" ||
      actionKey === "viewRecord"
    ) {
      setWorkflowUnavailableNotice(true);
      return;
    }

    localStorage.setItem("myRequestsReturnPage", "projectDetails");
    setPage("myRequests");
  }

  function openRequestModification() {
    const requestId = Number(post?.requestId || post?.id);
    const authorityJobId = String(
      requestModificationState.authority?.jobId || ""
    );

    if (
      !Number.isSafeInteger(requestId) ||
      requestId < 1 ||
      requestModificationState.status !== "confirmed" ||
      requestModificationState.requestId !== requestId ||
      !requestModificationEntry.actionable ||
      requestModificationEntry.route !== "homeownerRequestDetails" ||
      (authorityJobId && authorityJobId !== requestModificationState.jobId)
    ) {
      return;
    }

    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("myRequestsReturnPage", "projectDetails");
    setPage(requestModificationEntry.route);
  }

  useEffect(() => {
    const loadJobRecords = () => {
      const activeProject = getSelectedActiveProject();
      const originConversation = getConversationOriginContext();

      const conversationId =
        originConversation?.conversationId ||
        getCanonicalConversationActionId(activeProject) ||
        "";

      if (!originConversation?.conversationId && conversationId) {
        localStorage.setItem("activeConversationId", conversationId);
      }

      const records = getJobRecord(conversationId);

      setJobRecords(Array.isArray(records) ? records : []);
    };

    loadJobRecords();

    window.addEventListener("meetroJobRecordUpdated", loadJobRecords);
    window.addEventListener("storage", loadJobRecords);

    return () => {
      window.removeEventListener("meetroJobRecordUpdated", loadJobRecords);
      window.removeEventListener("storage", loadJobRecords);
    };
  }, []);

  useEffect(() => {
    async function fetchPost() {
      try {
        const postId =
  localStorage.getItem("selectedPostId");

const savedLead =
  localStorage.getItem(
    "selectedQuoteRequest"
  );

const activeProject =
  localStorage.getItem(
    "selectedActiveProject"
  );

const projectDetailsReturnPage =
  localStorage.getItem("projectDetailsReturnPage") || "";

if (
  activeProject &&
  projectDetailsReturnPage === "contractorDashboard"
) {
  const parsedActiveProject = JSON.parse(activeProject);
  setPost(parsedActiveProject.project || parsedActiveProject);
  return;
}

if (savedLead) {
  setPost(JSON.parse(savedLead));
  return;
}

if (!postId) {
  setPost(null);
  return;
}

const response = await fetch(
  `${API_URL}/posts/${postId}`
);

const data = await response.json();

if (data.post) {
  setPost(data.post);
} else if (savedLead) {
  setPost(JSON.parse(savedLead));
} else {
  setPost(null);
}
      } catch (error) {
        console.error(error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    if (!projectForPresentation) {
      clearRequestCompanionContext();
      return undefined;
    }

    const safeNextStep = isBusinessLeadReviewPage
      ? t("opportunityNextStep", language)
      : isProfessionalProject
      ? t("projectReviewWorkCenterNote", language)
      : getHomeownerProjectJourney(projectForPresentation, language).nextStep;
    const context = buildRequestCompanionContext({
      request: projectForPresentation,
      rolePerspective:
        isProfessionalProject || isBusinessLeadReviewPage ? "professional" : "homeowner",
      nextStep: safeNextStep,
      pageContext: "request_detail",
    });

    writeRequestCompanionContext(context);

    return () => {
      clearRequestCompanionContext();
    };
  }, [loading, projectForPresentation, language, isBusinessLeadReviewPage, isProfessionalProject]);

  useEffect(() => {
    if (loading || !post || hasProfessionalAuthority) return undefined;

    const requestId = Number(post.requestId || post.id);
    if (!Number.isSafeInteger(requestId) || requestId < 1) {
      queueMicrotask(() => {
        setRequestModificationState({
          status: "unavailable",
          requestId: null,
          jobId: "",
          requestRelationshipId: "",
          authority: null,
          errorCode: "CUSTOMER_REQUEST_ID_UNAVAILABLE",
        });
        setCustomerQuoteDiscovery({
          status: "unavailable",
          requestId: null,
          jobId: null,
          quotes: null,
          errorCode: "CUSTOMER_REQUEST_ID_UNAVAILABLE",
        });
      });
      return undefined;
    }

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setRequestModificationState({
        status: "loading",
        requestId,
        jobId: "",
        requestRelationshipId: "",
        authority: null,
        errorCode: "",
      });
      setCustomerQuoteDiscovery({
        status: "loading",
        requestId,
        jobId: null,
        quotes: null,
        errorCode: "",
      });
    });

    void fetchHomeownerRequestModification({ requestId, setPage })
      .then((result) => {
        if (!active) return null;
        const lifecycleRequestId = Number(result?.lifecycle?.requestId);
        const jobId = String(result?.lifecycle?.job?.id || "").trim();
        const authorityJobId = String(result?.authority?.jobId || "").trim();
        if (
          !result?.ok ||
          lifecycleRequestId !== requestId ||
          (authorityJobId && authorityJobId !== jobId)
        ) {
          const error = new Error("Request modification authority is unavailable.");
          error.code = result?.code || "REQUEST_MODIFICATION_IDENTITY_MISMATCH";
          throw error;
        }

        setRequestModificationState({
          status: "confirmed",
          requestId,
          jobId,
          requestRelationshipId: String(
            result.lifecycle.job?.requestRelationshipId || ""
          ).trim(),
          authority: result.authority,
          errorCode: "",
        });

        if (!jobId) {
          const error = new Error("Customer Job identity is unavailable.");
          error.code = "CUSTOMER_JOB_ID_UNAVAILABLE";
          setCustomerQuoteDiscovery({
            status: "unavailable",
            requestId,
            jobId: null,
            quotes: null,
            errorCode: error.code,
          });
          return null;
        }

        return fetchCustomerJobQuotes({ jobId, setPage })
          .then((quotes) => ({ jobId, quotes }))
          .catch((error) => {
            if (!active) return null;
            setCustomerQuoteDiscovery({
              status: "unavailable",
              requestId,
              jobId,
              quotes: null,
              errorCode: String(error?.code || "CUSTOMER_JOB_QUOTES_FAILED"),
            });
            return null;
          });
      })
      .then((result) => {
        if (!active || !result) return;
        setCustomerQuoteDiscovery({
          status: "confirmed",
          requestId,
          jobId: result.jobId,
          quotes: result.quotes,
          errorCode: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setRequestModificationState({
          status: "unavailable",
          requestId,
          jobId: "",
          requestRelationshipId: "",
          authority: null,
          errorCode: String(
            error?.code || "REQUEST_MODIFICATION_AUTHORITY_UNAVAILABLE"
          ),
        });
        setCustomerQuoteDiscovery({
          status: "unavailable",
          requestId,
          jobId: null,
          quotes: null,
          errorCode: String(error?.code || "CUSTOMER_JOB_QUOTES_FAILED"),
        });
      });

    return () => {
      active = false;
    };
  }, [hasProfessionalAuthority, loading, post, setPage]);

  useEffect(() => {
    if (customerQuoteDiscovery.status !== "confirmed") return undefined;
    const viewableQuotes = customerQuoteDiscovery.quotes.quotes.filter(
      ({ actions }) => actions.canViewQuote === true
    );
    if (
      viewableQuotes.length === 1 &&
      !selectedCustomerQuoteId &&
      !customerQuoteAutoOpenRef.current
    ) {
      customerQuoteAutoOpenRef.current = true;
      queueMicrotask(() => setSelectedCustomerQuoteId(viewableQuotes[0].quoteId));
      return undefined;
    }

    if (!selectedCustomerQuoteId) return undefined;
    if (!viewableQuotes.some(({ quoteId }) => quoteId === selectedCustomerQuoteId)) {
      queueMicrotask(() => setSelectedCustomerQuoteId(""));
      return undefined;
    }

    const quoteId = selectedCustomerQuoteId;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setCustomerQuoteDetail({
        status: "loading",
        quoteId,
        detail: null,
        errorCode: "",
      });
    });
    void fetchCustomerQuoteDetail({
      quoteId,
      jobId: customerQuoteDiscovery.jobId,
      setPage,
    })
      .then((detail) => {
        if (!active) return;
        setCustomerQuoteDetail({
          status: "confirmed",
          quoteId,
          detail,
          errorCode: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setCustomerQuoteDetail({
          status: "unavailable",
          quoteId,
          detail: null,
          errorCode: String(error?.code || "CUSTOMER_QUOTE_DETAIL_FAILED"),
        });
      });

    return () => {
      active = false;
    };
  }, [customerQuoteDiscovery, selectedCustomerQuoteId, setPage]);

  const reloadCustomerQuoteTruth = useCallback(
    async (quoteId = selectedCustomerQuoteId) => {
      const jobId = String(customerQuoteDiscovery.jobId || "").trim();
      if (!jobId || !quoteId) return null;
      const [quotes, detail] = await Promise.all([
        fetchCustomerJobQuotes({ jobId, setPage }),
        fetchCustomerQuoteDetail({ quoteId, jobId, setPage }),
      ]);
      setCustomerQuoteDiscovery((current) => ({
        ...current,
        status: "confirmed",
        jobId,
        quotes,
        errorCode: "",
      }));
      setCustomerQuoteDetail({
        status: "confirmed",
        quoteId,
        detail,
        errorCode: "",
      });
      return { quotes, detail };
    }, [customerQuoteDiscovery.jobId, selectedCustomerQuoteId, setPage]
  );

  const handleCustomerQuoteDecision = useCallback(
    async ({ quoteId, action, expectedIssuedVersion, idempotencyKey }) => {
      const result = await decideCustomerQuote({
        quoteId,
        action,
        expectedIssuedVersion,
        idempotencyKey,
        setPage,
      });
      await reloadCustomerQuoteTruth(quoteId);
      return result;
    },
    [reloadCustomerQuoteTruth, setPage]
  );

  return (
    <div
      className="app-page meetro-readable-page"
      data-customer-job-quotes-status={customerQuoteDiscovery.status}
      data-customer-job-id={customerQuoteDiscovery.jobId || ""}
      data-customer-quotes-count={
        customerQuoteDiscovery.status === "confirmed"
          ? customerQuoteDiscovery.quotes.quotes.length
          : ""
      }
      data-customer-quotes-summary={
        customerQuoteDiscovery.status === "confirmed"
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
      data-customer-quotes-error={customerQuoteDiscovery.errorCode}
      data-customer-quote-detail-status={customerQuoteDetail.status}
      data-customer-quote-detail-id={customerQuoteDetail.quoteId || ""}
      data-customer-quote-detail-error={customerQuoteDetail.errorCode}
      data-request-modification-status={requestModificationState.status}
      data-request-modification-mode={
        requestModificationState.authority?.mode || ""
      }
      data-request-modification-request-id={
        requestModificationState.requestId || ""
      }
      data-request-modification-job-id={requestModificationState.jobId}
      data-request-modification-relationship-id={
        requestModificationState.requestRelationshipId
      }
      style={pageWrapper}
    >
      <div style={contentWrapper}>
        <button
  onClick={() => {
    if (restoreConversationOriginContext(setPage)) return;

    const returnPage =
      localStorage.getItem("projectDetailsReturnPage") || "discover";

    setPage(returnPage);
  }}
  style={backButton}
>
          {openedFromConversation ? "× Close" : `← ${t("back")}`}
        </button>

        {loading && (
          <div style={cardStyle}>
            <p style={mutedText}>{t("loadingProject")}</p>
          </div>
        )}

        {!loading && !post && (
          <div style={cardStyle}>
            <div style={emptyIcon}>REQ</div>

            <h2 style={emptyTitle}>{t("postNotFound")}</h2>

            <p style={mutedText}>{t("projectCouldNotBeLoaded")}</p>
          </div>
        )}

        {!loading && post && (
          <div style={cardStyle}>
            {(isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={tagRow}>
              {post.category && <span style={tagStyle}>#{post.category}</span>}

              {post.location && (
                <span style={tagStyle}> {post.location}</span>
              )}
              </div>
            )}

            {isBusinessLeadReviewPage ? (
              <div style={opportunityCompactHeader}>
                <span style={opportunityCompactEyebrow}>
                  {t("opportunityHeaderEyebrow", language)}
                </span>
                <h1 style={opportunityCompactTitle}>
                  {post.title || post.service || post.category || t("homeServiceRequest", language)}
                </h1>
                <p style={opportunityCompactText}>
                  {t("opportunityDetailDescription", language)}
                </p>
                <div style={opportunityStatusGrid}>
                  <div style={opportunityStatusItem}>
                    <span>{t("currentStage", language)}</span>
                    <strong>{t("opportunityCurrentStage", language)}</strong>
                  </div>
                  <div style={opportunityStatusItem}>
                    <span>{t("wcNextStep", language)}</span>
                    <strong>{t("opportunityNextStep", language)}</strong>
                  </div>
                </div>
              </div>
            ) : (isProfessionalProject) && (
              <div style={professionalStatusCard}>
                <div style={professionalStatusIcon}>✓</div>

                <div>
                  <strong>
                    {projectForPresentation?.status === "scheduled"
                      ? t("projectScheduled")
                      : t("projectUnderReview")}
                  </strong>

                  <p>
                    {t("projectReviewWorkCenterNote")}
                  </p>
                </div>
              </div>
            )}

            {!isProfessionalProject && !isBusinessLeadReviewPage ? (
              <HomeownerProjectHeader request={projectForPresentation} language={language} />
            ) : !isBusinessLeadReviewPage && (
              <h1 style={projectTitle}>
                {post.title || post.service || post.category || "Project"}
              </h1>
            )}

            {!isProfessionalProject && !isBusinessLeadReviewPage ? (
              <ProjectJourneyPanel
                request={projectForPresentation}
                language={language}
                onPrimaryAction={handleJourneyPrimaryAction}
                onMessageProfessional={openProjectConversation}
              />
            ) : isProfessionalProject ? (
              <div style={projectLifecycleStrip}>
                {[
                  { key: "requested", label: t("requested") },
                  { key: "review", label: t("projectReviewContact") },
                  { key: "quote", label: t("quoteLater") },
                  { key: "active", label: t("active") },
                  { key: "completed", label: t("done") },
                ].map((step) => {
                  const status = String(projectForPresentation?.status || "").toLowerCase();
                  const currentStep =
                    status === "active"
                      ? "active"
                      : status === "quoted" || status === "quote"
                      ? "quote"
                      : status === "new" || status === "requested"
                      ? "requested"
                      : "review";
                  const isActive = currentStep === step.key;

                  return (
                    <div
                      key={step.key}
                      style={{
                        ...projectLifecycleStep,
                        ...(isActive ? projectLifecycleStepActive : {}),
                      }}
                    >
                      <span style={projectLifecycleDot} />
                      <small>{step.label}</small>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {!isProfessionalProject && !isBusinessLeadReviewPage && (
              <CustomerProjectAssessment
                jobId={requestModificationState.jobId}
                language={language}
                setPage={setPage}
              />
            )}

            {!isProfessionalProject && !isBusinessLeadReviewPage && (
              <CustomerQuoteReviewPanel
                language={language}
                discovery={customerQuoteDiscovery}
                detail={customerQuoteDetail}
                selectedQuoteId={selectedCustomerQuoteId}
                onSelectQuote={(quoteId) => {
                  setSelectedCustomerQuoteId(quoteId);
                  setCustomerQuoteDetail({
                    status: "idle",
                    quoteId,
                    detail: null,
                    errorCode: "",
                  });
                }}
                onCloseReview={() => setSelectedCustomerQuoteId("")}
                onDecision={handleCustomerQuoteDecision}
                onReload={reloadCustomerQuoteTruth}
              />
            )}

            {(() => {
              const projectPhotos = Array.isArray(post.photos)
                ? post.photos
                : [];

              const allPhotos = [
                ...projectPhotos,
                post.image_url,
              ].filter(Boolean);

              const uniquePhotos = [...new Set(allPhotos)];

              return (
                <div style={projectInformationCard}>
                  <strong style={projectInformationTitle}>
                    {t("requestDetails", language)}
                  </strong>

                  {uniquePhotos.length > 0 && (
                    <div style={projectPhotoGallery}>
                      <img
                        src={selectedPhoto || uniquePhotos[0]}
                        alt={post.title}
                        style={projectImage}
                        onClick={() => {
                          const activePhoto = selectedPhoto || uniquePhotos[0];
                          const activeIndex = uniquePhotos.indexOf(activePhoto);

                          setExpandedPhotos(uniquePhotos);
                          setExpandedPhotoIndex(activeIndex >= 0 ? activeIndex : 0);
                          setExpandedPhoto(activePhoto);
                        }}
                      />

                      {uniquePhotos.length > 1 && (
                        <>
                          <div style={projectPhotoCountRow}>
                            <div style={projectPhotoCount}>
                               {uniquePhotos.length} {uniquePhotos.length === 1 ? t("projectPhoto") : t("projectPhotos")}
                            </div>

                            <button
                              style={viewAllPhotosButton}
                              onClick={() => {
                                setExpandedPhotos(uniquePhotos);
                                setShowGalleryGrid(true);
                              }}
                            >
                              View All
                            </button>
                          </div>

                          <div style={projectThumbnailRow}>
                            {uniquePhotos.map((photo, index) => (
                              <img
                                key={`${photo}-${index}`}
                                src={photo}
                                alt={`Project photo ${index + 1}`}
                                style={projectThumbnail}
                                onClick={() => setSelectedPhoto(photo)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div style={projectInformationRows}>
                    <div style={projectInformationRow}>
                      <span>{t("projectTitle")}</span>
                      <strong>{post.title || post.service || post.category || "Project"}</strong>
                    </div>
                    <div style={projectInformationRow}>
                      <span>{t("categoryExample")}</span>
                      <strong>{post.category || t("categoryNotSet")}</strong>
                    </div>
                    <div style={projectInformationRow}>
                      <span>{t("projectScope")}</span>
                      <strong>
                        {post.description ||
                          post.project_description ||
                          post.details ||
                          post.notes ||
                          post.service ||
                          t("noDescriptionAdded")}
                      </strong>
                    </div>
                    <div style={projectInformationRow}>
                      <span>{t("fullServiceAddress")}</span>
                      <strong>{post.fullAddress || post.location || "—"}</strong>
                    </div>
                    {(post.unitNumber || post.unit_number) && (
                      <div style={projectInformationRow}>
                        <span>{t("unitNumber")}</span>
                        <strong>{post.unitNumber || post.unit_number}</strong>
                      </div>
                    )}
                    {(post.accessNotes || post.access_notes) && (
                      <div style={projectInformationRow}>
                        <span>{t("accessNotes")}</span>
                        <strong>{post.accessNotes || post.access_notes}</strong>
                      </div>
                    )}
                    <div style={projectInformationRow}>
                      <span>{t("customer")}</span>
                      <strong>
                        {post.username ||
                          post.customerName ||
                          post.customer ||
                          post.email ||
                          "Meetro user"}
                      </strong>
                    </div>
                  </div>

                  {!isProfessionalProject &&
                    !isBusinessLeadReviewPage &&
                    (requestModificationState.status === "loading" ||
                      requestModificationState.status === "unavailable" ||
                      requestModificationEntry.actionable ||
                      requestModificationEntry.kind ===
                        HOMEOWNER_REQUEST_MODIFICATION_ENTRY.CONTRACT_CHANGE_UNAVAILABLE) && (
                    <div style={requestDetailsActionWrap}>
                      {requestModificationState.status === "loading" && (
                        <p role="status" style={requestDetailsAuthorityNotice}>
                          {t("projectRequestActionsChecking", language)}
                        </p>
                      )}
                      {requestModificationState.status === "unavailable" && (
                        <p role="status" style={requestDetailsAuthorityNotice}>
                          {t("projectRequestActionsUnavailable", language)}
                        </p>
                      )}
                      {requestModificationEntry.actionable && (
                        <button
                          type="button"
                          style={requestDetailsActionButton}
                          data-request-modification-kind={
                            requestModificationEntry.kind
                          }
                          onClick={openRequestModification}
                        >
                          {requestModificationEntry.kind ===
                          HOMEOWNER_REQUEST_MODIFICATION_ENTRY.EDIT_REQUEST
                            ? t("editRequest", language)
                            : t("requestChange", language)}
                        </button>
                      )}
                      {requestModificationEntry.kind ===
                        HOMEOWNER_REQUEST_MODIFICATION_ENTRY.CONTRACT_CHANGE_UNAVAILABLE && (
                        <p role="status" style={requestDetailsAuthorityNotice}>
                          {t("projectContractChangeUnavailable", language)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {showGalleryGrid && (
              <div style={photoModalOverlay} onClick={() => setShowGalleryGrid(false)}>
                <div style={galleryGridCard} onClick={(event) => event.stopPropagation()}>
                  <button style={photoModalClose} onClick={() => setShowGalleryGrid(false)}>
                    ×
                  </button>

                  <h3 style={galleryGridTitle}>Project Photos</h3>

                  <div style={galleryGrid}>
                    {expandedPhotos.map((photo, index) => (
                      <button
                        key={`${photo}-grid-${index}`}
                        style={galleryGridItem}
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setExpandedPhoto(photo);
                          setExpandedPhotoIndex(index);
                          setShowGalleryGrid(false);
                        }}
                      >
                        <img
                          src={photo}
                          alt={`Project photo ${index + 1}`}
                          style={galleryGridImage}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {expandedPhoto && (
              <div style={photoModalOverlay} onClick={() => setExpandedPhoto("")}>
                <div
                  style={photoModalCard}
                  onClick={(event) => event.stopPropagation()}
                  onTouchStart={(event) => {
                    setTouchStartX(event.touches[0].clientX);
                  }}
                  onTouchEnd={(event) => {
                    if (touchStartX === null || expandedPhotos.length <= 1) return;

                    const touchEndX = event.changedTouches[0].clientX;
                    const swipeDistance = touchStartX - touchEndX;

                    if (Math.abs(swipeDistance) < 45) {
                      setTouchStartX(null);
                      return;
                    }

                    const nextIndex =
                      swipeDistance > 0
                        ? expandedPhotoIndex === expandedPhotos.length - 1
                          ? 0
                          : expandedPhotoIndex + 1
                        : expandedPhotoIndex === 0
                        ? expandedPhotos.length - 1
                        : expandedPhotoIndex - 1;

                    const nextPhoto = expandedPhotos[nextIndex];

                    setExpandedPhotoIndex(nextIndex);
                    setExpandedPhoto(nextPhoto);
                    setSelectedPhoto(nextPhoto);
                    setTouchStartX(null);
                  }}
                >
                  <button style={photoModalClose} onClick={() => setExpandedPhoto("")}>
                    ×
                  </button>

                  {expandedPhotos.length > 1 && (
                    <div style={photoModalCounter}>
                      {expandedPhotoIndex + 1} / {expandedPhotos.length}
                    </div>
                  )}

                  {expandedPhotos.length > 1 && (
                    <button
                      style={{ ...photoNavButton, left: "12px" }}
                      onClick={() => {
                        const nextIndex =
                          expandedPhotoIndex === 0
                            ? expandedPhotos.length - 1
                            : expandedPhotoIndex - 1;

                        const nextPhoto = expandedPhotos[nextIndex];

                        setExpandedPhotoIndex(nextIndex);
                        setExpandedPhoto(nextPhoto);
                        setSelectedPhoto(nextPhoto);
                      }}
                    >
                      ‹
                    </button>
                  )}

                  <img
                    src={expandedPhoto}
                    alt={t("expandedProjectPhoto")}
                    style={photoModalImage}
                  />

                  {expandedPhotos.length > 1 && (
                    <button
                      style={{ ...photoNavButton, right: "12px" }}
                      onClick={() => {
                        const nextIndex =
                          expandedPhotoIndex === expandedPhotos.length - 1
                            ? 0
                            : expandedPhotoIndex + 1;

                        const nextPhoto = expandedPhotos[nextIndex];

                        setExpandedPhotoIndex(nextIndex);
                        setExpandedPhoto(nextPhoto);
                        setSelectedPhoto(nextPhoto);
                      }}
                    >
                      ›
                    </button>
                  )}
                </div>
              </div>
            )}

            {isProfessionalProject && post.acceptedQuote && (
              <div style={acceptedQuoteBox}>
                <span>Accepted Quote</span>
                <strong>${post.acceptedQuote.amount || 0}</strong>
              </div>
            )}

            {!openedFromConversation && (isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={projectPrimaryActions}>
              {(isProfessionalProject || isBusinessLeadReviewPage) && (
                <p style={contactCustomerHelper}>
                  {t("contactCustomerArrangeVisitHelper")}
                </p>
              )}

              <button
                onClick={() => {
                  const conversationId =
                    post.conversationId ||
                    post.requestId ||
                    post.id ||
                    activeJobSnapshot?.jobId ||
                    localStorage.getItem("activeJobId") ||
                    "project-conversation";

                  localStorage.setItem("selectedQuoteRequest", JSON.stringify(post));
                  localStorage.setItem("selectedPostId", String(post.id || post.requestId || ""));
                  localStorage.setItem("selectedQuoteRequestId", String(post.id || post.requestId || conversationId));
                  localStorage.setItem("selectedMessageReceiverId", post.user_id || "");
                  localStorage.setItem("activeConversationId", String(conversationId));
                  localStorage.setItem(
                    "activeConversationName",
                    post.username || post.customer || post.email || "Customer"
                  );
                  localStorage.setItem(
                    "meetroConversationType",
                    isProfessionalProject || isBusinessLeadReviewPage
                      ? "standard"
                      : "activeJob"
                  );
                  localStorage.setItem("conversationReturnPage", "projectDetails");
                  localStorage.setItem("returnPage", "projectDetails");

                  if (isProfessionalProject || isBusinessLeadReviewPage) {
                    localStorage.setItem("leadWorkflowStage", "scheduling_discussion");
                    localStorage.setItem("leadWorkflowIntent", "arrange_visit_or_call");
                    localStorage.setItem(
                      "meetroPendingChatPrompt",
                      "Hi, I reviewed your request. What day/time works best for a visit or call?"
                    );
                  }

                  setPage("conversationThread");
                }}
                style={messageButton}
              >
                 {(isProfessionalProject || isBusinessLeadReviewPage)
                  ? t("contactCustomerArrangeVisit")
                  : getConversationActionLabel(
                      CONVERSATION_ACTION_STAGE.ACTIVE,
                      language
                    )}
              </button>
            </div>
            )}

            {(isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={aiSummaryBox}>
              <div style={aiSummaryIcon}>M</div>

              <div>
                <strong>Meetro Service Summary</strong>

                <p>
                  {truthfulJobRecords.length === 0
                    ? "No service memory has been saved yet. Updates, photos, approvals, materials, and payments saved from the conversation will appear here."
                    : `This service has ${truthfulJobRecords.length} saved workflow item${truthfulJobRecords.length === 1 ? "" : "s"}: ${memoryStats.photos} photo record${memoryStats.photos === 1 ? "" : "s"}, ${memoryStats.issues} issue${memoryStats.issues === 1 ? "" : "s"}, ${memoryStats.approvals} approval${memoryStats.approvals === 1 ? "" : "s"}, ${memoryStats.payments} payment request${memoryStats.payments === 1 ? "" : "s"}, and ${memoryStats.materials} material note${memoryStats.materials === 1 ? "" : "s"}.`}
                </p>

                {truthfulJobRecords.length > 0 && (
                  <div style={statusChipWrap}>
                    {memoryStats.issues > 0 && (
                      <span style={warningChip}> {memoryStats.issues} issue</span>
                    )}

                    {memoryStats.photos > 0 && (
                      <span style={infoChip}> {memoryStats.photos} photos</span>
                    )}

                    {memoryStats.payments > 0 && (
                      <span style={moneyChip}> payment</span>
                    )}

                    {memoryStats.materials > 0 && (
                      <span style={infoChip}> materials</span>
                    )}

                  </div>
                )}
              </div>
              </div>
            )}

            {(isProfessionalProject || isBusinessLeadReviewPage) && latestActivity && (
              <div style={latestActivityBox}>
                <div style={latestActivityLabel}>Latest Activity</div>

                <div style={latestActivityContent}>
                  <div style={latestActivityIcon}>
                    {latestActivity.type === "approval" && ""}
                    {latestActivity.type === "payment" && ""}
                    {latestActivity.type === "materials" && ""}
                    {latestActivity.type === "location" && ""}
                    {latestActivity.type === "scan" && ""}
                    {latestActivity.type === "photoWorkflow" && ""}
                    {latestActivity.type === "update" && ""}
                  </div>

                  <div>
                    <strong>{latestActivity.title}</strong>
                    <p>{latestActivity.subtitle}</p>
                    <span>{formatMessageTime(latestActivity.time || "") || "Saved"}</span>
                  </div>
                </div>

                {latestActivity.imageUrl && (
                  <img
                    src={latestActivity.imageUrl}
                    alt=""
                    style={latestActivityImage}
                  />
                )}
              </div>
            )}

            {(isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={jobMemoryBox}>
              <div style={jobMemoryHeader}>
                <strong> Project Memory</strong>
                <span>{truthfulJobRecords.length} saved</span>
              </div>

              {truthfulJobRecords.length === 0 ? (
                <p style={jobMemoryEmpty}>
                  Saved updates, photos, approvals, materials, and payments will appear here.
                </p>
              ) : (
                <div style={jobMemoryList}>
                  {truthfulJobRecords.slice(0, 5).map((item) => (
                    <div key={item.id} style={memoryTimelineItem}>
                      <div style={memoryTimelineIcon}>
                        {item.type === "approval" && ""}
                        {item.type === "payment" && ""}
                        {item.type === "materials" && ""}
                        {item.type === "location" && ""}
                        {item.type === "scan" && ""}
                        {item.type === "photoWorkflow" && ""}
                        {item.type === "update" && ""}
                      </div>

                      <div style={memoryTimelineBody}>
                        <div style={memoryTimelineTop}>
                          <strong>{item.title}</strong>
                          <span>{formatMessageTime(item.time || "") || "Saved"}</span>
                        </div>

                        <p>{item.subtitle}</p>

                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            style={memoryTimelineImage}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {(workflowUnavailableNotice ||
              hasUnsupportedWorkflow ||
              (isProfessionalProject && projectForPresentation?.status === "active")) && (
              <div style={workflowUnavailableCard}>
                <strong>{unavailableCopy.title}</strong>
                <p>{unavailableCopy.body}</p>
              </div>
            )}

            {(isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={projectActionGrid}>

                {post.status === "scheduled" && (
                  <button
                    style={startProjectButton}
                    onClick={() => {
                      if (!canReadLegacyWorkflowStorage()) return;
                      const requestId = post.requestId || post.id;

                      const homeownerRequests = JSON.parse(
                        localStorage.getItem("homeownerRequests") || "[]"
                      );

                      const updatedRequests = homeownerRequests.map((item) => {
                        const itemId = item.requestId || item.id;

                        if (itemId !== requestId) return item;

                        return {
                          ...item,
                          status: "active",
                          startedAt: new Date().toISOString(),
                        };
                      });

                      localStorage.setItem(
                        "homeownerRequests",
                        JSON.stringify(updatedRequests)
                      );

                      saveSelectedActiveProject({
                        ...activeProjectData,
                        status: "active",
                        project: {
                          ...post,
                          status: "active",
                          startedAt: new Date().toISOString(),
                        },
                      });

                      window.dispatchEvent(new Event("storage"));
                      window.location.reload();
                    }}
                  >
                     {t("activateProject")}
                  </button>
                )}

              </div>
            )}


          </div>
        )}

        <BottomNav setPage={setPage} currentPage="projectDetails" />
      </div>
    </div>
  );
}

function ProjectJourneyPanel({
  request,
  language,
  onPrimaryAction,
  onMessageProfessional,
}) {
  const journey = getHomeownerProjectJourney(request, language);
  const timelineEvents = getHomeownerProjectTimelineEvents(request, language);
  const primaryIsMessage = journey.primaryActionKey === "messageProfessional";
  const hasConversation = Boolean(
    getCanonicalConversationActionId(request)
  );
  const communicationLabel = hasConversation
    ? getConversationActionLabel(
        CONVERSATION_ACTION_STAGE.ACTIVE,
        language
      )
    : getConversationActionLabel(
        CONVERSATION_ACTION_STAGE.NEW,
        language
      );

  return (
    <section style={journeyShell} aria-label={t("projectJourney", language)}>
      <article style={{ ...journeyStageCard, ...journeyStageCardCurrent }}>
        <span style={journeyCardLabel}>{t("currentStage", language)}</span>
        <h3 style={journeyCardTitle}>{journey.currentTitle}</h3>
        <p style={journeyCardText}>{journey.currentSummary}</p>

        <div style={journeyActionRow}>
          <button
            type="button"
            style={journeyPrimaryButton}
            onClick={() =>
              primaryIsMessage
                ? onMessageProfessional?.()
                : onPrimaryAction?.(journey.primaryActionKey)
            }
          >
            {primaryIsMessage ? communicationLabel : journey.primaryActionLabel}
          </button>
          {!primaryIsMessage && (
            <button
              type="button"
              style={journeySecondaryButton}
              onClick={onMessageProfessional}
            >
              {communicationLabel}
            </button>
          )}
        </div>
      </article>

      <div style={journeyProgressBar} aria-label={t("projectTimeline", language)}>
        {journey.stages.map((stage) => (
          <div key={stage.key} style={journeyProgressStep}>
            <span
              style={{
                ...journeyProgressDot,
                ...(stage.complete ? journeyProgressDotDone : {}),
                ...(stage.current ? journeyProgressDotCurrent : {}),
              }}
            >
              {stage.complete ? "✓" : stage.current ? "●" : ""}
            </span>
            <span
              style={{
                ...journeyProgressLabel,
                ...(stage.current ? journeyProgressLabelCurrent : {}),
              }}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>

      <div style={relationshipTimeline}>
        <h3 style={relationshipTimelineTitle}>
          {t("relationshipTimeline", language)}
        </h3>

        {timelineEvents.length > 0 ? (
          timelineEvents.map((event) => (
            <div key={`${event.key}-${event.date}`} style={relationshipTimelineItem}>
              <span style={relationshipTimelineDot}></span>
              <div>
                <strong style={relationshipTimelineLabel}>{event.label}</strong>
                {event.date && (
                  <span style={relationshipTimelineDate}>
                    {new Date(event.date).toLocaleDateString(
                      language === "es" ? "es-US" : "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={relationshipTimelineEmpty}>
            {t("timelineEmpty", language)}
          </p>
        )}
      </div>
    </section>
  );
}

function HomeownerProjectHeader({ request = {}, language }) {
  const journey = getHomeownerProjectJourney(request, language);
  const professionalName =
    journey.professionalName ||
    request.selectedProfessional ||
    request.businessName ||
    request.professionalName ||
    request.acceptedQuote?.businessName ||
    "";

  return (
    <header style={homeownerProjectHeader}>
      <span style={journeyEyebrow}>{t("projectJourney", language)}</span>
      <h1 style={homeownerProjectTitle}>
        {request.title ||
          request.service ||
          request.category ||
          t("homeServiceRequest", language)}
      </h1>
      <div style={homeownerProjectMetaRow}>
        <span style={journeyStageBadge}>{journey.currentTitle}</span>
        {professionalName && (
          <span style={homeownerProjectProfessional}>
            {professionalName}
          </span>
        )}
      </div>
    </header>
  );
}


const pageWrapper = {
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 32%), linear-gradient(to bottom, #f7f7fb, #eef0f7)",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  fontFamily: "Arial",
};

const contentWrapper = {
  width: "100%",
  maxWidth: "820px",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 16px",
  borderRadius: "16px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(31,77,52,0.12)",
};

const professionalStatusCard = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  border: "1.5px solid #86efac",
  borderRadius: "20px",
  padding: "14px",
  marginBottom: "18px",
  color: "#065f46",
  textAlign: "left",
};

const professionalStatusIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  background: "#16a34a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0,
};

const opportunityCompactHeader = {
  background: "linear-gradient(180deg,#ffffff,#fffaf5)",
  border: "1px solid #fed7aa",
  borderRadius: "20px",
  padding: "14px",
  marginBottom: "14px",
  boxShadow: "0 12px 28px rgba(249,115,22,0.08)",
  textAlign: "left",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const opportunityCompactEyebrow = {
  display: "block",
  color: "#ea580c",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const opportunityCompactTitle = {
  margin: "0 0 6px",
  color: "#0f172a",
  fontSize: "24px",
  lineHeight: 1.12,
  fontWeight: "950",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const opportunityCompactText = {
  margin: "0 0 11px",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const opportunityStatusGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
  gap: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const opportunityStatusItem = {
  display: "grid",
  gap: "4px",
  padding: "10px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #ffedd5",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "850",
};



const aiSummaryBox = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  background: "linear-gradient(135deg,var(--meetro-surface-sage, #eef4ea),#ffffff)",
  border: "1px solid rgba(23,35,23,.12)",
  borderRadius: "20px",
  padding: "12px",
  marginBottom: "14px",
  textAlign: "left",
  boxShadow: "0 8px 18px rgba(31,77,52,.05)",
};


const statusChipWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "8px",
};

const infoChip = {
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const warningChip = {
  background: "#fff7ed",
  color: "#c2410c",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const moneyChip = {
  background: "#ecfdf5",
  color: "#047857",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const workflowUnavailableCard = {
  background: "var(--meetro-surface-paper, #fffaf0)",
  border: "1px solid var(--meetro-border-warm, rgba(126, 92, 54, 0.2))",
  borderRadius: "18px",
  padding: "16px",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "grid",
  gap: "6px",
  lineHeight: "1.45",
  marginTop: "16px",
};

const aiSummaryIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),var(--meetro-color-charcoal, #172317))",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};


const latestActivityBox = {
  background: "linear-gradient(135deg,#111827,#334155)",
  color: "white",
  borderRadius: "22px",
  padding: "14px",
  marginBottom: "14px",
  textAlign: "left",
  boxShadow: "0 12px 26px rgba(15,23,42,0.16)",
};

const latestActivityLabel = {
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  opacity: 0.885,
  marginBottom: "12px",
};

const latestActivityContent = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
};

const latestActivityIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
};

const latestActivityImage = {
  width: "100%",
  maxHeight: "220px",
  objectFit: "cover",
  borderRadius: "18px",
  marginTop: "14px",
};

const jobMemoryBox = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "12px",
  marginBottom: "14px",
  textAlign: "left",
  boxShadow: "0 6px 16px rgba(15,23,42,.035)",
};

const jobMemoryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  color: "#111827",
};

const jobMemoryEmpty = {
  margin: 0,
  color: "#667085",
  fontWeight: "700",
  lineHeight: 1.5,
};

const jobMemoryList = {
  display: "grid",
  gap: "10px",
};


const memoryTimelineItem = {
  display: "grid",
  gridTemplateColumns: "42px 1fr",
  gap: "12px",
  alignItems: "flex-start",
};

const memoryTimelineIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  boxShadow: "0 8px 16px rgba(31,77,52,0.12)",
};

const memoryTimelineBody = {
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "16px",
  padding: "11px",
};

const memoryTimelineTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "6px",
  color: "#111827",
};

const memoryTimelineImage = {
  width: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "16px",
  marginTop: "10px",
};

const acceptedQuoteBox = {
  background: "#f8f7ff",
  border: "1px solid #ede9fe",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
};

const cardStyle = {
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(23,35,23,.10)",
  borderRadius: "28px",
  padding: "20px",
  color: "#111827",
  textAlign: "left",
  boxShadow: "0 14px 34px rgba(15,23,42,.07)",
};

const emptyIcon = {
  fontSize: "52px",
  marginBottom: "10px",
};

const emptyTitle = {
  color: "#111827",
  marginTop: 0,
  marginBottom: "10px",
  fontSize: "28px",
};

const mutedText = {
  color: "#555",
  margin: 0,
  lineHeight: "1.6",
  fontWeight: "700",
};

const tagRow = {
  display: "flex",
  justifyContent: "flex-start",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const tagStyle = {
  background: "#f3efff",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "7px 11px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const projectTitle = {
  marginTop: 0,
  fontSize: "27px",
  lineHeight: "1.06",
  wordBreak: "break-word",
  textAlign: "left",
  marginBottom: "12px",
  color: "#111827",
  fontWeight: "950",
  letterSpacing: "-0.03em",
};

const homeownerProjectHeader = {
  margin: "0 0 10px",
  paddingBottom: "10px",
  borderBottom: "1px solid #e5e7eb",
};

const homeownerProjectTitle = {
  margin: "5px 0 8px",
  fontSize: "25px",
  lineHeight: 1.08,
  color: "#111827",
  fontWeight: "950",
  letterSpacing: "-0.02em",
  wordBreak: "normal",
  overflowWrap: "break-word",
};

const homeownerProjectMetaRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
};

const homeownerProjectProfessional = {
  color: "#475569",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.3,
};

const photoModalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  background: "rgba(15, 23, 42, 0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const photoModalCard = {
  position: "relative",
  width: "100%",
  maxWidth: "720px",
  maxHeight: "88vh",
  borderRadius: "24px",
  overflow: "hidden",
  background: "#111827",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
};

const photoModalClose = {
  position: "absolute",
  top: "12px",
  right: "12px",
  zIndex: 2,
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontSize: "26px",
  fontWeight: "900",
  cursor: "pointer",
  lineHeight: "34px",
};

const photoModalCounter = {
  position: "absolute",
  top: "14px",
  left: "14px",
  zIndex: 2,
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "13px",
  fontWeight: "900",
};

const photoNavButton = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
  width: "42px",
  height: "42px",
  borderRadius: "999px",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontSize: "34px",
  fontWeight: "900",
  cursor: "pointer",
  lineHeight: "34px",
};

const photoModalImage = {
  width: "100%",
  maxHeight: "88vh",
  objectFit: "contain",
  display: "block",
  transition: "opacity 0.22s ease, transform 0.22s ease",
  animation: "photoFadeIn 0.22s ease",
};

const projectLifecycleStrip = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "4px",
  margin: "0 0 18px",
  padding: "10px 4px",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
};

const projectLifecycleStep = {
  display: "grid",
  gap: "6px",
  placeItems: "center",
  color: "#94a3b8",
  fontWeight: "700",
  fontSize: "10px",
  textAlign: "center",
};

const projectLifecycleStepActive = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "950",
};

const projectLifecycleDot = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  background: "currentColor",
};

const journeyShell = {
  margin: "0 0 14px",
  padding: "14px",
  borderRadius: "24px",
  background: "linear-gradient(180deg,#ffffff,#f8f7ff)",
  border: "1px solid #ddd6fe",
  boxShadow: "0 12px 28px rgba(31, 77, 52, 0.08)",
  overflow: "hidden",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const journeyEyebrow = {
  display: "block",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "4px",
};

const journeyStageBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  borderRadius: "999px",
  padding: "8px 11px",
  background: "#f7f4ff",
  border: "1px solid #c4b5fd",
  color: "#4f28e8",
  fontSize: "12px",
  fontWeight: "950",
  overflowWrap: "break-word",
};

const journeyProgressBar = {
  display: "flex",
  gap: "7px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  padding: "2px 0 10px",
  marginBottom: "4px",
  maxWidth: "100%",
};

const journeyProgressStep = {
  flex: "0 0 auto",
  minWidth: "64px",
  display: "grid",
  justifyItems: "center",
  gap: "5px",
  scrollSnapAlign: "start",
};

const journeyProgressDot = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-surface-sage, #eef4ea)",
  border: "1px solid #dbeafe",
  color: "#94a3b8",
  fontSize: "10px",
  fontWeight: "950",
};

const journeyProgressDotDone = {
  background: "#ecfdf5",
  borderColor: "#86efac",
  color: "#047857",
};

const journeyProgressDotCurrent = {
  background: "var(--meetro-color-forest, #1f4d34)",
  borderColor: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
};

const journeyProgressLabel = {
  color: "#64748b",
  fontSize: "11px",
  lineHeight: 1.2,
  fontWeight: "900",
  textAlign: "center",
  wordBreak: "normal",
  hyphens: "none",
};

const journeyProgressLabelCurrent = {
  color: "#4f28e8",
};

const journeyStageCard = {
  width: "100%",
  minHeight: "0",
  borderRadius: "18px",
  padding: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  scrollSnapAlign: "start",
  boxSizing: "border-box",
};

const journeyStageCardCurrent = {
  border: "2px solid #8b7cff",
  background: "linear-gradient(180deg,#ffffff,#f7f4ff)",
};

const journeyCardLabel = {
  display: "block",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: "950",
  marginBottom: "8px",
};

const journeyCardTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: "950",
};

const journeyCardText = {
  margin: "9px 0 0",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const journeyActionRow = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  marginTop: "12px",
};

const journeyPrimaryButton = {
  border: "none",
  borderRadius: "15px",
  padding: "12px 14px",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),#4f28e8)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

const journeySecondaryButton = {
  border: "1px solid #ddd6fe",
  borderRadius: "15px",
  padding: "11px 14px",
  background: "#ffffff",
  color: "#4f28e8",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

const relationshipTimeline = {
  marginTop: "10px",
  padding: "12px 14px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const relationshipTimelineTitle = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const relationshipTimelineItem = {
  display: "grid",
  gridTemplateColumns: "18px 1fr",
  gap: "9px",
  alignItems: "flex-start",
  padding: "6px 0",
};

const relationshipTimelineDot = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
  marginTop: "5px",
};

const relationshipTimelineLabel = {
  display: "block",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "900",
  lineHeight: 1.25,
};

const relationshipTimelineDate = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
  marginTop: "3px",
};

const relationshipTimelineEmpty = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const projectInformationCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "14px",
  marginBottom: "14px",
};

const projectInformationTitle = {
  display: "block",
  color: "#0f172a",
  fontSize: "18px",
  marginBottom: "12px",
};

const projectInformationRows = {
  display: "grid",
  gap: "10px",
};

const requestDetailsActionWrap = {
  marginTop: "14px",
  paddingTop: "14px",
  borderTop: "1px solid #e2e8f0",
};

const requestDetailsActionButton = {
  width: "100%",
  minHeight: "44px",
  border: "1px solid #ddd6fe",
  borderRadius: "15px",
  padding: "12px 14px",
  background: "#ffffff",
  color: "#4f28e8",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

const requestDetailsAuthorityNotice = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "750",
  lineHeight: 1.5,
};

const projectInformationRow = {
  display: "grid",
  gridTemplateColumns: "minmax(110px, 0.38fr) 1fr",
  gap: "12px",
  alignItems: "start",
  paddingTop: "10px",
  borderTop: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
};

const projectPhotoGallery = {
  marginBottom: "22px",
};

const projectPhotoCountRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  margin: "10px 0 8px",
};

const viewAllPhotosButton = {
  border: "none",
  borderRadius: "999px",
  padding: "7px 12px",
  background: "#efe7ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const galleryGridCard = {
  position: "relative",
  width: "calc(100% - 28px)",
  maxWidth: "760px",
  maxHeight: "78vh",
  overflowY: "auto",
  borderRadius: "26px",
  background: "white",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
  marginBottom: "80px",
};

const galleryGridTitle = {
  margin: "2px 48px 14px 0",
  fontSize: "21px",
  fontWeight: "950",
  color: "#111827",
};

const galleryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
};

const galleryGridItem = {
  border: "none",
  padding: 0,
  borderRadius: "16px",
  overflow: "hidden",
  background: "#f8f7ff",
  cursor: "pointer",
};

const galleryGridImage = {
  width: "100%",
  height: "112px",
  objectFit: "cover",
  display: "block",
};

const projectPhotoCount = {
  margin: "10px 0 8px",
  fontSize: "13px",
  fontWeight: "900",
  color: "var(--meetro-color-forest, #1f4d34)",
  textAlign: "center",
};

const projectThumbnailRow = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  padding: "4px 2px 8px",
};

const projectThumbnail = {
  width: "82px",
  height: "70px",
  objectFit: "cover",
  borderRadius: "16px",
  border: "2px solid #ede9fe",
  cursor: "pointer",
  flexShrink: 0,
  transition: "transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease",
};

const photoAnimationStyle = document.createElement("style");
photoAnimationStyle.innerHTML = `
@keyframes photoFadeIn {
  from {
    opacity: 0.882;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`;
if (!document.getElementById("meetro-photo-animation-style")) {
  photoAnimationStyle.id = "meetro-photo-animation-style";
  document.head.appendChild(photoAnimationStyle);
}

const projectImage = {
  width: "100%",
  maxHeight: "360px",
  objectFit: "cover",
  borderRadius: "22px",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(15,23,42,.10)",
};

const projectActionGrid = {
  display: "grid",
  gap: "12px",
  marginTop: "14px",
};

const startProjectButton = {
  width: "100%",
  padding: "16px 20px",
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  border: "none",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(34,197,94,0.24)",
};

const projectPrimaryActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  marginTop: "20px",
  marginBottom: "18px",
};

const contactCustomerHelper = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.5,
};

const messageButton = {
  width: "100%",
  marginTop: "4px",
  padding: "15px 18px",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),#7b61ff)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontWeight: "950",
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 12px 22px rgba(31,77,52,0.22)",
};

export default ProjectDetails;
