import { useEffect, useState } from "react";
import {
  getCanonicalEvaluationSourceContext,
  ordinaryCanonicalEvaluationContentToForm,
} from "../utils/canonicalEvaluation.js";
import {
  loadCanonicalEvaluationForRecord,
  saveCanonicalEvaluationDraft,
} from "../utils/evaluationAuthorityController.js";
import { isCanonicalWorkCenterHydrationEnabled } from "../utils/workCenterCanonicalHydration.js";

const EMPTY_FORM = Object.freeze({
  observations: "",
  diagnosisSummary: "",
  limitations: "",
  internalNotes: "",
});

function formForEvaluation(evaluation) {
  return (
    ordinaryCanonicalEvaluationContentToForm(evaluation) || {
      ...EMPTY_FORM,
    }
  );
}

function evaluationErrorMessage(error) {
  if (error?.status === 403) {
    return "Evaluation authority is not available for this professional account.";
  }
  if (error?.status === 404) {
    return "Canonical Evaluation is unavailable for this Job.";
  }
  if (error?.code === "STALE_EVALUATION_VERSION") {
    return "This Evaluation changed elsewhere. Reopen the Job to load the current version.";
  }
  if (error?.code === "EVALUATION_COMPLETED") {
    return "This completed Evaluation is read-only.";
  }
  return error?.message || "Canonical Evaluation could not be loaded.";
}

function canonicalRecord({ jobId, requestId, relationshipId }) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
    postId: requestId,
    requestId,
    relationshipId,
  };
}

export default function CanonicalJobEvaluation({
  record = {},
  customerConcern = "",
  setPage,
}) {
  const sourceContext = getCanonicalEvaluationSourceContext(record);
  const jobId = sourceContext?.jobId || "";
  const requestId = sourceContext?.requestId || null;
  const relationshipId = sourceContext?.relationshipId || null;
  const environmentEnabled = isCanonicalWorkCenterHydrationEnabled();
  const [loadState, setLoadState] = useState({
    status: "loading",
    evaluation: null,
    error: "",
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setNotice("");
    setEditing(false);

    if (!environmentEnabled || !jobId || !requestId) {
      Promise.resolve().then(() => {
        if (!active) return;
        setLoadState({
          status: "unavailable",
          evaluation: null,
          error: "Canonical Evaluation is unavailable for this Job.",
        });
      });
      return () => {
        active = false;
      };
    }

    const scopedRecord = canonicalRecord({
      jobId,
      requestId,
      relationshipId,
    });
    Promise.resolve().then(() => {
      if (!active) return;
      setLoadState({ status: "loading", evaluation: null, error: "" });
    });

    void loadCanonicalEvaluationForRecord({ record: scopedRecord, setPage })
      .then((evaluation) => {
        if (!active) return;
        setLoadState({ status: "ready", evaluation, error: "" });
        setForm(formForEvaluation(evaluation));
      })
      .catch((error) => {
        if (!active) return;
        setLoadState({
          status: "error",
          evaluation: null,
          error: evaluationErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [environmentEnabled, jobId, relationshipId, requestId, setPage]);

  const evaluation = loadState.evaluation;
  const isDraft = evaluation?.evaluation?.status === "draft";
  const canEdit = evaluation?.evaluation?.capabilities?.canEditDraft === true;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function beginEditing() {
    setNotice("");
    setForm(formForEvaluation(evaluation));
    setEditing(true);
  }

  function cancelEditing() {
    setNotice("");
    setForm(formForEvaluation(evaluation));
    setEditing(false);
  }

  async function saveEvaluation() {
    if (!form.observations.trim()) {
      setLoadState((current) => ({
        ...current,
        error: "Professional observations are required before saving.",
      }));
      return;
    }

    const scopedRecord = canonicalRecord({
      jobId,
      requestId,
      relationshipId,
    });
    setLoadState((current) => ({ ...current, status: "saving", error: "" }));
    setNotice("");
    try {
      const confirmed = await saveCanonicalEvaluationDraft({
        record: scopedRecord,
        form,
        currentEvaluation: evaluation,
        setPage,
      });
      setLoadState({ status: "ready", evaluation: confirmed, error: "" });
      setForm(formForEvaluation(confirmed));
      setEditing(false);
      setNotice(
        `Evaluation saved at canonical version ${confirmed.aggregate.version}.`
      );
    } catch (error) {
      setLoadState((current) => ({
        ...current,
        status: "ready",
        error: evaluationErrorMessage(error),
      }));
    }
  }

  return (
    <section style={styles.section} aria-labelledby="canonical-job-evaluation-title">
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Canonical professional authority</span>
          <h3 id="canonical-job-evaluation-title" style={styles.title}>
            Professional Evaluation
          </h3>
        </div>
        <span style={styles.statusBadge}>
          {loadState.status === "loading"
            ? "Loading"
            : loadState.status === "saving"
              ? "Saving"
              : evaluation
                ? evaluation.evaluation.status === "completed"
                  ? "Completed"
                  : "Draft"
                : "No Evaluation"}
        </span>
      </div>

      <div style={styles.concern} aria-label="Customer Concern read-only">
        <span style={styles.fieldLabel}>Customer Concern</span>
        <strong style={styles.readOnlyLabel}>Read-only customer truth</strong>
        <p style={styles.concernText}>{customerConcern || "Unavailable"}</p>
      </div>

      {loadState.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Evaluation.</p>
      )}

      {loadState.error && (
        <p role="alert" style={styles.error}>{loadState.error}</p>
      )}

      {notice && <p role="status" style={styles.success}>{notice}</p>}

      {loadState.status === "ready" && !evaluation && !editing && (
        <div style={styles.emptyState}>
          <p style={styles.message}>No canonical Evaluation has been saved for this Job.</p>
          <button type="button" style={styles.primaryButton} onClick={beginEditing}>
            Start Evaluation
          </button>
        </div>
      )}

      {evaluation && !editing && (
        <div style={styles.readView}>
          <div style={styles.metaRow}>
            <span>Version {evaluation.aggregate.version}</span>
            <span>
              Updated {new Date(evaluation.evaluation.updatedAt).toLocaleString()}
            </span>
          </div>
          <div style={styles.readField}>
            <span style={styles.fieldLabel}>Professional observations</span>
            <p style={styles.readText}>{evaluation.evaluation.content.observations || "None recorded."}</p>
          </div>
          {evaluation.evaluation.content.diagnosisSummary && (
            <div style={styles.readField}>
              <span style={styles.fieldLabel}>Assessment summary</span>
              <p style={styles.readText}>{evaluation.evaluation.content.diagnosisSummary}</p>
            </div>
          )}
          {evaluation.evaluation.content.limitations && (
            <div style={styles.readField}>
              <span style={styles.fieldLabel}>Limitations</span>
              <p style={styles.readText}>{evaluation.evaluation.content.limitations}</p>
            </div>
          )}
          {evaluation.evaluation.content.internalNotes && (
            <div style={styles.readField}>
              <span style={styles.fieldLabel}>Internal notes</span>
              <p style={styles.readText}>{evaluation.evaluation.content.internalNotes}</p>
            </div>
          )}
          {isDraft && canEdit && (
            <button type="button" style={styles.secondaryButton} onClick={beginEditing}>
              Edit Evaluation
            </button>
          )}
        </div>
      )}

      {editing && (
        <div style={styles.form}>
          <label style={styles.label}>
            Professional observations
            <textarea
              style={styles.textarea}
              value={form.observations}
              maxLength={5000}
              required
              onChange={(event) => updateField("observations", event.target.value)}
            />
          </label>
          <label style={styles.label}>
            Assessment summary
            <textarea
              style={styles.textarea}
              value={form.diagnosisSummary}
              maxLength={5000}
              onChange={(event) => updateField("diagnosisSummary", event.target.value)}
            />
          </label>
          <label style={styles.label}>
            Limitations
            <textarea
              style={styles.textarea}
              value={form.limitations}
              maxLength={5000}
              onChange={(event) => updateField("limitations", event.target.value)}
            />
          </label>
          <label style={styles.label}>
            Internal notes
            <textarea
              style={styles.textarea}
              value={form.internalNotes}
              maxLength={5000}
              onChange={(event) => updateField("internalNotes", event.target.value)}
            />
          </label>
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.primaryButton}
              disabled={loadState.status === "saving"}
              onClick={() => void saveEvaluation()}
            >
              {loadState.status === "saving" ? "Saving" : "Save Evaluation"}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              disabled={loadState.status === "saving"}
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 16,
    padding: 16,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#ffffff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  eyebrow: {
    display: "block",
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: { margin: "4px 0 0", fontSize: 20, letterSpacing: 0 },
  statusBadge: {
    padding: "6px 10px",
    border: "1px solid #94a3b8",
    borderRadius: 999,
    color: "#334155",
    background: "#f8fafc",
    fontSize: 12,
    fontWeight: 800,
  },
  concern: {
    display: "grid",
    gap: 5,
    padding: "12px 0",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
  },
  fieldLabel: { color: "#475569", fontSize: 12, fontWeight: 800 },
  readOnlyLabel: { color: "#166534", fontSize: 12 },
  concernText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  message: { margin: 0, color: "#475569", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: 10,
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
  },
  success: {
    margin: 0,
    padding: 10,
    borderLeft: "3px solid #15803d",
    color: "#166534",
    background: "#f0fdf4",
  },
  emptyState: { display: "grid", gap: 12, justifyItems: "start" },
  readView: { display: "grid", gap: 14 },
  metaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  readField: { display: "grid", gap: 5 },
  readText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  form: { display: "grid", gap: 14 },
  label: { display: "grid", gap: 6, color: "#334155", fontWeight: 700 },
  textarea: {
    width: "100%",
    minHeight: 96,
    boxSizing: "border-box",
    resize: "vertical",
    padding: 10,
    border: "1px solid #94a3b8",
    borderRadius: 6,
    color: "#0f172a",
    background: "#ffffff",
    font: "inherit",
    lineHeight: 1.45,
  },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  primaryButton: {
    minHeight: 42,
    padding: "9px 14px",
    border: "1px solid #1f5132",
    borderRadius: 6,
    color: "#ffffff",
    background: "#1f5132",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 42,
    padding: "9px 14px",
    border: "1px solid #94a3b8",
    borderRadius: 6,
    color: "#334155",
    background: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
