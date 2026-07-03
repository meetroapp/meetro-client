const PRIMARY_CTA_LABELS = {
  schedule_visit: {
    en: "Schedule Visit",
    es: "Programar visita",
  },
  start_evaluation: {
    en: "Record Evaluation Notes",
    es: "Registrar notas de evaluación",
  },
  create_proposal: {
    en: "Prepare Proposal",
    es: "Preparar propuesta",
  },
  send_proposal: {
    en: "Send Proposal",
    es: "Enviar propuesta",
  },
  open_conversation: {
    en: "Continue Conversation",
    es: "Continuar conversación",
  },
  record_payment: {
    en: "Record Payment",
    es: "Registrar pago",
  },
  schedule_work: {
    en: "Schedule Work",
    es: "Programar trabajo",
  },
  mark_en_route: {
    en: "Mark On The Way",
    es: "Marcar en camino",
  },
  mark_arrived: {
    en: "Mark Arrived",
    es: "Marcar llegada",
  },
  start_work: {
    en: "Start Work",
    es: "Comenzar trabajo",
  },
  complete_work: {
    en: "Record Completion",
    es: "Registrar finalización",
  },
  create_receipt: {
    en: "Create Receipt",
    es: "Crear recibo",
  },
  send_receipt: {
    en: "Send Receipt",
    es: "Enviar recibo",
  },
  close_job: {
    en: "Review Closure",
    es: "Revisar cierre",
  },
  view_history: {
    en: "View History",
    es: "Ver historial",
  },
};

export function getWorkCenterPrimaryCtaLabel(actionType = "", language = "en") {
  const labels = PRIMARY_CTA_LABELS[actionType] || {};
  return labels[language] || labels.en || "";
}

export function getWorkCenterPrimaryCtaLabels() {
  return Object.freeze({ ...PRIMARY_CTA_LABELS });
}
