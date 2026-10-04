import WorkCenterBackButton from "./WorkCenterBackButton.jsx";
import {
  WorkCenterEmptyState,
  WorkCenterMetricGrid,
  WorkCenterPageHeader,
  WorkCenterStatusPill,
} from "./WorkCenterWorkspaceSystem.jsx";
import { getWorkPlanCopy } from "../utils/workPlanLanguage.js";
import { getWorkCenterWorkspaceCopy } from "../utils/workCenterWorkspaceLanguage.js";

export default function ProfessionalWorkPlanOverview({
  sourceState,
  language = "en",
  onBack,
  onRetry,
  onOpenJob,
}) {
  const copy = getWorkPlanCopy(language);
  const workspaceCopy = getWorkCenterWorkspaceCopy(language);
  const summary = sourceState?.summary || null;
  return (
    <section
      className="professional-work-plan-overview work-center-workspace"
      style={styles.section}
      aria-labelledby="professional-work-plan-overview-title"
      data-work-plan-overview-status={sourceState?.status || "idle"}
      data-work-plan-overview-error={sourceState?.error || ""}
    >
      <WorkCenterBackButton label={copy.backToWorkCenter} onClick={onBack} />
      <WorkCenterPageHeader
        eyebrow={copy.workspaceEyebrow}
        title={copy.workPlan}
        titleId="professional-work-plan-overview-title"
        description={workspaceCopy.workPlanDescription}
      />

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
        <WorkCenterMetricGrid
          ariaLabel={copy.workPlan}
          metrics={[
            { key: "items", icon: "workCenter", label: copy.workItems, value: summary.workItemCount },
            { key: "completed", icon: "completion", tone: "success", label: copy.completed, value: summary.completedCount },
            { key: "remaining", icon: "history", tone: "info", label: copy.remaining, value: summary.remainingCount },
            { key: "attention", icon: "warning", tone: "warning", label: copy.needsAttention, value: summary.needsAttentionCount },
            { key: "jobs", icon: "currentJobs", tone: "violet", label: workspaceCopy.jobs, value: summary.jobCount },
          ]}
        />
      )}

      {summary?.jobs.length === 0 && (
        <WorkCenterEmptyState
          icon="workCenter"
          title={workspaceCopy.workPlanEmptyTitle}
          body={workspaceCopy.workPlanEmptyBody}
        />
      )}
      <div style={styles.jobs}>
        {summary?.jobs.map((job) => (
          <article key={job.jobId} className="work-center-content-card" style={styles.job} data-work-plan-job-id={job.jobId}>
            <div style={styles.jobCopy}>
              <span style={styles.customer}>{job.customerName}</span>
              <h3 style={styles.jobTitle}>{job.title}</h3>
              <p style={styles.jobMeta}>
                {copy.format("itemCount", { count: job.workItemCount })} ·{" "}
                {copy.format("completedCount", { count: job.completedCount })} ·{" "}
                {copy.format("remainingCount", { count: job.remainingCount })}
              </p>
              <WorkCenterStatusPill className="professional-work-plan-overview__status">
                {job.readyForCompletionReview
                  ? copy.readyForCompletionReview
                  : job.needsAttentionCount > 0
                    ? copy.needsAttention
                    : job.remainingCount > 0
                      ? copy.inProgress
                      : copy.readyToStart}
              </WorkCenterStatusPill>
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
  section: { minWidth: 0 },
  jobs: { display: "grid", gap: 12 },
  job: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: 18, border: "1px solid #dce5d8", borderRadius: 8, background: "#fff", minWidth: 0, boxShadow: "0 8px 24px rgba(28,49,31,.05)" },
  jobCopy: { minWidth: 0, flex: "1 1 260px" },
  customer: { color: "#475569", fontSize: 12, fontWeight: 800 },
  jobTitle: { margin: "3px 0 6px", fontSize: 18, letterSpacing: 0, overflowWrap: "anywhere" },
  jobMeta: { margin: 0, color: "#475569", lineHeight: 1.5 },
  primaryButton: { minHeight: 44, padding: "9px 14px", border: 0, borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 850, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 800, cursor: "pointer" },
  error: { color: "#991b1b" },
};
