import { useEffect, useState } from "react";
import { fetchCanonicalVisitDetail } from "../utils/canonicalVisitProjection.js";
import { t } from "../utils/language.js";

const eventLabels = {
  VISIT_PROPOSED: "professionalScheduleHistoryProposed",
  VISIT_SCHEDULE_PROPOSED: "professionalScheduleHistoryScheduleProposed",
  VISIT_CHANGE_REQUESTED: "professionalScheduleHistoryChangeRequested",
  VISIT_RESCHEDULED: "professionalScheduleHistoryUpdated",
  VISIT_CONFIRMED: "professionalScheduleHistoryConfirmed",
  VISIT_EXTERNAL_CONFIRMATION_RECORDED: "professionalScheduleHistoryExternalConfirmed",
  VISIT_CANCELLED: "professionalScheduleHistoryCancelled",
  VISIT_STARTED: "professionalScheduleHistoryStarted",
  VISIT_COMPLETED: "professionalScheduleHistoryCompleted",
};

function formatInstant(instant, timeZone, language) {
  return new Intl.DateTimeFormat(language, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone,
  }).format(new Date(instant));
}

export default function CanonicalVisitScheduleHistory({ visit, language = "en", setPage }) {
  const { jobId, id: visitId, purpose, evaluationId, currentVersion } = visit;
  const [expanded, setExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState(null);
  const identity = `${jobId}:${visitId}:${currentVersion}`;
  const regionId = `visit-history-${jobId}-${visitId}`;

  useEffect(() => {
    if (!expanded) return undefined;
    let current = true;
    fetchCanonicalVisitDetail({ jobId, visitId, purpose, evaluationId, setPage })
      .then((detail) => {
        // An older read cannot describe the current card's history completely.
        if (detail.currentVersion < currentVersion) throw new Error("Stale Visit history");
        if (current) setResult({ identity, retryKey, detail });
      })
      .catch(() => {
        if (current) setResult({ identity, retryKey, error: true });
      });
    return () => { current = false; };
  }, [expanded, jobId, visitId, purpose, evaluationId, currentVersion, identity, retryKey, setPage]);

  const loaded = result?.identity === identity && result?.retryKey === retryKey ? result : null;
  const events = loaded?.detail?.history.events;
  const versions = loaded?.detail?.history.versions;
  return (
    <div style={{ minWidth: 0, borderTop: "1px solid #dce5dc", paddingTop: 10 }}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((value) => !value)}
        style={{ minHeight: 44, padding: "8px 0", border: 0, background: "transparent", color: "#244d2a", font: "inherit", fontWeight: 700, cursor: "pointer", textAlign: "start" }}
      >
        {t("professionalScheduleVisitHistory", language)} <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
      </button>
      <div id={regionId} hidden={!expanded}>
        {expanded && !loaded && <p role="status">{t("professionalScheduleVisitHistoryLoading", language)}</p>}
        {expanded && loaded?.error && (
          <div role="alert">
            <p>{t("professionalScheduleVisitHistoryUnavailable", language)}</p>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} style={{ minHeight: 44 }}>
              {t("professionalScheduleRetry", language)}
            </button>
          </div>
        )}
        {expanded && events && (
          events.length === 0
            ? <p>{t("professionalScheduleVisitHistoryEmpty", language)}</p>
            : <ol style={{ margin: 0, paddingInlineStart: 22, display: "grid", gap: 14 }}>
              {[...events].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).map((event) => {
                // Join the event to its own immutable version, never the current schedule.
                const version = versions.find((item) => item.version === event.visitVersion);
                return (
                  <li key={event.id} style={{ overflowWrap: "anywhere" }}>
                    <time dateTime={event.createdAt}>{formatInstant(event.createdAt, version.timeZone, language)}</time>
                    {" — "}<strong>{t(eventLabels[event.type], language)}</strong>
                    <div>{t("professionalScheduleHistoryVersionSchedule", language)}: {formatInstant(version.scheduledStartAt, version.timeZone, language)}
                      {version.scheduledEndAt && <> – {formatInstant(version.scheduledEndAt, version.timeZone, language)}</>}
                    </div>
                    {event.reason && <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{event.reason}</p>}
                  </li>
                );
              })}
            </ol>
        )}
      </div>
    </div>
  );
}
