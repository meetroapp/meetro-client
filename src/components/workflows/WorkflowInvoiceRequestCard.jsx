import { getWorkflowStatusLabel } from "../../utils/workflowStatus";
import { t } from "../../utils/language";
import {
  updateMatchingHomeownerRequests,
  prependProjectTimeline,
} from "../../utils/workflowTimeline";
import MeetroIcon from "../MeetroIcon";
import UniversalDocumentCard from "../documents/UniversalDocumentCard";

function WorkflowInvoiceRequestCard({
  msg,
  language,
  currentViewerRole,
  setMessages,
  setMessageText,
  reviewProjectAction,
}) {
  const title =
    msg.projectTitle || msg.invoice?.service || msg.title || t("documentInvoice", language);
  const amount = msg.invoice?.total || msg.total || msg.amount || "";
  const status =
    msg.paymentStatus === "paid" || msg.invoice?.status === "paid"
      ? t("documentStatusPaid", language)
      : msg.paymentStatus === "question"
      ? t("documentStatusQuestionSent", language)
      : t("documentStatusUnpaid", language);

  return (
    <UniversalDocumentCard
      documentType="invoice"
      projectTitle={title}
      amount={amount}
      status={status}
      language={language}
      icon="quickInvoice"
      reviewProjectAction={() =>
        reviewProjectAction?.({
          ...msg.invoice,
          ...msg,
          title,
          projectTitle: title,
          total: amount,
          status,
          type: "invoice",
        })
      }
    />
  );

  return (
    <>
      {currentViewerRole !== "business" &&
        msg.paymentStatus === "payment_requested" && (
          <div style={invoiceWorkflowActions}>
            <button
              style={markInvoicePaidButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "payment_marked_paid",
                        invoicePaymentMarkedPaid: true,
                        invoicePaymentMarkedPaidAt:
                          new Date().toISOString(),
                        invoiceTotalPaid:
                          msg.invoice?.total || 0,
                      },
                      {
                        type: "invoicePaymentMarkedPaid",
                        label:
                          language === "es"
                            ? "Pago marcado como realizado"
                            : "Payment marked paid",
                        amount:
                          msg.invoice?.total || 0,
                      }
                    )
                );

                localStorage.setItem("activeInvoiceStatus", "paid");

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          paymentStatus: "paid",
                          text:
                            language === "es"
                              ? "El cliente marcó esta factura como pagada."
                              : "Customer marked this invoice as paid.",
                          invoice: {
                            ...(item.invoice || {}),
                            status: "paid",
                          },
                        }
                      : item
                  )
                );
              }}
            >
              {language === "es"
                ? "Marcar pagado"
                : "Mark Paid"}
            </button>

            <button
              style={invoiceQuestionButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "payment_question",
                        invoiceQuestionAsked: true,
                        invoiceQuestionAskedAt:
                          new Date().toISOString(),
                      },
                      {
                        type: "invoiceQuestionAsked",
                        label:
                          language === "es"
                            ? "Pregunta enviada sobre factura"
                            : "Question sent about invoice",
                        amount:
                          msg.invoice?.total || 0,
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          paymentStatus: "question",
                          text:
                            language === "es"
                              ? "El cliente tiene una pregunta sobre la factura."
                              : "Customer has a question about the invoice.",
                        }
                      : item
                  )
                );

                setMessageText(
                  language === "es"
                    ? "Tengo una pregunta sobre esta factura."
                    : "I have a question about this invoice."
                );
              }}
            >
              {language === "es"
                ? "Pregunta"
                : "Ask Question"}
            </button>
          </div>
        )}

      {msg.paymentStatus === "paid" && (
        <div style={invoicePaidNotice}>
          <MeetroIcon name="payment" size={16} decorative />{" "}
          {getWorkflowStatusLabel("paid", language)}
        </div>
      )}

      {msg.paymentStatus === "question" && (
        <div style={invoiceQuestionNotice}>
          <MeetroIcon name="messages" size={16} decorative />{" "}
          {getWorkflowStatusLabel("question", language)}
        </div>
      )}
    </>
  );
}

export default WorkflowInvoiceRequestCard;
