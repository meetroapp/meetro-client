import { formatScheduleTime } from "./displayTime.js";

const STATUS_LABELS = {
  scheduled: {
    en: "Scheduled",
    es: "Programado",
  },
  work_scheduled: {
    en: "Scheduled Work",
    es: "Trabajo programado",
  },
  visit_scheduled: {
    en: "Scheduled Visit",
    es: "Visita programada",
  },
  pending: {
    en: "Pending",
    es: "Pendiente",
  },
  confirmed: {
    en: "Confirmed",
    es: "Confirmado",
  },
};

const EXACT_TITLE_LABELS = {
  "scheduled estimate visit": {
    en: "Scheduled Estimate Visit",
    es: "Visita de estimado programada",
  },
  "door installation": {
    en: "Door installation",
    es: "Instalación de puerta",
  },
};

const DATE_LABELS = {
  today: {
    en: "Today",
    es: "Hoy",
  },
  tomorrow: {
    en: "Tomorrow",
    es: "Mañana",
  },
};

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function languageKey(language) {
  return language === "es" ? "es" : "en";
}

export function getDashboardScheduleStatusLabel(status, language = "en") {
  const key = normalizeToken(status || "scheduled");
  const labels = STATUS_LABELS[key];

  if (!labels) {
    return String(status || STATUS_LABELS.scheduled.en).replaceAll("_", " ");
  }

  return labels[languageKey(language)];
}

export function getDashboardScheduleDateLabel(value, language = "en") {
  const key = normalizeToken(value || "today");
  const labels = DATE_LABELS[key];

  return labels ? labels[languageKey(language)] : String(value || "");
}

export function getDashboardScheduleTitleLabel(title, language = "en") {
  const rawTitle = String(title || "").trim();
  if (!rawTitle) return "";

  const exact = EXACT_TITLE_LABELS[rawTitle.toLowerCase()];
  if (exact) return exact[languageKey(language)];

  const visitPrefix = "Visit with ";
  if (rawTitle.startsWith(visitPrefix)) {
    const name = rawTitle.slice(visitPrefix.length).trim();
    return language === "es" ? `Visita con ${name}` : rawTitle;
  }

  return rawTitle;
}

export function formatDashboardScheduleItem(item = {}, language = "en") {
  const title =
    getDashboardScheduleTitleLabel(item.title, language) ||
    getDashboardScheduleTitleLabel(item.service, language) ||
    getDashboardScheduleTitleLabel(item.appointmentType, language) ||
    getDashboardScheduleStatusLabel("scheduled", language);

  const status = getDashboardScheduleStatusLabel(item.status, language);
  const dateLabel = getDashboardScheduleDateLabel(
    item.dateLabel || item.dayLabel || item.relativeDate || "today",
    language
  );

  return {
    title,
    status,
    dateLabel,
    meta: item.location || item.address || "",
    time: formatScheduleTime(item.time || ""),
  };
}
