function normalizeStatus(status) {
  return String(status || "pending").toLowerCase().trim();
}

const CLOSED_REQUEST_STATUSES = new Set([
  "closed",
  "closure_completed",
  "history",
  "archived",
  "deleted",
]);

const CANCELLED_REQUEST_STATUSES = new Set(["cancelled", "canceled"]);

const MOVED_ON_LEAD_STATUSES = new Set([
  "accepted",
  "selected",
  "scheduled",
  "work_scheduled",
  "scheduled_work",
  "on_the_way",
  "enroute",
  "arrived",
  "active",
  "in_progress",
  "working",
  "started",
  "needs_resolution",
  "completed",
  "work_completed",
  "closed",
  "closure_completed",
  "history",
  "archived",
  "deleted",
  "cancelled",
  "canceled",
]);

export function isRequestClosedOrArchived(request = {}) {
  const status = normalizeStatus(request.status);
  const lifecycleState = normalizeStatus(request.lifecycleState);
  const closureStatus = normalizeStatus(request.closureStatus);

  return Boolean(
    CLOSED_REQUEST_STATUSES.has(status) ||
      lifecycleState === "history" ||
      lifecycleState === "archived" ||
      closureStatus === "closed" ||
      request.closedAt ||
      request.archivedAt ||
      request.deletedAt ||
      request.archived === true ||
      request.deleted === true ||
      request.isArchived === true ||
      request.isDeleted === true ||
      request.savedToHistory
  );
}

export function isRequestVisibleToHomeowner(request = {}) {
  return Boolean(request) && !isRequestClosedOrArchived(request);
}

export function isRequestActiveForHomeowner(request = {}) {
  const status = normalizeStatus(request.status);
  return isRequestVisibleToHomeowner(request) && !CANCELLED_REQUEST_STATUSES.has(status);
}

export function isRequestAvailableAsNewLead(request = {}) {
  const status = normalizeStatus(request.status || "open");
  const relationshipOwned = Boolean(
    request.professionalId ||
      request.businessId ||
      request.contractorId ||
      request.assignedProfessionalId ||
      request.selectedBusinessId ||
      request.acceptedByBusinessId ||
      request.matchedBusinessId ||
      request.providerId ||
      request.acceptedProfessionalId ||
      request.selectedProfessionalId ||
      request.assignedProfessionalName ||
      request.assignedProfessional ||
      request.acceptedByProfessionalId
  );
  const quoteAccepted = Array.isArray(request.quotesReceived)
    ? request.quotesReceived.some((quote) =>
        ["accepted", "approved"].includes(normalizeStatus(quote?.status || quote?.quoteStatus))
      )
    : false;

  return Boolean(
    request &&
      !MOVED_ON_LEAD_STATUSES.has(status) &&
      !relationshipOwned &&
      !request.acceptedQuote &&
      !request.selectedProfessional &&
      !request.acceptedByProfessionalId &&
      !request.acceptedAt &&
      !quoteAccepted &&
      !isRequestClosedOrArchived(request)
  );
}

function hasItems(value) {
  return Array.isArray(value) ? value.length > 0 : Number(value || 0) > 0;
}

function hasTimelineType(request, matcher) {
  return Array.isArray(request?.projectTimeline)
    ? request.projectTimeline.some((event) => matcher(String(event?.type || "").toLowerCase()))
    : false;
}

export function getHomeownerLifecycleStage(request = {}, language = "en") {
  const status = normalizeStatus(request.status);
  const quotesReceived = hasItems(request.quotesReceived);
  const hasAcceptedQuote = Boolean(request.acceptedQuote) || status === "accepted";
  const hasCompletion =
    status === "completed" ||
    Boolean(request.completionRecord) ||
    hasTimelineType(request, (type) => type.includes("completion"));
  const isClosed =
    status === "closed" ||
    status === "closure_completed" ||
    status === "history" ||
    request.lifecycleState === "history" ||
    request.closureStatus === "closed" ||
    request.closedAt ||
    request.savedToHistory;
  const hasSchedule =
    status === "scheduled" ||
    Boolean(request.scheduledAt || request.appointmentDate || request.evaluationDate) ||
    hasTimelineType(request, (type) => type.includes("schedule") || type.includes("appointment"));
  const hasMessages =
    status === "messaged" ||
    Number(request.messagesCount || 0) > 0 ||
    hasTimelineType(request, (type) => type.includes("message"));

  const copy = {
    en: {
      waiting: ["Waiting for professional response", "No action needed right now. Professionals can respond to your request."],
      communication: ["Communication started", "Share details and coordinate an evaluation."],
      scheduled: ["Evaluation scheduled", "Complete the evaluation before quote approval."],
      quote: ["Quote received", "Review the proposal and request changes if needed."],
      approval: ["Approval needed", "Approve a quote when you are ready for work."],
      work: ["Work in progress", "Follow updates until the work is completed."],
      completion: ["Completion review", "Confirm completion, then review Closure obligations."],
      closure: ["Closure pending", "Resolve payment, documents, confirmations, and obligations."],
      history: ["Saved to relationship history", "Use history for future service."],
      cancelled: ["Request cancelled", "Restore or create a new request when needed."],
    },
    es: {
      waiting: ["Esperando respuesta profesional", "No necesita hacer nada por ahora. Los profesionales pueden responder a su solicitud."],
      communication: ["Comunicación iniciada", "Comparte detalles y coordina una evaluación."],
      scheduled: ["Evaluación programada", "Completa la evaluación antes de aprobar una cotización."],
      quote: ["Cotización recibida", "Revisa la propuesta y solicita cambios si es necesario."],
      approval: ["Aprobación requerida", "Aprueba una cotización cuando estés listo para el trabajo."],
      work: ["Trabajo en progreso", "Sigue las actualizaciones hasta que el trabajo se complete."],
      completion: ["Revisión de finalización", "Confirma la finalización y luego revisa obligaciones de Cierre."],
      closure: ["Cierre pendiente", "Resuelve pagos, documentos, confirmaciones y obligaciones."],
      history: ["Guardado en historial de relación", "Usa el historial para servicios futuros."],
      cancelled: ["Solicitud cancelada", "Restaura o crea una nueva solicitud cuando sea necesario."],
    },
  };

  let key = "waiting";

  if (status === "cancelled") key = "cancelled";
  else if (isClosed) key = "history";
  else if (hasCompletion) key = "closure";
  else if (["active", "in_progress", "working", "started"].includes(status)) key = "work";
  else if (hasAcceptedQuote) key = "work";
  else if (quotesReceived || status === "quoted") key = "approval";
  else if (hasSchedule) key = "scheduled";
  else if (hasMessages || status === "viewed") key = "communication";

  const [stageLabel, nextStep] = copy[language === "es" ? "es" : "en"][key];

  return {
    key,
    stageLabel,
    nextStep,
  };
}

export function getHomeownerWorkflowPresentation(request = {}, language = "en") {
  const lifecycle = getHomeownerLifecycleStage(request, language);
  const status = normalizeStatus(request.status);
  const quote =
    request.acceptedQuote ||
    (Array.isArray(request.quotesReceived)
      ? request.quotesReceived.find((item) =>
          ["sent", "viewed", "pending", "revision_requested", "accepted", "approved"].includes(
            normalizeStatus(item?.status || item?.quoteStatus)
          )
        ) || request.quotesReceived[0]
      : null) ||
    {};
  const quoteStatus = normalizeStatus(quote.status || quote.quoteStatus);
  const hasProposal = Boolean(quote.quoteId || request.acceptedQuote || hasItems(request.quotesReceived));
  const paymentRecorded = Boolean(
    request.paymentStatus ||
      request.paymentRecord ||
      request.depositPaid ||
      request.depositRecorded ||
      request.paymentReceivedAt
  );
  const hasCompletion =
    status === "completed" ||
    Boolean(request.completionRecord) ||
    hasTimelineType(request, (type) => type.includes("completion"));
  const closed =
    status === "closed" ||
    status === "closure_completed" ||
    status === "history" ||
    request.lifecycleState === "history" ||
    request.closureStatus === "closed" ||
    request.closedAt ||
    request.savedToHistory;
  const schedule = request.schedule || request.appointment || request.linkedAppointment || {};
  const hasSchedule =
    status === "scheduled" ||
    Boolean(request.scheduledAt || request.appointmentDate || request.evaluationDate || schedule.date);
  const activeWorkStatus = normalizeStatus(
    request.activeWorkStatus ||
      request.workStatus ||
      request.workflowStage ||
      status
  );

  const copy = {
    en: {
      request: {
        status: "Waiting for professional response",
        next: "No action needed right now.",
        action: "Continue Request",
        hint: "Request submitted",
      },
      visit: {
        status: "Visit scheduled",
        next: "Confirm or review the appointment details.",
        action: "Review Schedule",
        hint: "Visit scheduled",
      },
      evaluation: {
        status: "Evaluation completed",
        next: "The professional can prepare your proposal.",
        action: "Review Details",
        hint: "Evaluation saved",
      },
      proposal: {
        status: "Proposal Ready for Review",
        next: "Review the proposal, approve it, or request changes.",
        action: "Review Proposal",
        hint: "Proposal ready",
      },
      approval: {
        status: "Waiting for Your Approval",
        next: "Approve the proposal or request changes.",
        action: "Approve Proposal",
        hint: "Approval needed",
      },
      payment: {
        status: "Payment / Deposit needed",
        next: "Review payment details before work is scheduled.",
        action: "Review Payment Details",
        hint: "Payment step",
      },
      workScheduled: {
        status: "Your work is scheduled",
        next: "Review the work date or message the professional.",
        action: "Review Schedule",
        hint: "Work scheduled",
      },
      onTheWay: {
        status: "Professional is on the way",
        next: "Watch for arrival updates.",
        action: "Continue Conversation",
        hint: "On the way",
      },
      arrived: {
        status: "Professional has arrived",
        next: "Work can begin after arrival.",
        action: "Continue Conversation",
        hint: "Arrived",
      },
      progress: {
        status: "Work in progress",
        next: "Follow updates until the work is completed.",
        action: "Continue Conversation",
        hint: "Active work",
      },
      completion: {
        status: "Work completed — review details",
        next: "Review completion, receipt, and closure details.",
        action: "Review Completion",
        hint: "Completion review",
      },
      history: {
        status: "Saved to Service History",
        next: "Use your service record for future work.",
        action: "Review Record",
        hint: "Service history",
      },
      cancelled: {
        status: "Request cancelled",
        next: "Create a new request when you are ready.",
        action: "Request Help",
        hint: "Cancelled",
      },
    },
    es: {
      request: {
        status: "Esperando respuesta profesional",
        next: "No necesita hacer nada por ahora.",
        action: "Continuar solicitud",
        hint: "Solicitud enviada",
      },
      visit: {
        status: "Visita programada",
        next: "Confirme o revise los detalles de la cita.",
        action: "Revisar agenda",
        hint: "Visita programada",
      },
      evaluation: {
        status: "Evaluación completada",
        next: "El profesional puede preparar su propuesta.",
        action: "Revisar detalles",
        hint: "Evaluación guardada",
      },
      proposal: {
        status: "Propuesta lista para revisar",
        next: "Revise la propuesta, apruébela o solicite cambios.",
        action: "Revisar propuesta",
        hint: "Propuesta lista",
      },
      approval: {
        status: "Esperando su aprobación",
        next: "Apruebe la propuesta o solicite cambios.",
        action: "Aprobar propuesta",
        hint: "Aprobación requerida",
      },
      payment: {
        status: "Pago / depósito requerido",
        next: "Revise los detalles de pago antes de programar el trabajo.",
        action: "Revisar pago",
        hint: "Paso de pago",
      },
      workScheduled: {
        status: "Su trabajo está programado",
        next: "Revise la fecha o envíe un mensaje al profesional.",
        action: "Revisar agenda",
        hint: "Trabajo programado",
      },
      onTheWay: {
        status: "El profesional va en camino",
        next: "Revise actualizaciones de llegada.",
        action: "Continuar conversación",
        hint: "En camino",
      },
      arrived: {
        status: "El profesional llegó",
        next: "El trabajo puede comenzar después de la llegada.",
        action: "Continuar conversación",
        hint: "Llegó",
      },
      progress: {
        status: "Trabajo en progreso",
        next: "Siga las actualizaciones hasta completar el trabajo.",
        action: "Continuar conversación",
        hint: "Trabajo activo",
      },
      completion: {
        status: "Trabajo completado — revise detalles",
        next: "Revise finalización, recibo y cierre.",
        action: "Revisar finalización",
        hint: "Revisión de finalización",
      },
      history: {
        status: "Guardado en historial de servicios",
        next: "Use el registro para trabajos futuros.",
        action: "Revisar registro",
        hint: "Historial",
      },
      cancelled: {
        status: "Solicitud cancelada",
        next: "Cree una nueva solicitud cuando esté listo.",
        action: "Solicitar ayuda",
        hint: "Cancelado",
      },
    },
  };

  let key = lifecycle.key === "history" ? "history" : "request";

  if (status === "cancelled") key = "cancelled";
  else if (closed) key = "history";
  else if (hasCompletion || ["completed", "work_completed"].includes(status)) key = "completion";
  else if (["on_the_way", "enroute"].includes(activeWorkStatus)) key = "onTheWay";
  else if (activeWorkStatus === "arrived") key = "arrived";
  else if (["active", "in_progress", "working", "started"].includes(activeWorkStatus)) key = "progress";
  else if (["work_scheduled", "scheduled_work"].includes(activeWorkStatus) || request.workScheduledAt) key = "workScheduled";
  else if ((request.acceptedQuote || quoteStatus === "accepted" || quoteStatus === "approved") && !paymentRecorded) key = "payment";
  else if (hasProposal && ["sent", "viewed", "pending", "revision_requested"].includes(quoteStatus)) key = "approval";
  else if (hasProposal) key = "proposal";
  else if (hasTimelineType(request, (type) => type.includes("evaluation"))) key = "evaluation";
  else if (hasSchedule) key = "visit";
  else key = lifecycle.key === "communication" ? "request" : lifecycle.key;

  const strings = copy[language === "es" ? "es" : "en"][key] || copy.en.request;
  const amount =
    quote.amount ||
    quote.total ||
    quote.totalAmount ||
    request.acceptedQuote?.amount ||
    request.acceptedQuote?.total ||
    "";
  const professionalName =
    quote.businessName ||
    request.selectedProfessional ||
    request.businessName ||
    request.professionalName ||
    request.contractorName ||
    "";

  return {
    key,
    statusLabel: strings.status,
    nextAction: strings.next,
    primaryActionLabel: strings.action,
    primaryActionKey: ["onTheWay", "arrived", "progress"].includes(key)
      ? "messageProfessional"
      : key,
    progressHint: strings.hint,
    professionalName,
    amount,
    quote,
  };
}

export function getHomeownerWorkflowTimeline(request = {}, language = "en") {
  const presentation = getHomeownerWorkflowPresentation(request, language);
  const order = [
    ["request", language === "es" ? "Solicitud" : "Request"],
    ["visit", language === "es" ? "Visita" : "Visit"],
    ["evaluation", language === "es" ? "Evaluación" : "Evaluation"],
    ["proposal", language === "es" ? "Propuesta" : "Proposal"],
    ["approval", language === "es" ? "Aprobación" : "Approval"],
    ["payment", language === "es" ? "Pago" : "Payment"],
    ["workScheduled", language === "es" ? "Trabajo" : "Work"],
    ["completion", language === "es" ? "Finalización" : "Completion"],
    ["history", language === "es" ? "Historial" : "History"],
  ];
  const currentIndex = Math.max(
    0,
    order.findIndex(([key]) => key === presentation.key)
  );

  return order.map(([key, label], index) => ({
    key,
    label,
    done: index < currentIndex || presentation.key === "history",
    current: index === currentIndex && presentation.key !== "history",
  }));
}
