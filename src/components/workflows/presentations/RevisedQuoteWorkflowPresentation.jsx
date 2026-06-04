import WorkflowRenderer from "../WorkflowRenderer";

function RevisedQuoteWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
  styles,
}) {
  const {
    revisedQuoteBody,
    revisedQuoteHeader,
    revisedQuoteEyebrow,
    revisedQuoteTitle,
    revisedQuoteAmount,
    revisedQuoteText,
    revisedQuoteBreakdown,
    revisedQuoteRow,
    revisedQuoteNotes,
    revisedQuoteActions,
    approveRevisedQuoteButton,
    requestRevisedQuoteChangeButton,
    revisedQuoteApproved,
    revisedQuotePending,
  } = styles;

  return (
    <div style={revisedQuoteBody}>
      <div style={revisedQuoteHeader}>
        <div>
          <p style={revisedQuoteEyebrow}>
            {language === "es" ? "Cotización revisada" : "Revised Quote"}
          </p>

          <h3 style={revisedQuoteTitle}>
            {msg.projectTitle || (language === "es" ? "Proyecto" : "Project")}
          </h3>
        </div>

        <div style={revisedQuoteAmount}>
          ${Number(msg.amount || 0).toFixed(2)}
        </div>
      </div>

      <p style={revisedQuoteText}>
        {msg.text ||
          (language === "es"
            ? "El profesional envió una cotización actualizada."
            : "The professional sent an updated quote.")}
      </p>

      <div style={revisedQuoteBreakdown}>
        <div style={revisedQuoteRow}>
          <span>{language === "es" ? "Mano de obra" : "Labor"}</span>
          <strong>${Number(msg.labor || 0).toFixed(2)}</strong>
        </div>

        <div style={revisedQuoteRow}>
          <span>{language === "es" ? "Materiales" : "Materials"}</span>
          <strong>${Number(msg.materials || 0).toFixed(2)}</strong>
        </div>

        <div style={revisedQuoteRow}>
          <span>{language === "es" ? "Tiempo estimado" : "Timeline"}</span>
          <strong>{msg.timeline || "Pending"}</strong>
        </div>
      </div>

      {msg.notes && <p style={revisedQuoteNotes}>{msg.notes}</p>}

      <WorkflowRenderer
        {...workflowRenderProps}
        styles={{
          revisedQuoteActions,
          approveRevisedQuoteButton,
          requestRevisedQuoteChangeButton,
          revisedQuoteApproved,
          revisedQuotePending,
        }}
      />
    </div>
  );
}

export default RevisedQuoteWorkflowPresentation;
