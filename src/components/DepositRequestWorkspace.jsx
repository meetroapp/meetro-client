import { useEffect, useMemo, useState } from "react";

import BottomNav from "./BottomNav.jsx";
import {
  createBusinessDocumentDraft,
  createBusinessDocumentSaveKey,
  deliverBusinessDocumentDraft,
  getBusinessDocumentCustomerPdf,
  listBusinessDocumentDeliveries,
  listBusinessDocumentDrafts,
  updateBusinessDocumentDraft,
} from "../utils/businessDocumentDraftApi.js";
import {
  downloadBusinessDocumentPdfArtifact,
  previewBusinessDocumentPdfArtifact,
} from "../utils/businessDocumentDeviceShare.js";
import {
  fetchProfessionalPreWorkDeposit,
  formatDepositMoney,
} from "../utils/preWorkDepositApi.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialContent(job, quote) {
  return {
    customerName: job?.customerName || quote?.customerName || "",
    customerEmail: quote?.customerEmail || "",
    customerPhone: quote?.customerPhone || "",
    customerLocation: job?.location || quote?.customerLocation || "",
    projectTitle: job?.title || quote?.projectTitle || "",
    quoteReference: quote?.quoteNumber || "",
    dueDate: "",
    notes: "Thank you for approving the work.",
    paymentInstructions: quote?.paymentTerms || quote?.terms || "",
    customerMessage: "Please review this deposit request. Payment is required before scheduling can begin.",
  };
}

function documentPayload({ jobId, paymentRequirementId, content }) {
  return {
    documentType: "DEPOSIT_REQUEST",
    jobId,
    paymentRequirementId,
    content,
    workspace: {
      activeDocument: "DEPOSIT_REQUEST",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    customerParty: null,
  };
}

function proposalFromInstruction(instruction) {
  const text = String(instruction || "").trim();
  if (!text) return null;
  const patch = {};
  if (/thank/i.test(text)) patch.notes = "Thank you for approving the work.";
  if (/before scheduling/i.test(text)) {
    patch.customerMessage = "Thank you for approving the work. The deposit is required before scheduling can begin.";
  }
  const due = text.match(/(?:due|make it due)\s+(.+?)(?:[.!]|$)/i);
  if (due) patch.dueDate = due[1].trim();
  const method = text.match(/(?:pay|payment)(?:\s+by|\s+with|\s+instructions?\s*:?)\s+(.+?)(?:[.!]|$)/i);
  if (method) patch.paymentInstructions = method[1].trim();
  if (!Object.keys(patch).length) patch.notes = text;
  return patch;
}

function deliveryLabel(deliveries) {
  const latest = deliveries[0] || null;
  const successful = deliveries.some((item) => ["SENT", "DELIVERY_REQUESTED"].includes(item.state));
  if (latest?.state === "FAILED") return "Retry Send";
  if (successful) return "Resend Deposit Request";
  return "Send Deposit Request";
}

export default function DepositRequestWorkspace({ setPage, job = {}, quote = {}, onBack }) {
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deposit, setDeposit] = useState(null);
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState(() => initialContent(job, quote));
  const [baseline, setBaseline] = useState(() => initialContent(job, quote));
  const [manual, setManual] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);

  const jobId = job?.id || "";
  const dirty = JSON.stringify(content) !== JSON.stringify(baseline);
  const authority = document?.depositRequestAuthority || deposit;
  const eligible = Boolean(
    authority && ["DUE", "PARTIALLY_SATISFIED"].includes(authority.state) &&
      authority.remainingMinor > 0
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchProfessionalPreWorkDeposit({ jobId, setPage }),
      listBusinessDocumentDrafts({ type: "DEPOSIT_REQUEST", setPage }),
    ]).then(async ([read, documents]) => {
      if (!active) return;
      const exact = documents.find((candidate) =>
        candidate.jobId === jobId &&
        candidate.paymentRequirementId === read.deposit.obligationId
      ) || null;
      const nextContent = exact?.content || initialContent(job, quote);
      const history = exact
        ? await listBusinessDocumentDeliveries({ draftId: exact.id, setPage })
        : [];
      if (!active) return;
      setDeposit(read.deposit);
      setDocument(exact);
      setContent(nextContent);
      setBaseline(nextContent);
      setDeliveries(history);
      setPhase("ready");
    }).catch((reason) => {
      if (!active) return;
      setError(reason?.message || "The exact deposit requirement could not be loaded.");
      setPhase("error");
    });
    return () => { active = false; };
  }, [jobId, setPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const money = useMemo(() => {
    if (!authority) return null;
    return {
      project: formatDepositMoney(authority.quoteTotalMinor, authority.currency),
      requested: formatDepositMoney(authority.requiredMinor, authority.currency),
      after: formatDepositMoney(authority.quoteTotalMinor - authority.requiredMinor, authority.currency),
      received: formatDepositMoney(authority.appliedMinor, authority.currency),
      needed: formatDepositMoney(authority.remainingMinor, authority.currency),
    };
  }, [authority]);

  async function save() {
    if (!deposit?.obligationId || !eligible) throw new Error("This deposit requirement is no longer available for preparation.");
    const payload = documentPayload({ jobId, paymentRequirementId: deposit.obligationId, content });
    const saved = document
      ? await updateBusinessDocumentDraft({
          draftId: document.id,
          expectedVersion: document.version,
          payload,
          idempotencyKey: createBusinessDocumentSaveKey(),
          setPage,
        })
      : await createBusinessDocumentDraft({
          payload,
          idempotencyKey: createBusinessDocumentSaveKey(),
          setPage,
        });
    setDocument(saved);
    setContent(saved.content);
    setBaseline(saved.content);
    setDeposit((current) => current || saved.depositRequestAuthority);
    setNotice("Deposit Request draft saved. Nothing was sent and no payment was created.");
    return saved;
  }

  async function saveClick() {
    setBusy(true);
    setError("");
    try { await save(); } catch (reason) { setError(reason?.message || "The Deposit Request could not be saved."); }
    finally { setBusy(false); }
  }

  function propose() {
    const patch = proposalFromInstruction(instruction);
    if (!patch) return;
    setProposal(patch);
  }

  async function beginDelivery() {
    setBusy(true);
    setError("");
    try {
      const saved = !document || dirty ? await save() : document;
      setReview({
        document: saved,
        channel: saved.content.customerEmail ? "EMAIL" : "MEETRO_MESSAGE",
        recipientEmail: saved.content.customerEmail || "",
        subject: `Deposit Request ${saved.reference}`,
        customerMessage: saved.content.customerMessage || "Please review this deposit request.",
      });
    } catch (reason) {
      setError(reason?.message || "The exact saved request could not be prepared for review.");
    } finally { setBusy(false); }
  }

  async function send() {
    if (!review?.document) return;
    setBusy(true);
    setError("");
    try {
      const delivery = await deliverBusinessDocumentDraft({
        draftId: review.document.id,
        expectedVersion: review.document.version,
        channel: review.channel,
        recipientEmail: review.recipientEmail,
        subject: review.subject,
        customerMessage: review.customerMessage,
        idempotencyKey: createBusinessDocumentSaveKey(),
        setPage,
      });
      const history = await listBusinessDocumentDeliveries({ draftId: review.document.id, setPage });
      setDeliveries(history);
      setReview(null);
      setNotice(delivery.state === "FAILED"
        ? "Delivery failed. The request remains saved and no payment was created."
        : "Deposit Request sent. The requirement remains unpaid until real payment is verified.");
    } catch (reason) {
      if (document) {
        try { setDeliveries(await listBusinessDocumentDeliveries({ draftId: document.id, setPage })); } catch { /* keep delivery error */ }
      }
      setError(reason?.message || "The Deposit Request was not sent.");
      setReview(null);
    } finally { setBusy(false); }
  }

  async function pdf(action) {
    if (!document || dirty) {
      setError("Save the exact request version before opening its customer PDF.");
      return;
    }
    setBusy(true);
    try {
      const artifact = await getBusinessDocumentCustomerPdf({
        draftId: document.id,
        expectedVersion: document.version,
        documentType: document.documentType,
        reference: document.reference,
        setPage,
      });
      if (action === "preview") previewBusinessDocumentPdfArtifact(artifact);
      else downloadBusinessDocumentPdfArtifact(artifact);
    } catch (reason) { setError(reason?.message || "The saved customer PDF is unavailable."); }
    finally { setBusy(false); }
  }

  if (phase === "loading") return <div className="app-page meetro-form-page"><p role="status">Loading the exact deposit requirement…</p></div>;
  if (phase === "error" || !eligible || !money) {
    return <div className="app-page meetro-form-page" role="alert"><h1>Deposit Request unavailable</h1><p>{error || "This Job has no active unpaid deposit requirement."}</p><button type="button" onClick={onBack}>Go Back</button></div>;
  }

  return (
    <div className="app-page meetro-wide-page business-document-workspace" style={styles.page}>
      <header className="business-document-header">
        <button type="button" className="business-document-back" onClick={onBack} aria-label="Leave Deposit Request workspace">←</button>
        <div><div className="business-document-title-row"><h1>{content.projectTitle || "Deposit Request"}</h1><span>Job linked</span></div><p>{content.customerName ? `Customer: ${content.customerName}` : "Customer linked through the approved Job"}</p></div>
        <div className="business-document-header-actions"><span>{document ? `Saved · v${document.version}` : "Not saved"}</span></div>
      </header>

      <nav className="business-document-tabs" aria-label="Business documents">
        <button type="button" onClick={() => setPage(`quoteBuilder?jobId=${encodeURIComponent(jobId)}`)}>Quote</button>
        <button type="button" onClick={() => setPage(`invoiceBuilder?jobId=${encodeURIComponent(jobId)}`)}>Invoice</button>
        <button type="button" className="active" aria-current="page">Deposit Request</button>
      </nav>

      <main style={styles.main}>
        <section style={styles.assistant} aria-label="Meetro-assisted Deposit Request review">
          <h2>Prepare Deposit Request</h2>
          <p>Tell Meetro what customer-facing note, due date, or payment instructions to propose. Nothing is applied or sent automatically.</p>
          <textarea rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Thank the customer and tell them they can pay by check." style={styles.input} />
          <button type="button" onClick={propose} disabled={!instruction.trim()}>Propose Change</button>
          {proposal ? <div style={styles.proposal}><strong>Review proposed changes</strong>{Object.entries(proposal).map(([key, value]) => <p key={key}><b>{key.replace(/([A-Z])/g, " $1")}:</b> {value}</p>)}<div style={styles.row}><button type="button" onClick={() => setProposal(null)}>Dismiss</button><button type="button" onClick={() => { setContent((current) => ({ ...current, ...proposal })); setProposal(null); setInstruction(""); }}>Apply</button></div></div> : null}
          <button type="button" onClick={() => setManual((current) => !current)} aria-expanded={manual}>{manual ? "Hide manual form" : "Fill form manually"}</button>
          {manual ? <div style={styles.form}>
            <label>Customer<input value={content.customerName} onChange={(event) => setContent({ ...content, customerName: event.target.value })} style={styles.input} /></label>
            <label>Customer email<input type="email" value={content.customerEmail} onChange={(event) => setContent({ ...content, customerEmail: event.target.value })} style={styles.input} /></label>
            <label>Due date<input type="date" min={today()} value={/^\d{4}-\d{2}-\d{2}$/.test(content.dueDate) ? content.dueDate : ""} onChange={(event) => setContent({ ...content, dueDate: event.target.value })} style={styles.input} /></label>
            <label>Note<textarea rows={3} value={content.notes} onChange={(event) => setContent({ ...content, notes: event.target.value })} style={styles.input} /></label>
            <label>Payment instructions<textarea rows={3} value={content.paymentInstructions} onChange={(event) => setContent({ ...content, paymentInstructions: event.target.value })} style={styles.input} /></label>
            <label>Delivery message<textarea rows={3} value={content.customerMessage} onChange={(event) => setContent({ ...content, customerMessage: event.target.value })} style={styles.input} /></label>
          </div> : null}
          {error ? <p role="alert" style={styles.error}>{error}</p> : null}
          {notice ? <p role="status" style={styles.notice}>{notice}</p> : null}
        </section>

        <section style={styles.preview} aria-label="Live Deposit Request Preview">
          <header style={styles.previewHeader}><div><small>DEPOSIT REQUEST</small><h2>{document?.reference || "Draft"}</h2></div><span>Live preview</span></header>
          <dl style={styles.summary}>
            <div><dt>Customer</dt><dd>{content.customerName || "Linked customer"}</dd></div>
            <div><dt>Project</dt><dd>{content.projectTitle || "Linked Job"}</dd></div>
            <div><dt>Approved Quote</dt><dd>{document?.depositRequestAuthority?.quoteReference || content.quoteReference || "Verified approved Quote"}</dd></div>
          </dl>
          <div style={styles.money}><p><span>Project total</span><strong>{money.project}</strong></p><p><span>Deposit requested</span><strong>{money.requested}</strong></p><p><span>Amount remaining after deposit</span><strong>{money.after}</strong></p>{authority.appliedMinor > 0 ? <p><span>Payments received</span><strong>{money.received}</strong></p> : null}<p><span>Amount still needed</span><strong>{money.needed}</strong></p></div>
          {content.dueDate ? <p><strong>Due date</strong><br />{content.dueDate}</p> : null}
          {content.paymentInstructions ? <p><strong>Payment instructions</strong><br />{content.paymentInstructions}</p> : null}
          {content.notes ? <p><strong>Note</strong><br />{content.notes}</p> : null}
          <div style={styles.actions}><button type="button" onClick={saveClick} disabled={busy || (document && !dirty)}>{busy ? "Working…" : document ? "Save Draft" : "Save Draft"}</button><button type="button" onClick={() => void pdf("preview")} disabled={!document || dirty || busy}>Preview PDF</button><button type="button" onClick={() => void pdf("download")} disabled={!document || dirty || busy}>Download PDF</button><button type="button" onClick={beginDelivery} disabled={busy}>{deliveryLabel(deliveries)}</button></div>
          {deliveries.length ? <section><h3>Delivery history</h3><ul>{deliveries.map((item) => <li key={item.id}>{item.state === "FAILED" ? "Deposit request delivery failed" : item.channel === "EMAIL" ? "Deposit request emailed" : "Deposit request sent in Meetro"} · {new Date(item.requestedAt).toLocaleString()}</li>)}</ul></section> : null}
        </section>
      </main>

      {review ? <div style={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="deposit-send-review" style={styles.dialog}><h2 id="deposit-send-review">Review Deposit Request delivery</h2><p>This sends the exact saved request. It does not record payment or satisfy the deposit.</p><label>Channel<select value={review.channel} onChange={(event) => setReview({ ...review, channel: event.target.value })} style={styles.input}><option value="MEETRO_MESSAGE">Meetro Message</option><option value="EMAIL">Email with Meetro</option></select></label>{review.channel === "EMAIL" ? <label>Recipient email<input type="email" value={review.recipientEmail} onChange={(event) => setReview({ ...review, recipientEmail: event.target.value })} style={styles.input} /></label> : null}<label>Subject<input value={review.subject} onChange={(event) => setReview({ ...review, subject: event.target.value })} style={styles.input} /></label><label>Customer message<textarea rows={4} value={review.customerMessage} onChange={(event) => setReview({ ...review, customerMessage: event.target.value })} style={styles.input} /></label><div style={styles.row}><button type="button" onClick={() => setReview(null)} disabled={busy}>Cancel</button><button type="button" onClick={send} disabled={busy || (review.channel === "EMAIL" && !review.recipientEmail)}>{busy ? "Sending…" : deliveryLabel(deliveries)}</button></div></section></div> : null}
      <BottomNav setPage={setPage} currentPage="quoteBuilder" />
    </div>
  );
}

const styles = {
  page: { paddingBottom: 90 },
  main: { display: "grid", gridTemplateColumns: "minmax(280px, .8fr) minmax(360px, 1.2fr)", gap: 20, padding: 20 },
  assistant: { display: "grid", alignContent: "start", gap: 14, padding: 20, border: "1px solid #d9e4dc", borderRadius: 14, background: "#fff" },
  preview: { display: "grid", alignContent: "start", gap: 18, padding: 28, border: "1px solid #cfdad2", borderRadius: 14, background: "#fff", boxShadow: "0 10px 32px rgba(20, 50, 32, .08)" },
  previewHeader: { display: "flex", justifyContent: "space-between", borderBottom: "2px solid #173f2b", paddingBottom: 16 },
  summary: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: 0 },
  money: { padding: 18, borderRadius: 12, background: "#f2f7f3" },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  row: { display: "flex", justifyContent: "flex-end", gap: 8 },
  input: { width: "100%", boxSizing: "border-box", marginTop: 5, padding: 10, border: "1px solid #b9c8bd", borderRadius: 8 },
  form: { display: "grid", gap: 12 },
  proposal: { padding: 14, border: "1px solid #9dc9aa", borderRadius: 10, background: "#f1faf3" },
  error: { color: "#9f1d20", fontWeight: 700 },
  notice: { color: "#155d33", fontWeight: 700 },
  overlay: { position: "fixed", inset: 0, zIndex: 8000, display: "grid", placeItems: "center", padding: 20, background: "rgba(7, 20, 12, .55)" },
  dialog: { display: "grid", gap: 14, width: "min(100%, 540px)", maxHeight: "90vh", overflow: "auto", padding: 24, borderRadius: 14, background: "#fff" },
};
