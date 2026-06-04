import WorkflowRenderer from "../WorkflowRenderer";

function CompletionWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
  styles,
}) {
  const {
    closeoutWorkflowBody,
    closeoutWorkflowHeader,
    closeoutWorkflowEyebrow,
    closeoutWorkflowTitle,
    closeoutWorkflowAmount,
    closeoutWorkflowText,
    closeoutWorkflowBreakdown,
    closeoutWorkflowRow,
    closeoutConfirmedNotice,
    closeoutFollowupNotice,
    leaveReviewButton,
  } = styles;

  return (
    <div style={closeoutWorkflowBody}>
      <div style={closeoutWorkflowHeader}>
        <div>
          <p style={closeoutWorkflowEyebrow}>
            {language === "es" ? "Cierre del proyecto" : "Project Closeout"}
          </p>

          <h3 style={closeoutWorkflowTitle}>
            {msg.projectTitle ||
              msg.completion?.service ||
              (language === "es" ? "Trabajo completado" : "Completed Job")}
          </h3>
        </div>

        <div style={closeoutWorkflowAmount}>
          ${Number(msg.completion?.amount || 0).toFixed(2)}
        </div>
      </div>

      <p style={closeoutWorkflowText}>
        {msg.completion?.notes ||
          msg.text ||
          (language === "es"
            ? "El profesional marcó el trabajo como completado."
            : "The professional marked the job as completed.")}
      </p>

      <div style={closeoutWorkflowBreakdown}>
        <div style={closeoutWorkflowRow}>
          <span>{language === "es" ? "Pago recibido" : "Payment received"}</span>
          <strong>{msg.completion?.paymentReceived || "Pending"}</strong>
        </div>

        <div style={closeoutWorkflowRow}>
          <span>{language === "es" ? "Tipo de pago" : "Payment type"}</span>
          <strong>{msg.completion?.paymentType || "Pending"}</strong>
        </div>

        <div style={closeoutWorkflowRow}>
          <span>{language === "es" ? "Costo materiales" : "Material cost"}</span>
          <strong>
            ${Number(msg.completion?.materialCost || 0).toFixed(2)}
          </strong>
        </div>

        <div style={closeoutWorkflowRow}>
          <span>{language === "es" ? "Horas labor" : "Labor hours"}</span>
          <strong>{msg.completion?.laborHours || "0"}</strong>
        </div>
      </div>

      <WorkflowRenderer
        {...workflowRenderProps}
        styles={{
          closeoutWorkflowBody,
          closeoutConfirmedNotice,
          closeoutFollowupNotice,
          leaveReviewButton,
        }}
      />
    </div>
  );
}

export default CompletionWorkflowPresentation;
