export function getWorkflowStatusLabel(status, language = "en") {
  const labels = {
    en: {
      pending_review: "Awaiting professional review",
      reviewed: "Reviewed by professional",
      needs_revised_quote: "Revised quote needed",

      quote_sent: "Quote sent",
      approved: "Approved",
      change_requested: "Changes requested",

      pending_materials_approval: "Pending",
      materials_approved: "Materials approved",
      materials_change_requested: "Changes requested",
      customer_providing_materials: "Customer will provide materials",

      payment_requested: "Payment requested",
      paid: "Payment marked paid",
      question: "Question sent",

      awaiting_customer_confirmation: "Awaiting customer confirmation",
      confirmed: "Confirmed",
      followup_requested: "Follow-up requested",
    },
    es: {
      pending_review: "Esperando revisión profesional",
      reviewed: "Revisado por el profesional",
      needs_revised_quote: "Requiere cotización revisada",

      quote_sent: "Cotización enviada",
      approved: "Aprobado",
      change_requested: "Cambios solicitados",

      pending_materials_approval: "Pendiente",
      materials_approved: "Materiales aprobados",
      materials_change_requested: "Cambios solicitados",
      customer_providing_materials: "El cliente proveerá los materiales",

      payment_requested: "Pago solicitado",
      paid: "Pago marcado como realizado",
      question: "Pregunta enviada",

      awaiting_customer_confirmation: "Esperando confirmación del cliente",
      confirmed: "Confirmado",
      followup_requested: "Seguimiento solicitado",
    },
  };

  return labels[language]?.[status] || labels.en[status] || status || "";
}

export function getWorkflowTypeIcon(type) {
  const icons = {
    workflow_change_request: "🔁",
    workflow_revised_quote: "💰",
    workflow_materials_approval: "📦",
    workflow_invoice_request: "🧾",
    workflow_completion_closeout: "🏁",
  };

  return icons[type] || "📌";
}

export function isWorkflowMessage(type) {
  return [
    "workflow_change_request",
    "workflow_revised_quote",
    "workflow_materials_approval",
    "workflow_invoice_request",
    "workflow_completion_closeout",
  ].includes(type);
}
