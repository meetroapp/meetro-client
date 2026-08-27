import { useEffect, useRef, useState } from "react";
import {
  confirmCanonicalFinding,
  createLifecycleCommandKey,
  submitCanonicalFinding,
  updateCanonicalFinding,
} from "../utils/findingRecommendationApi.js";
import { loadCanonicalFindingsForEvaluation } from "../utils/findingRecommendationReadController.js";
import { getEfrCopy } from "../utils/efrLanguage.js";
import { getNewFindingDraftText } from "../utils/evaluationDraftProgression.js";
import CanonicalRecommendationsPanel from "./CanonicalRecommendationsPanel.jsx";

function findingState(finding, copy) {
  if (finding.resolutionState === "RESOLVED") return copy.resolved;
  if (finding.resolutionState === "PARTIALLY_RESOLVED") return copy.partiallyResolved;
  if (finding.resolutionState === "DEFERRED") return copy.deferred;
  return copy.needsAttention;
}

function commandError(error, copy) {
  if (/STALE_/.test(String(error?.code || ""))) return copy.changedElsewhere;
  return error?.message || copy.findingsUnavailable;
}

export default function CanonicalFindingsPanel({
  enabled = false,
  evaluation,
  setPage,
  language = "en",
  availableActions = [],
  onPrepareQuote,
  onCanonicalChange,
  assistantFindingDraft = null,
  assistantRecommendationDraft = null,
  onAssistantFindingDraftConsumed,
  onAssistantRecommendationDraftConsumed,
  onAssistantFindingReview,
  onAssistantRecommendationReview,
}) {
  const copy = getEfrCopy(language);
  const evaluationId = evaluation?.evaluation?.id || "";
  const actionCodes = new Set(availableActions.map((action) => String(action?.code || "")));
  const canReviewFindings = actionCodes.has("REVIEW_FINDINGS");
  const canReviewRecommendations = actionCodes.has("REVIEW_RECOMMENDATIONS");
  const canPrepareQuote = actionCodes.has("CREATE_QUOTE");
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    findings: [],
    error: "",
    notice: "",
  });
  const [editor, setEditor] = useState(null);
  const confirmKeys = useRef(new Map());

  useEffect(() => {
    let active = true;
    if (!enabled || !evaluationId) {
      queueMicrotask(() => {
        if (active) setState({ status: "unavailable", findings: [], error: "", notice: "" });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setState((current) => ({ ...current, status: "loading", error: "" }));
    });
    void loadCanonicalFindingsForEvaluation({ evaluation, setPage })
      .then((findings) => {
        if (active) {
          setState((current) => ({
            status: findings ? "ready" : "unavailable",
            findings: findings || [],
            error: "",
            notice: current.notice,
          }));
        }
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            findings: [],
            error: commandError(error, copy),
            notice: "",
          });
        }
      });
    return () => { active = false; };
  }, [copy, enabled, evaluation, evaluationId, refresh, setPage]);

  if (!enabled || !evaluationId) return null;

  function openEditor(finding = null, initialStatement = "", assistantDraft = null) {
    try {
      const statement = finding?.statement || getNewFindingDraftText({
        evaluation,
        existingFindings: state.findings,
        currentDraft: editor?.statement ?? null,
        explicitDraft: initialStatement,
      });
      setEditor({
        mode: finding ? "update" : "create",
        finding,
        statement,
        customerVisible: finding?.customerVisible === true,
        idempotencyKey: createLifecycleCommandKey(
          finding ? "finding-update" : "finding-create"
        ),
        assistantDraft: finding ? null : assistantDraft,
        saving: false,
      });
      setState((current) => ({ ...current, error: "", notice: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: commandError(error, copy) }));
    }
  }

  async function saveFinding() {
    if (!editor?.statement.trim()) return;
    setEditor((current) => ({ ...current, saving: true }));
    setState((current) => ({ ...current, error: "", notice: "" }));
    try {
      if (editor.assistantDraft) {
        const action = editor.statement.trim() === editor.assistantDraft.text ? "ACCEPTED" : "EDITED";
        const reviewed = await onAssistantFindingReview?.(
          editor.assistantDraft,
          action,
          action === "EDITED" ? editor.statement.trim() : undefined
        );
        if (reviewed === false) {
          setEditor((current) => ({ ...current, saving: false }));
          return;
        }
      }
      if (editor.mode === "update") {
        await updateCanonicalFinding({
          findingId: editor.finding.id,
          expectedVersion: editor.finding.currentVersion,
          statement: editor.statement.trim(),
          customerVisible: editor.customerVisible,
          idempotencyKey: editor.idempotencyKey,
          setPage,
        });
      } else {
        await submitCanonicalFinding({
          evaluationId,
          statement: editor.statement.trim(),
          customerVisible: editor.customerVisible,
          idempotencyKey: editor.idempotencyKey,
          setPage,
        });
      }
      setEditor(null);
      setState((current) => ({ ...current, notice: copy.saveFinding }));
      onCanonicalChange?.();
      setRefresh((value) => value + 1);
    } catch (error) {
      setEditor((current) => ({ ...current, saving: false }));
      setState((current) => ({ ...current, error: commandError(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) setRefresh((value) => value + 1);
    }
  }

  async function confirmFinding(finding) {
    let key = confirmKeys.current.get(finding.id);
    try {
      key ||= createLifecycleCommandKey("finding-confirm");
      confirmKeys.current.set(finding.id, key);
      setState((current) => ({ ...current, status: "saving", error: "", notice: "" }));
      await confirmCanonicalFinding({
        findingId: finding.id,
        expectedVersion: finding.currentVersion,
        idempotencyKey: key,
        setPage,
      });
      confirmKeys.current.delete(finding.id);
      setState((current) => ({ ...current, notice: copy.confirmed }));
      onCanonicalChange?.();
      setRefresh((value) => value + 1);
    } catch (error) {
      setState((current) => ({ ...current, status: "ready", error: commandError(error, copy) }));
      if (/STALE_/.test(String(error?.code || ""))) {
        confirmKeys.current.delete(finding.id);
        setRefresh((value) => value + 1);
      }
    }
  }

  return (
    <section style={styles.section} aria-labelledby="canonical-findings-title">
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>{copy.assessment}</span>
          <h3 id="canonical-findings-title" style={styles.title}>{copy.whatFound}</h3>
        </div>
        {canReviewFindings && !editor && (
          <button type="button" style={styles.primaryButton} onClick={() => openEditor()}>
            {copy.addFinding}
          </button>
        )}
      </div>
      {state.status === "loading" && <p role="status" style={styles.message}>{copy.loadingFindings}</p>}
      {state.error && <p role="alert" style={styles.error}>{state.error}</p>}
      {state.notice && <p role="status" style={styles.success}>{state.notice}</p>}
      {state.status === "error" && (
        <button type="button" style={styles.secondaryButton} onClick={() => setRefresh((value) => value + 1)}>
          {copy.retry}
        </button>
      )}
      {state.status === "ready" && state.findings.length === 0 && !editor && (
        <p style={styles.message}>{copy.noFindings}</p>
      )}
      {assistantFindingDraft && canReviewFindings && !editor && (
        <div style={styles.editor} data-assistant-finding-draft={assistantFindingDraft.id}>
          <p style={styles.statement}>{assistantFindingDraft.text}</p>
          <button type="button" style={styles.primaryButton} onClick={() => {
            openEditor(null, assistantFindingDraft.text, assistantFindingDraft);
            onAssistantFindingDraftConsumed?.();
          }}>{copy.addFinding}</button>
        </div>
      )}
      {editor && (
        <div style={styles.editor}>
          <label style={styles.label}>
            {copy.findingDetails}
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
              onClick={() => void saveFinding()}
            >
              {editor.saving ? copy.saving : copy.saveFinding}
            </button>
            <button type="button" style={styles.secondaryButton} disabled={editor.saving} onClick={() => setEditor(null)}>
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
      {state.findings.length > 0 && (
        <div style={styles.findingsList}>
          {state.findings.map((finding, index) => (
            <article key={finding.id} style={styles.finding}>
              <div style={styles.findingHeader}>
                <h4 style={styles.findingTitle}>{copy.finding} {index + 1}</h4>
                <div style={styles.stateRow}>
                  <span style={styles.state}>{findingState(finding, copy)}</span>
                  <span style={styles.secondaryState}>
                    {finding.confirmationState === "CONFIRMED" ? copy.confirmed : copy.proposed}
                  </span>
                </div>
              </div>
              <p style={styles.statement}>{finding.statement}</p>
              <span style={styles.visibility}>
                {finding.customerVisible ? copy.sharedWithCustomer : copy.professionalOnly}
              </span>
              {canReviewFindings && finding.confirmationState === "PROPOSED" && !editor && (
                <div style={styles.actions}>
                  <button type="button" style={styles.secondaryButton} onClick={() => openEditor(finding)}>
                    {copy.update}
                  </button>
                  <button type="button" style={styles.primaryButton} onClick={() => void confirmFinding(finding)}>
                    {copy.confirmFinding}
                  </button>
                </div>
              )}
              <CanonicalRecommendationsPanel
                finding={finding}
                evaluationDiagnosisSummary={
                  evaluation?.evaluation?.content?.diagnosisSummary || ""
                }
                setPage={setPage}
                language={language}
                canManage={canReviewRecommendations}
                canPrepareQuote={canPrepareQuote}
                onPrepareQuote={onPrepareQuote}
                onCanonicalChange={onCanonicalChange}
                assistantDraft={
                  assistantRecommendationDraft &&
                  state.findings.filter((candidate) => candidate.confirmationState === "CONFIRMED").length === 1 &&
                  finding.confirmationState === "CONFIRMED"
                    ? assistantRecommendationDraft
                    : null
                }
                onAssistantDraftConsumed={onAssistantRecommendationDraftConsumed}
                onAssistantDraftReview={onAssistantRecommendationReview}
              />
            </article>
          ))}
        </div>
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
  section: { display: "grid", gap: 16, padding: "18px 0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: "4px 0 0", fontSize: 20, letterSpacing: 0 },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: { margin: 0, color: "#991b1b", lineHeight: 1.5 },
  success: { margin: 0, color: "#166534", lineHeight: 1.5 },
  findingsList: { display: "grid", gap: 18 },
  finding: { display: "grid", gap: 10, minWidth: 0, paddingBottom: 18, borderBottom: "1px solid #e2e8f0" },
  findingHeader: { display: "grid", gap: 7 },
  findingTitle: { margin: 0, fontSize: 16, letterSpacing: 0 },
  stateRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  state: { color: "#7c2d12", fontSize: 12, fontWeight: 800 },
  secondaryState: { color: "#1f5132", fontSize: 12, fontWeight: 800 },
  visibility: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  statement: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  editor: { display: "grid", gap: 12, padding: 12, border: "1px solid #cbd5e1", borderRadius: 8 },
  label: { display: "grid", gap: 6, color: "#334155", fontWeight: 700 },
  textarea: { width: "100%", minHeight: 96, boxSizing: "border-box", padding: 10, border: "1px solid #94a3b8", borderRadius: 6, font: "inherit", resize: "vertical" },
  checkLabel: { display: "flex", alignItems: "center", gap: 9, minHeight: 44, lineHeight: 1.4 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  primaryButton: { ...button, border: "1px solid #1f5132", color: "#ffffff", background: "#1f5132" },
  secondaryButton: { ...button, border: "1px solid #94a3b8", color: "#334155", background: "#ffffff" },
};
