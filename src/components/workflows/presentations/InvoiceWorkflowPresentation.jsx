import { t } from "../../../utils/language";
import UniversalDocumentCard from "../../documents/UniversalDocumentCard";

function getInvoiceStatus(msg, language) {
  const status = msg.paymentStatus || msg.invoice?.status || msg.status || "";

  if (status === "paid") return t("documentStatusPaid", language);
  if (status === "question") return t("documentStatusQuestionSent", language);

  return t("documentStatusUnpaid", language);
}

function InvoiceWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
}) {
  const title =
    msg.projectTitle ||
    msg.invoice?.service ||
    msg.title ||
    (language === "es" ? "Servicio" : "Service");
  const amount = msg.invoice?.total || msg.total || msg.amount || "";
  const record = {
    ...msg.invoice,
    ...msg,
    title,
    projectTitle: title,
    total: amount,
    status: getInvoiceStatus(msg, language),
  };

  return (
    <UniversalDocumentCard
      documentType="invoice"
      projectTitle={title}
      amount={amount}
      status={getInvoiceStatus(msg, language)}
      language={language}
      icon="quickInvoice"
      reviewProjectAction={() => workflowRenderProps.reviewProjectAction?.({
        ...record,
        type: "invoice",
      })}
    />
  );
}

export default InvoiceWorkflowPresentation;
