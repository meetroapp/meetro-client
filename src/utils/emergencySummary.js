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
