import { EMERGENCY_SERVICE_OPTIONS } from "./emergencySpecialties.js";

export const ACTIVE_EMERGENCY_SUMMARY_STATUSES = Object.freeze([
  "draft",
  "safety_blocked",
  "ready_for_distribution",
  "active",
  "selection_pending",
  "assigned",
  "professional_en_route",
  "professional_arrived",
  "in_service",
  "work_in_progress",
]);

export const HISTORY_EMERGENCY_SUMMARY_STATUSES = Object.freeze([
  "completed",
  "resolved",
  "cancelled",
  "expired",
  "unable_to_match",
]);

export const EMERGENCY_SUMMARY_STATUSES = Object.freeze([
  ...ACTIVE_EMERGENCY_SUMMARY_STATUSES,
  ...HISTORY_EMERGENCY_SUMMARY_STATUSES,
]);

const EMERGENCY_WORK_CENTER_LABELS = Object.freeze({
  en: Object.freeze({
    draft: "Continue Emergency Draft",
    safety_blocked: "Safety Action Required",
    ready_for_distribution:
      "Waiting for Professional Responses",
    active: "Emergency Request Active",
    selection_pending: "Professional Selection Pending",
    assigned: "Professional Selected",
    professional_en_route: "Professional En Route",
    professional_arrived: "Professional Arrived",
    in_service: "Work In Progress",
    work_in_progress: "Work In Progress",
    completed: "Emergency Work Completed",
    resolved: "Emergency Work Completed",
    cancelled: "Emergency Request Cancelled",
    expired: "Emergency Request Expired",
    unable_to_match: "No Compatible Professional Found",
  }),
  es: Object.freeze({
    draft: "Continuar Borrador de Emergencia",
    safety_blocked: "Acción de Seguridad Requerida",
    ready_for_distribution:
      "Esperando Respuestas de Profesionales",
    active: "Solicitud de Emergencia Activa",
    selection_pending:
      "Selección de Profesional Pendiente",
    assigned: "Profesional Seleccionado",
    professional_en_route: "Profesional en Camino",
    professional_arrived: "Profesional Llegó",
    in_service: "Trabajo en Progreso",
    work_in_progress: "Trabajo en Progreso",
    completed: "Trabajo de Emergencia Completado",
    resolved: "Trabajo de Emergencia Completado",
    cancelled: "Solicitud de Emergencia Cancelada",
    expired: "Solicitud de Emergencia Expirada",
    unable_to_match:
      "No se Encontró un Profesional Compatible",
  }),
});

const EMERGENCY_RELATIONSHIP_NEXT_STEPS = Object.freeze({
  en: Object.freeze({
    draft:
      "Continue the private draft and complete the required safety review.",
    safety_blocked:
      "Follow the safety guidance shown for this request and contact emergency services when needed.",
    ready_for_distribution:
      "Compatible professionals can respond now. Review responses before selecting anyone.",
    active:
      "This request is active and waiting for the next authoritative relationship update.",
    selection_pending:
      "Professional selection is being confirmed. No dispatch is implied until the backend confirms it.",
    assigned:
      "Your selected professional is connected. Use the conversation to coordinate the service.",
    professional_en_route:
      "Your selected professional is on the way. Keep access details current in the conversation.",
    professional_arrived:
      "Your selected professional has arrived. Confirm the service area before work begins.",
    in_service:
      "Emergency work is in progress. Continue coordination in the conversation.",
    work_in_progress:
      "Emergency work is in progress. Continue coordination in the conversation.",
    completed:
      "The Emergency work is marked complete. The conversation remains available when the relationship is active.",
    resolved:
      "The Emergency work is marked complete. The conversation remains available when the relationship is active.",
    cancelled:
      "This request is cancelled and no further Emergency workflow action is available.",
    expired:
      "This request expired before completion. Start a new request only if help is still needed.",
    unable_to_match:
      "No compatible professional was matched. Start a new request only if help is still needed.",
  }),
  es: Object.freeze({
    draft:
      "Continúa el borrador privado y completa la revisión de seguridad requerida.",
    safety_blocked:
      "Sigue la orientación de seguridad de esta solicitud y contacta a los servicios de emergencia cuando sea necesario.",
    ready_for_distribution:
      "Los profesionales compatibles pueden responder ahora. Revisa las respuestas antes de seleccionar a alguien.",
    active:
      "Esta solicitud está activa y espera la próxima actualización autorizada de la relación.",
    selection_pending:
      "La selección del profesional se está confirmando. No se implica un despacho hasta que el servidor lo confirme.",
    assigned:
      "Tu profesional seleccionado está conectado. Usa la conversación para coordinar el servicio.",
    professional_en_route:
      "Tu profesional seleccionado está en camino. Mantén los detalles de acceso actualizados en la conversación.",
    professional_arrived:
      "Tu profesional seleccionado llegó. Confirma el área de servicio antes de comenzar el trabajo.",
    in_service:
      "El trabajo de Emergencia está en progreso. Continúa la coordinación en la conversación.",
    work_in_progress:
      "El trabajo de Emergencia está en progreso. Continúa la coordinación en la conversación.",
    completed:
      "El trabajo de Emergencia está marcado como completado. La conversación permanece disponible cuando la relación está activa.",
    resolved:
      "El trabajo de Emergencia está marcado como completado. La conversación permanece disponible cuando la relación está activa.",
    cancelled:
      "Esta solicitud está cancelada y no hay otra acción disponible en el flujo de Emergencia.",
    expired:
      "Esta solicitud expiró antes de completarse. Inicia una nueva solo si todavía necesitas ayuda.",
    unable_to_match:
      "No se encontró un profesional compatible. Inicia una nueva solicitud solo si todavía necesitas ayuda.",
  }),
});

const EMERGENCY_RESPONSE_AWARENESS_COPY = Object.freeze({
  en: Object.freeze({
    waitingLabel: "Waiting for Professional Responses",
    waitingNextStep:
      "Eligible professionals can still respond. Return here to review responses before selecting anyone.",
    oneResponseLabel: "1 Professional Response Available",
    oneResponseNextStep:
      "Review the available professional response before selecting anyone.",
    multipleResponsesLabel: (count) =>
      `${count} Professional Responses Available`,
    multipleResponsesNextStep: (count) =>
      `Review and select from the ${count} available professional responses.`,
    oneResponseAction: "Review Response",
    multipleResponsesAction: "Review Responses",
  }),
  es: Object.freeze({
    waitingLabel: "Esperando Respuestas de Profesionales",
    waitingNextStep:
      "Los profesionales elegibles aún pueden responder. Vuelve aquí para revisar las respuestas antes de seleccionar a alguien.",
    oneResponseLabel: "1 Respuesta Profesional Disponible",
    oneResponseNextStep:
      "Revisa la respuesta profesional disponible antes de seleccionar a alguien.",
    multipleResponsesLabel: (count) =>
      `${count} Respuestas Profesionales Disponibles`,
    multipleResponsesNextStep: (count) =>
      `Revisa y selecciona entre las ${count} respuestas profesionales disponibles.`,
    oneResponseAction: "Revisar Respuesta",
    multipleResponsesAction: "Revisar Respuestas",
  }),
});

const SELECTED_EMERGENCY_PRESENTATION_STATUSES = Object.freeze([
  "assigned",
  "professional_en_route",
  "professional_arrived",
  "in_service",
  "work_in_progress",
  "completed",
  "resolved",
]);

const EMERGENCY_TIMELINE_LABELS = Object.freeze({
  en: Object.freeze({
    requested: "Requested",
    accepted: "Accepted",
    enRoute: "On the Way",
    arrived: "Arrived",
    workStarted: "Work Started",
    completed: "Completed",
  }),
  es: Object.freeze({
    requested: "Solicitada",
    accepted: "Aceptada",
    enRoute: "En Camino",
    arrived: "Llegó",
    workStarted: "Trabajo Iniciado",
    completed: "Completada",
  }),
});

export const EMERGENCY_TIMELINE_STAGES = Object.freeze([
  Object.freeze({
    key: "requested",
    timestampField: "requestedAt",
  }),
  Object.freeze({
    key: "accepted",
    timestampField: "assignedAt",
  }),
  Object.freeze({
    key: "enRoute",
    timestampField: "enRouteAt",
  }),
  Object.freeze({
    key: "arrived",
    timestampField: "arrivedAt",
  }),
  Object.freeze({
    key: "workStarted",
    timestampField: "workStartedAt",
  }),
  Object.freeze({
    key: "completed",
    timestampField: "completedAt",
  }),
]);

const EMERGENCY_TIMELINE_STATUS_INDEX = Object.freeze({
  draft: -1,
  ready_for_distribution: 0,
  active: 0,
  selection_pending: 0,
  assigned: 1,
  professional_en_route: 2,
  professional_arrived: 3,
  in_service: 4,
  work_in_progress: 4,
  completed: 5,
  resolved: 5,
});

const EMERGENCY_ALTERNATE_OUTCOMES = Object.freeze({
  safety_blocked: Object.freeze({
    timestampField: null,
    label: Object.freeze({
      en: "Safety Action Required",
      es: "Acción de Seguridad Requerida",
    }),
  }),
  cancelled: Object.freeze({
    timestampField: "cancelledAt",
    label: Object.freeze({
      en: "Emergency Request Cancelled",
      es: "Solicitud de Emergencia Cancelada",
    }),
  }),
  expired: Object.freeze({
    timestampField: "expiredAt",
    label: Object.freeze({
      en: "Emergency Request Expired",
      es: "Solicitud de Emergencia Expirada",
    }),
  }),
  unable_to_match: Object.freeze({
    timestampField: null,
    label: Object.freeze({
      en: "No Compatible Professional Found",
      es: "No se Encontró un Profesional Compatible",
    }),
  }),
});

function normalizeCanonicalTimestamp(value) {
  if (typeof value !== "string") return null;
  const timestamp = value.trim();
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return null;
  return timestamp;
}

export function isSupportedEmergencySummaryStatus(status) {
  return EMERGENCY_SUMMARY_STATUSES.includes(
    String(status || "").trim()
  );
}

export function normalizeEmergencyPendingResponseCount(value) {
  return Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function getCanonicalEmergencyResponseStatuses(
  responses,
  emergencyRequestId
) {
  if (
    !Array.isArray(responses) ||
    !Number.isSafeInteger(emergencyRequestId) ||
    emergencyRequestId <= 0
  ) {
    return new Map();
  }

  const statusesByRelationshipId = new Map();

  for (const response of responses) {
    if (
      !response ||
      typeof response !== "object" ||
      Array.isArray(response) ||
      !Number.isSafeInteger(response.id) ||
      response.id <= 0 ||
      response.emergencyRequestId !== emergencyRequestId ||
      !["pending", "active"].includes(response.status)
    ) {
      continue;
    }

    const previousStatus = statusesByRelationshipId.get(
      response.id
    );
    statusesByRelationshipId.set(
      response.id,
      previousStatus === "active" || response.status === "active"
        ? "active"
        : "pending"
    );
  }

  return statusesByRelationshipId;
}

export function countPendingEmergencyResponses(
  responses,
  emergencyRequestId
) {
  return [...getCanonicalEmergencyResponseStatuses(
    responses,
    emergencyRequestId
  ).values()].filter((status) => status === "pending").length;
}

export function getEmergencyResponsePresentation({
  status,
  language = "en",
  availableResponseCount,
  responses,
  emergencyRequestId,
  hasSelectedProfessional = false,
} = {}) {
  const normalizedStatus = String(status || "").trim();
  const copy =
    EMERGENCY_RESPONSE_AWARENESS_COPY[
      language === "es" ? "es" : "en"
    ];
  const baseLabels =
    EMERGENCY_WORK_CENTER_LABELS[
      language === "es" ? "es" : "en"
    ];
  const baseNextSteps =
    EMERGENCY_RELATIONSHIP_NEXT_STEPS[
      language === "es" ? "es" : "en"
    ];
  const exactResponseStatuses = Array.isArray(responses)
    ? getCanonicalEmergencyResponseStatuses(
        responses,
        emergencyRequestId
      )
    : null;
  const pendingResponseCount = exactResponseStatuses
    ? [...exactResponseStatuses.values()].filter(
        (responseStatus) => responseStatus === "pending"
      ).length
    : normalizeEmergencyPendingResponseCount(
        availableResponseCount
      );
  const selectedProfessional = Boolean(
    hasSelectedProfessional === true ||
      SELECTED_EMERGENCY_PRESENTATION_STATUSES.includes(
        normalizedStatus
      ) ||
      (exactResponseStatuses &&
        [...exactResponseStatuses.values()].includes("active"))
  );
  const responseEligible =
    normalizedStatus === "ready_for_distribution";

  if (responseEligible && selectedProfessional) {
    return {
      pendingResponseCount,
      hasActionableResponses: false,
      hasSelectedProfessional: true,
      statusLabel: baseLabels.assigned,
      nextStep: baseNextSteps.assigned,
      reviewActionLabel: "",
    };
  }

  if (responseEligible && pendingResponseCount > 0) {
    const hasOneResponse = pendingResponseCount === 1;

    return {
      pendingResponseCount,
      hasActionableResponses: true,
      hasSelectedProfessional: false,
      statusLabel: hasOneResponse
        ? copy.oneResponseLabel
        : copy.multipleResponsesLabel(pendingResponseCount),
      nextStep: hasOneResponse
        ? copy.oneResponseNextStep
        : copy.multipleResponsesNextStep(pendingResponseCount),
      reviewActionLabel: hasOneResponse
        ? copy.oneResponseAction
        : copy.multipleResponsesAction,
    };
  }

  return {
    pendingResponseCount,
    hasActionableResponses: false,
    hasSelectedProfessional: selectedProfessional,
    statusLabel:
      responseEligible && pendingResponseCount === 0
        ? copy.waitingLabel
        : baseLabels[normalizedStatus] || "",
    nextStep:
      responseEligible && pendingResponseCount === 0
        ? copy.waitingNextStep
        : baseNextSteps[normalizedStatus] || "",
    reviewActionLabel: "",
  };
}

export function getEmergencyWorkCenterStatusLabel(
  status,
  language = "en",
  responseAwareness = {}
) {
  return getEmergencyResponsePresentation({
    ...responseAwareness,
    status,
    language,
  }).statusLabel;
}

export function getEmergencyRelationshipNextStep(
  status,
  language = "en",
  responseAwareness = {}
) {
  return getEmergencyResponsePresentation({
    ...responseAwareness,
    status,
    language,
  }).nextStep;
}

export function getEmergencyTimeline(
  emergencyRequest = {},
  language = "en"
) {
  const status = String(
    emergencyRequest.status || ""
  ).trim();
  const labels =
    EMERGENCY_TIMELINE_LABELS[
      language === "es" ? "es" : "en"
    ];

  const timestamps = EMERGENCY_TIMELINE_STAGES.map(
    ({ timestampField }) =>
      normalizeCanonicalTimestamp(
        emergencyRequest[timestampField]
      )
  );
  const latestTimestampIndex =
    timestamps.reduce(
      (latest, timestamp, index) =>
        timestamp ? index : latest,
      -1
    );
  const contiguousTimestampIndex =
    timestamps.reduce(
      (latest, timestamp, index) =>
        index === latest + 1 && timestamp
          ? index
          : latest,
      -1
    );
  const hasStatusIndex = Object.hasOwn(
    EMERGENCY_TIMELINE_STATUS_INDEX,
    status
  );
  const statusIndex = hasStatusIndex
    ? EMERGENCY_TIMELINE_STATUS_INDEX[status]
    : -1;
  const hasAlternateOutcome =
    Object.hasOwn(
      EMERGENCY_ALTERNATE_OUTCOMES,
      status
    );
  const reachedIndex = hasAlternateOutcome
    ? contiguousTimestampIndex
    : hasStatusIndex
      ? statusIndex
      : latestTimestampIndex;

  return EMERGENCY_TIMELINE_STAGES.map(
    ({ key, timestampField }, index) => ({
      key,
      label: labels[key],
      timestampField,
      reachedAt:
        index <= reachedIndex
          ? timestamps[index]
          : null,
      state:
        index > reachedIndex
          ? "future"
          : !hasAlternateOutcome &&
              index === reachedIndex
            ? "current"
            : "reached",
    })
  );
}

export function getEmergencyAlternateOutcome(
  emergencyRequest = {},
  language = "en"
) {
  const status = String(
    emergencyRequest.status || ""
  ).trim();
  const outcome =
    EMERGENCY_ALTERNATE_OUTCOMES[status];

  if (!outcome) return null;

  return {
    status,
    label:
      outcome.label[
        language === "es" ? "es" : "en"
      ],
    occurredAt: outcome.timestampField
      ? normalizeCanonicalTimestamp(
          emergencyRequest[
            outcome.timestampField
          ]
        )
      : null,
  };
}

export function getEmergencySpecialtyDisplayLabel(
  serviceSpecialty,
  language = "en"
) {
  const normalized = String(serviceSpecialty || "").trim();
  const option = EMERGENCY_SERVICE_OPTIONS.find(
    (candidate) => candidate.value === normalized
  );

  return (
    option?.label?.[language] ||
    option?.label?.en ||
    normalized
      .split("_")
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join(" ")
  );
}
