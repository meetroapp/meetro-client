import { formatScheduleTime } from "./displayTime.js";

export function formatScheduleDisplayTime(hour, minute = 0) {
  return formatScheduleTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

export function parseUserScheduleTime(inputText = "") {
  const text = String(inputText || "");
  const normalized = text.toLowerCase();

  if (/\bnoon\b/.test(normalized)) {
    return { hour: 12, minute: 0, value: "12:00", display: "12 PM", spoken: "12 PM" };
  }

  if (/\bmidnight\b/.test(normalized)) {
    return { hour: 0, minute: 0, value: "00:00", display: "12 AM", spoken: "12 AM" };
  }

  const explicitMatch = normalized.match(
    /\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)(?=\s|$|[,.!?])/
  );

  if (explicitMatch) {
    let hour = Number(explicitMatch[1]);
    const minute = Number(explicitMatch[2] || "0");
    const meridiem = explicitMatch[3].replace(/\./g, "");

    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    const display = formatScheduleDisplayTime(hour, minute);
    return {
      hour,
      minute,
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      display,
      spoken: display,
    };
  }

  const contextualMatch = normalized.match(
    /\b(?:morning|afternoon|evening|tonight|mañana|tarde|noche)\b.*?\b(?:at|a las|around|about)?\s*(\d{1,2})(?::([0-5]\d))?\b|\b(?:at|a las|around|about)\s*(\d{1,2})(?::([0-5]\d))?\s*(?:in the\s+)?(morning|afternoon|evening|tonight|mañana|tarde|noche)\b/
  );

  if (contextualMatch) {
    const period = contextualMatch[0].toLowerCase();
    let hour = Number(contextualMatch[1] || contextualMatch[3]);
    const minute = Number(contextualMatch[2] || contextualMatch[4] || "0");

    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (/(afternoon|evening|tonight|tarde|noche)/.test(period) && hour < 12) {
      hour += 12;
    }
    if (/(morning|mañana)/.test(period) && hour === 12) {
      hour = 0;
    }

    const display = formatScheduleDisplayTime(hour, minute);
    return {
      hour,
      minute,
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      display,
      spoken: display,
    };
  }

  const clockMatch = normalized.match(/\b(?:at|a las|around|about)\s+(\d{1,2})(?::([0-5]\d))\b/);

  if (clockMatch) {
    const hour = Number(clockMatch[1]);
    const minute = Number(clockMatch[2] || "0");

    if (hour > 23 || minute > 59) return null;
    const display = formatScheduleDisplayTime(hour, minute);
    return {
      hour,
      minute,
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      display,
      spoken: display,
    };
  }

  return null;
}
