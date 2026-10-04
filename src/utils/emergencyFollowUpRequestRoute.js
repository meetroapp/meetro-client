import { normalizeEmergencyRequestId } from "./emergencyApi.js";

const ORIGIN = "emergency_follow_up";

// Presentation context only. The authenticated endpoint owns linkage authority.
export function buildEmergencyFollowUpRequestRoute({ emergencyRequestId } = {}) {
  const id = normalizeEmergencyRequestId(emergencyRequestId);
  if (!id) throw new Error("A valid Emergency request ID is required.");
  return `upload?${new URLSearchParams({ requestOrigin: ORIGIN, emergencyRequestId: String(id) })}`;
}

export function readEmergencyFollowUpRequestRoute(hash = globalThis.location?.hash || "") {
  const [page, query = ""] = String(hash).replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const origins = params.getAll("requestOrigin").map(value => value.trim().toLowerCase());
  const active = page === "upload" && (origins.includes(ORIGIN) || params.has("emergencyRequestId"));
  if (!active) return Object.freeze({ active: false, valid: true, emergencyRequestId: null });
  const id = normalizeEmergencyRequestId(params.get("emergencyRequestId"));
  const collision = origins.includes("existing_customer_request") || params.has("sourceMeetroRelationshipId");
  return Object.freeze({
    active: true,
    valid: Boolean(id && !collision && origins.length === 1 && origins[0] === ORIGIN && params.getAll("emergencyRequestId").length === 1),
    emergencyRequestId: id,
  });
}

export function getEmergencyFollowUpRequestCopy(language) {
  return language === "es" ? {
    action: "Crear solicitud de trabajo de seguimiento",
    supporting: "¿Necesitas más trabajo después de la emergencia? Crea una solicitud de trabajo estándar separada para el alcance adicional.",
    rules: "La emergencia permanece completada. El profesional anterior no se selecciona automáticamente. La nueva solicitud sigue las reglas normales de cotización, aprobación, depósito, programación y trabajo.",
    title: "Seguimiento después de la emergencia",
    text: "Describe el trabajo adicional por separado. Tu emergencia completada permanecerá sin cambios. Esta solicitud seguirá el proceso normal de trabajo estándar.",
    invalid: "No se pudo verificar el contexto de esta solicitud. Vuelve a la emergencia completada y abre una nueva solicitud de seguimiento.",
  } : {
    action: "Create Follow-Up Job Request",
    supporting: "Need more work after the emergency? Create a separate Standard Job Request for the larger follow-up scope.",
    rules: "The Emergency remains completed. The prior professional is not automatically selected. Normal quote, approval, deposit, scheduling, and work rules apply to the new request.",
    title: "Follow-up after Emergency",
    text: "Describe the additional work separately. Your completed Emergency will stay unchanged. This request will follow the normal Standard Job process.",
    invalid: "This request context could not be verified. Return to the completed Emergency and open a new follow-up request.",
  };
}
