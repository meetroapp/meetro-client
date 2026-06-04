import WorkflowRenderer from "../WorkflowRenderer";

function InvoiceWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
  styles,
}) {
  const {
    invoiceWorkflowBody,
    invoiceWorkflowHeader,
    invoiceWorkflowEyebrow,
    invoiceWorkflowTitle,
    invoiceWorkflowAmount,
    invoiceWorkflowText,
    invoiceWorkflowBreakdown,
    invoiceWorkflowRow,
    invoiceWorkflowNotes,
    invoiceWorkflowActions,
    markInvoicePaidButton,
    invoiceQuestionButton,
    invoicePaidNotice,
    invoiceQuestionNotice,
  } = styles;

  return (
    <div style={invoiceWorkflowBody}>
      <div style={invoiceWorkflowHeader}>
        <div>
          <p style={invoiceWorkflowEyebrow}>
            {language === "es" ? "Solicitud de pago" : "Payment Request"}
          </p>

          <h3 style={invoiceWorkflowTitle}>
            {msg.projectTitle ||
              msg.invoice?.service ||
              (language === "es" ? "Servicio" : "Service")}
          </h3>
        </div>

        <div style={invoiceWorkflowAmount}>
          ${Number(msg.invoice?.total || 0).toFixed(2)}
        </div>
      </div>

      <p style={invoiceWorkflowText}>
        {msg.invoice?.workPerformed ||
          msg.text ||
          (language === "es"
            ? "Factura enviada por el profesional."
            : "Invoice sent by professional.")}
      </p>

      <div style={invoiceWorkflowBreakdown}>
        <div style={invoiceWorkflowRow}>
          <span>{language === "es" ? "Mano de obra" : "Labor"}</span>
          <strong>${Number(msg.invoice?.labor || 0).toFixed(2)}</strong>
        </div>

        <div style={invoiceWorkflowRow}>
          <span>{language === "es" ? "Materiales" : "Materials"}</span>
          <strong>${Number(msg.invoice?.materials || 0).toFixed(2)}</strong>
        </div>

        <div style={invoiceWorkflowRow}>
          <span>{language === "es" ? "Tarifa" : "Service fee"}</span>
          <strong>${Number(msg.invoice?.serviceFee || 0).toFixed(2)}</strong>
        </div>

        <div style={invoiceWorkflowRow}>
          <span>{language === "es" ? "Descuento" : "Discount"}</span>
          <strong>-${Number(msg.invoice?.discount || 0).toFixed(2)}</strong>
        </div>
      </div>

      {msg.invoice?.notes && (
        <p style={invoiceWorkflowNotes}>{msg.invoice.notes}</p>
      )}

      <WorkflowRenderer
        {...workflowRenderProps}
        styles={{
          invoiceWorkflowActions,
          markInvoicePaidButton,
          invoiceQuestionButton,
          invoicePaidNotice,
          invoiceQuestionNotice,
        }}
      />
    </div>
  );
}

export default InvoiceWorkflowPresentation;
