import { getWorkflowStatusLabel } from "../../utils/workflowStatus";
import {
  updateMatchingHomeownerRequests,
  prependProjectTimeline,
} from "../../utils/workflowTimeline";

function WorkflowRevisedQuoteCard({
  msg,
  language,
  currentViewerRole,
  setMessages,
  setMessageText,
  styles,
}) {
  const {
    revisedQuoteActions,
    approveRevisedQuoteButton,
    requestRevisedQuoteChangeButton,
    revisedQuoteApproved,
    revisedQuotePending,
  } = styles;

  return (
    <>
      {currentViewerRole !== "business" &&
        msg.status === "quote_sent" && (
          <div style={revisedQuoteActions}>
            <button
              style={approveRevisedQuoteButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "approved",
                        revisedQuoteApproved: true,
                        revisedQuoteApprovedAt:
                          new Date().toISOString(),
                        approvedRevisedQuoteAmount:
                          msg.amount || 0,
                      },
                      {
                        type: "revisedQuoteApproved",
                        label:
                          language === "es"
                            ? "Cotización revisada aprobada"
                            : "Revised quote approved",
                        quoteId: msg.id || "",
                        amount: msg.amount || 0,
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          status: "approved",
                          text:
                            language === "es"
                              ? "Cotización revisada aprobada por el cliente."
                              : "Revised quote approved by customer.",
                        }
                      : item
                  )
                );
              }}
            >
              {language === "es"
                ? "Aprobar"
                : "Approve"}
            </button>

            <button
              style={requestRevisedQuoteChangeButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "revision_requested",
                        revisedQuoteChangeRequested: true,
                        revisedQuoteChangeRequestedAt:
                          new Date().toISOString(),
                      },
                      {
                        type: "revisedQuoteChangeRequested",
                        label:
                          language === "es"
                            ? "Cambios solicitados en cotización revisada"
                            : "Changes requested on revised quote",
                        quoteId: msg.id || "",
                        amount: msg.amount || 0,
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          status: "change_requested",
                          text:
                            language === "es"
                              ? "El cliente solicitó cambios en la cotización revisada."
                              : "Customer requested changes to the revised quote.",
                        }
                      : item
                  )
                );

                setMessageText(
                  language === "es"
                    ? "Tengo una pregunta sobre la cotización revisada."
                    : "I have a question about the revised quote."
                );
              }}
            >
              {language === "es"
                ? "Cambios"
                : "Request Change"}
            </button>
          </div>
        )}

      {msg.status === "approved" && (
        <div style={revisedQuoteApproved}>
          ✅{" "}
          {getWorkflowStatusLabel("approved", language)}
        </div>
      )}

      {msg.status === "change_requested" && (
        <div style={revisedQuotePending}>
          💬{" "}
          {getWorkflowStatusLabel("change_requested", language)}
        </div>
      )}
    </>
  );
}

export default WorkflowRevisedQuoteCard;
