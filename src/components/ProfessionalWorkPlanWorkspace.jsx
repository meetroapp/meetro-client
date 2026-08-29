import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeApprovedWork,
  completeWorkFailureMessage,
  createApprovedWorkCompletionIdempotencyKey,
  fetchCompletableApprovedWorkExecution,
} from "../utils/approvedWorkExecutionApi.js";
import { fetchProfessionalJobWorkPlan } from "../utils/workPlanApi.js";
import { fetchWorkPreparation } from "../utils/workPreparationApi.js";
import { loadCanonicalQuoteDetail, loadCanonicalQuotesForRecord } from "../utils/quoteReadController.js";
import { loadCanonicalVisitWorkspace } from "../utils/canonicalVisitController.js";
import {
  WORK_LEVEL_AUTHORITY_GAPS,
  buildApprovedWorkProjection,
  buildExecutionSafeViewModel,
  buildReadinessProjection,
  deriveWorkExecutionMode,
  selectApprovedQuote,
} from "../utils/workCenterLifecycleUx.js";
import CanonicalJobVisits from "./CanonicalJobVisits.jsx";
import CompactWorkPlanPreparation from "./CompactWorkPlanPreparation.jsx";
import MeetroIcon from "./MeetroIcon.jsx";

function readable(value) {
  return String(value || "Unavailable").toLowerCase().split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function dateLabel(value, language) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(language || "en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch { return ""; }
}

function scheduleLabel(visit, language) {
  if (!visit?.scheduledStartAt) return "Schedule unavailable";
  try {
    const start = new Date(visit.scheduledStartAt);
    const end = visit.scheduledEndAt ? new Date(visit.scheduledEndAt) : null;
    const date = new Intl.DateTimeFormat(language || "en", { month: "short", day: "numeric" }).format(start);
    const time = new Intl.DateTimeFormat(language || "en", { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time.format(start)}${end ? `–${time.format(end)}` : ""}`;
  } catch { return "Schedule unavailable"; }
}

function assignedName(record) {
  return [record.assignedProfessionalName, record.professionalName, record.providerName, record.businessName]
    .find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function Status({ children, tone = "neutral" }) {
  return <span style={{ ...styles.status, ...styles[`${tone}Status`] }}>{children}</span>;
}

function CompactArea({ title, summary, children, id, icon = "workCenter", emphasis = "standard" }) {
  return (
    <section id={id} className={`work-plan-compact-area work-plan-compact-area--${emphasis}`} style={styles.area} aria-labelledby={`${id}-title`}>
      <header className="work-plan-compact-area__header" style={styles.areaHeader}>
        <span className="work-plan-compact-area__icon" aria-hidden="true"><MeetroIcon name={icon} size={22} decorative /></span>
        <span style={styles.areaHeadingCopy}><h3 id={`${id}-title`} style={styles.areaTitle}>{title}</h3><p style={styles.areaSummary}>{summary}</p></span>
      </header>
      <div className="work-plan-compact-area__body" style={styles.areaBody}>{children}</div>
    </section>
  );
}

function ReadinessCheck({ complete, label }) {
  return <div style={{ ...styles.readinessCheck, ...(complete ? styles.readinessCheckComplete : {}) }}><span aria-hidden="true" style={styles.checkIcon}>{complete ? "✓" : "○"}</span><span>{label}</span></div>;
}

function CompactSchedule({ visits, record, language, canonicalRecord, setPage }) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const visit = [...visits].filter((item) => item.state !== "CANCELLED")
    .sort((left, right) => Date.parse(left.scheduledStartAt || 0) - Date.parse(right.scheduledStartAt || 0))[0];
  const professional = assignedName(record);
  return (
    <div style={styles.scheduleSection}>
      {visit ? <div style={styles.scheduleRow} data-work-schedule-state={visit.state}>
        <div style={styles.scheduleCopy}><strong>{scheduleLabel(visit, language)}</strong><span>{[professional && `Assigned to ${professional}`, visit.locationMode === "REMOTE" ? "Remote" : "At the job address"].filter(Boolean).join(" · ")}</span></div>
        <Status tone={["SCHEDULED", "STARTED", "COMPLETED"].includes(visit.state) ? "success" : "neutral"}>{visit.state === "SCHEDULED" ? "Confirmed" : readable(visit.state)}</Status>
      </div> : <p style={styles.muted}>No work visit is scheduled yet.</p>}
      <button type="button" style={styles.secondaryButton} aria-expanded={controlsOpen} aria-controls="work-plan-schedule-controls" onClick={() => setControlsOpen((current) => !current)}>{controlsOpen ? "Hide schedule options" : "View or edit schedule"}</button>
      {controlsOpen && <div id="work-plan-schedule-controls" style={styles.scheduleControls}><CanonicalJobVisits record={canonicalRecord} setPage={setPage} purposeFilter="APPROVED_WORK" showDeposit={false} embedded /></div>}
    </div>
  );
}

export function PreWorkPlanPresentation({ approvedWork, preparation, approvedVisits, readiness, record = {}, language = "en", canonicalRecord = {}, jobId, setPage, onCanonicalChange, preparationInitialOpen = "", showManageControls = true }) {
  return <div style={styles.preWork} data-work-plan-review-state={preparationInitialOpen || "collapsed"}>
    <CompactArea id="approved-work" title="Approved Work" summary="What the customer approved." icon="workCenter" emphasis="primary">
      {!approvedWork?.scope.length ? <p style={styles.muted}>No approved Quote scope is available for this Job.</p> : <ul style={styles.scopeList}>{approvedWork.scope.map((item) => <li key={item.scopeItemId} style={styles.scopeItem} data-approved-scope-item-id={item.scopeItemId}><strong>{item.description}</strong>{item.quantity != null && <span>Qty {item.quantity} · Approved by customer</span>}</li>)}</ul>}
      {approvedWork && <details style={styles.supportingDetails}><summary>View approved scope details</summary><code>{approvedWork.quoteId}</code><span>Approved Quote version {approvedWork.approvedVersion}</span></details>}
    </CompactArea>
    <CompactArea id="materials-preparation" title="Materials & Preparation" summary="What you need before you start." icon="materials"><CompactWorkPlanPreparation preparation={preparation} jobId={jobId} language={language} setPage={setPage} onCanonicalChange={onCanonicalChange} initialOpen={preparationInitialOpen} showManageControls={showManageControls} /></CompactArea>
    <CompactArea id="work-schedule" title="Work Schedule" summary="When the work is planned." icon="schedule"><CompactSchedule visits={approvedVisits} record={record} language={language} canonicalRecord={canonicalRecord} setPage={setPage} /></CompactArea>
    <CompactArea id="work-readiness" title="Ready to Start" summary="Everything is in place." icon="completion">
      <div style={styles.readinessGrid}><ReadinessCheck complete={readiness.approvedScope} label="Customer approved" /><ReadinessCheck complete={readiness.depositSatisfied} label="Deposit received" /><ReadinessCheck complete={readiness.preparationReady} label="Materials ready" /><ReadinessCheck complete={readiness.scheduled} label="Work scheduled" /></div>
      <div style={readiness.readyToStart ? styles.readyNotice : styles.waitingNotice} role="status" data-work-authority-gap={WORK_LEVEL_AUTHORITY_GAPS[0]}><strong>{readiness.readyToStart ? "Start Work is temporarily unavailable." : "A few things still need attention"}</strong><span>{readiness.readyToStart ? "Everything is in place." : "Complete the unchecked items before starting this job."}</span></div>
    </CompactArea>
  </div>;
}

export default function ProfessionalWorkPlanWorkspace({ jobId, record = {}, preferredQuoteId = "", liveJob = null, language = "en", setPage, onCanonicalChange }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", plan: null, quote: null, preparation: null, schedule: null, execution: null, errors: [] });
  const [completion, setCompletion] = useState(null);
  const [completionAttempt, setCompletionAttempt] = useState(null);
  const completionInFlight = useRef(false);
  const requestId = Number(record.requestId || record.postId) || null;
  const relationshipId = Number(record.relationshipId) || null;
  const canonicalRecord = useMemo(() => ({ source: "CANONICAL_BACKEND_READ", readOnly: true, lifecycleVerified: true, lifecycleContractVersion: 2, jobId, requestId, postId: requestId, relationshipId }), [jobId, relationshipId, requestId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setState({ status: "loading", plan: null, quote: null, preparation: null, schedule: null, execution: null, errors: [] }); });
    const planRead = fetchProfessionalJobWorkPlan({ jobId, setPage });
    const preparationRead = fetchWorkPreparation({ jobId, setPage });
    const scheduleRead = loadCanonicalVisitWorkspace({ record: canonicalRecord, setPage });
    const executionRead = fetchCompletableApprovedWorkExecution({ jobId, setPage });
    const quoteRead = loadCanonicalQuotesForRecord({ record: canonicalRecord, setPage }).then(async (quotes) => {
      const selected = selectApprovedQuote(quotes, preferredQuoteId);
      return selected ? loadCanonicalQuoteDetail({ record: canonicalRecord, quote: selected, setPage }) : null;
    });
    void Promise.allSettled([planRead, quoteRead, preparationRead, scheduleRead, executionRead]).then((results) => {
      if (!active) return;
      const [planResult, quoteResult, preparationResult, scheduleResult, executionResult] = results;
      const errors = results.map((result) => result.status === "rejected" ? String(result.reason?.code || result.reason?.message || "READ_FAILED") : "").filter(Boolean);
      setState({
        status: planResult.status === "fulfilled" ? "ready" : "error",
        plan: planResult.status === "fulfilled" ? planResult.value : null,
        quote: quoteResult.status === "fulfilled" ? quoteResult.value : null,
        preparation: preparationResult.status === "fulfilled" ? preparationResult.value?.workPreparation : null,
        schedule: scheduleResult.status === "fulfilled" ? scheduleResult.value : null,
        execution: executionResult.status === "fulfilled" ? executionResult.value : null,
        errors,
      });
    });
    return () => { active = false; };
  }, [canonicalRecord, jobId, preferredQuoteId, refreshKey, setPage]);

  const plan = state.plan;
  const approvedWork = buildApprovedWorkProjection(state.quote);
  const approvedVisits = state.schedule?.approvedWork?.flatMap((subject) => subject.visits || []) || [];
  const readiness = buildReadinessProjection({ approvedWork, preparation: state.preparation, schedule: approvedVisits });
  const canonicalMode = deriveWorkExecutionMode({ plan, liveJob });
  const mode = completion ? "COMPLETED" : canonicalMode;
  const executionView = buildExecutionSafeViewModel({ approvedWork, plan, preparation: state.preparation, schedule: approvedVisits, liveJob });
  const title = mode === "COMPLETED" ? "Work Completed" : mode === "IN_PROGRESS" ? "Work In Progress" : "Work Plan";
  const completeWorkEligible = mode === "IN_PROGRESS" &&
    state.execution?.state === "ACTIVE" &&
    state.execution.safeNextActions.includes("COMPLETE_WORK");

  function openCompleteWorkConfirmation() {
    if (!completeWorkEligible || completionInFlight.current) return;
    try {
      setCompletionAttempt({
        idempotencyKey: createApprovedWorkCompletionIdempotencyKey(),
        submitting: false,
        error: "",
      });
    } catch (error) {
      setCompletionAttempt({ idempotencyKey: "", submitting: false, error: completeWorkFailureMessage(error) });
    }
  }

  function cancelCompleteWorkConfirmation() {
    if (completionInFlight.current) return;
    setCompletionAttempt(null);
  }

  async function confirmCompleteWork() {
    if (
      completionInFlight.current ||
      !completeWorkEligible ||
      !completionAttempt?.idempotencyKey ||
      !state.execution?.id
    ) return;
    completionInFlight.current = true;
    setCompletionAttempt((current) => current && { ...current, submitting: true, error: "" });
    try {
      const result = await completeApprovedWork({
        jobId,
        executionId: state.execution.id,
        idempotencyKey: completionAttempt.idempotencyKey,
        setPage,
      });
      setCompletion(result.completion);
      setState((current) => ({ ...current, execution: result.execution }));
      setCompletionAttempt(null);
      setRefreshKey((value) => value + 1);
      await Promise.resolve(onCanonicalChange?.());
    } catch (error) {
      setCompletionAttempt((current) => current && {
        ...current,
        submitting: false,
        error: completeWorkFailureMessage(error),
      });
    } finally {
      completionInFlight.current = false;
    }
  }

  return (
    <section className="professional-work-plan" style={styles.section} aria-label={title} data-work-plan-primary-container="true" data-work-plan-status={state.status} data-work-plan-error={state.errors.join(",")} data-work-plan-job-id={jobId || ""} data-work-execution-mode={mode}>
      {mode !== "PRE_WORK" && <header style={styles.header}><h2 style={styles.title}>{title}</h2><Status tone={mode === "COMPLETED" ? "success" : "active"}>{title}</Status></header>}
      {state.status === "loading" && <p role="status">Loading this Work Plan…</p>}
      {state.status === "error" && <div role="alert" style={styles.error}><p>This Work Plan is temporarily unavailable.</p><button type="button" style={styles.secondaryButton} onClick={() => setRefreshKey((value) => value + 1)}>Retry</button></div>}
      {state.errors.length > 0 && state.status === "ready" && <p role="status" style={styles.partialNotice}>Some Work Plan details are temporarily unavailable.</p>}

      {state.status === "ready" && mode === "PRE_WORK" && <PreWorkPlanPresentation approvedWork={approvedWork} preparation={state.preparation} approvedVisits={approvedVisits} readiness={readiness} record={record} language={language} canonicalRecord={canonicalRecord} jobId={jobId} setPage={setPage} onCanonicalChange={onCanonicalChange} />}

      {state.status === "ready" && mode !== "PRE_WORK" && <>
        <CompactArea id="approved-work" title="Approved Work" summary="What the customer approved." icon="workCenter" emphasis="primary">{!approvedWork?.scope.length ? <p style={styles.muted}>No approved scope is available.</p> : <ul style={styles.scopeList}>{approvedWork.scope.map((item) => <li key={item.scopeItemId} style={styles.scopeItem}><strong>{item.description}</strong>{item.quantity != null && <span>Qty {item.quantity}</span>}</li>)}</ul>}</CompactArea>
        <div style={styles.referenceGrid}><div><strong>Preparation</strong><span>{readable(executionView.preparation?.preparationState)}</span></div><div><strong>Schedule</strong><span>{executionView.schedule.length ? `${executionView.schedule.length} visit${executionView.schedule.length === 1 ? "" : "s"}` : "Unavailable"}</span></div></div>
        <section style={styles.progressSection} aria-labelledby="work-progress-title"><h3 id="work-progress-title" style={styles.areaTitle}>Progress</h3>{plan.workstreams.length === 0 && <p style={styles.muted}>No work progress is available.</p>}{plan.workstreams.map((workstream) => <article key={workstream.id} style={styles.workstream} data-workstream-id={workstream.id} data-workstream-status={workstream.status}><header style={styles.workstreamHeader}><div><strong>{workstream.title}</strong><span>{readable(workstream.status || workstream.state)}</span></div><Status tone={["DONE", "COMPLETED"].includes(workstream.status) ? "success" : "active"}>{readable(workstream.status)}</Status></header><div style={styles.activities}>{workstream.activities.map((activity) => <div key={activity.id} style={styles.activity} data-work-item-id={activity.id} data-work-item-status={activity.status}><div><strong>{activity.statement}</strong><span>{dateLabel(activity.updatedAt, language)}</span></div><Status tone={["DONE", "COMPLETED"].includes(activity.status) ? "success" : "active"}>{readable(activity.status)}</Status>{activity.updates?.length > 0 && <details style={styles.supportingDetails}><summary>Progress updates</summary><ul>{activity.updates.map((update) => <li key={update.version}>{update.statement}</li>)}</ul></details>}</div>)}</div><details style={styles.supportingDetails}><summary>Work record details</summary><code>{workstream.id}</code><span>Version {workstream.currentVersion}</span></details></article>)}</section>
        {completeWorkEligible && <section style={styles.completeWorkPanel} aria-labelledby="complete-work-title"><div><h3 id="complete-work-title" style={styles.areaTitle}>Ready to finish?</h3><p style={styles.muted}>Complete all approved work in one step when the Job is finished.</p></div><button type="button" style={styles.primaryButton} onClick={openCompleteWorkConfirmation}>Complete Work</button></section>}
        {mode === "COMPLETED" && <div style={styles.completedNotice} role="status"><strong>Work Completed</strong><span>The approved work has been finished.</span><span><strong>Next:</strong> Prepare Final Invoice.</span></div>}
      </>}
      {completionAttempt && <div style={styles.dialogBackdrop} role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="complete-work-confirmation-title" style={styles.dialog}><h2 id="complete-work-confirmation-title" style={styles.dialogTitle}>Complete this work?</h2><p style={styles.dialogCopy}>The approved work will be marked complete and the Job will move to final Invoice preparation.</p>{completionAttempt.error && <p role="alert" style={styles.dialogError}>{completionAttempt.error}</p>}<div style={styles.dialogActions}><button type="button" style={styles.secondaryButton} onClick={cancelCompleteWorkConfirmation} disabled={completionAttempt.submitting}>Cancel</button><button type="button" style={{ ...styles.primaryButton, ...(completionAttempt.submitting ? styles.disabledButton : {}) }} onClick={confirmCompleteWork} disabled={completionAttempt.submitting || !completionAttempt.idempotencyKey}>{completionAttempt.submitting ? "Completing…" : "Complete Work"}</button></div></section></div>}
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 8, minWidth: 0, textAlign: "left" },
  preWork: { display: "grid", minWidth: 0, textAlign: "left" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, color: "#173d2a", fontSize: "clamp(1.25rem, 4vw, 1.65rem)" },
  status: { display: "inline-flex", alignItems: "center", minHeight: 28, padding: "2px 10px", borderRadius: 999, border: "1px solid #cbd5ce", color: "#415148", background: "#f7faf8", fontSize: 12, fontWeight: 850 },
  successStatus: { border: "1px solid #a6cfaf", color: "#1d5b31", background: "#edf8ef" },
  activeStatus: { border: "1px solid #9eb8d1", color: "#244b70", background: "#eef6fd" }, neutralStatus: {},
  area: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 11, padding: "15px 0", borderTop: "1px solid #dce5de", background: "#fff", minWidth: 0 },
  areaHeader: { display: "flex", alignItems: "flex-start", gap: 11, minWidth: 0 }, areaHeadingCopy: { display: "grid", gap: 2, minWidth: 0 }, areaTitle: { margin: 0, color: "#203d2b", fontSize: 16, lineHeight: 1.25, fontWeight: 800 }, areaSummary: { margin: 0, color: "#5b6a61", fontSize: 14, lineHeight: 1.4 }, areaBody: { display: "grid", gap: 10, minWidth: 0, paddingLeft: 46 },
  scopeList: { margin: 0, paddingLeft: 20, display: "grid", gap: 8 }, scopeItem: { paddingLeft: 1, lineHeight: 1.35, display: "grid", gap: 2, fontSize: 14 }, supportingDetails: { display: "grid", gap: 6, color: "#5d6a62", fontSize: 12, overflowWrap: "anywhere" },
  scheduleSection: { display: "grid", justifyItems: "start", gap: 10, minWidth: 0 }, scheduleRow: { width: "100%", boxSizing: "border-box", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "11px 12px", borderRadius: 10, background: "#f5f8f6", minWidth: 0 }, scheduleCopy: { display: "grid", gap: 3, minWidth: 0, overflowWrap: "anywhere" }, scheduleControls: { width: "100%", minWidth: 0 },
  readinessGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 8, minWidth: 0 }, readinessCheck: { minWidth: 0, minHeight: 50, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", border: "1px solid #dce4de", borderRadius: 9, background: "#f8faf8", color: "#536158" }, readinessCheckComplete: { background: "#f0f7f1", color: "#234d32" }, checkIcon: { display: "inline-grid", placeItems: "center", flex: "0 0 23px", width: 23, height: 23, borderRadius: 999, border: "1px solid #75a780", color: "#21623a", fontWeight: 900 },
  readyNotice: { display: "grid", gap: 3, padding: "11px 12px", borderLeft: "3px solid #3f8752", color: "#245433", background: "#eef7f0", lineHeight: 1.4 }, waitingNotice: { display: "grid", gap: 3, padding: "11px 12px", borderLeft: "3px solid #b07a1b", color: "#654a17", background: "#fff9eb", lineHeight: 1.4 },
  referenceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 9 }, progressSection: { display: "grid", gap: 12, padding: "14px 0", borderTop: "1px solid #dce5de" }, workstream: { display: "grid", gap: 10, paddingTop: 10, borderTop: "1px solid #e0e7e2" }, workstreamHeader: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }, activities: { display: "grid", gap: 8 }, activity: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, padding: 11, borderLeft: "3px solid #bdd0c1", background: "#f8fbf9" },
  partialNotice: { margin: 0, color: "#78570f" }, nextStep: { margin: 0, padding: 12, background: "#edf7ef", color: "#234b31" }, muted: { margin: 0, color: "#64746a", lineHeight: 1.5 }, error: { color: "#991b1b" }, secondaryButton: { minHeight: 44, padding: "8px 12px", border: "1px solid #8ea395", borderRadius: 8, background: "#fff", color: "#275039", fontWeight: 800, cursor: "pointer" },
  completeWorkPanel: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", padding: 14, border: "1px solid #b9d2bf", borderRadius: 10, background: "#f2f8f3" }, primaryButton: { minHeight: 44, padding: "9px 15px", border: "1px solid #14532d", borderRadius: 8, background: "#14532d", color: "#fff", fontWeight: 850, cursor: "pointer" }, disabledButton: { opacity: 0.65, cursor: "wait" }, completedNotice: { display: "grid", gap: 4, padding: 14, borderLeft: "3px solid #3f8752", background: "#edf7ef", color: "#234b31", lineHeight: 1.45 }, dialogBackdrop: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 18, background: "rgba(15, 35, 23, 0.45)" }, dialog: { width: "min(100%, 460px)", boxSizing: "border-box", display: "grid", gap: 14, padding: 22, borderRadius: 12, background: "#fff", boxShadow: "0 22px 60px rgba(13, 39, 22, 0.24)" }, dialogTitle: { margin: 0, color: "#173d2a", fontSize: 21 }, dialogCopy: { margin: 0, color: "#4f6056", lineHeight: 1.5 }, dialogError: { margin: 0, padding: 10, borderLeft: "3px solid #b42318", background: "#fff4f2", color: "#8f1f16", lineHeight: 1.45 }, dialogActions: { display: "flex", justifyContent: "flex-end", gap: 9, flexWrap: "wrap" },
};
