export const WORKFLOW_TYPES = [
  "workflow_change_request",
  "workflow_quote_sent",
  "workflow_revised_quote",
  "workflow_materials_approval",
  "workflow_invoice_request",
  "workflow_completion_closeout",
];

export function isWorkflowType(type) {
  return WORKFLOW_TYPES.includes(type);
}

export function getWorkflowIcon(type) {
  const icons = {
    workflow_change_request: "history",
    workflow_quote_sent: "quote",
    workflow_revised_quote: "quote",
    workflow_materials_approval: "materials",
    workflow_invoice_request: "quickInvoice",
    workflow_completion_closeout: "completion",
  };

  return icons[type] || "noteText";
}

export function getWorkflowTitle(type, language = "en") {
  const titles = {
    workflow_change_request: {
      en: "Change Request",
      es: "Solicitud de cambio",
    },
    workflow_quote_sent: {
      en: "Quote Sent",
      es: "Cotización enviada",
    },
    workflow_revised_quote: {
      en: "Revised Quote",
      es: "Cotización revisada",
    },
    workflow_materials_approval: {
      en: "Materials Approval",
      es: "Aprobación de materiales",
    },
    workflow_invoice_request: {
      en: "Payment Request",
      es: "Solicitud de pago",
    },
    workflow_completion_closeout: {
      en: "Completion Record",
      es: "Registro de finalización",
    },
  };

  return titles[type]?.[language] || titles[type]?.en || "";
}

export function getWorkflowMessageProps(msg, language = "en") {
  if (!msg) {
    return {
      icon: "noteText",
      title: "",
      subtitle: "",
      workflowType: "",
    };
  }

  return {
    icon: getWorkflowIcon(msg.type),
    title: msg.title || getWorkflowTitle(msg.type, language),
    subtitle: msg.subtitle || getWorkflowSubtitle(msg, language),
    workflowType: msg.type,
  };
}

export function isWorkflowMessageType(msg, type) {
  return Boolean(msg && msg.type === type);
}

export function getWorkflowSubtitle(msg, language = "en") {
  if (!msg) return "";

  if (msg.subtitle) return msg.subtitle;

  if (msg.type === "workflow_change_request") {
    if (msg.priority === "urgent") {
      return language === "es"
        ? "Cambio urgente solicitado"
        : "Urgent change requested";
    }

    return language === "es"
      ? "Cambio solicitado por el cliente"
      : "Customer requested project change";
  }

  if (msg.type === "workflow_quote_sent") {
    return language === "es"
      ? "Cotización enviada para revisión"
      : "Quote sent for review";
  }

  if (msg.type === "workflow_revised_quote") {
    return language === "es"
      ? "Cotización actualizada enviada"
      : "Updated quote sent";
  }

  if (msg.type === "workflow_materials_approval") {
    return language === "es"
      ? "Materiales pendientes de aprobación"
      : "Materials pending approval";
  }

  if (msg.type === "workflow_invoice_request") {
    return language === "es"
      ? "Factura enviada para pago"
      : "Invoice sent for payment";
  }

  if (msg.type === "workflow_completion_closeout") {
    return language === "es"
      ? "Trabajo marcado como completado"
      : "Job marked completed";
  }

  return "";
}
