import { getWorkflowStatusLabel } from "../../utils/workflowStatus";
import { t } from "../../utils/language";
import { shareCompletionRecord as shareCompletionRecordFile } from "../../utils/completionShare";
import MeetroIcon from "../MeetroIcon";

function WorkflowCompletionCloseoutCard({
  msg,
  language,
  currentViewerRole,
  setPage,
  styles,
}) {
  const {
    closeoutWorkflowBody,
    closeoutConfirmedNotice,
    closeoutFollowupNotice,
    leaveReviewButton,
  } = styles;
  const isBusinessViewer = currentViewerRole === "business";
  const closeoutActionsStyle = {
    display: "grid",
    gap: "10px",
    marginTop: "14px",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    width: "100%",
    minWidth: 0,
  };
  const primaryHomeownerAction = {
    border: "none",
    borderRadius: "14px",
    padding: "12px 14px",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    minWidth: 0,
  };

  async function shareCompletionRecord(event) {
    event.stopPropagation();
    await shareCompletionRecordFile(msg.completion || {
      title: msg.projectTitle,
      service: msg.projectTitle,
    });
  }

  return (
    <div style={closeoutWorkflowBody}>
      {isBusinessViewer ? (
        <>
          <div style={closeoutConfirmedNotice}>
            <MeetroIcon name="completion" size={16} decorative /> {t("completionSaved")} ·{" "}
            {language === "es"
              ? "Revisión de cierre pendiente"
              : "Closure review pending"}
          </div>

          <div style={closeoutActionsStyle}>
            <button
              style={leaveReviewButton}
              onClick={shareCompletionRecord}
            >
              {t("shareRecord")}
            </button>

            <button
              style={leaveReviewButton}
              onClick={(event) => {
                event.stopPropagation();
                localStorage.setItem("completedJobViewMode", "business");
                setPage("completedJobDetails");
              }}
            >
              {t("openCompletedWork")}
            </button>

            <button
              style={leaveReviewButton}
              onClick={(event) => {
                event.stopPropagation();
                localStorage.setItem("meetroWorkCenterTab", "completed");
                setPage("contractorDashboard");
              }}
            >
              {t("backToWorkCenter")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={closeoutConfirmedNotice}>
            <MeetroIcon name="completion" size={16} decorative /> {t("serviceCompleted")} ·{" "}
            {language === "es"
              ? "Confirma la finalización; el cierre se revisa por separado"
              : "Confirm completion; Closure is reviewed separately"}
          </div>

          <div style={closeoutActionsStyle}>
            <button
              style={{
                ...primaryHomeownerAction,
                background: "#10b981",
              }}
              onClick={(event) => {
                event.stopPropagation();
                localStorage.setItem("completedJobViewMode", "homeowner");
                setPage("myRequests");
              }}
            >
              {t("leaveReview")}
            </button>

            <button
              style={{
                ...primaryHomeownerAction,
                background: "#f59e0b",
              }}
              onClick={(event) => {
                shareCompletionRecord(event);
              }}
            >
              {t("shareSaveReceipt")}
            </button>
          </div>
        </>
      )}

      {!isBusinessViewer && msg.completionStatus === "confirmed" && (
        <div style={closeoutConfirmedNotice}>
          <MeetroIcon name="completion" size={16} decorative />{" "}
          {getWorkflowStatusLabel("confirmed", language)} ·{" "}
          {language === "es" ? "Garantía reconocida" : "Warranty acknowledged"}
        </div>
      )}

      {!isBusinessViewer && msg.completionStatus === "followup_requested" && (
        <div style={closeoutFollowupNotice}>
          <MeetroIcon name="messages" size={16} decorative />{" "}
          {getWorkflowStatusLabel("followup_requested", language)}
        </div>
      )}

    </div>
  );
}

export default WorkflowCompletionCloseoutCard;
