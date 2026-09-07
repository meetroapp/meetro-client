export default function CompactCurrentJobHeader({
  eyebrow = "Current Job",
  customer,
  service,
  address,
  status,
  nextStep,
  responsibility,
  blocker,
  concern,
  participants = [],
  connected = false,
  action = null,
}) {
  return (
    <section className="compact-current-job-header" aria-label="Current Job">
      <div className="compact-current-job-header__primary">
        <div className="compact-current-job-header__identity">
          <span className="compact-current-job-header__eyebrow">{eyebrow}</span>
          <h2>{customer}</h2>
          <p className="compact-current-job-header__service">{service}</p>
          {address && <p className="compact-current-job-header__address">{address}</p>}
        </div>

        <div className="compact-current-job-header__state" aria-label="Job status and next step">
          <div className="compact-current-job-header__state-item compact-current-job-header__state-item--status">
            <span className="compact-current-job-header__label">Job status</span>
            <strong className="compact-current-job-header__pill">{status}</strong>
          </div>
          <div className="compact-current-job-header__state-item compact-current-job-header__state-item--next">
            <span className="compact-current-job-header__label">Next</span>
            <strong>{nextStep}</strong>
          </div>
          <div className="compact-current-job-header__state-item compact-current-job-header__state-item--responsibility">
            <span className="compact-current-job-header__label">Who acts next</span>
            <strong>{responsibility}</strong>
          </div>
          {action && <div className="compact-current-job-header__action">{action}</div>}
          {blocker && <span role="status" className="compact-current-job-header__blocker">{blocker}</span>}
        </div>
      </div>

      <div className="compact-current-job-header__details" aria-label="Job details">
        <div className="compact-current-job-header__concern">
          <span className="compact-current-job-header__label">Customer concern</span>
          <p>{concern || "Unavailable"}</p>
        </div>
        <div className="compact-current-job-header__record">
          <span className="compact-current-job-header__label">Job record</span>
          <strong>{connected ? "Connected" : "Unavailable"}</strong>
        </div>
        <details className="compact-current-job-header__participants">
          <summary>{participants.length} known participant{participants.length === 1 ? "" : "s"}</summary>
          {participants.length > 0 && (
            <ul>
              {participants.map((participant, index) => (
                <li key={`${participant.displayName || "participant"}-${index}`}>
                  <strong>{participant.displayName || "Participant"}</strong>
                  {participant.roles?.length
                    ? ` — ${participant.roles.map((role) => role.labelKey || role.role).join(", ")}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </details>
      </div>
    </section>
  );
}
