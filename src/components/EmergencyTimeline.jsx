import {
  getEmergencyAlternateOutcome,
  getEmergencyTimeline,
} from "../utils/emergencySummary.js";

function formatTimestamp(value, language) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    language === "es" ? "es-US" : "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function getStageStyle(state, compactFindHelp = false) {
  if (compactFindHelp) {
    if (state === "current") {
      return compactCurrentStage;
    }

    if (state === "reached") {
      return compactReachedStage;
    }

    return compactFutureStage;
  }

  if (state === "current") {
    return currentStage;
  }

  if (state === "reached") {
    return reachedStage;
  }

  return futureStage;
}

function getDotStyle(state, compactFindHelp = false) {
  if (compactFindHelp) {
    if (state === "current") {
      return compactCurrentDot;
    }

    if (state === "reached") {
      return compactReachedDot;
    }

    return compactFutureDot;
  }

  if (state === "current") {
    return currentDot;
  }

  if (state === "reached") {
    return reachedDot;
  }

  return futureDot;
}

function EmergencyTimeline({
  emergencyRequest = {},
  language = "en",
  presentation = "default",
}) {
  const compactFindHelp =
    presentation === "findHelp";

  const stages = getEmergencyTimeline(
    emergencyRequest,
    language
  );
  const alternateOutcome =
    getEmergencyAlternateOutcome(
      emergencyRequest,
      language
    );

  return (
    <div
      style={timelineContainer}
      data-emergency-timeline="canonical"
    >
      <ol
        className={
          compactFindHelp
            ? "emergency-timeline-grid"
            : undefined
        }
        style={
          compactFindHelp
            ? compactTimelineGrid
            : timelineGrid
        }
        aria-label={
          language === "es"
            ? "Progreso de la solicitud de Emergencia"
            : "Emergency request progress"
        }
      >
        {stages.map((stage) => (
          <li
            key={stage.key}
            style={{
              ...(compactFindHelp
                ? compactTimelineStage
                : timelineStage),
              ...getStageStyle(
                stage.state,
                compactFindHelp
              ),
            }}
            data-stage-key={stage.key}
            data-stage-state={stage.state}
            aria-current={
              stage.state === "current"
                ? "step"
                : undefined
            }
          >
            <span
              style={{
                ...timelineDot,
                ...getDotStyle(
                  stage.state,
                  compactFindHelp
                ),
              }}
              aria-hidden="true"
            />
            <span style={stageContent}>
              <strong style={stageLabel}>
                {stage.label}
              </strong>
              {stage.reachedAt && (
                <time
                  style={stageTimestamp}
                  dateTime={stage.reachedAt}
                >
                  {formatTimestamp(
                    stage.reachedAt,
                    language
                  )}
                </time>
              )}
            </span>
          </li>
        ))}
      </ol>

      {alternateOutcome && (
        <div
          style={alternateOutcomeCard}
          role="status"
          data-emergency-outcome={
            alternateOutcome.status
          }
        >
          <strong>{alternateOutcome.label}</strong>
          {alternateOutcome.occurredAt && (
            <time
              style={alternateOutcomeTimestamp}
              dateTime={alternateOutcome.occurredAt}
            >
              {formatTimestamp(
                alternateOutcome.occurredAt,
                language
              )}
            </time>
          )}
        </div>
      )}
    </div>
  );
}

export default EmergencyTimeline;

const timelineContainer = {
  display: "grid",
  gap: "10px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
};

const timelineGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 112px), 1fr))",
  gap: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const compactTimelineGrid = {
  ...timelineGrid,
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "6px",
};

const timelineStage = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  minWidth: 0,
  padding: "9px",
  borderRadius: "12px",
};

const compactTimelineStage = {
  ...timelineStage,
  gap: "5px",
  minHeight: "44px",
  padding: "6px",
  borderRadius: "10px",
  boxSizing: "border-box",
};

const reachedStage = {
  color: "#166534",
  background: "#dcfce7",
  border: "1px solid #86efac",
};

const currentStage = {
  color: "#991b1b",
  background: "#fee2e2",
  border: "2px solid #dc2626",
  boxShadow:
    "0 0 0 3px rgba(220, 38, 38, 0.12)",
};

const futureStage = {
  color: "#64748b",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
};

const compactReachedStage = {
  color:
    "var(--meetro-color-accent, #10B981)",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  border:
    "1px solid rgba(16, 185, 129, 0.28)",
};

const compactCurrentStage = {
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  border:
    "1px solid var(--meetro-color-forest, #0B5D3B)",
  boxShadow: "none",
};

const compactFutureStage = {
  color:
    "var(--meetro-color-muted, #6B7280)",
  background:
    "var(--meetro-surface-paper, #FFFFFF)",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
};

const timelineDot = {
  flex: "0 0 auto",
  width: "10px",
  height: "10px",
  marginTop: "2px",
  borderRadius: "999px",
};

const reachedDot = {
  background: "#22c55e",
  border: "1px solid #15803d",
};

const currentDot = {
  background: "#dc2626",
  border: "2px solid #ffffff",
  boxShadow: "0 0 0 2px #dc2626",
};

const futureDot = {
  background: "transparent",
  border: "1px solid #94a3b8",
};

const compactReachedDot = {
  background:
    "var(--meetro-color-accent, #10B981)",
  border:
    "1px solid var(--meetro-color-accent, #10B981)",
};

const compactCurrentDot = {
  background:
    "var(--meetro-color-forest, #0B5D3B)",
  border: "2px solid #FFFFFF",
  boxShadow:
    "0 0 0 2px var(--meetro-color-forest, #0B5D3B)",
};

const compactFutureDot = {
  background: "transparent",
  border:
    "1px solid var(--meetro-color-muted, #6B7280)",
};

const stageContent = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const stageLabel = {
  fontSize: "11px",
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const stageTimestamp = {
  color: "inherit",
  fontSize: "10px",
  lineHeight: 1.25,
  opacity: 0.84,
};

const alternateOutcomeCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "6px 12px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "10px 12px",
  border: "1px solid #f59e0b",
  borderRadius: "12px",
  color: "#92400e",
  background: "#fffbeb",
  fontSize: "11px",
};

const alternateOutcomeTimestamp = {
  color: "inherit",
  fontSize: "10px",
};
