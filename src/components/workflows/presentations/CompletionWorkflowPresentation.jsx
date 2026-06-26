import { t } from "../../../utils/language";
import { getWorkflowStatusLabel } from "../../../utils/workflowStatus";
import UniversalDocumentCard from "../../documents/UniversalDocumentCard";
import { captureConversationOriginContext } from "../../../utils/conversationOrigin";

function CompletionWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
}) {
  const { setPage, reviewProjectAction } = workflowRenderProps;
  const isBusinessViewer =
    workflowRenderProps.currentViewerRole === "business";

  const title =
    msg.projectTitle ||
    msg.completion?.service ||
    (language === "es" ? "Trabajo completado" : "Completed Job");

  const amountRaw = msg.completion?.amount || msg.completion?.total || msg.total || 0;
  const amount = Number(amountRaw || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  const statusLabel =
    getWorkflowStatusLabel(msg.completionStatus, language) ||
    t(msg.completionStatus) ||
    (language === "es" ? "Completado" : "Completed");

  const completionRecord = {
    ...msg.completion,
    ...msg,
    title,
    total: amountRaw,
    amount: amountRaw,
    service: msg.projectTitle || msg.completion?.service || "Completion",
    projectTitle: msg.projectTitle || msg.completion?.service || "Completion",
  };

  const showClosureReview =
    Boolean(msg.reviewRequested) ||
    msg.completionStatus === "awaiting_customer_confirmation" ||
    msg.completionStatus === "followup_requested";

  const handleReviewProject = () => {
    localStorage.setItem(
      "completedJobViewMode",
      isBusinessViewer ? "business" : "homeowner"
    );
    if (typeof reviewProjectAction === "function") {
      reviewProjectAction();
    } else {
      setPage("completedJobDetails");
    }
  };

  const handleClosureReview = () => {
    captureConversationOriginContext({
      sourcePage: "conversationThread",
      workspace: "completedJobDetails",
      viewerRole: isBusinessViewer ? "business" : "homeowner",
    });
    localStorage.setItem(
      "completedJobViewMode",
      isBusinessViewer ? "business" : "homeowner"
    );
    setPage("completedJobDetails");
  };

  return (
    <div style={compactDocumentStack}>
      <UniversalDocumentCard
        documentType="completion"
        projectTitle={title}
        amount={amount}
        status={statusLabel}
        language={language}
        icon="completion"
        reviewProjectAction={showClosureReview ? undefined : handleReviewProject}
      />

      {showClosureReview ? (
        <div style={closureCard}>
          <strong style={closureCardTitle}>Project Closure</strong>
          <p style={closureCardText}>
            {language === "es"
              ? "La finalización se ha registrado."
              : "Completion has been recorded."}
          </p>
          <div style={closureCardStatus}>
            {language === "es"
              ? "Listo para revisión de cierre"
              : "Ready for Closure Review"}
          </div>
          <button
            type="button"
            style={reviewButton}
            onClick={handleClosureReview}
          >
            {language === "es" ? "Revisar proyecto" : "Review Project"} →
          </button>
        </div>
      ) : null}
    </div>
  );
}

const compactDocumentStack = {
  display: "grid",
  gap: 10,
};

const closureCard = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  borderRadius: 16,
  background: "#fff",
  padding: 12,
  display: "grid",
  gap: 8,
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const closureCardTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 15,
};

const closureCardText = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.35,
  color: "#64748b",
  overflowWrap: "anywhere",
};

const closureCardStatus = {
  color: "#1f2937",
  fontWeight: 700,
  fontSize: 13,
};

const reviewButton = {
  border: "none",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#f59e0b",
  color: "#111827",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  textAlign: "left",
};

export default CompletionWorkflowPresentation;
