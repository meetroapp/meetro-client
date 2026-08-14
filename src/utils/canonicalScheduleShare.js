import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

import {
  buildCanonicalMessagePayload,
  normalizeCanonicalConversationId,
  normalizeCanonicalMessage,
  validateCanonicalMessageText,
} from "./canonicalConversationMessaging.js";
import { authFetch } from "./authFetch.js";
import { t } from "./language.js";

const SHAREABLE_STATES = new Set(["PROPOSED", "SCHEDULED"]);

function confirmedVisit(value) {
  const start = Date.parse(value?.scheduledStartAt || "");
  const end = value?.scheduledEndAt
    ? Date.parse(value.scheduledEndAt)
    : null;
  return Boolean(
    value?.kind === "visit" &&
      typeof value.id === "string" &&
      value.id.trim() &&
      typeof value.jobId === "string" &&
      value.jobId.trim() &&
      Number.isSafeInteger(value.currentVersion) &&
      value.currentVersion > 0 &&
      SHAREABLE_STATES.has(value.state) &&
      Number.isFinite(start) &&
      (end === null || (Number.isFinite(end) && end > start)) &&
      typeof value.timeZone === "string" &&
      value.timeZone.trim() &&
      ["EVALUATION", "APPROVED_WORK"].includes(value.purpose)
  );
}

function formatDateTime(value, timeZone, language, options) {
  try {
    return new Intl.DateTimeFormat(language, {
      timeZone,
      ...options,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function visitLocation(visit, language) {
  if (visit.location?.mode === "REMOTE") {
    return t("professionalScheduleRemote", language);
  }
  const address = visit.location?.address;
  if (address) {
    return [address.line1, address.city, address.region, address.postalCode]
      .filter(Boolean)
      .join(", ");
  }
  return visit.location?.serviceArea ||
    t("professionalScheduleCustomerLocation", language);
}

export function buildCanonicalScheduleSharePresentation(
  visit,
  { language = "en" } = {}
) {
  if (!confirmedVisit(visit)) return null;
  const purpose = t(
    visit.purpose === "EVALUATION"
      ? "professionalScheduleEvaluationVisit"
      : "professionalScheduleApprovedWork",
    language
  );
  const date = formatDateTime(
    visit.scheduledStartAt,
    visit.timeZone,
    language,
    { weekday: "short", month: "short", day: "numeric", year: "numeric" }
  );
  const start = formatDateTime(
    visit.scheduledStartAt,
    visit.timeZone,
    language,
    { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
  );
  const end = visit.scheduledEndAt
    ? formatDateTime(
        visit.scheduledEndAt,
        visit.timeZone,
        language,
        { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      )
    : "";
  if (!date || !start || (visit.scheduledEndAt && !end)) return null;
  const lines = [
    t("professionalScheduleShareHeading", language, { purpose }),
    t("professionalScheduleShareDate", language, { date }),
    t("professionalScheduleShareTime", language, {
      time: end ? `${start} – ${end}` : start,
    }),
    t("professionalScheduleShareLocation", language, {
      location: visitLocation(visit, language),
    }),
  ];
  return Object.freeze({
    title: t("professionalScheduleShareTitle", language, { purpose }),
    text: lines.join("\n"),
  });
}

export function resolveCanonicalScheduleConversationTarget(
  visit,
  workCenterJobs = []
) {
  if (!confirmedVisit(visit) || !Array.isArray(workCenterJobs)) return null;
  const matches = workCenterJobs.filter(
    (job) =>
      job?.source === "CANONICAL_BACKEND_READ" &&
      job?.readOnly === true &&
      String(job.jobId || "") === visit.jobId
  );
  if (matches.length !== 1) return null;
  const conversationId = normalizeCanonicalConversationId(
    matches[0].conversationId
  );
  if (!conversationId || matches[0].conversationCanSend !== true) return null;
  return Object.freeze({
    jobId: visit.jobId,
    conversationId,
    canSendMessages: true,
  });
}

export async function sendCanonicalScheduleInMeetro({
  visit,
  conversationTarget,
  language = "en",
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const presentation = buildCanonicalScheduleSharePresentation(visit, { language });
  const conversationId = normalizeCanonicalConversationId(
    conversationTarget?.conversationId
  );
  if (
    !presentation ||
    !conversationId ||
    conversationTarget?.jobId !== visit.jobId ||
    conversationTarget?.canSendMessages !== true
  ) return null;
  const validation = validateCanonicalMessageText(presentation.text);
  if (!validation.valid) return null;
  const result = await authFetchImpl(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(buildCanonicalMessagePayload(validation.text)),
    },
    setPage
  );
  if (
    !result?.response?.ok ||
    result.response.status !== 201 ||
    result?.data?.success !== true ||
    result?.data?.code !== "CONVERSATION_MESSAGE_CREATED" ||
    normalizeCanonicalConversationId(result?.data?.conversationId) !== conversationId
  ) return null;
  return normalizeCanonicalMessage(result.data.message, "business");
}

export async function shareCanonicalScheduleExternally({
  visit,
  language = "en",
  platform = Capacitor.getPlatform(),
  nativeShare = (payload) => Share.share(payload),
  webShare = globalThis.navigator?.share?.bind(globalThis.navigator),
  copy = globalThis.navigator?.clipboard?.writeText?.bind(
    globalThis.navigator?.clipboard
  ),
} = {}) {
  const presentation = buildCanonicalScheduleSharePresentation(visit, { language });
  if (!presentation) return { ok: false, method: "unavailable" };
  if (platform === "ios" && typeof nativeShare === "function") {
    await nativeShare({
      title: presentation.title,
      text: presentation.text,
      dialogTitle: presentation.title,
    });
    return { ok: true, method: "native" };
  }
  if (typeof webShare === "function") {
    await webShare(presentation);
    return { ok: true, method: "web" };
  }
  if (typeof copy === "function") {
    await copy(presentation.text);
    return { ok: true, method: "copy" };
  }
  return { ok: false, method: "unavailable", presentation };
}

export function buildCanonicalScheduleEmailUrl(visit, { language = "en" } = {}) {
  const presentation = buildCanonicalScheduleSharePresentation(visit, { language });
  return presentation
    ? `mailto:?subject=${encodeURIComponent(presentation.title)}&body=${encodeURIComponent(presentation.text)}`
    : null;
}

export function isCanonicalScheduleShareable(visit) {
  return confirmedVisit(visit);
}
