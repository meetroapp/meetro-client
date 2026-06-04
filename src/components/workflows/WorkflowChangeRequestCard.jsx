import { getWorkflowStatusLabel } from "../../utils/workflowStatus";

function WorkflowChangeRequestCard({
  msg,
  language,
  currentViewerRole,
  conversation,
  setMessages,
  setMessageText,
  setPage,
  styles,
}) {
  const {
    changeRequestBody,
    changeRequestText,
    changeRequestStatus,
    changeRequestActions,
    reviewChangeButton,
    revisedQuoteButton,
  } = styles;

  return (
    <div style={changeRequestBody}>
      <p style={changeRequestText}>
        {msg.text ||
          (language === "es"
            ? "Solicitud de cambio enviada."
            : "Change request sent.")}
      </p>

      <div style={changeRequestStatus}>
        {getWorkflowStatusLabel(
          msg.status || "pending_review",
          language
        ) || (language === "es" ? "En revisión" : "In review")}
      </div>

      {currentViewerRole === "business" && msg.status === "pending_review" && (
        <div style={changeRequestActions}>
          <button
            style={reviewChangeButton}
            onClick={(event) => {
              event.stopPropagation();

              setMessages((prev) =>
                prev.map((item) =>
                  item.id === msg.id
                    ? {
                        ...item,
                        status: "reviewed",
                        subtitle:
                          language === "es"
                            ? "Cambio revisado por el profesional"
                            : "Change reviewed by professional",
                      }
                    : item
                )
              );
            }}
          >
            {language === "es" ? "Marcar revisado" : "Mark Reviewed"}
          </button>

          <button
            style={revisedQuoteButton}
            onClick={(event) => {
              event.stopPropagation();

              const revisedQuoteContext = {
                source: "workflow_change_request",
                workflowType: "project",
                requestId:
                  msg.requestId ||
                  conversation?.requestId ||
                  conversation?.id ||
                  "",
                conversationId:
                  conversation?.conversationId || conversation?.id || "",
                projectTitle:
                  conversation?.projectTitle ||
                  conversation?.title ||
                  msg.projectTitle ||
                  "Project",
                projectDescription: msg.text || conversation?.description || "",
                changeRequestId: msg.id,
                changeRequestMessage: msg.text || "",
                homeownerName: conversation?.homeownerName || "Homeowner",
                businessName: localStorage.getItem("businessName") || "Business",
                createdAt: new Date().toISOString(),
              };

              localStorage.setItem(
                "meetroRevisedQuoteContext",
                JSON.stringify(revisedQuoteContext)
              );

              setMessages((prev) =>
                prev.map((item) =>
                  item.id === msg.id
                    ? {
                        ...item,
                        status: "needs_revised_quote",
                        subtitle:
                          language === "es"
                            ? "El cambio requiere cotización revisada"
                            : "Change requires revised quote",
                      }
                    : item
                )
              );

              setMessageText(
                language === "es"
                  ? "Voy a revisar el cambio y preparar una cotización actualizada."
                  : "I’ll review the change and prepare an updated quote."
              );

              setPage("quoteBuilder");
            }}
          >
            {language === "es" ? "Cotización revisada" : "Revised Quote Needed"}
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkflowChangeRequestCard;
