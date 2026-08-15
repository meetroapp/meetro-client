import WorkCenterBackButton from "./WorkCenterBackButton.jsx";
import { getWorkPlanCopy } from "../utils/workPlanLanguage.js";

export default function ProfessionalWorkPlanOverview({
  sourceState,
  language = "en",
  onBack,
  onRetry,
  onOpenJob,
}) {
  const copy = getWorkPlanCopy(language);
  const summary = sourceState?.summary || null;
  return (
    <section
      className="professional-work-plan-overview"
      style={styles.section}
      aria-labelledby="professional-work-plan-overview-title"
      data-work-plan-overview-status={sourceState?.status || "idle"}
      data-work-plan-overview-error={sourceState?.error || ""}
    >
      <WorkCenterBackButton label={copy.backToWorkCenter} onClick={onBack} />
      <header style={styles.header}>
        <div>
          <span style={styles.eyebrow}>{copy.workspaceEyebrow}</span>
          <h2 id="professional-work-plan-overview-title" style={styles.title}>
            {copy.workPlan}
          </h2>
          <p style={styles.purpose}>{copy.cardPurpose}</p>
        </div>
        {summary && (
          <span style={styles.count}>
            {copy.format("jobCount", { count: summary.jobCount })}
          </span>
        )}
      </header>

      {sourceState?.status === "loading" && <p role="status">{copy.loading}</p>}
      {sourceState?.status === "error" && (
        <div role="alert" style={styles.error}>
          <p>{copy.unavailable}</p>
          <button type="button" style={styles.secondaryButton} onClick={onRetry}>
            {copy.retry}
          </button>
        </div>
      )}

      {summary && (
        <div style={styles.metrics}>
          <div><strong>{summary.workItemCount}</strong><span>{copy.workItems}</span></div>
          <div><strong>{summary.completedCount}</strong><span>{copy.completed}</span></div>
          <div><strong>{summary.remainingCount}</strong><span>{copy.remaining}</span></div>
          <div><strong>{summary.needsAttentionCount}</strong><span>{copy.needsAttention}</span></div>
        </div>
      )}

      {summary?.jobs.length === 0 && <p style={styles.empty}>{copy.noApprovedWork}</p>}
      <div style={styles.jobs}>
        {summary?.jobs.map((job) => (
          <article key={job.jobId} style={styles.job} data-work-plan-job-id={job.jobId}>
            <div style={styles.jobCopy}>
              <span style={styles.customer}>{job.customerName}</span>
              <h3 style={styles.jobTitle}>{job.title}</h3>
              <p style={styles.jobMeta}>
                {copy.format("itemCount", { count: job.workItemCount })} ·{" "}
                {copy.format("completedCount", { count: job.completedCount })} ·{" "}
                {copy.format("remainingCount", { count: job.remainingCount })}
              </p>
              <strong style={styles.status}>
                {job.readyForCompletionReview
                  ? copy.readyForCompletionReview
                  : job.needsAttentionCount > 0
                    ? copy.needsAttention
                    : job.remainingCount > 0
                      ? copy.inProgress
                      : copy.readyToStart}
              </strong>
            </div>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => onOpenJob?.(job.jobId)}
            >
              {copy.openJob}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 18, padding: "20px 0", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  eyebrow: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "3px 0 0", fontSize: 26, letterSpacing: 0 },
  purpose: { margin: "7px 0 0", color: "#475569" },
  count: { alignSelf: "flex-start", color: "#1f5132", fontWeight: 850 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" },
  jobs: { display: "grid", gap: 0 },
  job: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 0", borderBottom: "1px solid #d7dee8", minWidth: 0 },
  jobCopy: { minWidth: 0, flex: "1 1 260px" },
  customer: { color: "#475569", fontSize: 12, fontWeight: 800 },
  jobTitle: { margin: "3px 0 6px", fontSize: 18, letterSpacing: 0, overflowWrap: "anywhere" },
  jobMeta: { margin: 0, color: "#475569", lineHeight: 1.5 },
  status: { display: "block", marginTop: 6, color: "#1f5132", fontSize: 13 },
  primaryButton: { minHeight: 44, padding: "9px 14px", border: 0, borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 850, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 800, cursor: "pointer" },
  empty: { color: "#64748b" },
  error: { color: "#991b1b" },
};
