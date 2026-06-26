import { Capacitor, registerPlugin } from "@capacitor/core";

const LocalNotifications = registerPlugin("LocalNotifications");

export const APPOINTMENT_REMINDER_OFFSETS = [1440, 120, 30];

// Level 3 push notifications require backend push token management and APNS. Future scope.

function hashReminderKey(key) {
  const input = String(key || "meetro-reminder");
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) || 1;
}

function normalizeAppointmentTime(date, time) {
  if (!date) return null;

  const rawTime = String(time || "09:00").trim();
  const timeMatch = rawTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!timeMatch) {
    const parsed = new Date(`${date} ${rawTime}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || "0");
  const period = timeMatch[3]?.toUpperCase();

  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const paddedHour = String(hour).padStart(2, "0");
  const paddedMinute = String(minute).padStart(2, "0");
  const parsed = new Date(`${date}T${paddedHour}:${paddedMinute}:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getAppointmentReminderIds(appointment = {}) {
  const appointmentId =
    appointment.id || appointment.scheduleId || appointment.appointmentId || "appointment";

  return APPOINTMENT_REMINDER_OFFSETS.map((offset) => ({
    offset,
    id: hashReminderKey(`${appointmentId}:${offset}`),
    key: `${appointmentId}:${offset}`,
  }));
}

export async function openNotificationSettings() {
  try {
    const appPlugin = Capacitor?.Plugins?.App;

    if (
      Capacitor?.isNativePlatform?.() &&
      typeof appPlugin?.openSettings === "function"
    ) {
      await appPlugin.openSettings();
      return { opened: true };
    }
  } catch {
    // The inline settings card provides manual iOS instructions.
  }

  return { opened: false };
}

export async function cancelAppointmentReminderNotifications(appointment = {}) {
  try {
    if (!LocalNotifications?.cancel) return { cancelled: false };

    await LocalNotifications.cancel({
      notifications: getAppointmentReminderIds(appointment).map(({ id }) => ({ id })),
    });

    return { cancelled: true };
  } catch (error) {
    return { cancelled: false, error };
  }
}

async function requestLocalNotificationPermission() {
  try {
    if (!LocalNotifications?.checkPermissions || !LocalNotifications?.requestPermissions) {
      return { granted: false, reason: "unavailable" };
    }

    const existing = await LocalNotifications.checkPermissions();
    if (existing?.display === "granted") return { granted: true };

    const requested = await LocalNotifications.requestPermissions();
    return {
      granted: requested?.display === "granted",
      reason: requested?.display === "denied" ? "denied" : "blocked",
    };
  } catch (error) {
    return { granted: false, reason: "blocked", error };
  }
}

export async function scheduleAppointmentReminderNotifications(
  appointment = {},
  { viewerRole = "professional", language = "en" } = {}
) {
  const appointmentAt = normalizeAppointmentTime(appointment.date, appointment.time);
  const permission = await requestLocalNotificationPermission();

  if (!permission.granted) {
    return {
      ok: false,
      permissionDenied: true,
      reason: permission.reason,
      appointment: {
        ...appointment,
        reminders: {
          enabled: false,
          type: "local_notification",
          offsets: APPOINTMENT_REMINDER_OFFSETS,
          scheduled: [],
          disabled: true,
          reason: permission.reason,
        },
      },
    };
  }

  await cancelAppointmentReminderNotifications(appointment);

  if (!appointmentAt) {
    return {
      ok: false,
      reason: "invalid_appointment_time",
      appointment: {
        ...appointment,
        reminders: {
          enabled: false,
          type: "local_notification",
          offsets: APPOINTMENT_REMINDER_OFFSETS,
          scheduled: [],
          disabled: true,
          reason: "invalid_appointment_time",
        },
      },
    };
  }

  const now = Date.now();
  const reminderIds = getAppointmentReminderIds(appointment);
  const scheduled = reminderIds
    .map(({ id, key, offset }) => {
      const scheduledAt = new Date(appointmentAt.getTime() - offset * 60 * 1000);
      if (scheduledAt.getTime() <= now) return null;

      const customer = appointment.customerName || appointment.homeownerName || "customer";
      const business = appointment.businessName || "professional";
      const time = appointment.time || "";
      const body =
        viewerRole === "customer" || viewerRole === "homeowner"
          ? language === "es"
            ? `Recordatorio: Tu cita de Meetro con ${business} es a las ${time}.`
            : `Reminder: Your Meetro appointment with ${business} is at ${time}.`
          : language === "es"
          ? `Recordatorio: Tienes una cita de cliente Meetro con ${customer} a las ${time}.`
          : `Reminder: You have a Meetro customer appointment with ${customer} at ${time}.`;

      return {
        id,
        key,
        offset,
        scheduledAt: scheduledAt.toISOString(),
        title: language === "es" ? "Recordatorio de cita Meetro" : "Meetro appointment reminder",
        body,
      };
    })
    .filter(Boolean);

  if (scheduled.length > 0 && LocalNotifications?.schedule) {
    await LocalNotifications.schedule({
      notifications: scheduled.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        schedule: { at: new Date(reminder.scheduledAt) },
        extra: {
          appointmentId: appointment.id || appointment.scheduleId || "",
          reminderKey: reminder.key,
          offset: reminder.offset,
        },
      })),
    });
  }

  return {
    ok: true,
    appointment: {
      ...appointment,
      reminders: {
        enabled: true,
        type: "local_notification",
        offsets: APPOINTMENT_REMINDER_OFFSETS,
        scheduled,
        disabled: false,
      },
    },
  };
}
