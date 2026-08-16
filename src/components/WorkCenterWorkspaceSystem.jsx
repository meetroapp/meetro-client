import { useEffect, useId, useRef, useState } from "react";
import MeetroIcon from "./MeetroIcon.jsx";

export function WorkCenterPageHeader({ eyebrow, title, description, titleId, action = null }) {
  return (
    <header className="work-center-page-header">
      <div className="work-center-page-header__copy">
        <span className="work-center-page-header__eyebrow">{eyebrow}</span>
        <h2 id={titleId} className="work-center-page-header__title">{title}</h2>
        <p className="work-center-page-header__description">{description}</p>
      </div>
      {action && <div className="work-center-page-header__action">{action}</div>}
    </header>
  );
}

export function WorkCenterMetricGrid({ metrics = [], ariaLabel }) {
  return (
    <div className="work-center-metric-grid" aria-label={ariaLabel}>
      {metrics.map((metric) => (
        <div className={`work-center-metric-card work-center-metric-card--${metric.tone || "forest"}`} key={metric.key || metric.label}>
          <span className="work-center-metric-card__icon" aria-hidden="true">
            <MeetroIcon name={metric.icon || "workCenter"} size={24} decorative />
          </span>
          <span className="work-center-metric-card__copy">
            <strong className="work-center-metric-card__value">{metric.value}</strong>
            <span className="work-center-metric-card__label">{metric.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function WorkCenterEmptyState({ icon = "workCenter", title, body, action = null }) {
  return (
    <div className="work-center-empty-state">
      <span className="work-center-empty-state__icon" aria-hidden="true">
        <MeetroIcon name={icon} size={52} decorative />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div className="work-center-empty-state__action">{action}</div>}
    </div>
  );
}

export function WorkCenterStatusPill({ children, tone = "neutral", className = "" }) {
  return <span className={`work-center-status-pill work-center-status-pill--${tone} ${className}`.trim()}>{children}</span>;
}

export function WorkCenterAccordion({
  id,
  icon = "workCenter",
  title,
  summary,
  status = "",
  defaultOpen = false,
  autoOpenToken = "",
  nested = false,
  children,
}) {
  const generatedId = useId();
  const sectionId = id || generatedId.replaceAll(":", "");
  const [open, setOpen] = useState(defaultOpen);
  const lastAutoOpenToken = useRef("");

  useEffect(() => {
    if (!defaultOpen || !autoOpenToken || lastAutoOpenToken.current === autoOpenToken) return;
    lastAutoOpenToken.current = autoOpenToken;
    setOpen(true);
  }, [autoOpenToken, defaultOpen]);

  return (
    <section className={`work-center-accordion${open ? " work-center-accordion--open" : ""}${nested ? " work-center-accordion--nested" : ""}`} data-work-center-accordion={sectionId}>
      <button
        type="button"
        className="work-center-accordion__trigger"
        aria-expanded={open}
        aria-controls={`${sectionId}-content`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="work-center-accordion__icon" aria-hidden="true">
          <MeetroIcon name={icon} size={24} decorative />
        </span>
        <span className="work-center-accordion__copy">
          <strong>{title}</strong>
          <span>{summary}</span>
        </span>
        {status && <WorkCenterStatusPill>{status}</WorkCenterStatusPill>}
        <span className="work-center-accordion__chevron" aria-hidden="true">v</span>
      </button>
      <div id={`${sectionId}-content`} className="work-center-accordion__content" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
