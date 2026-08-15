import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeCanonicalJob,
  createJobCompletionIdempotencyKey,
  fetchJobCompletionReview,
} from "../utils/jobCompletionApi.js";
import { getJobCompletionCopy } from "../utils/jobCompletionLanguage.js";

function outstandingCount(review) {
  return Object.values(review?.outstanding || {}).reduce(
    (total, count) => total + Number(count || 0),
    0
  );
}

export default function ProfessionalCompletionReview({
  jobId,
  language = "en",
  setPage,
  onCompleted,
}) {
  const copy = getJobCompletionCopy(language);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", review: null, error: "" });
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commandError, setCommandError] = useState("");
  const commandKeyRef = useRef("");
  const submittingRef = useRef(false);

  const loadReview = useCallback(async () => {
    const review = await fetchJobCompletionReview({ jobId, setPage });
    setState({ status: "ready", review, error: "" });
    return review;
  }, [jobId, setPage]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setState({ status: "loading", review: null, error: "" });
    });
    void fetchJobCompletionReview({ jobId, setPage })
      .then((review) => {
        if (active) setState({ status: "ready", review, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            review: null,
            error: String(error?.code || "JOB_COMPLETION_REVIEW_FAILED"),
          });
        }
      });
    return () => { active = false; };
  }, [jobId, refreshKey, setPage]);

  const handleComplete = async () => {
    if (!state.review?.canComplete || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setCommandError("");
    try {
      if (!commandKeyRef.current) {
        commandKeyRef.current = createJobCompletionIdempotencyKey();
      }
      const completion = await completeCanonicalJob({
        jobId,
        expectedVersion: state.review.currentVersion,
        idempotencyKey: commandKeyRef.current,
        setPage,
      });
      commandKeyRef.current = "";
      await loadReview();
      setConfirming(false);
      onCompleted?.(completion);
    } catch (error) {
      setCommandError(String(error?.code || "JOB_COMPLETION_FAILED"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const review = state.review;
  const isCompleted = review?.state === "COMPLETED";

  return (
    <section
      className="professional-completion-review"
      style={styles.section}
      aria-labelledby="professional-completion-review-title"
      data-job-completion-status={state.status}
      data-job-completion-job-id={jobId || ""}
      data-job-completion-error={state.error || commandError}
    >
      <header style={styles.header}>
        <div>
          <h2 id="professional-completion-review-title" style={styles.title}>
            {isCompleted ? copy.workCompleted : copy.completionReview}
          </h2>
          <p style={styles.purpose}>
            {isCompleted ? copy.completedBody : copy.completionPurpose}
          </p>
        </div>
        {isCompleted && <span style={styles.status}>{copy.readyToInvoice}</span>}
      </header>

      {state.status === "loading" && <p role="status">{copy.loading}</p>}
      {state.status === "error" && (
        <div role="alert" style={styles.error}>
          <p>{copy.unavailable}</p>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            {copy.retry}
          </button>
        </div>
      )}

      {review && !isCompleted && (
        <>
          <div style={styles.metrics}>
            <div style={styles.metric}>
              <strong>{review.work.completedWorkItemCount}/{review.work.workItemCount}</strong>
              <span>{copy.work} · {copy.completed}</span>
            </div>
            <div style={styles.metric}>
              <strong>{outstandingCount(review) || copy.none}</strong>
              <span>{copy.outstandingItems}</span>
            </div>
            <div style={styles.metric}>
              <strong>{review.customerUpdates.status === "UP_TO_DATE" ? copy.upToDate : review.customerUpdates.count}</strong>
              <span>{copy.customerUpdates}</span>
            </div>
          </div>

          {!review.canComplete && <p role="status" style={styles.notReady}>{copy.notReady}</p>}
          {commandError && <p role="alert" style={styles.errorText}>{copy.commandFailed}</p>}

          {review.canComplete && !confirming && (
            <button type="button" style={styles.primaryButton} onClick={() => setConfirming(true)}>
              {copy.completeJob}
            </button>
          )}

          {review.canComplete && confirming && (
            <div role="alertdialog" aria-modal="false" aria-labelledby="complete-job-confirm-title" style={styles.confirmation}>
              <strong id="complete-job-confirm-title">{copy.confirmTitle}</strong>
              <p style={styles.confirmBody}>{copy.confirmBody}</p>
              <div style={styles.actions}>
                <button type="button" style={styles.primaryButton} disabled={submitting} onClick={handleComplete}>
                  {submitting ? copy.completing : copy.confirm}
                </button>
                <button type="button" style={styles.secondaryButton} disabled={submitting} onClick={() => setConfirming(false)}>
                  {copy.cancel}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 16, padding: "18px 0", borderTop: "1px solid #cbd5e1", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  title: { margin: 0, fontSize: 22, letterSpacing: 0 },
  purpose: { margin: "6px 0 0", color: "#475569", lineHeight: 1.5, maxWidth: 620 },
  status: { color: "#1f5132", fontSize: 13, fontWeight: 850 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 1, background: "#cbd5e1", border: "1px solid #cbd5e1" },
  metric: { display: "grid", gap: 4, padding: 14, background: "#fff", minWidth: 0 },
  notReady: { margin: 0, color: "#7c2d12", lineHeight: 1.5 },
  confirmation: { display: "grid", gap: 8, padding: 14, borderLeft: "3px solid #1f5132", background: "#eff7ed" },
  confirmBody: { margin: 0, lineHeight: 1.5, color: "#334155" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: { minHeight: 44, padding: "10px 16px", border: "1px solid #1f5132", borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 800, cursor: "pointer", width: "fit-content" },
  secondaryButton: { minHeight: 44, padding: "9px 14px", border: "1px solid #64748b", borderRadius: 6, background: "#fff", color: "#243326", fontWeight: 800, cursor: "pointer", width: "fit-content" },
  error: { color: "#991b1b" },
  errorText: { margin: 0, color: "#991b1b" },
};
