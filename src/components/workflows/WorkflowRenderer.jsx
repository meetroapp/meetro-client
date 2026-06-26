import WorkflowChangeRequestCard from "./WorkflowChangeRequestCard";
import WorkflowCompletionCloseoutCard from "./WorkflowCompletionCloseoutCard";
import WorkflowInvoiceRequestCard from "./WorkflowInvoiceRequestCard";
import WorkflowMaterialsApprovalCard from "./WorkflowMaterialsApprovalCard";
import WorkflowRevisedQuoteCard from "./WorkflowRevisedQuoteCard";
import WorkflowQuoteSentCard from "./WorkflowQuoteSentCard";

function WorkflowRenderer(props) {
  const { message, msg } = props;
  const workflowMessage = message || msg;

  if (!workflowMessage) {
    return null;
  }

  switch (workflowMessage.type) {
    case "workflow_change_request":
      return <WorkflowChangeRequestCard {...props} />;

    case "workflow_completion_closeout":
      return <WorkflowCompletionCloseoutCard {...props} />;

    case "workflow_invoice_request":
      return <WorkflowInvoiceRequestCard {...props} />;

    case "workflow_materials_approval":
      return <WorkflowMaterialsApprovalCard {...props} />;

    case "workflow_revised_quote":
      return <WorkflowRevisedQuoteCard {...props} />;

    case "workflow_quote_sent":
      return <WorkflowQuoteSentCard {...props} />;

    default:
      return null;
  }
}

export default WorkflowRenderer;
