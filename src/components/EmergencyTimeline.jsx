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

function getStageStyle(state) {
  if (state === "current") {
    return currentStage;
  }

  if (state === "reached") {
    return reachedStage;
  }

  return futureStage;
}

function getDotStyle(state) {
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
}) {
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
        style={timelineGrid}
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
              ...timelineStage,
              ...getStageStyle(stage.state),
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
                ...getDotStyle(stage.state),
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

const timelineStage = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  minWidth: 0,
  padding: "9px",
  borderRadius: "12px",
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
  boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.12)",
};

const futureStage = {
  color: "#64748b",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
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
