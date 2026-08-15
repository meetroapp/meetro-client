import { useEffect, useState } from "react";
import {
  getCanonicalEvaluationSourceContext,
  ordinaryCanonicalEvaluationContentToForm,
} from "../utils/canonicalEvaluation.js";
import {
  completeCanonicalEvaluationDraft,
  loadCanonicalEvaluationForRecord,
  saveCanonicalEvaluationDraft,
} from "../utils/evaluationAuthorityController.js";
import { getEfrCopy } from "../utils/efrLanguage.js";
import { isCanonicalWorkCenterHydrationEnabled } from "../utils/workCenterCanonicalHydration.js";
import CanonicalFindingsPanel from "./CanonicalFindingsPanel.jsx";

const EMPTY_FORM = Object.freeze({
  observations: "",
  diagnosisSummary: "",
  limitations: "",
  internalNotes: "",
});

function formForEvaluation(evaluation) {
  return ordinaryCanonicalEvaluationContentToForm(evaluation) || { ...EMPTY_FORM };
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

function errorMessage(error, copy) {
  if (/STALE_/.test(String(error?.code || ""))) return copy.changedElsewhere;
  if (error?.code === "EVALUATION_COMPLETED") return copy.completed;
  return error?.message || copy.evaluationUnavailable;
}

export default function CanonicalJobEvaluation({
  record = {},
  customerConcern = "",
  availableActions = [],
  language = "en",
  setPage,
  onCanonicalChange,
  onPrepareQuote,
}) {
  const copy = getEfrCopy(language);
  const sourceContext = getCanonicalEvaluationSourceContext(record);
  const jobId = sourceContext?.jobId || "";
  const requestId = sourceContext?.requestId || null;
  const relationshipId = sourceContext?.relationshipId || null;
  const environmentEnabled = isCanonicalWorkCenterHydrationEnabled();
  const [refresh, setRefresh] = useState(0);
  const [loadState, setLoadState] = useState({
    status: "loading",
    evaluation: null,
    error: "",
    notice: "",
  });
  const [editing, setEditing] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    let active = true;
    setEditing(false);
    setConfirmingCompletion(false);
    if (!environmentEnabled || !jobId || !requestId) {
      queueMicrotask(() => {
        if (active) {
          setLoadState({ status: "unavailable", evaluation: null, error: copy.evaluationUnavailable, notice: "" });
        }
      });
      return () => { active = false; };
    }
    const scopedRecord = canonicalRecord({ jobId, requestId, relationshipId });
    queueMicrotask(() => {
      if (active) setLoadState((current) => ({ ...current, status: "loading", error: "" }));
    });
    void loadCanonicalEvaluationForRecord({ record: scopedRecord, setPage })
      .then((evaluation) => {
        if (!active) return;
        setLoadState({ status: "ready", evaluation, error: "", notice: "" });
        setForm(formForEvaluation(evaluation));
      })
      .catch((error) => {
        if (active) {
          setLoadState({ status: "error", evaluation: null, error: errorMessage(error, copy), notice: "" });
        }
      });
    return () => { active = false; };
  }, [copy, environmentEnabled, jobId, relationshipId, refresh, requestId, setPage]);

  const evaluation = loadState.evaluation;
  const actionCodes = new Set(availableActions.map((action) => String(action?.code || "")));
  const canStart = actionCodes.has("START_EVALUATION");
  const canEdit = actionCodes.has("EDIT_EVALUATION") && evaluation?.evaluation?.capabilities?.canEditDraft === true;
  const canComplete = actionCodes.has("COMPLETE_EVALUATION") && evaluation?.evaluation?.capabilities?.canComplete === true;
  const editingAllowed = evaluation ? canEdit : canStart;

  function beginEditing() {
    setLoadState((current) => ({ ...current, error: "", notice: "" }));
    setForm(formForEvaluation(evaluation));
    setEditing(true);
  }

  async function saveEvaluation() {
    if (!editingAllowed) {
      setLoadState((current) => ({ ...current, error: copy.updateUnavailable }));
      return;
    }
    if (!form.observations.trim()) {
      setLoadState((current) => ({ ...current, error: copy.observationsRequired }));
      return;
    }
    setLoadState((current) => ({ ...current, status: "saving", error: "", notice: "" }));
    try {
      const confirmed = await saveCanonicalEvaluationDraft({
        record: canonicalRecord({ jobId, requestId, relationshipId }),
        form,
        currentEvaluation: evaluation,
        setPage,
      });
      setLoadState({ status: "ready", evaluation: confirmed, error: "", notice: copy.evaluationSaved });
      setForm(formForEvaluation(confirmed));
      setEditing(false);
      onCanonicalChange?.();
    } catch (error) {
      setLoadState((current) => ({ ...current, status: "ready", error: errorMessage(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) setRefresh((value) => value + 1);
    }
  }

  async function completeEvaluation() {
    if (!canComplete || !evaluation) return;
    setLoadState((current) => ({ ...current, status: "completing", error: "", notice: "" }));
    try {
      const completed = await completeCanonicalEvaluationDraft({
        record: canonicalRecord({ jobId, requestId, relationshipId }),
        form: formForEvaluation(evaluation),
        currentEvaluation: evaluation,
        setPage,
      });
      setLoadState({ status: "ready", evaluation: completed, error: "", notice: copy.evaluationCompleted });
      setForm(formForEvaluation(completed));
      setConfirmingCompletion(false);
      onCanonicalChange?.();
    } catch (error) {
      setLoadState((current) => ({ ...current, status: "ready", error: errorMessage(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) setRefresh((value) => value + 1);
    }
  }

  const statusLabel = loadState.status === "loading"
    ? copy.loading
    : loadState.status === "saving"
      ? copy.saving
      : loadState.status === "completing"
        ? copy.completing
        : evaluation
          ? evaluation.evaluation.status === "completed" ? copy.completed : copy.draft
          : copy.noEvaluation;

  return (
    <>
      <section style={styles.section} aria-labelledby="canonical-job-evaluation-title">
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>{copy.assessment}</span>
            <h3 id="canonical-job-evaluation-title" style={styles.title}>{copy.evaluation}</h3>
          </div>
          <span style={styles.statusBadge}>{statusLabel}</span>
        </div>
        <div style={styles.concern}>
          <span style={styles.fieldLabel}>{copy.customerConcern}</span>
          <strong style={styles.readOnlyLabel}>{copy.customerDetails}</strong>
          <p style={styles.readText}>{customerConcern || copy.unavailable}</p>
        </div>
        {loadState.status === "loading" && <p role="status" style={styles.message}>{copy.loadingEvaluation}</p>}
        {loadState.error && <p role="alert" style={styles.error}>{loadState.error}</p>}
        {loadState.notice && <p role="status" style={styles.success}>{loadState.notice}</p>}
        {loadState.status === "error" && (
          <button type="button" style={styles.secondaryButton} onClick={() => setRefresh((value) => value + 1)}>
            {copy.retry}
          </button>
        )}
        {loadState.status === "ready" && !evaluation && !editing && (
          <div style={styles.emptyState}>
            <p style={styles.message}>{copy.noEvaluationBody}</p>
            {canStart && <button type="button" style={styles.primaryButton} onClick={beginEditing}>{copy.startEvaluation}</button>}
          </div>
        )}
        {evaluation && !editing && (
          <div style={styles.readView}>
            <div style={styles.readField}>
              <span style={styles.fieldLabel}>{copy.observations}</span>
              <p style={styles.readText}>{evaluation.evaluation.content.observations || copy.noneRecorded}</p>
            </div>
            {evaluation.evaluation.content.diagnosisSummary && (
              <div style={styles.readField}><span style={styles.fieldLabel}>{copy.assessmentSummary}</span><p style={styles.readText}>{evaluation.evaluation.content.diagnosisSummary}</p></div>
            )}
            {evaluation.evaluation.content.limitations && (
              <div style={styles.readField}><span style={styles.fieldLabel}>{copy.limitations}</span><p style={styles.readText}>{evaluation.evaluation.content.limitations}</p></div>
            )}
            {evaluation.evaluation.content.internalNotes && (
              <div style={styles.readField}><span style={styles.fieldLabel}>{copy.internalNotes}</span><p style={styles.readText}>{evaluation.evaluation.content.internalNotes}</p></div>
            )}
            <div style={styles.actions}>
              {canEdit && <button type="button" style={styles.secondaryButton} onClick={beginEditing}>{copy.editEvaluation}</button>}
              {canComplete && !confirmingCompletion && (
                <button type="button" style={styles.primaryButton} onClick={() => setConfirmingCompletion(true)}>{copy.completeEvaluation}</button>
              )}
            </div>
            {confirmingCompletion && (
              <div style={styles.confirmation}>
                <strong>{copy.confirmCompletion}</strong>
                <p style={styles.message}>{copy.completionHelp}</p>
                <div style={styles.actions}>
                  <button type="button" style={styles.primaryButton} onClick={() => void completeEvaluation()}>{copy.completeEvaluation}</button>
                  <button type="button" style={styles.secondaryButton} onClick={() => setConfirmingCompletion(false)}>{copy.keepEditing}</button>
                </div>
              </div>
            )}
          </div>
        )}
        {editing && editingAllowed && (
          <div style={styles.form}>
            {[
              ["observations", copy.observations, true],
              ["diagnosisSummary", copy.assessmentSummary, false],
              ["limitations", copy.limitations, false],
              ["internalNotes", copy.internalNotes, false],
            ].map(([field, label, required]) => (
              <label key={field} style={styles.label}>
                {label}
                <textarea
                  style={styles.textarea}
                  value={form[field]}
                  maxLength={5000}
                  required={required}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                />
              </label>
            ))}
            <div style={styles.actions}>
              <button type="button" style={styles.primaryButton} disabled={loadState.status === "saving"} onClick={() => void saveEvaluation()}>
                {loadState.status === "saving" ? copy.saving : copy.saveEvaluation}
              </button>
              <button type="button" style={styles.secondaryButton} disabled={loadState.status === "saving"} onClick={() => setEditing(false)}>{copy.cancel}</button>
            </div>
          </div>
        )}
      </section>
      <CanonicalFindingsPanel
        enabled={environmentEnabled && sourceContext?.type === "ordinary_job"}
        evaluation={evaluation}
        setPage={setPage}
        language={language}
        availableActions={availableActions}
        onCanonicalChange={onCanonicalChange}
        onPrepareQuote={onPrepareQuote}
      />
    </>
  );
}

const button = { minHeight: 44, padding: "9px 14px", borderRadius: 6, fontWeight: 800, cursor: "pointer" };
const styles = {
  section: { display: "grid", gap: 16, padding: 16, border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "4px 0 0", fontSize: 20, letterSpacing: 0 },
  statusBadge: { padding: "6px 10px", border: "1px solid #94a3b8", borderRadius: 999, color: "#334155", background: "#f8fafc", fontSize: 12, fontWeight: 800 },
  concern: { display: "grid", gap: 5, padding: "12px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
  fieldLabel: { color: "#475569", fontSize: 12, fontWeight: 800 },
  readOnlyLabel: { color: "#166534", fontSize: 12 },
  message: { margin: 0, color: "#475569", lineHeight: 1.5 },
  error: { margin: 0, padding: 10, borderLeft: "3px solid #b91c1c", color: "#991b1b", background: "#fef2f2" },
  success: { margin: 0, padding: 10, borderLeft: "3px solid #15803d", color: "#166534", background: "#f0fdf4" },
  emptyState: { display: "grid", gap: 12, justifyItems: "start" },
  readView: { display: "grid", gap: 14 },
  readField: { display: "grid", gap: 5 },
  readText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  form: { display: "grid", gap: 14 },
  label: { display: "grid", gap: 6, color: "#334155", fontWeight: 700 },
  textarea: { width: "100%", minHeight: 96, boxSizing: "border-box", resize: "vertical", padding: 10, border: "1px solid #94a3b8", borderRadius: 6, color: "#0f172a", background: "#ffffff", font: "inherit", lineHeight: 1.45 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  confirmation: { display: "grid", gap: 10, padding: 12, border: "1px solid #d97706", borderRadius: 8, background: "#fffbeb" },
  primaryButton: { ...button, border: "1px solid #1f5132", color: "#ffffff", background: "#1f5132" },
  secondaryButton: { ...button, border: "1px solid #94a3b8", color: "#334155", background: "#ffffff" },
};
