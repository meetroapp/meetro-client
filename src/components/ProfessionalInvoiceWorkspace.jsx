import { useCallback, useEffect, useState } from "react";

import CanonicalInvoiceDetail from "./CanonicalInvoiceDetail.jsx";
import ContextualAskMeetro from "./ContextualAskMeetro.jsx";
import WorkCenterBackButton from "./WorkCenterBackButton.jsx";
import {
  WorkCenterEmptyState,
  WorkCenterMetricGrid,
  WorkCenterPageHeader,
} from "./WorkCenterWorkspaceSystem.jsx";
import { formatLocaleCurrency } from "../utils/localeFormat.js";
import {
  createCanonicalInvoice,
  createInvoiceCommandKey,
  fetchProfessionalInvoice,
  fetchProfessionalInvoiceWorkspace,
  issueCanonicalInvoice,
  recordCanonicalPayment,
} from "../utils/invoicePaymentApi.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";
import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage.js";
import {
  INTELLIGENCE_OPERATION,
  recordWorkflowReview,
  requestWorkflowIntelligence,
} from "../utils/contextualIntelligence.js";
import { getWorkCenterWorkspaceCopy } from "../utils/workCenterWorkspaceLanguage.js";
import {
  buildInvoiceEmailUrl,
  copyInvoiceDetails,
  shareInvoiceExternally,
} from "../utils/invoiceShare.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dollarsToMinor(value) {
  const normalized = String(value || "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export default function ProfessionalInvoiceWorkspace({
  language = "en",
  setPage,
  onBack,
}) {
  const copy = getInvoiceCopy(language);
  const workspaceCopy = getWorkCenterWorkspaceCopy(language);
  const [workspace, setWorkspace] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [createTarget, setCreateTarget] = useState(null);
  const [createDraft, setCreateDraft] = useState({
    dueMode: "DUE_ON_RECEIPT", dueDate: "", customerNotes: "", terms: "",
  });
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({
    amount: "", method: "CHECK", receivedDate: today(), reference: "",
  });
  const [assistant, setAssistant] = useState({ busy: false, error: "", notice: "", result: null });
  const [assistantInvoiceDraft, setAssistantInvoiceDraft] = useState(null);

  const loadWorkspace = useCallback(async () => {
    const value = await fetchProfessionalInvoiceWorkspace({ limit: 50, setPage });
    setWorkspace(value);
    setPhase("ready");
    return value;
  }, [setPage]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setPhase("loading");
      void loadWorkspace().catch(() => active && setPhase("error"));
    });
    return () => { active = false; };
  }, [loadWorkspace]);

  const money = useCallback((minor, currency = workspace?.summary.currency || "USD") =>
    formatLocaleCurrency((Number(minor) || 0) / 100, currency || "USD", {}, language),
  [language, workspace]);

  async function openInvoice(invoiceId) {
    setBusy(`read:${invoiceId}`);
    setNotice("");
    try {
      setSelected(await fetchProfessionalInvoice({ invoiceId, setPage }));
      setConfirmIssue(false);
      setShowPayment(false);
    } catch {
      setNotice(copy.unavailable);
    } finally {
      setBusy("");
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!createTarget) return;
    setBusy("create");
    setNotice("");
    try {
      if (assistantInvoiceDraft) {
        const edits = [
          [assistantInvoiceDraft.customerNotes, createDraft.customerNotes],
          [assistantInvoiceDraft.terms, createDraft.terms],
        ].filter(([item, value]) => item?.text !== value.trim());
        await Promise.all(edits.map(([item, value]) => recordWorkflowReview({
          proposalId: assistantInvoiceDraft.proposalId,
          elementId: item.id,
          action: "EDITED",
          editedValue: value.trim(),
          setPage,
        })));
      }
      const invoice = await createCanonicalInvoice({
        jobId: createTarget.jobId,
        expectedCompletionVersion: createTarget.completionVersion,
        due: {
          mode: createDraft.dueMode,
          date: createDraft.dueMode === "SPECIFIC_DATE" ? createDraft.dueDate : null,
        },
        customerNotes: createDraft.customerNotes.trim() || null,
        terms: createDraft.terms.trim() || null,
        idempotencyKey: createInvoiceCommandKey("invoice-create"),
        setPage,
      });
      setSelected(invoice);
      setCreateTarget(null);
      setCreateDraft({ dueMode: "DUE_ON_RECEIPT", dueDate: "", customerNotes: "", terms: "" });
      setAssistantInvoiceDraft(null);
      await loadWorkspace();
    } catch (error) {
      setNotice(error?.message || copy.unavailable);
    } finally {
      setBusy("");
    }
  }

  async function handleIssue() {
    if (!selected?.actions.canIssue) return;
    setBusy("issue");
    setNotice("");
    try {
      const result = await issueCanonicalInvoice({
        invoiceId: selected.invoiceId,
        expectedVersion: selected.currentVersion,
        idempotencyKey: createInvoiceCommandKey("invoice-issue"),
        setPage,
      });
      setSelected(result.invoice);
      setConfirmIssue(false);
      setNotice(copy.sent);
      await loadWorkspace();
    } catch (error) {
      if (error?.code === "STALE_INVOICE_VERSION") {
        await openInvoice(selected.invoiceId);
      }
      setNotice(error?.message || copy.unavailable);
    } finally {
      setBusy("");
    }
  }

  async function handlePayment(event) {
    event.preventDefault();
    const amountMinor = dollarsToMinor(paymentDraft.amount);
    if (!selected || !amountMinor) return;
    setBusy("payment");
    setNotice("");
    try {
      const result = await recordCanonicalPayment({
        invoiceId: selected.invoiceId,
        expectedVersion: selected.currentVersion,
        amountMinor,
        method: paymentDraft.method,
        receivedDate: paymentDraft.receivedDate,
        customerReference: paymentDraft.reference.trim() || null,
        idempotencyKey: createInvoiceCommandKey("invoice-payment"),
        setPage,
      });
      setSelected(result.invoice);
      setPaymentDraft({ amount: "", method: "CHECK", receivedDate: today(), reference: "" });
      setShowPayment(false);
      setNotice(copy.recorded);
      await loadWorkspace();
    } catch (error) {
      if (error?.code === "STALE_INVOICE_VERSION") {
        await openInvoice(selected.invoiceId);
      }
      setNotice(error?.message || copy.unavailable);
    } finally {
      setBusy("");
    }
  }

  async function share() {
    if (!selected) return;
    const result = await shareInvoiceExternally({ invoice: selected, language });
    if (result.method === "copy") setNotice(copy.copied);
  }

  async function copyDetails() {
    if (selected && await copyInvoiceDetails({ invoice: selected, language })) {
      setNotice(copy.copied);
    }
  }

  async function requestInvoiceHelp(action, prompt) {
    const intents = {
      create: "CREATE_INVOICE",
      review: "REVIEW_INVOICE",
      balance: "EXPLAIN_BALANCE",
    };
    if (!createTarget && !selected) return;
    setAssistant({ busy: true, error: "", notice: "", result: null });
    try {
      const result = await requestWorkflowIntelligence({
        operation: INTELLIGENCE_OPERATION.INVOICE,
        locale: language,
        input: {
          jobId: selected ? null : createTarget.jobId,
          invoiceId: selected?.invoiceId || null,
          intent: intents[action],
          professionalInstructions: prompt || null,
        },
        expected: {
          jobId: selected ? undefined : createTarget.jobId,
          invoiceId: selected?.invoiceId || undefined,
        },
        setPage,
      });
      setAssistant({ busy: false, error: "", notice: "", result });
    } catch (error) {
      setAssistant({ busy: false, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable, notice: "", result: null });
    }
  }

  async function reviewInvoiceProposal(action, { apply = false } = {}) {
    const proposal = assistant.result?.proposal;
    if (!proposal) return;
    const items = [proposal.customerNotes, proposal.terms, proposal.dueDateWording, proposal.balanceExplanation]
      .filter((item) => item?.id && item.text);
    try {
      await Promise.all(items.map((item) => recordWorkflowReview({
        proposalId: proposal.proposalId,
        elementId: item.id,
        action,
        reasonCategory: action === "REJECTED" ? "PROFESSIONAL_DISMISSED" : undefined,
        setPage,
      })));
      if (apply && createTarget) {
        setCreateDraft((current) => ({
          ...current,
          customerNotes: proposal.customerNotes.text || current.customerNotes,
          terms: proposal.terms.text || current.terms,
        }));
        setAssistantInvoiceDraft(proposal);
      }
      setAssistant((current) => ({
        ...current,
        result: action === "REJECTED" ? null : current.result,
        notice: action === "REJECTED" ? "" : getAskMeetroWorkflowCopy(language).useInInvoice,
      }));
    } catch (error) {
      setAssistant((current) => ({ ...current, error: error?.message || getAskMeetroWorkflowCopy(language).unavailable }));
    }
  }

  const summary = workspace?.summary;
  const selectedActions = selected ? (
    <div style={styles.actions}>
      {selected.actions.canIssue && !confirmIssue && (
        <button type="button" style={styles.primaryButton} onClick={() => setConfirmIssue(true)}>
          {copy.send}
        </button>
      )}
      {selected.actions.canIssue && confirmIssue && (
        <div style={styles.confirmRow} role="group" aria-label={copy.confirmSend}>
          <button type="button" style={styles.primaryButton} disabled={busy === "issue"} onClick={handleIssue}>
            {copy.confirmSend}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={() => setConfirmIssue(false)}>
            {copy.cancel}
          </button>
        </div>
      )}
      {selected.actions.canRecordPayment && !showPayment && (
        <button type="button" style={styles.primaryButton} onClick={() => setShowPayment(true)}>
          {copy.recordPayment}
        </button>
      )}
      {selected.actions.canShareExternal && (
        <>
          <button type="button" style={styles.secondaryButton} onClick={share}>{copy.share}</button>
          <a style={styles.linkButton} href={buildInvoiceEmailUrl(selected, { language }) || undefined}>{copy.email}</a>
          <button type="button" style={styles.secondaryButton} onClick={copyDetails}>{copy.copy}</button>
        </>
      )}
      {selected.actions.canShareExternal && <span style={styles.shareNote}>{copy.noPublicLink}</span>}
    </div>
  ) : null;

  return (
    <section className="work-center-workspace" style={styles.workspace} data-invoice-workspace-phase={phase}>
      {onBack && <WorkCenterBackButton label={copy.back} onClick={onBack} />}
      <WorkCenterPageHeader
        eyebrow={workspaceCopy.financeEyebrow}
        title={copy.title}
        description={workspaceCopy.financeDescription}
      />

      {phase === "loading" && <p role="status">{copy.loading}</p>}
      {phase === "error" && <p role="alert">{copy.unavailable}</p>}
      {notice && <p role="status" style={styles.notice}>{notice}</p>}

      {summary && (
        <WorkCenterMetricGrid
          ariaLabel={copy.title}
          metrics={[
            { key: "ready", icon: "completion", label: copy.ready, value: summary.readyToInvoice },
            { key: "drafts", icon: "quickInvoice", tone: "info", label: copy.drafts, value: summary.drafts },
            { key: "waiting", icon: "history", tone: "warning", label: copy.waiting, value: summary.waitingForPayment },
            { key: "paid", icon: "payment", tone: "success", label: copy.paid, value: summary.paid },
            { key: "outstanding", icon: "revenue", tone: "violet", label: copy.outstanding, value: summary.totalOutstandingMinor == null ? "-" : money(summary.totalOutstandingMinor) },
          ]}
        />
      )}

      {workspace?.readyJobs.length > 0 && (
        <section style={styles.band} aria-label={copy.ready}>
          <h3 style={styles.subheading}>{copy.ready}</h3>
          <div style={styles.list}>
            {workspace.readyJobs.map((job) => (
              <div key={job.jobId} style={styles.row} data-ready-invoice-job-id={job.jobId}>
                <div style={styles.rowCopy}>
                  <strong>{job.customerName}</strong><span>{job.serviceTitle}</span>
                  <small>{copy.completed}: {new Date(job.completedAt).toLocaleDateString(language)}</small>
                </div>
                <div style={styles.rowAction}>
                  {job.approvedAmount && <strong>{money(job.approvedAmount.totalMinor, job.approvedAmount.currency)}</strong>}
                  <button type="button" style={styles.primaryButton} onClick={() => {
                    setAssistantInvoiceDraft(null);
                    setAssistant({ busy: false, error: "", notice: "", result: null });
                    setCreateTarget(job);
                  }}>{copy.create}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {createTarget && (
        <form style={styles.form} onSubmit={handleCreate} data-invoice-create-job-id={createTarget.jobId}>
          <h3 style={styles.subheading}>{copy.create}: {createTarget.customerName}</h3>
          <label style={styles.field}>{copy.dueDate}
            <select value={createDraft.dueMode} onChange={(event) => setCreateDraft((current) => ({ ...current, dueMode: event.target.value }))} style={styles.input}>
              <option value="DUE_ON_RECEIPT">{copy.dueOnReceipt}</option>
              <option value="SPECIFIC_DATE">{copy.specificDate}</option>
            </select>
          </label>
          {createDraft.dueMode === "SPECIFIC_DATE" && (
            <label style={styles.field}>{copy.dueDate}<input required min={today()} type="date" value={createDraft.dueDate} onChange={(event) => setCreateDraft((current) => ({ ...current, dueDate: event.target.value }))} style={styles.input} /></label>
          )}
          <label style={styles.field}>{copy.customerNotes}<textarea maxLength={2000} value={createDraft.customerNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, customerNotes: event.target.value }))} style={styles.textarea} /></label>
          <label style={styles.field}>{copy.terms}<textarea maxLength={2000} value={createDraft.terms} onChange={(event) => setCreateDraft((current) => ({ ...current, terms: event.target.value }))} style={styles.textarea} /></label>
          <div style={styles.confirmRow}><button type="submit" disabled={busy === "create"} style={styles.primaryButton}>{copy.create}</button><button type="button" style={styles.secondaryButton} onClick={() => {
            setCreateTarget(null);
            setAssistantInvoiceDraft(null);
          }}>{copy.cancel}</button></div>
        </form>
      )}

      {(createTarget || selected) && (
        <ContextualAskMeetro
          language={language}
          contextLabel="invoice"
          contextName={selected?.invoiceNumber || createTarget?.serviceTitle || getAskMeetroWorkflowCopy(language).invoice}
          actions={selected ? [
            { id: "review", label: getAskMeetroWorkflowCopy(language).reviewInvoice },
            { id: "balance", label: getAskMeetroWorkflowCopy(language).explainBalance },
          ] : [
            { id: "create", label: getAskMeetroWorkflowCopy(language).helpCreateInvoice },
          ]}
          busy={assistant.busy}
          error={assistant.error}
          notice={assistant.notice}
          onRequest={requestInvoiceHelp}
        >
          {assistant.result && (
            <InvoiceAssistantResult
              proposal={assistant.result.proposal}
              language={language}
              canApply={Boolean(createTarget)}
              money={money}
              onApply={() => void reviewInvoiceProposal("ACCEPTED", { apply: true })}
              onDismiss={() => void reviewInvoiceProposal("REJECTED")}
            />
          )}
        </ContextualAskMeetro>
      )}

      {workspace?.invoices.length > 0 ? (
        <section style={styles.band} aria-label={copy.invoice}>
          <h3 style={styles.subheading}>{copy.invoice}</h3>
          <div style={styles.list}>
            {workspace.invoices.map((invoice) => (
              <button key={invoice.invoiceId} type="button" style={styles.invoiceRow} onClick={() => openInvoice(invoice.invoiceId)} data-invoice-id={invoice.invoiceId}>
                <span><strong>{invoice.invoiceNumber}</strong><small>{invoice.customerName} / {invoice.serviceTitle}</small></span>
                <span><strong>{money(invoice.balanceMinor, invoice.currency)}</strong><small>{invoice.status.replaceAll("_", " ")}</small></span>
              </button>
            ))}
          </div>
        </section>
      ) : phase === "ready" && workspace?.readyJobs.length === 0 ? (
        <WorkCenterEmptyState
          icon="payment"
          title={workspaceCopy.financeEmptyTitle}
          body={workspaceCopy.financeEmptyBody}
        />
      ) : null}

      {selected && (
        <section style={styles.detailBand}>
          <CanonicalInvoiceDetail invoice={selected} language={language} actions={selectedActions} />
          {showPayment && selected.actions.canRecordPayment && (
            <form style={styles.form} onSubmit={handlePayment}>
              <h3 style={styles.subheading}>{copy.recordPayment}</h3>
              <label style={styles.field}>{copy.amount}<input required inputMode="decimal" value={paymentDraft.amount} onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))} style={styles.input} /></label>
              <label style={styles.field}>{copy.method}<select value={paymentDraft.method} onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))} style={styles.input}><option value="CASH">{copy.cash}</option><option value="CHECK">{copy.check}</option><option value="BANK_TRANSFER">{copy.bankTransfer}</option><option value="OTHER">{copy.other}</option></select></label>
              <label style={styles.field}>{copy.receivedDate}<input required max={today()} type="date" value={paymentDraft.receivedDate} onChange={(event) => setPaymentDraft((current) => ({ ...current, receivedDate: event.target.value }))} style={styles.input} /></label>
              <label style={styles.field}>{copy.reference}<input maxLength={500} value={paymentDraft.reference} onChange={(event) => setPaymentDraft((current) => ({ ...current, reference: event.target.value }))} style={styles.input} /></label>
              <div style={styles.confirmRow}><button type="submit" disabled={busy === "payment" || !dollarsToMinor(paymentDraft.amount)} style={styles.primaryButton}>{copy.recordPayment}</button><button type="button" style={styles.secondaryButton} onClick={() => setShowPayment(false)}>{copy.cancel}</button></div>
            </form>
          )}
        </section>
      )}
      {busy.startsWith("read:") && <p role="status">{copy.loading}</p>}
    </section>
  );
}

function InvoiceAssistantResult({ proposal, language, canApply, money, onApply, onDismiss }) {
  const copy = getAskMeetroWorkflowCopy(language);
  const financial = proposal.canonicalFinancialTruth;
  return (
    <div style={styles.assistantResult}>
      <strong>{proposal.summary}</strong>
      <div style={styles.financialTruth}>
        <span>{financial.status.replaceAll("_", " ")}</span>
        {financial.totalMinor != null && <strong>{money(financial.totalMinor, financial.currency || "USD")}</strong>}
        {financial.balanceMinor != null && <span>{money(financial.balanceMinor, financial.currency || "USD")}</span>}
      </div>
      {proposal.lineDescriptions.map((item) => <p key={item.id} style={styles.assistantText}>{item.text}</p>)}
      {proposal.customerNotes.text && <p style={styles.assistantText}>{proposal.customerNotes.text}</p>}
      {proposal.terms.text && <p style={styles.assistantText}>{proposal.terms.text}</p>}
      {proposal.balanceExplanation.text && <p style={styles.assistantText}>{proposal.balanceExplanation.text}</p>}
      <div style={styles.actions}>
        {canApply && <button type="button" style={styles.primaryButton} onClick={onApply}>{copy.useInInvoice}</button>}
        <button type="button" style={styles.secondaryButton} onClick={onDismiss}>{copy.dismiss}</button>
      </div>
    </div>
  );
}

const styles = {
  workspace: { minWidth: 0 },
  notice: { margin: 0, padding: 12, borderLeft: "4px solid #0f766e", background: "#eff8f7" },
  band: { display: "grid", gap: 10, minWidth: 0, paddingTop: 4 },
  subheading: { margin: 0, fontSize: 18, letterSpacing: 0 },
  list: { display: "grid", gap: 8, minWidth: 0 },
  row: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, border: "1px solid #d7ded8", borderRadius: 6, background: "#fff" },
  rowCopy: { display: "grid", gap: 3, minWidth: 0, overflowWrap: "anywhere" },
  rowAction: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 },
  invoiceRow: { display: "flex", justifyContent: "space-between", gap: 12, width: "100%", minHeight: 56, padding: 12, border: "1px solid #d7ded8", borderRadius: 6, background: "#fff", color: "#172317", textAlign: "left", cursor: "pointer" },
  detailBand: { display: "grid", gap: 12, minWidth: 0 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  confirmRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  primaryButton: { minHeight: 44, padding: "0 16px", border: 0, borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 800, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "0 16px", border: "1px solid #9aa89d", borderRadius: 6, background: "#fff", color: "#172317", fontWeight: 800, cursor: "pointer" },
  linkButton: { display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px", border: "1px solid #9aa89d", borderRadius: 6, background: "#fff", color: "#172317", fontWeight: 800, textDecoration: "none" },
  shareNote: { flexBasis: "100%", color: "#667267", fontSize: 13 },
  form: { display: "grid", gap: 12, minWidth: 0, padding: 16, border: "1px solid #b7c2b9", borderRadius: 8, background: "#f7faf8" },
  field: { display: "grid", gap: 6, minWidth: 0, fontWeight: 700 },
  input: { width: "100%", minWidth: 0, minHeight: 44, padding: "8px 10px", border: "1px solid #9aa89d", borderRadius: 6, background: "#fff", font: "inherit" },
  textarea: { width: "100%", minWidth: 0, minHeight: 88, padding: 10, border: "1px solid #9aa89d", borderRadius: 6, background: "#fff", font: "inherit", resize: "vertical" },
  assistantResult: { display: "grid", gap: 10, minWidth: 0 },
  financialTruth: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: 10, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff" },
  assistantText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
};
