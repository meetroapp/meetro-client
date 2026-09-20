// Source is independent of lifecycle state. Never infer Emergency from a title,
// urgency, payment state, or a numeric request identifier.
export function getWorkCenterSource(record = {}) {
  const sourceType = record.source_type ?? record.sourceType ?? record.aggregate?.sourceContext?.type;
  if (sourceType === "emergency_request") return "emergency";
  if (["job_request", "request", "ordinary_job", "ordinary_request_selection", "existing_customer_request"].includes(sourceType)) return "request";
  // Older canonical ordinary Work Center entries predate source_type.
  if (!sourceType && !record.authority &&
      Number.isSafeInteger(record.requestId) && record.requestId > 0 &&
      Number.isSafeInteger(record.relationshipId) && record.relationshipId > 0 &&
      !record.emergencyRequestId) return "request";
  return "unknown";
}

export function matchesWorkCenterSource(record, filter = "all") {
  return filter === "all" || getWorkCenterSource(record) === filter;
}

export function filterWorkCenterSources(records = [], filter = "all") {
  return records.filter((record) => matchesWorkCenterSource(record, filter));
}

const COPY = {
  en: { all: "All", request: "Job Requests", emergency: "Emergency", requestBadge: "Job Request", unknown: "Source unavailable", label: "Job source" },
  es: { all: "Todos", request: "Solicitudes de trabajo", emergency: "Emergencia", requestBadge: "Solicitud de trabajo", unknown: "Origen no disponible", label: "Origen del trabajo" },
  fr: { all: "Tous", request: "Demandes de travaux", emergency: "Urgence", requestBadge: "Demande de travaux", unknown: "Origine indisponible", label: "Origine du travail" },
  "pt-BR": { all: "Todos", request: "Solicitações de serviço", emergency: "Emergência", requestBadge: "Solicitação de serviço", unknown: "Origem indisponível", label: "Origem do serviço" },
};
export function getWorkCenterSourceCopy(language = "en") {
  return COPY[language] || COPY.en;
}
