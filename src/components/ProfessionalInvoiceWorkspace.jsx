import { issueCanonicalInvoiceExternally, emailCanonicalInvoice } from "../utils/invoicePaymentApi.js";
import UniversalAskMeetroEntry from "./UniversalAskMeetroEntry.jsx";
import { useCallback, useEffect, useRef, useState } from "react";

import CanonicalInvoiceDetail from "./CanonicalInvoiceDetail.jsx";
import { fetchJobCompletionReview } from "../utils/jobCompletionApi.js";
import InvoiceCompletionNotice from "./InvoiceCompletionNotice.jsx";
import useAskMeetroContext from "../hooks/useAskMeetroContext.js";
import WorkCenterBackButton from "./WorkCenterBackButton.jsx";
import {
  WorkCenterEmptyState,
  WorkCenterMetricGrid,
  WorkCenterPageHeader,
} from "./WorkCenterWorkspaceSystem.jsx";
import { formatLocaleCurrency } from "../utils/localeFormat.js";
import {
  createInvoiceCommandKey,
  fetchProfessionalInvoice,
  fetchProfessionalInvoiceWorkspace,
  recordCanonicalPayment,
  issueCanonicalInvoice,
} from "../utils/invoicePaymentApi.js";
import {
  createPaymentReminderKey,
  sendInvoicePaymentReminder,
} from "../utils/paymentReminderApi.js";
import {
  buildCanonicalConversationRoute,
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
} from "../utils/canonicalConversationMessaging.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";
import { getWorkCenterWorkspaceCopy } from "../utils/workCenterWorkspaceLanguage.js";
import {
  buildInvoiceSharePresentation,
  buildInvoiceEmailUrl,
  copyInvoiceDetails,
  downloadInvoicePdf,
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

function emptyPaymentDraft() {
  return { amount: "", method: "CHECK", receivedDate: today(), reference: "" };
}

export default function ProfessionalInvoiceWorkspace({
  language = "en",
  setPage,
  onBack,
  initialInvoiceId = "",
  expectedJobId = "",
}) {
  const copy = getInvoiceCopy(language);
  const workspaceCopy = getWorkCenterWorkspaceCopy(language);
  const [workspace, setWorkspace] = useState(null);
  const [workspacePhase, setWorkspacePhase] = useState("idle");
  const [invoicePhase, setInvoicePhase] = useState("idle");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(false);
  const deliveryAttemptRef = useRef({ signature: "", key: "" });
  const [showPayment, setShowPayment] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDraft, setReminderDraft] = useState("");
  const [paymentDraft, setPaymentDraft] = useState(emptyPaymentDraft);
  const selectedInvoiceIdRef = useRef("");
  const reminderAttemptRef = useRef({ signature: "", key: "" });
  useAskMeetroContext({ invoiceId: selected?.invoiceId, jobId: selected?.jobId, conversationId: selected?.conversationId, label: selected?.invoiceNumber });

  const loadWorkspace = useCallback(async () => {
    const value = await fetchProfessionalInvoiceWorkspace({ limit: 50, setPage });
    setWorkspace(value);
    setWorkspacePhase("ready");
    return value;
  }, [setPage]);

  const resetPaymentInteraction = useCallback(() => {
    setShowPayment(false);
    setPaymentDraft(emptyPaymentDraft());
  }, []);

  const acceptCanonicalInvoice = useCallback((invoice) => {
    const previousInvoiceId = selectedInvoiceIdRef.current;
    selectedInvoiceIdRef.current = invoice.invoiceId;
    setSelected(invoice);
    if (previousInvoiceId && previousInvoiceId !== invoice.invoiceId) {
      resetPaymentInteraction();
    }
  }, [resetPaymentInteraction]);

  useEffect(() => {
    if (initialInvoiceId) {
      setWorkspacePhase("idle");
      return undefined;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setWorkspacePhase("loading");
      void loadWorkspace().catch(() => active && setWorkspacePhase("error"));
    });
    return () => { active = false; };
  }, [initialInvoiceId, loadWorkspace]);

  useEffect(() => {
    if (!initialInvoiceId) {
      setInvoicePhase("idle");
      return undefined;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const isSameInvoiceRefresh = selectedInvoiceIdRef.current === initialInvoiceId;
      if (!isSameInvoiceRefresh) setInvoicePhase("loading");
      setNotice("");
      void fetchProfessionalInvoice({ invoiceId: initialInvoiceId, setPage })
        .then((invoice) => {
          if (!active) return;
          if (expectedJobId && invoice.jobId !== expectedJobId) {
            setNotice("This exact Invoice does not belong to the requested Job.");
            setInvoicePhase("error");
            return;
          }
          acceptCanonicalInvoice(invoice);
          setInvoicePhase("ready");
          setConfirmIssue(false);
          setShowReminder(false);
          setReminderDraft("");
          reminderAttemptRef.current = { signature: "", key: "" };
        })
        .catch(() => {
          if (!active) return;
          setInvoicePhase("error");
          setNotice(copy.unavailable);
        })
    });
    return () => { active = false; };
  }, [acceptCanonicalInvoice, copy.unavailable, expectedJobId, initialInvoiceId, setPage]);

  const money = useCallback((minor, currency = workspace?.summary.currency || "USD") =>
    formatLocaleCurrency((Number(minor) || 0) / 100, currency || "USD", {}, language),
  [language, workspace]);

  async function openInvoice(invoiceId) {
    const isSameInvoiceRefresh = selectedInvoiceIdRef.current === invoiceId;
    if (!isSameInvoiceRefresh) setInvoicePhase("loading");
    setNotice("");
    try {
      acceptCanonicalInvoice(await fetchProfessionalInvoice({ invoiceId, setPage }));
      setInvoicePhase("ready");
      setConfirmIssue(false);
      setShowReminder(false);
      setReminderDraft("");
      reminderAttemptRef.current = { signature: "", key: "" };
    } catch {
      setInvoicePhase("error");
      setNotice(copy.unavailable);
    }
  }

  async function verifyCompletion() {
    try {
      const review = await fetchJobCompletionReview({ jobId: selected.jobId, setPage });
      if (review.state === "COMPLETED") return true;
    } catch { /* The send boundary fails closed. */ }
    setConfirmIssue(false);
    setCompletionNotice(true);
    return false;
  }

  async function beginIssue() {
    if (busy || (!selected?.conversationId && !(selected?.authority?.kind === "BUSINESS_CUSTOMER" && selected.status === "DRAFT"))) return;
    setBusy("delivery-review");
    try { if (await verifyCompletion()) setConfirmIssue(true); }
    finally { setBusy(""); }
  }

  async function handleIssue() {
    if (busy || (!selected?.conversationId && !(selected?.authority?.kind === "BUSINESS_CUSTOMER" && selected.status === "DRAFT"))) return;
    setBusy("delivery"); setNotice("");
    try {
      if (!await verifyCompletion()) return;
      const command = { invoiceId: selected.invoiceId, expectedVersion: selected.currentVersion, messageText: `Please review Invoice ${selected.invoiceNumber}. The exact Invoice and its PDF are available here.` };
      const signature = JSON.stringify(command);
      if (deliveryAttemptRef.current.signature !== signature) deliveryAttemptRef.current = { signature, key: createInvoiceCommandKey("invoice-delivery") };
      const issue = selected.conversationId ? issueCanonicalInvoice : issueCanonicalInvoiceExternally;
      const result = await issue({ ...command, idempotencyKey: deliveryAttemptRef.current.key, setPage });
      setSelected(result.invoice); setConfirmIssue(false);
      deliveryAttemptRef.current = { signature: "", key: "" };
      if (result.invoice.conversationId) setPage(buildCanonicalConversationRoute(result.invoice.conversationId, "workCenter", {
        shell: CANONICAL_CONVERSATION_COMMUNICATION_SHELL, invoiceId: result.invoice.invoiceId,
      }));
    } catch (error) { setNotice(error?.message || copy.unavailable); }
    finally { setBusy(""); }
  }

  const canSendInvoiceReminder = Boolean(
    selected &&
      ["SENT", "PARTIALLY_PAID"].includes(selected.status) &&
      Number.isSafeInteger(selected.balanceMinor) &&
      selected.balanceMinor > 0 &&
      Number.isSafeInteger(selected.currentVersion) &&
      selected.currentVersion > 0
  );

  function openReminder() {
    if (!canSendInvoiceReminder) return;
    setReminderDraft(selected.conversationId ? "" : `Payment reminder: Invoice ${selected.invoiceNumber} has a remaining balance of ${money(selected.balanceMinor, selected.currency)}. ${buildInvoiceSharePresentation(selected)?.text || ""}`);
    setNotice("");
    setShowPayment(false);
    setShowReminder(true);
    reminderAttemptRef.current = { signature: "", key: "" };
  }

  function closeReminder() {
    if (busy === "reminder") return;
    setShowReminder(false);
    setReminderDraft("");
    reminderAttemptRef.current = { signature: "", key: "" };
  }

  async function handleReminder(event) {
    event.preventDefault();

    if (!selected || !canSendInvoiceReminder || !selected.conversationId || busy) return;

    const messageText = reminderDraft.trim() || null;
    const command = {
      invoiceId: selected.invoiceId,
      expectedVersion: selected.currentVersion,
      messageText,
    };
    const signature = JSON.stringify(command);

    const idempotencyKey =
      reminderAttemptRef.current.signature === signature
        ? reminderAttemptRef.current.key
        : createPaymentReminderKey("INVOICE");

    reminderAttemptRef.current = {
      signature,
      key: idempotencyKey,
    };

    setBusy("reminder");
    setNotice("");

    try {
      await sendInvoicePaymentReminder({
        ...command,
        idempotencyKey,
        setPage,
      });

      setShowReminder(false);
      setReminderDraft("");
      reminderAttemptRef.current = { signature: "", key: "" };
      setNotice(copy.reminderSent);
    } catch (error) {
      if (
        error?.code === "STALE_PAYMENT_REMINDER_SOURCE" &&
        selected?.invoiceId
      ) {
        const invoiceId = selected.invoiceId;
        setShowReminder(false);
        setReminderDraft("");
        reminderAttemptRef.current = { signature: "", key: "" };
        await openInvoice(invoiceId);
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
      acceptCanonicalInvoice(result.invoice);
      resetPaymentInteraction();
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
    if (!selected || busy) return;
    setBusy("share");
    try {
      if (!await verifyCompletion()) return;
      const result = await shareInvoiceExternally({ invoice: selected, language, setPage });
      if (result.ok && result.method === "download") setNotice(copy.pdfReady);
    } catch (error) { setNotice(error?.message || copy.unavailable); }
    finally { setBusy(""); }
  }

  async function copyDetails() {
    try { if (selected && await copyInvoiceDetails({ invoice: selected, language })) setNotice(copy.copied); }
    catch (error) { setNotice(error?.message || copy.unavailable); }
  }

  async function emailInvoice() {
    if (!selected || busy) return;
    setBusy("email");
    try {
      if (!await verifyCompletion()) return;
      if (selected.authority?.kind === "BUSINESS_CUSTOMER") {
        await sendExternalEmail("INVOICE");
        return;
      }
      if (!await downloadInvoicePdf({ invoice: selected, setPage })) { setNotice(copy.unavailable); return; }
      setNotice("PDF downloaded. Attach it to the email draft before sending. External delivery is not confirmed by Meetro.");
      const url = buildInvoiceEmailUrl(selected, { language });
      if (url) window.location.href = url;
    } catch (error) { setNotice(error?.message || copy.unavailable); }
    finally { setBusy(""); }
  }

  async function sendExternalEmail(purpose, messageText = null) {
    const command = {invoiceId:selected.invoiceId,expectedVersion:selected.currentVersion,purpose,messageText};
    const signature = JSON.stringify(command);
    if (reminderAttemptRef.current.signature !== signature) reminderAttemptRef.current = {signature,key:createInvoiceCommandKey("invoice-email")};
    const result = await emailCanonicalInvoice({...command,idempotencyKey:reminderAttemptRef.current.key,setPage});
    setNotice(result.delivery.state === "REQUESTING" ? "Email request is pending." : `Email delivery requested for ${result.delivery.recipientEmail}.`);
    if(result.delivery.state !== "REQUESTING") reminderAttemptRef.current = {signature:"",key:""};
    return result;
  }

  async function externalReminder(transport) {
    if (!selected || selected.conversationId || !canSendInvoiceReminder || busy) return;
    setBusy("reminder");
    try {
      if (transport === "copy") {
        await navigator.clipboard.writeText(reminderDraft);
        setNotice("Reminder copied. No payment or delivery has been recorded.");
      } else if (transport === "email") {
        await sendExternalEmail("REMINDER", reminderDraft.trim() || null);
        setShowReminder(false);
      } else if (navigator.share) {
        await navigator.share({ title: `Payment reminder ${selected.invoiceNumber}`, text: reminderDraft });
      }
    } catch (error) { if (error?.name !== "AbortError") setNotice(error?.message || copy.unavailable); }
    finally { setBusy(""); }
  }

  const summary = workspace?.summary;
  const selectedActions = selected ? (
    <div style={styles.actions}>
      {(selected.conversationId || (selected.authority?.kind === "BUSINESS_CUSTOMER" && selected.status === "DRAFT")) && !confirmIssue && (
        <button type="button" style={styles.primaryButton} disabled={Boolean(busy)} onClick={beginIssue}>
          {selected.conversationId ? "Send via Meetro" : "Review Invoice"}
        </button>
      )}
      {confirmIssue && (
        <div style={styles.confirmRow} role="group" aria-label={copy.confirmSend}>
          <button type="button" style={styles.primaryButton} disabled={Boolean(busy)} onClick={handleIssue}>
            {selected.conversationId ? copy.confirmSend : "Confirm Invoice"}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={() => setConfirmIssue(false)}>
            {copy.cancel}
          </button>
        </div>
      )}
      {canSendInvoiceReminder && !showReminder && !showPayment && (
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={openReminder}
          data-action="send-payment-reminder"
        >
          {copy.sendReminder}
        </button>
      )}
      {selected.actions.canRecordPayment && !showPayment && (
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => {
            setShowReminder(false);
            setReminderDraft("");
            reminderAttemptRef.current = { signature: "", key: "" };
            setShowPayment(true);
          }}
        >
          {copy.recordPayment}
        </button>
      )}
      {selected.actions.canShareExternal && (
        <>
          <button type="button" style={styles.secondaryButton} onClick={share}>{copy.share}</button>
          <button type="button" style={styles.linkButton} disabled={Boolean(busy)} onClick={() => void emailInvoice()}>{selected.authority?.kind === "BUSINESS_CUSTOMER" ? "Email PDF" : "Download PDF + Open Email Draft"}</button>
          <button type="button" style={styles.secondaryButton} onClick={copyDetails}>{copy.copy}</button>
        </>
      )}
      {selected.actions.canShareExternal && <span style={styles.shareNote}>{copy.noPublicLink}</span>}
    </div>
  ) : null;
  const phase = initialInvoiceId ? invoicePhase : workspacePhase;
  const isLoading = phase === "loading" || invoicePhase === "loading";
  const hasError = phase === "error" || invoicePhase === "error";

  return (
    <section className="work-center-workspace" style={styles.workspace} data-invoice-workspace-phase={phase}>
      {onBack && (
        <div className="work-center-invoice-safe-header" style={styles.safeHeader}>
          <WorkCenterBackButton label={copy.back} onClick={onBack} />
        </div>
      )}
      <WorkCenterPageHeader
        eyebrow={workspaceCopy.financeEyebrow}
        title={copy.title}
        description={workspaceCopy.financeDescription}
      />

      <UniversalAskMeetroEntry language={language} context={{ invoiceId: selected?.invoiceId, jobId: selected?.jobId, conversationId: selected?.conversationId }} contextName={selected?.invoiceNumber || "Invoices & Payments"} />
      {isLoading && <p role="status">{copy.loading}</p>}
      {!isLoading && hasError && <p role="alert">{copy.unavailable}</p>}
      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      {completionNotice && <InvoiceCompletionNotice onClose={() => setCompletionNotice(false)} />}

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
                    localStorage.setItem("invoiceBuilderReturnPage", "workCenter");
                    localStorage.setItem("invoiceBuilderSource", "completed_job");
                    setPage(`invoiceBuilder?jobId=${encodeURIComponent(job.jobId)}`);
                  }}>{copy.create}</button>
                </div>
                <dl style={styles.moneySummary}>
                  <div><dt>Approved work</dt><dd>{money(job.approvedAmount?.totalMinor || 0, job.approvedAmount?.currency)}</dd></div>
                  <div><dt>Payments received</dt><dd>{money(job.paymentsReceivedMinor, job.approvedAmount?.currency)}</dd></div>
                  <div><dt>Amount still due</dt><dd>{money(job.amountStillDueMinor, job.approvedAmount?.currency)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </section>
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

          {showReminder && canSendInvoiceReminder && (
            <form
              style={styles.form}
              onSubmit={handleReminder}
              data-payment-reminder-form="invoice"
            >
              <h3 style={styles.subheading}>{copy.reminderTitle}</h3>

              <p style={styles.reminderDescription}>
                {copy.reminderDescription}
              </p>

              <p style={styles.reminderGuard}>
                {copy.reminderOnly}
              </p>

              <label style={styles.field}>
                {copy.reminderMessage}
                <textarea
                  maxLength={5000}
                  value={reminderDraft}
                  onChange={(event) => {
                    setReminderDraft(event.target.value);
                    reminderAttemptRef.current = { signature: "", key: "" };
                  }}
                  placeholder={copy.reminderPlaceholder}
                  style={styles.textarea}
                />
              </label>

              <div style={styles.confirmRow}>
                {selected.conversationId ? <button
                  type="submit"
                  disabled={busy === "reminder"}
                  style={styles.primaryButton}
                >
                  {busy === "reminder"
                    ? copy.sendingReminder
                    : copy.confirmReminder}
                </button> : <>
                  <button type="button" onClick={() => externalReminder("copy")}>Copy reminder</button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => externalReminder("email")}>Email reminder</button>
                  {typeof navigator.share === "function" && <button type="button" onClick={() => externalReminder("share")}>Share reminder</button>}
                </>}

                <button
                  type="button"
                  disabled={busy === "reminder"}
                  style={styles.secondaryButton}
                  onClick={closeReminder}
                >
                  {copy.cancel}
                </button>
              </div>
            </form>
          )}

          {showPayment && selected.actions.canRecordPayment && (
            <form style={styles.form} onSubmit={handlePayment} data-record-payment-form="invoice">
              <h3 style={styles.subheading}>{copy.recordPayment}</h3>
              <label style={styles.field}>{copy.amount}<input required inputMode="decimal" value={paymentDraft.amount} onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))} style={styles.input} /></label>
              <label style={styles.field}>{copy.method}<select value={paymentDraft.method} onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))} style={styles.input}><option value="CASH">{copy.cash}</option><option value="CHECK">{copy.check}</option><option value="BANK_TRANSFER">{copy.bankTransfer}</option><option value="OTHER">{copy.other}</option></select></label>
              <label style={styles.field}>{copy.receivedDate}<input required max={today()} type="date" value={paymentDraft.receivedDate} onChange={(event) => setPaymentDraft((current) => ({ ...current, receivedDate: event.target.value }))} style={styles.input} /></label>
              <label style={styles.field}>{copy.reference}<input maxLength={500} value={paymentDraft.reference} onChange={(event) => setPaymentDraft((current) => ({ ...current, reference: event.target.value }))} style={styles.input} /></label>
              <div style={styles.confirmRow}><button type="submit" disabled={busy === "payment" || !dollarsToMinor(paymentDraft.amount)} style={styles.primaryButton}>{copy.recordPayment}</button><button type="button" style={styles.secondaryButton} onClick={resetPaymentInteraction}>{copy.cancel}</button></div>
            </form>
          )}
        </section>
      )}
    </section>
  );
}

const styles = {
  workspace: { width: "100%", maxWidth: "100%", minWidth: 0, paddingTop: "max(8px, calc(env(safe-area-inset-top, 0px) + 8px))", boxSizing: "border-box" },
  safeHeader: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  notice: { margin: 0, padding: 12, borderLeft: "4px solid #0f766e", background: "#eff8f7" },
  band: { display: "grid", gap: 10, minWidth: 0, paddingTop: 4 },
  subheading: { margin: 0, fontSize: 18, letterSpacing: 0 },
  list: { display: "grid", gap: 8, minWidth: 0 },
  row: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, border: "1px solid #d7ded8", borderRadius: 6, background: "#fff" },
  rowCopy: { display: "grid", gap: 3, minWidth: 0, overflowWrap: "anywhere" },
  rowAction: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 },
  moneySummary: { display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 8, width: "100%", margin: 0 },
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
  reminderDescription: { margin: 0, lineHeight: 1.5, color: "#475449" },
  reminderGuard: { margin: 0, padding: 10, borderLeft: "4px solid #1f5132", background: "#eef6f0", color: "#173d25", fontWeight: 800, lineHeight: 1.45 },
  assistantResult: { display: "grid", gap: 10, minWidth: 0 },
  financialTruth: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: 10, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff" },
  assistantText: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
};
