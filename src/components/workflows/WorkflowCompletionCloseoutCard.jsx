import { getWorkflowStatusLabel } from "../../utils/workflowStatus";
import {
  updateMatchingHomeownerRequests,
  prependProjectTimeline,
} from "../../utils/workflowTimeline";

function WorkflowCompletionCloseoutCard({
  msg,
  language,
  currentViewerRole,
  setMessages,
  setMessageText,
  styles,
}) {
  const {
    closeoutWorkflowBody,
    closeoutConfirmedNotice,
    closeoutFollowupNotice,
    leaveReviewButton,
  } = styles;

  return (
    <div style={closeoutWorkflowBody}>
      {currentViewerRole !== "business" &&
        msg.completionStatus !== "confirmed" &&
        msg.completionStatus !== "followup_requested" && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              style={{
                flex: 1,
                border: "none",
                borderRadius: 14,
                padding: "12px 14px",
                background: "#10b981",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={(event) => {
                event.stopPropagation();

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          completionStatus: "confirmed",
                          text:
                            language === "es"
                              ? "El cliente confirmó el cierre del proyecto."
                              : "Customer confirmed project closeout.",
                        }
                      : item
                  )
                );
              }}
            >
              {language === "es"
                ? "Confirmar cierre"
                : "Confirm Completion"}
            </button>

            <button
              style={{
                flex: 1,
                border: "none",
                borderRadius: 14,
                padding: "12px 14px",
                background: "#f59e0b",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "closeout_followup_requested",
                        closeoutFollowupRequested: true,
                        closeoutFollowupRequestedAt:
                          new Date().toISOString(),
                      },
                      {
                        type: "closeoutFollowupRequested",
                        label:
                          language === "es"
                            ? "Seguimiento solicitado por el cliente"
                            : "Follow-up requested by customer",
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          completionStatus: "followup_requested",
                          text:
                            language === "es"
                              ? "El cliente solicitó seguimiento antes del cierre."
                              : "Customer requested follow-up before closeout.",
                        }
                      : item
                  )
                );

                setMessageText(
                  language === "es"
                    ? "Tengo una pregunta antes de confirmar el cierre."
                    : "I have a question before confirming closeout."
                );
              }}
            >
              {language === "es"
                ? "Solicitar seguimiento"
                : "Request Follow-up"}
            </button>
          </div>
        )}

      {msg.completionStatus === "confirmed" && (
        <div style={closeoutConfirmedNotice}>
          ✅{" "}
          {getWorkflowStatusLabel("confirmed", language)} ·{" "}
          {language === "es" ? "Garantía reconocida" : "Warranty acknowledged"}
        </div>
      )}

      {msg.completionStatus === "followup_requested" && (
        <div style={closeoutFollowupNotice}>
          💬{" "}
          {getWorkflowStatusLabel("followup_requested", language)}
        </div>
      )}

      {msg.completionStatus === "confirmed" && (
        <button
          style={leaveReviewButton}
          onClick={(event) => {
            event.stopPropagation();

            setMessageText(
              language === "es"
                ? "Gracias por el servicio. Quiero dejar una reseña."
                : "Thank you for the service. I would like to leave a review."
            );
          }}
        >
          ⭐ {language === "es" ? "Dejar reseña" : "Leave Review"}
        </button>
      )}
    </div>
  );
}

export default WorkflowCompletionCloseoutCard;
