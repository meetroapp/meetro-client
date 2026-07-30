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

export function getEmergencyWorkCenterStatusLabel(
  status,
  language = "en"
) {
  const normalized = String(status || "").trim();
  const labels =
    EMERGENCY_WORK_CENTER_LABELS[
      language === "es" ? "es" : "en"
    ];
  return labels[normalized] || "";
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
    ? latestTimestampIndex
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
