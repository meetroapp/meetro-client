function GuidedWorkspaceCard({
  id,
  title,
  icon,
  state = "upcoming",
  summary = [],
  onEdit,
  editLabel = "Edit",
  children,
}) {
  const isActive = state === "active";
  const isComplete = state === "complete";
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;
  const summaryItems = Array.isArray(summary) ? summary.filter(Boolean) : [summary].filter(Boolean);

  return (
    <section
      className={`guided-workspace-card guided-workspace-card--${state}`}
      aria-labelledby={headingId}
      aria-expanded={isActive}
    >
      <header className="guided-workspace-card__header">
        <div className="guided-workspace-card__title-row">
          <span className="guided-workspace-card__status" aria-hidden="true">
            {isComplete ? "✓" : icon || "○"}
          </span>
          <h2 id={headingId} className="guided-workspace-card__title">
            {title}
          </h2>
        </div>

        {isComplete && onEdit && (
          <button
            type="button"
            className="guided-workspace-card__edit"
            onClick={onEdit}
            aria-controls={contentId}
            aria-expanded={isActive}
          >
            {editLabel}
          </button>
        )}
      </header>

      {!isActive && (
        <div className="guided-workspace-card__summary">
          {summaryItems.length > 0 ? (
            summaryItems.map((item) => (
              <p key={item} className="guided-workspace-card__summary-line">
                {item}
              </p>
            ))
          ) : (
            <p className="guided-workspace-card__summary-line guided-workspace-card__summary-line--muted">
              {isComplete ? "Complete" : "Not started"}
            </p>
          )}
        </div>
      )}

      {isActive && (
        <div id={contentId} className="guided-workspace-card__content">
          {children}
        </div>
      )}
    </section>
  );
}

export default GuidedWorkspaceCard;
