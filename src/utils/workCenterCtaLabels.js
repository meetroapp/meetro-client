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
    en: "Create Proposal",
    es: "Crear propuesta",
  },
  send_proposal: {
    en: "Send Proposal",
    es: "Enviar propuesta",
  },
  open_conversation: {
    en: "Open Conversation",
    es: "Abrir conversación",
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
    en: "Complete Work",
    es: "Completar trabajo",
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
    en: "Close Job",
    es: "Cerrar trabajo",
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
