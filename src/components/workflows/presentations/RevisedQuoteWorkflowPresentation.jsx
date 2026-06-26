import { t } from "../../../utils/language";
import UniversalDocumentCard from "../../documents/UniversalDocumentCard";

function getRevisedQuoteStatus(msg, language) {
  const status = msg.status || msg.quoteStatus || "quote_sent";

  if (status === "approved" || status === "accepted") {
    return t("documentStatusApproved", language);
  }

  if (status === "change_requested" || status === "revision_requested") {
    return t("documentStatusRevisionRequested", language);
  }

  return t("documentStatusAwaitingApproval", language);
}

function RevisedQuoteWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
}) {
  const title = msg.projectTitle || msg.title || t("project", language);
  const amount = msg.amount || msg.total || msg.quoteAmount || "";
  const record = {
    ...msg,
    title,
    projectTitle: title,
    total: amount,
    status: getRevisedQuoteStatus(msg, language),
  };

  return (
    <UniversalDocumentCard
      documentType="quote"
      projectTitle={title}
      amount={amount}
      status={getRevisedQuoteStatus(msg, language)}
      language={language}
      icon="quote"
      reviewProjectAction={() => workflowRenderProps.reviewProjectAction?.({
        ...record,
        type: "quote",
      })}
    />
  );
}

export default RevisedQuoteWorkflowPresentation;
