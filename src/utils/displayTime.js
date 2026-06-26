const TIME_24_HOUR_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;
const TIME_12_HOUR_PATTERN = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(AM|PM|A\.M\.|P\.M\.|a\.m\.|p\.m\.)\b/;

function normalizeDateInput(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);

  const raw = String(value || "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(date, options = {}) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

export function formatTime(value, options = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const existing12Hour = raw.match(TIME_12_HOUR_PATTERN);
  if (existing12Hour && !Number.isNaN(new Date(raw).getTime())) {
    return formatDateTime(new Date(raw), options);
  }
  if (existing12Hour) {
    const hour = Number(existing12Hour[1]);
    const minute = existing12Hour[2] || "00";
    const meridiem = existing12Hour[3].replace(/\./g, "").toUpperCase();
    return `${hour}:${minute} ${meridiem}`;
  }

  const timeMatch = raw.match(TIME_24_HOUR_PATTERN);
  if (timeMatch) {
    const date = new Date(2000, 0, 1, Number(timeMatch[1]), Number(timeMatch[2]));
    return formatDateTime(date, options);
  }

  const date = normalizeDateInput(value);
  if (date) return formatDateTime(date, options);

  return raw;
}

export function formatScheduleTime(value) {
  return formatTime(value);
}

export function formatMessageTime(value) {
  return formatTime(value);
}

export function formatDateTimeDisplay(dateValue, timeValue = "", options = {}) {
  const dateRaw = String(dateValue || "").trim();
  const timeRaw = String(timeValue || "").trim();

  let date = null;
  if (dateRaw && timeRaw) {
    date = normalizeDateInput(`${dateRaw}T${timeRaw}`);
    if (!date) date = normalizeDateInput(`${dateRaw} ${timeRaw}`);
  }
  if (!date && dateRaw) date = normalizeDateInput(dateRaw);

  const formattedDate = date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: options.includeYear === false ? undefined : "numeric",
      })
    : dateRaw;
  const formattedTime = timeRaw ? formatTime(timeRaw) : date ? formatTime(date) : "";

  return [formattedDate, formattedTime].filter(Boolean).join(" • ");
}
