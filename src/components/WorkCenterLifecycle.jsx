import { getLanguage, t } from "../utils/language.js";
import { WORK_CENTER_JOB_LIFECYCLE } from "../utils/workCenterLifecyclePresentation.js";

export default function WorkCenterLifecycle({
  presentation,
  compact = false,
  language = getLanguage(),
  ariaLabel = t("wc52progress", language),
}) {
  const stages = presentation?.stages || WORK_CENTER_JOB_LIFECYCLE.map((stage, index) => ({
    ...stage,
    index,
    state: index === 0 ? "current" : "locked",
    currentAction: "",
  }));

  return (
    <div
      className={`work-center-lifecycle${compact ? " work-center-lifecycle--compact" : ""}`}
      aria-label={ariaLabel}
      data-lifecycle-stage-count={stages.length}
      data-lifecycle-source={presentation?.sourceType || "job_request"}
    >
      {[stages.slice(0, 4), stages.slice(4)].map((row, rowIndex) => (
        <div className="work-center-lifecycle__row" data-lifecycle-row={rowIndex + 1} key={rowIndex}>
        {row.map((stage) => (
        <div
          key={stage.key}
          className={`work-center-lifecycle__stage work-center-lifecycle__stage--${stage.state}`}
          data-lifecycle-stage={stage.key}
          data-lifecycle-state={stage.state}
          aria-current={stage.state === "current" ? "step" : undefined}
        >
          <span className="work-center-lifecycle__indicator" aria-hidden="true">
            {stage.state === "complete" ? "✓" : stage.index + 1}
          </span>
          <span className="work-center-lifecycle__label">{presentation?.sourceType === "emergency_request" ? stage.label : t(`wc52${stage.key}`, language)}</span>
        </div>
        ))}
        </div>
      ))}
    </div>
  );
}

export function WorkCenterLifecycleHeading({ presentation, language = getLanguage() }) {
  return (
    <div className="work-center-lifecycle-heading">
      <h2>{t("wc52progress", language)}</h2>
      <span>{t("wc52progressCount", language, { count: presentation?.completedCount || 0 })}</span>
    </div>
  );
}
