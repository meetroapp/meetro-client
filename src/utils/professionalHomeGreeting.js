const MORNING_START_HOUR = 5;
const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 17;

function localDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function getProfessionalHomeDaypart(now = new Date()) {
  const hour = localDate(now).getHours();
  if (hour >= MORNING_START_HOUR && hour < AFTERNOON_START_HOUR) {
    return "Good morning";
  }
  if (hour >= AFTERNOON_START_HOUR && hour < EVENING_START_HOUR) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function getProfessionalHomeGreeting({ name = "", now = new Date() } = {}) {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "";
  const daypart = getProfessionalHomeDaypart(now);
  return firstName ? `${daypart}, ${firstName}` : daypart;
}

export function getProfessionalHomeGreetingRefreshDelay(now = new Date()) {
  const date = localDate(now);
  const hour = date.getHours();
  const next = new Date(date.getTime());

  if (hour < MORNING_START_HOUR) {
    next.setHours(MORNING_START_HOUR, 0, 0, 0);
  } else if (hour < AFTERNOON_START_HOUR) {
    next.setHours(AFTERNOON_START_HOUR, 0, 0, 0);
  } else if (hour < EVENING_START_HOUR) {
    next.setHours(EVENING_START_HOUR, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(MORNING_START_HOUR, 0, 0, 0);
  }

  return Math.max(1000, next.getTime() - date.getTime());
}
