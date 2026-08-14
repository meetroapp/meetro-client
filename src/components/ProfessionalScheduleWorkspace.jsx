import { useRef, useState } from "react";
import {
  activateCanonicalVisitAuthority,
  runCanonicalVisitCommand,
} from "../utils/canonicalVisitProjection.js";
import {
  buildProfessionalScheduleCommandSchedule,
  fetchProfessionalSchedule,
  formatProfessionalScheduleTimeZone,
  groupProfessionalSchedule,
  resolveProfessionalScheduleTimeZone,
} from "../utils/professionalScheduleProjection.js";
import { prepareProfessionalSchedulingOpportunity } from "../utils/professionalScheduleCommands.js";
import {
  buildCanonicalScheduleEmailUrl,
  isCanonicalScheduleShareable,
  resolveCanonicalScheduleConversationTarget,
  sendCanonicalScheduleInMeetro,
  shareCanonicalScheduleExternally,
} from "../utils/canonicalScheduleShare.js";
import { t } from "../utils/language.js";

function tomorrow() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return value.toISOString().slice(0, 10);
}

function wallPart(value, timeZone, part) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((entry) => [entry.type, entry.value]));
  return part === "date"
    ? `${values.year}-${values.month}-${values.day}`
    : `${values.hour}:${values.minute}`;
}

function defaultForm(visit = null) {
  let deviceTimeZone;
  try {
    deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    deviceTimeZone = null;
  }
  const timeZone = resolveProfessionalScheduleTimeZone({
    visitTimeZone: visit?.timeZone,
    deviceTimeZone,
  });
  const start = visit?.scheduledStartAt || null;
  const end = visit?.scheduledEndAt || null;
  return {
    date: wallPart(start, timeZone, "date") || tomorrow(),
    startTime: wallPart(start, timeZone, "time") || "09:00",
    endTime: wallPart(end, timeZone, "time") || "",
    timeZone,
    locationMode: visit?.locationMode || "JOB_SERVICE_LOCATION",
  };
}

function purposeLabel(item, language) {
  return t(
    item.purpose === "EVALUATION"
      ? "professionalScheduleEvaluationVisit"
      : "professionalScheduleApprovedWork",
    language
  );
}

function formatVisitTime(visit, language) {
  try {
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: visit.timeZone,
      timeZoneName: "short",
    };
    const start = new Intl.DateTimeFormat(language, options).format(
      new Date(visit.scheduledStartAt)
    );
    if (!visit.scheduledEndAt) return start;
    const end = new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: visit.timeZone,
      timeZoneName: "short",
    }).format(new Date(visit.scheduledEndAt));
    return `${start} – ${end}`;
  } catch {
    return "—";
  }
}

function locationText(item, language) {
  if (item.location.mode === "REMOTE") return t("professionalScheduleRemote", language);
  const address = item.location.address;
  if (address) {
    return [address.line1, address.city, address.region, address.postalCode]
      .filter(Boolean)
      .join(", ");
  }
  return item.location.serviceArea ||
    t("professionalScheduleCustomerLocation", language);
}

function ScheduleCard({
  item,
  language,
  running,
  onAction,
  onShare,
  onViewJob,
  conversationTarget,
  shareTruthCurrent,
}) {
  const visit = item.kind === "visit";
  const shareable = shareTruthCurrent && isCanonicalScheduleShareable(item);
  return (
    <article style={styles.card} data-schedule-identity={visit ? item.id : `${item.purpose}:${item.evaluationId || item.approvedQuoteDecisionId}`}>
      <div style={styles.cardHeader}>
        <div style={styles.cardMain}>
          <span style={styles.eyebrow}>{purposeLabel(item, language)}</span>
          <h3 style={styles.cardTitle}>{item.customer.displayName}</h3>
          <p style={styles.jobTitle}>{item.job.title}</p>
        </div>
        <span style={styles.statePill}>
          {item.semanticState === "WAITING_FOR_CUSTOMER"
            ? t("professionalScheduleWaitingMessage", language)
            : item.semanticState === "CHANGE_REQUESTED"
              ? t("professionalScheduleChangeMessage", language)
              : item.semanticState === "COMPLETED"
                ? t("professionalScheduleCompleted", language)
                : item.semanticState === "CANCELLED"
                  ? t("professionalScheduleCancelled", language)
                  : purposeLabel(item, language)}
        </span>
      </div>
      {visit && <p style={styles.scheduleTime}>{formatVisitTime(item, language)}</p>}
      <p style={styles.location}>{locationText(item, language)}</p>
      {item.latestCustomerChangeRequest?.reason && (
        <p style={styles.changeNote}>{item.latestCustomerChangeRequest.reason}</p>
      )}
      <div style={styles.actions}>
        {!visit && item.actions.canStartScheduling && (
          <button
            type="button"
            style={styles.primaryButton}
            disabled={running}
            onClick={() => onAction("schedule", item)}
          >
            {t(
              item.purpose === "EVALUATION"
                ? "professionalScheduleScheduleEvaluation"
                : "professionalScheduleScheduleWork",
              language
            )}
          </button>
        )}
        {visit && item.actions.canReschedule && (
          <button type="button" style={styles.primaryButton} disabled={running} onClick={() => onAction("reschedule", item)}>
            {t("professionalScheduleReschedule", language)}
          </button>
        )}
        {visit && item.actions.canCancel && (
          <button type="button" style={styles.secondaryButton} disabled={running} onClick={() => onAction("cancel", item)}>
            {t("professionalScheduleCancel", language)}
          </button>
        )}
        {visit && item.actions.canComplete && (
          <button type="button" style={styles.primaryButton} disabled={running} onClick={() => onAction("complete", item)}>
            {t("professionalScheduleComplete", language)}
          </button>
        )}
        {item.actions.canViewJob && (
          <button type="button" style={styles.secondaryButton} onClick={() => onViewJob(item.jobId)}>
            {t("professionalScheduleViewJob", language)}
          </button>
        )}
        {shareable && conversationTarget && (
          <button type="button" style={styles.secondaryButton} disabled={running} onClick={() => onShare("meetro", item, conversationTarget)}>
            {t("professionalScheduleSendInMeetro", language)}
          </button>
        )}
        {shareable && (
          <button type="button" style={styles.secondaryButton} disabled={running} onClick={() => onShare("external", item)}>
            {t("professionalScheduleShare", language)}
          </button>
        )}
        {shareable && (
          <button type="button" style={styles.secondaryButton} disabled={running} onClick={() => onShare("email", item)}>
            {t("professionalScheduleEmail", language)}
          </button>
        )}
      </div>
    </article>
  );
}

export default function ProfessionalScheduleWorkspace({
  sourceState,
  language = "en",
  setPage,
  onConfirmed,
  onOpenConversation,
  onRetry,
  onViewJob,
  workCenterJobs = [],
} = {}) {
  const confirmed = sourceState?.confirmed;
  const [history, setHistory] = useState(null);
  const [historyStatus, setHistoryStatus] = useState("idle");
  const [historyError, setHistoryError] = useState("");
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [running, setRunning] = useState(false);
  const [blockedShareSignature, setBlockedShareSignature] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const workspaceRef = useRef(null);
  const returnFocusRef = useRef(null);

  async function readActive() {
    const schedule = await fetchProfessionalSchedule({ view: "active", limit: 50, setPage });
    onConfirmed(schedule);
    return schedule;
  }

  async function loadHistory({ cursor = null } = {}) {
    setHistoryStatus("loading");
    setHistoryError("");
    try {
      const next = await fetchProfessionalSchedule({
        view: "history",
        limit: 25,
        cursor,
        setPage,
      });
      setHistory((current) => cursor && current
        ? {
            ...next,
            visits: Object.freeze([...current.visits, ...next.visits]),
          }
        : next);
      setHistoryStatus("confirmed");
    } catch (loadError) {
      setHistoryStatus("error");
      void loadError;
      setHistoryError(t("professionalScheduleUnavailable", language));
    }
  }

  function openEditor(mode, item) {
    returnFocusRef.current = document.activeElement;
    setError("");
    setNotice("");
    setForm(defaultForm(item.kind === "visit" ? item : null));
    setEditor({ mode, item });
  }

  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() =>
      (returnFocusRef.current || workspaceRef.current)?.focus()
    );
  }

  async function startScheduling(opportunity) {
    setRunning(true);
    setError("");
    setNotice("");
    try {
      const activeOpportunity = await prepareProfessionalSchedulingOpportunity({
        opportunity,
        activate: (subject) => activateCanonicalVisitAuthority({
          jobId: subject.jobId,
          purpose: subject.purpose,
          subjectId:
            subject.purpose === "EVALUATION"
              ? subject.evaluationId
              : subject.quoteId,
          setPage,
        }),
        readActive,
      });
      if (!activeOpportunity) {
        throw new Error(t("professionalScheduleActivationFailed", language));
      }
      window.dispatchEvent(new CustomEvent("meetro-canonical-visit-changed", {
        detail: {
          jobId: activeOpportunity.jobId,
          visitId: null,
          source: "professional-schedule",
        },
      }));
      openEditor("propose", activeOpportunity);
    } catch (activationError) {
      void activationError;
      setError(t("professionalScheduleActivationFailed", language));
    } finally {
      setRunning(false);
    }
  }

  async function runVisitAction(mode, item) {
    if (["reschedule", "cancel"].includes(mode)) {
      openEditor(mode, item);
      return;
    }
    if (mode === "schedule") {
      await startScheduling(item);
      return;
    }
    openEditor("complete", item);
  }

  async function shareSchedule(mode, item, conversationTarget = null) {
    setRunning(true);
    setError("");
    setNotice("");
    try {
      if (mode === "meetro") {
        const message = await sendCanonicalScheduleInMeetro({
          visit: item,
          conversationTarget,
          language,
          setPage,
        });
        if (!message) throw new Error("schedule-share-failed");
        setNotice(t("professionalScheduleSentInMeetro", language));
        onOpenConversation?.(conversationTarget);
        return;
      }
      if (mode === "email") {
        const emailUrl = buildCanonicalScheduleEmailUrl(item, { language });
        if (!emailUrl) throw new Error("schedule-share-unavailable");
        window.location.assign(emailUrl);
        return;
      }
      const result = await shareCanonicalScheduleExternally({
        visit: item,
        language,
      });
      if (!result.ok) throw new Error("schedule-share-unavailable");
      setNotice(t(
        result.method === "copy"
          ? "professionalScheduleCopied"
          : "professionalScheduleShared",
        language
      ));
    } catch (shareError) {
      void shareError;
      setError(t("professionalScheduleShareFailed", language));
    } finally {
      setRunning(false);
    }
  }

  async function submitEditor(event) {
    event.preventDefault();
    if (!editor) return;
    const item = editor.item;
    const schedule = buildProfessionalScheduleCommandSchedule({
      purpose: item.purpose,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      timeZone: form.timeZone,
      locationMode: form.locationMode,
    });
    if (
      !["cancel", "complete"].includes(editor.mode) &&
      !schedule
    ) {
      setError(t("professionalScheduleInvalidTime", language));
      return;
    }
    setRunning(true);
    setError("");
    setNotice("");
    try {
      await runCanonicalVisitCommand({
        jobId: item.jobId,
        command: editor.mode,
        visit: item.kind === "visit" ? item : null,
        purpose: item.purpose,
        evaluationId: item.purpose === "EVALUATION" ? item.evaluationId : null,
        approvedQuoteDecisionId:
          item.purpose === "APPROVED_WORK"
            ? item.approvedQuoteDecisionId || item.approvedQuoteDecisionEvidence?.decisionId
            : null,
        schedule: ["cancel", "complete"].includes(editor.mode)
          ? null
          : schedule,
        setPage,
      });
      if (item.kind === "visit") {
        setBlockedShareSignature(`${item.id}:${item.currentVersion}`);
      }
      await readActive();
      setHistory(null);
      setHistoryStatus("idle");
      setEditor(null);
      setNotice(t(
        editor.mode === "complete"
          ? "professionalScheduleAppointmentOccurred"
          : "professionalScheduleSaved",
        language
      ));
      window.dispatchEvent(new CustomEvent("meetro-canonical-visit-changed", {
        detail: {
          jobId: item.jobId,
          visitId: item.id || null,
          source: "professional-schedule",
        },
      }));
    } catch (commandError) {
      if (commandError?.code === "STALE_VISIT_VERSION") {
        await readActive().catch(() => {});
        setEditor(null);
        setError(t("professionalScheduleConflict", language));
      } else {
        setError(t("professionalScheduleUnavailable", language));
      }
    } finally {
      setRunning(false);
    }
  }

  if (!confirmed && sourceState?.status === "loading") {
    return <p role="status" style={styles.message}>{t("professionalScheduleLoading", language)}</p>;
  }
  if (!confirmed) {
    return (
      <div role="alert" style={styles.errorBox}>
        <p>{t("professionalScheduleUnavailable", language)}</p>
        <button type="button" style={styles.primaryButton} onClick={onRetry}>
          {t("professionalScheduleRetry", language)}
        </button>
      </div>
    );
  }

  const canonicalGroups = groupProfessionalSchedule(confirmed);
  const groups = [
    {
      key: "ready",
      title: t("professionalScheduleNeedsScheduling", language),
      items: canonicalGroups.needsScheduling,
    },
    {
      key: "change",
      title: t("professionalScheduleChangeRequested", language),
      items: canonicalGroups.changeRequested,
    },
    {
      key: "waiting",
      title: t("professionalScheduleWaiting", language),
      items: canonicalGroups.waitingOnCustomer,
    },
    {
      key: "upcoming",
      title: t("professionalScheduleUpcoming", language),
      items: canonicalGroups.upcoming,
    },
  ];
  const activeCount = confirmed.opportunities.length + confirmed.visits.length;
  const editorShowsEndTime = editor?.item?.purpose === "APPROVED_WORK";
  const editorTimeZoneLabel = editor
    ? formatProfessionalScheduleTimeZone(form.timeZone, language) ||
      t("professionalScheduleLocalTime", language)
    : "";

  return (
    <section
      ref={workspaceRef}
      tabIndex={-1}
      aria-labelledby="professional-schedule-title"
      style={styles.workspace}
    >
      <div style={styles.header}>
        <div>
          <h2 id="professional-schedule-title" style={styles.title}>
            {t("professionalScheduleTitle", language)}
          </h2>
          <div style={styles.summary} aria-label={t("professionalScheduleTitle", language)}>
            <span>{t("professionalScheduleReadyCount", language, { count: confirmed.summary.readyToSchedule })}</span>
            <span>{t("professionalScheduleWaitingCount", language, { count: confirmed.summary.waitingOnCustomer })}</span>
            <span>{t("professionalScheduleChangeCount", language, { count: confirmed.summary.changeRequested })}</span>
            <span>{t("professionalScheduleUpcomingCount", language, { count: confirmed.summary.upcoming })}</span>
          </div>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={() => loadHistory()} disabled={historyStatus === "loading"}>
          {t("professionalScheduleViewHistory", language)}
        </button>
      </div>

      {sourceState.error && (
        <p role="alert" style={styles.warning}>{t("professionalScheduleRefreshWarning", language)}</p>
      )}
      {notice && <p role="status" style={styles.success}>{notice}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}

      {activeCount === 0 ? (
        <div style={styles.empty}>
          <strong>{t("professionalScheduleEmpty", language)}</strong>
          <span>{t("professionalScheduleEmptyDetail", language)}</span>
        </div>
      ) : groups.map((group) => (
        group.items.length > 0 && (
          <section key={group.key} aria-labelledby={`schedule-${group.key}`} style={styles.group}>
            <h3 id={`schedule-${group.key}`} style={styles.groupTitle}>{group.title}</h3>
            <div style={styles.grid}>
              {group.items.map((item) => (
                <ScheduleCard
                  key={item.kind === "visit" ? item.id : `${item.purpose}:${item.evaluationId || item.approvedQuoteDecisionId}`}
                  item={item}
                  language={language}
                  running={running}
                  onAction={runVisitAction}
                  onShare={shareSchedule}
                  onViewJob={onViewJob}
                  conversationTarget={resolveCanonicalScheduleConversationTarget(item, workCenterJobs)}
                  shareTruthCurrent={blockedShareSignature !== `${item.id}:${item.currentVersion}`}
                />
              ))}
            </div>
          </section>
        )
      ))}

      {historyStatus !== "idle" && (
        <section aria-labelledby="schedule-history" style={styles.group}>
          <h3 id="schedule-history" style={styles.groupTitle}>{t("professionalScheduleHistory", language)}</h3>
          {historyStatus === "loading" && !history && <p role="status">{t("professionalScheduleLoading", language)}</p>}
          {historyError && <p role="alert" style={styles.error}>{historyError}</p>}
          {history && (
            <>
              {history.visits.length === 0 && (
                <p style={styles.message}>
                  {t("professionalScheduleHistoryEmpty", language)}
                </p>
              )}
              <div style={styles.grid}>
                {history.visits.map((item) => (
                  <ScheduleCard
                    key={item.id}
                    item={item}
                    language={language}
                    running={running}
                    onAction={runVisitAction}
                    onShare={shareSchedule}
                    onViewJob={onViewJob}
                    conversationTarget={resolveCanonicalScheduleConversationTarget(item, workCenterJobs)}
                    shareTruthCurrent={blockedShareSignature !== `${item.id}:${item.currentVersion}`}
                  />
                ))}
              </div>
              {history.page.hasMore && (
                <button type="button" style={styles.secondaryButton} onClick={() => loadHistory({ cursor: history.page.nextCursor })}>
                  {t("professionalScheduleLoadMore", language)}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {editor && (
        <div style={styles.overlay} role="presentation">
          <form style={styles.editor} onSubmit={submitEditor} aria-labelledby="schedule-editor-title">
            <div style={styles.editorHeader}>
              <h3 id="schedule-editor-title" style={styles.groupTitle}>
                {editor.mode === "reschedule"
                  ? t("professionalScheduleReschedule", language)
                  : editor.mode === "cancel"
                    ? t("professionalScheduleCancel", language)
                    : editor.mode === "complete"
                      ? t("professionalScheduleComplete", language)
                      : t(
                          editor.item.purpose === "EVALUATION"
                            ? "professionalScheduleScheduleEvaluation"
                            : "professionalScheduleScheduleWork",
                          language
                        )}
              </h3>
              <button type="button" style={styles.secondaryButton} onClick={closeEditor}>
                {t("professionalScheduleCancelEdit", language)}
              </button>
            </div>
            {!["cancel", "complete"].includes(editor.mode) && (
              <>
                <p style={styles.editorContext}>
                  {editor.item.customer.displayName} · {editor.item.job.title}
                </p>
                <div style={styles.formGrid}>
                  <label style={styles.label}>
                    {t("professionalScheduleDate", language)}
                    <input style={styles.input} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />
                  </label>
                  <label style={styles.label}>
                    {t(
                      editor.item.purpose === "EVALUATION"
                        ? "professionalScheduleArrivalTime"
                        : "professionalScheduleStartTime",
                      language
                    )}
                    <input style={styles.input} type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} required />
                  </label>
                  {editorShowsEndTime && (
                    <label style={styles.label}>
                      {t("professionalScheduleEndTimeOptional", language)}
                      <input style={styles.input} type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
                    </label>
                  )}
                  <label style={styles.label}>
                    {t("professionalScheduleLocation", language)}
                    <select style={styles.input} value={form.locationMode} onChange={(event) => setForm((current) => ({ ...current, locationMode: event.target.value }))} required>
                      <option value="JOB_SERVICE_LOCATION">{t("professionalScheduleCustomerLocation", language)}</option>
                      <option value="REMOTE">{t("professionalScheduleRemote", language)}</option>
                    </select>
                  </label>
                </div>
                <p style={styles.timeZoneNote}>
                  {t("professionalScheduleTimeZoneDisplay", language, {
                    timeZone: editorTimeZoneLabel,
                  })}
                </p>
              </>
            )}
            <button type="submit" style={styles.primaryButton} disabled={running}>
              {running ? t("professionalScheduleSaving", language) : editor.mode === "cancel"
                ? t("professionalScheduleCancel", language)
                : editor.mode === "complete"
                  ? t("professionalScheduleComplete", language)
                : t("professionalScheduleSave", language)}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

const styles = {
  workspace: { display: "grid", gap: 20, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  title: { margin: 0, color: "#172317", fontSize: "clamp(1.5rem, 4vw, 2rem)" },
  summary: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, color: "#445246", fontSize: 14 },
  group: { display: "grid", gap: 12 },
  groupTitle: { margin: 0, color: "#172317", fontSize: 18 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14, minWidth: 0 },
  card: { border: "1px solid #dce6dc", borderRadius: 18, background: "rgba(255,255,255,.94)", padding: 16, display: "grid", gap: 10, minWidth: 0, boxShadow: "0 10px 28px rgba(25,50,29,.06)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  cardMain: { minWidth: 0 },
  eyebrow: { color: "#55705a", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" },
  cardTitle: { margin: "4px 0", color: "#172317", overflowWrap: "anywhere" },
  jobTitle: { margin: 0, color: "#445246", overflowWrap: "anywhere" },
  statePill: { borderRadius: 999, background: "#eef6ee", color: "#28552e", padding: "7px 10px", fontSize: 12, fontWeight: 800, maxWidth: "100%" },
  scheduleTime: { margin: 0, color: "#172317", fontWeight: 800 },
  location: { margin: 0, color: "#536055", overflowWrap: "anywhere" },
  changeNote: { margin: 0, padding: 10, borderRadius: 12, background: "#fff7ed", color: "#9a4c13" },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  primaryButton: { minHeight: 44, border: 0, borderRadius: 12, padding: "10px 15px", background: "#244d2a", color: "#fff", fontWeight: 800, cursor: "pointer" },
  secondaryButton: { minHeight: 44, border: "1px solid #b9c9ba", borderRadius: 12, padding: "10px 15px", background: "#fff", color: "#244d2a", fontWeight: 800, cursor: "pointer" },
  message: { minHeight: 44, color: "#445246" },
  errorBox: { border: "1px solid #f1b7b7", borderRadius: 16, padding: 16, background: "#fff7f7", color: "#912e2e" },
  warning: { margin: 0, borderRadius: 12, padding: 12, background: "#fff8e8", color: "#775410" },
  error: { margin: 0, color: "#a53030", fontWeight: 700 },
  success: { margin: 0, color: "#25612c", fontWeight: 700 },
  empty: { border: "1px dashed #b9c9ba", borderRadius: 18, padding: 24, display: "grid", gap: 6, color: "#445246" },
  overlay: { position: "fixed", inset: 0, zIndex: 10020, background: "rgba(18,30,20,.48)", display: "grid", placeItems: "center", padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))", overflowY: "auto" },
  editor: { width: "min(620px, 100%)", maxHeight: "min(88dvh, 760px)", overflowY: "auto", borderRadius: 20, background: "#fff", padding: 20, display: "grid", gap: 18, boxShadow: "0 24px 64px rgba(15,30,18,.24)" },
  editorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  editorContext: { margin: 0, color: "#445246", fontWeight: 700, overflowWrap: "anywhere" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 },
  label: { display: "grid", gap: 6, color: "#253b28", fontWeight: 700 },
  input: { width: "100%", minHeight: 44, boxSizing: "border-box", border: "1px solid #b9c9ba", borderRadius: 10, padding: "9px 11px", background: "#fff", font: "inherit" },
  timeZoneNote: { margin: 0, color: "#536055", fontSize: 13 },
};
