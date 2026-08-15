import { useEffect, useState } from "react";
import {
  createCanonicalRecommendation,
  createLifecycleCommandKey,
  updateCanonicalRecommendation,
} from "../utils/findingRecommendationApi.js";
import { loadCanonicalRecommendationsForFinding } from "../utils/findingRecommendationReadController.js";
import { getEfrCopy } from "../utils/efrLanguage.js";

function recommendationLabel(recommendation, copy) {
  return recommendation.kind === "ALTERNATIVE"
    ? copy.alternativeRecommendation
    : copy.primaryRecommendation;
}

function statusLabel(status, copy) {
  const labels = {
    ACTIVE: copy.active,
    ACCEPTED: copy.accepted,
    DECLINED: copy.declined,
    DEFERRED: copy.deferred,
    SUPERSEDED: copy.superseded,
    WITHDRAWN: copy.withdrawn,
    EXCLUDED_FROM_CURRENT_QUOTE: copy.excluded,
    SEPARATE_PROPOSAL_REQUIRED: copy.separateProposal,
  };
  return labels[status] || copy.unavailable;
}

function commandError(error, copy) {
  if (/STALE_/.test(String(error?.code || ""))) return copy.changedElsewhere;
  return error?.message || copy.recommendationsUnavailable;
}

export default function CanonicalRecommendationsPanel({
  finding,
  setPage,
  language = "en",
  canManage = false,
  canPrepareQuote = false,
  onPrepareQuote,
  onCanonicalChange,
}) {
  const copy = getEfrCopy(language);
  const findingId = finding?.id || "";
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    recommendations: [],
    error: "",
    notice: "",
  });
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    let active = true;
    if (!findingId) {
      queueMicrotask(() => {
        if (active) setState({ status: "unavailable", recommendations: [], error: "", notice: "" });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setState((current) => ({ ...current, status: "loading", error: "" }));
    });
    void loadCanonicalRecommendationsForFinding({ finding, setPage })
      .then((recommendations) => {
        if (active) {
          setState((current) => ({
            status: recommendations ? "ready" : "unavailable",
            recommendations: recommendations || [],
            error: "",
            notice: current.notice,
          }));
        }
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            recommendations: [],
            error: commandError(error, copy),
            notice: "",
          });
        }
      });
    return () => { active = false; };
  }, [copy, finding, findingId, refresh, setPage]);

  function openEditor(recommendation = null) {
    try {
      setEditor({
        mode: recommendation ? "update" : "create",
        recommendation,
        statement: recommendation?.statement || "",
        customerVisible: recommendation?.customerVisible === true,
        idempotencyKey: createLifecycleCommandKey(
          recommendation ? "recommendation-update" : "recommendation-create"
        ),
        saving: false,
      });
      setState((current) => ({ ...current, error: "", notice: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: commandError(error, copy) }));
    }
  }

  async function saveRecommendation() {
    if (!editor?.statement.trim()) return;
    setEditor((current) => ({ ...current, saving: true }));
    setState((current) => ({ ...current, error: "", notice: "" }));
    try {
      if (editor.mode === "update") {
        await updateCanonicalRecommendation({
          recommendationId: editor.recommendation.id,
          expectedVersion: editor.recommendation.currentVersion,
          statement: editor.statement.trim(),
          customerVisible: editor.customerVisible,
          idempotencyKey: editor.idempotencyKey,
          setPage,
        });
      } else {
        await createCanonicalRecommendation({
          findingId,
          statement: editor.statement.trim(),
          customerVisible: editor.customerVisible,
          idempotencyKey: editor.idempotencyKey,
          setPage,
        });
      }
      setEditor(null);
      setState((current) => ({ ...current, notice: copy.saveRecommendation }));
      onCanonicalChange?.();
      setRefresh((value) => value + 1);
    } catch (error) {
      setEditor((current) => ({ ...current, saving: false }));
      setState((current) => ({ ...current, error: commandError(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) setRefresh((value) => value + 1);
    }
  }

  const recommendations = state.recommendations;
  return (
    <section style={styles.section} aria-labelledby={`recommendations-${findingId}`}>
      <div style={styles.header}>
        <h5 id={`recommendations-${findingId}`} style={styles.title}>
          {copy.whatRecommend}
        </h5>
        {canManage && finding.confirmationState === "CONFIRMED" && !editor && (
          <button type="button" style={styles.secondaryButton} onClick={() => openEditor()}>
            {copy.addRecommendation}
          </button>
        )}
      </div>
      {state.status === "loading" && <p role="status" style={styles.message}>{copy.loadingRecommendations}</p>}
      {state.error && <p role="alert" style={styles.error}>{state.error}</p>}
      {state.notice && <p role="status" style={styles.success}>{state.notice}</p>}
      {state.status === "error" && (
        <button type="button" style={styles.secondaryButton} onClick={() => setRefresh((value) => value + 1)}>
          {copy.retry}
        </button>
      )}
      {state.status === "ready" && recommendations.length === 0 && !editor && (
        <p style={styles.message}>{copy.noRecommendations}</p>
      )}
      {editor && (
        <div style={styles.editor}>
          <label style={styles.label}>
            {copy.recommendationDetails}
            <textarea
              style={styles.textarea}
              maxLength={5000}
              value={editor.statement}
              onChange={(event) => setEditor((current) => ({ ...current, statement: event.target.value }))}
            />
          </label>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={editor.customerVisible}
              onChange={(event) => setEditor((current) => ({ ...current, customerVisible: event.target.checked }))}
            />
            {copy.shareWithCustomer}
          </label>
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.primaryButton}
              disabled={editor.saving || !editor.statement.trim()}
              onClick={() => void saveRecommendation()}
            >
              {editor.saving ? copy.saving : copy.saveRecommendation}
            </button>
            <button type="button" style={styles.secondaryButton} disabled={editor.saving} onClick={() => setEditor(null)}>
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
      {recommendations.length > 0 && (
        <div style={styles.list}>
          {recommendations.map((recommendation) => (
            <article key={recommendation.id} style={styles.recommendation}>
              <div style={styles.metaRow}>
                <strong>{recommendationLabel(recommendation, copy)}</strong>
                <span style={styles.state}>{statusLabel(recommendation.status, copy)}</span>
              </div>
              <p style={styles.statement}>{recommendation.statement}</p>
              <span style={styles.visibility}>
                {recommendation.customerVisible ? copy.sharedWithCustomer : copy.professionalOnly}
              </span>
              {recommendation.constraints.length > 0 && (
                <div style={styles.constraints}>
                  <strong>{copy.customerConstraint}</strong>
                  {recommendation.constraints.map((constraint) => (
                    <p key={constraint.id} style={styles.statement}>{constraint.statement}</p>
                  ))}
                  <span style={styles.notApproval}>{copy.notApproval}</span>
                </div>
              )}
              {canManage && recommendation.status === "ACTIVE" && !editor && (
                <button type="button" style={styles.secondaryButton} onClick={() => openEditor(recommendation)}>
                  {copy.update}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {canPrepareQuote && recommendations.length > 0 && typeof onPrepareQuote === "function" && (
        <button type="button" style={styles.primaryButton} onClick={onPrepareQuote}>
          {copy.prepareQuote}
        </button>
      )}
    </section>
  );
}

const button = {
  minHeight: 44,
  padding: "9px 14px",
  borderRadius: 6,
  fontWeight: 800,
  cursor: "pointer",
};

const styles = {
  section: { display: "grid", gap: 12, paddingTop: 14, borderTop: "1px solid #e2e8f0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { margin: 0, color: "#334155", fontSize: 16, letterSpacing: 0 },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: { margin: 0, color: "#991b1b", lineHeight: 1.5 },
  success: { margin: 0, color: "#166534", lineHeight: 1.5 },
  list: { display: "grid", gap: 12 },
  recommendation: { display: "grid", gap: 8, paddingLeft: 12, borderLeft: "3px solid #1f5132", minWidth: 0 },
  metaRow: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  state: { color: "#1f5132", fontSize: 12, fontWeight: 800 },
  visibility: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  statement: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  constraints: { display: "grid", gap: 5, paddingTop: 8, borderTop: "1px solid #e2e8f0" },
  notApproval: { color: "#7c2d12", fontSize: 12, fontWeight: 800 },
  editor: { display: "grid", gap: 12, padding: 12, border: "1px solid #cbd5e1", borderRadius: 8 },
  label: { display: "grid", gap: 6, color: "#334155", fontWeight: 700 },
  textarea: { width: "100%", minHeight: 96, boxSizing: "border-box", padding: 10, border: "1px solid #94a3b8", borderRadius: 6, font: "inherit", resize: "vertical" },
  checkLabel: { display: "flex", alignItems: "center", gap: 9, minHeight: 44, lineHeight: 1.4 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  primaryButton: { ...button, border: "1px solid #1f5132", color: "#ffffff", background: "#1f5132" },
  secondaryButton: { ...button, border: "1px solid #94a3b8", color: "#334155", background: "#ffffff" },
};
