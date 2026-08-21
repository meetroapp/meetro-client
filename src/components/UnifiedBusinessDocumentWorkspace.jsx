import { useMemo, useRef, useState } from "react";

import BottomNav from "./BottomNav.jsx";
import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import {
  buildBusinessDocumentConversationPatch,
  createInvoiceContinuityDraft,
  customerVisibleWorkspaceDraft,
  normalizeBusinessDocumentTab,
} from "../utils/businessDocumentWorkspace.js";
import { getBusinessIdentityProjection } from "../utils/businessIdentity.js";
import { buildQuickInvoiceDocumentModel } from "../utils/customerDocumentModel.js";
import {
  downloadCustomerDocumentPdf,
  getCustomerDocumentActionCopy,
  previewCustomerDocumentPdf,
} from "../utils/customerDocumentPdf.js";
import "./UnifiedBusinessDocumentWorkspace.css";

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function todayLocalIsoDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function quoteRows(quote) {
  return [
    ...(quote.lineItems || []).map((item) => ({
      id: item.id,
      description: item.description,
      amount: Number(item.total || 0),
    })),
    ...(quote.materialItems || []).map((item) => ({
      id: item.id,
      description: item.name,
      amount: Number(item.total || 0),
    })),
    ...(quote.laborItems || []).map((item) => ({
      id: item.id,
      description: item.description,
      amount: Number(item.total || (Number(item.hours || 0) * Number(item.rate || 0))),
    })),
  ].filter((item) => item.description || item.amount > 0);
}

function DocumentTabs({ activeDocument, onDocumentChange, onSavedFiles }) {
  return (
    <nav className="business-document-tabs" aria-label="Business documents">
      {[
        ["quote", "Quote", "quickQuote"],
        ["invoice", "Invoice", "quickInvoice"],
      ].map(([id, label, icon]) => (
        <button
          key={id}
          type="button"
          className={activeDocument === id ? "active" : ""}
          aria-current={activeDocument === id ? "page" : undefined}
          onClick={() => onDocumentChange(id)}
        >
          <MeetroIcon name={icon} size={17} decorative />
          {label}
        </button>
      ))}
      <button type="button" onClick={onSavedFiles} aria-haspopup="dialog">
        <MeetroIcon name="history" size={17} decorative />
        Saved Files
      </button>
    </nav>
  );
}

function DeliveryMenu({ kind, onUnavailable }) {
  const [open, setOpen] = useState(false);
  const label = kind === "quote" ? "Send Quote" : "Send Invoice";

  return (
    <div className="business-document-delivery">
      <button
        type="button"
        className="business-document-primary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label} <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div role="menu" className="business-document-delivery-menu">
          <button type="button" role="menuitem" onClick={() => onUnavailable("Email")}>Email</button>
          <button type="button" role="menuitem" onClick={() => onUnavailable("Message")}>Message</button>
        </div>
      ) : null}
    </div>
  );
}

function QuotePreview({ quote, branding }) {
  const rows = quoteRows(quote);
  return (
    <article className="business-live-document" aria-label="Live Quote Preview">
      <header className="business-document-preview-heading">
        <strong>{branding.businessName}</strong>
        <div><b>QUOTE</b><span>DRAFT PREVIEW</span></div>
      </header>
      <dl className="business-document-meta">
        <div><dt>Customer</dt><dd>{quote.customerName || "—"}</dd></div>
        <div><dt>Project</dt><dd>{quote.projectTitle || "—"}</dd></div>
        <div><dt>Quote #</dt><dd>{quote.quoteNumber || "Draft"}</dd></div>
        <div><dt>Date</dt><dd>{quote.quoteDate || "—"}</dd></div>
      </dl>
      <section className="business-document-copy">
        <h3>Scope of Work</h3>
        <p>{quote.recommendedSolution || quote.projectDescription || "Tell Meetro about the work to begin this draft."}</p>
      </section>
      <div className="business-document-table" role="table" aria-label="Quote line items">
        <div className="head" role="row"><span>Description</span><span>Amount</span></div>
        {rows.length ? rows.map((item) => (
          <div role="row" key={item.id}><span>{item.description || "Service"}</span><strong>{money(item.amount)}</strong></div>
        )) : <div role="row"><span>Working draft</span><strong>—</strong></div>}
        <div className="total" role="row"><span>PROJECT PRICE</span><strong>{quote.total > 0 ? money(quote.total) : "—"}</strong></div>
      </div>
      <div className="business-document-footer-grid">
        <section><h3>Payment Terms</h3><p>{quote.terms || "Confirm terms before delivery."}</p></section>
        <section><h3>Estimated Duration</h3><p>{quote.estimatedDuration || "Not confirmed"}</p></section>
        <section><h3>Acceptance / Status</h3><p>Draft only. Nothing is issued or approved.</p></section>
      </div>
      <footer>{branding.businessName}<span>Prepared with Meetro</span></footer>
    </article>
  );
}

function InvoicePreview({ invoice, branding, beforePhotos, afterPhotos }) {
  return (
    <article className="business-live-document" aria-label="Live Invoice Preview">
      <header className="business-document-preview-heading">
        <strong>{branding.businessName}</strong>
        <div><b>INVOICE</b><span>DRAFT PREVIEW</span></div>
      </header>
      <dl className="business-document-meta">
        <div><dt>Bill To</dt><dd>{invoice.customerName || "—"}</dd></div>
        <div><dt>Job</dt><dd>{invoice.projectTitle || "—"}</dd></div>
        <div><dt>Invoice #</dt><dd>{invoice.invoiceNumber || "Draft"}</dd></div>
        <div><dt>Date</dt><dd>{invoice.invoiceDate || "—"}</dd></div>
        <div><dt>Quote reference</dt><dd>{invoice.quoteReference || "Not linked"}</dd></div>
      </dl>
      <section className="business-document-copy">
        <h3>Work Completed</h3>
        <p>{invoice.workPerformed || "Completion details have not been confirmed."}</p>
      </section>
      {(beforePhotos.length || afterPhotos.length) ? (
        <section className="business-document-proof" aria-label="Before and After Photos">
          <div><h3>Before</h3><PhotoStrip photos={beforePhotos} /></div>
          <div><h3>After</h3><PhotoStrip photos={afterPhotos} /></div>
        </section>
      ) : null}
      <div className="business-document-table" role="table" aria-label="Invoice summary">
        <div className="head" role="row"><span>Invoice Summary</span><span>Amount</span></div>
        <div role="row"><span>Confirmed invoice amount</span><strong>{invoice.totalOverride ? money(invoice.totalOverride) : "—"}</strong></div>
        <div className="total" role="row"><span>TOTAL DUE</span><strong>{invoice.totalOverride ? money(invoice.totalOverride) : "—"}</strong></div>
      </div>
      <div className="business-document-footer-grid">
        <section><h3>Payment Terms</h3><p>{invoice.paymentTerms || "Not confirmed"}</p></section>
        <section><h3>Status</h3><p>Draft only. Payment and completion are not inferred.</p></section>
      </div>
      <footer>{branding.businessName}<span>Prepared with Meetro</span></footer>
    </article>
  );
}

function PhotoStrip({ photos }) {
  return <div className="business-document-photo-strip">{photos.map((photo) => (
    photo.previewUrl ? <img key={photo.id} src={photo.previewUrl} alt="Documented work" /> : null
  ))}</div>;
}

function ManualEditor({ activeDocument, quote, invoice, onQuoteFieldChange, onInvoiceFieldChange, onClose }) {
  const fields = activeDocument === "quote"
    ? [
        ["customerName", "Customer"], ["projectTitle", "Project"],
        ["recommendedSolution", "Scope of Work"], ["totalOverride", "Customer price"],
        ["terms", "Payment terms / conditions"], ["estimatedDuration", "Estimated duration"],
        ["notes", "Customer notes"],
      ]
    : [
        ["customerName", "Customer"], ["projectTitle", "Job"],
        ["workPerformed", "Work completed"], ["totalOverride", "Invoice amount"],
        ["paymentTerms", "Payment terms"], ["notes", "Customer notes"],
      ];
  const values = activeDocument === "quote" ? quote : invoice;
  const update = activeDocument === "quote" ? onQuoteFieldChange : onInvoiceFieldChange;

  return (
    <section className="business-document-manual" aria-labelledby="business-document-manual-title">
      <header><div><span>Manual entry</span><h2 id="business-document-manual-title">Edit the live {activeDocument}</h2></div><button type="button" onClick={onClose}>Close</button></header>
      <div>{fields.map(([field, label]) => (
        <label key={field}>{label}
          {field === "recommendedSolution" || field === "workPerformed" || field === "terms" || field === "paymentTerms" || field === "notes" ? (
            <textarea value={values[field] || ""} onChange={(event) => update(field, event.target.value)} />
          ) : (
            <input inputMode={field === "totalOverride" ? "decimal" : undefined} value={values[field] || ""} onChange={(event) => update(field, event.target.value)} />
          )}
        </label>
      ))}</div>
    </section>
  );
}

function SavedFilesDrawer({ onClose }) {
  return (
    <>
      <button type="button" className="business-saved-backdrop" aria-label="Close Saved Files" onClick={onClose} />
      <aside className="business-saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-files-title">
        <header><h2 id="saved-files-title">Saved Quotes &amp; Invoices</h2><button type="button" onClick={onClose} aria-label="Close Saved Files">×</button></header>
        <input type="search" placeholder="Search customer, job, number, or address…" aria-label="Search saved documents" />
        <div className="business-saved-filters" aria-label="Saved document filters">
          <button type="button">All Types</button><button type="button">All Status</button><button type="button">All Time</button>
        </div>
        <div className="business-saved-empty" role="status">
          <MeetroIcon name="history" size={28} decorative />
          <strong>Governed document history will appear here.</strong>
          <p>No browser-stored or fabricated records are shown. Complete Quote and Invoice search requires a canonical backend listing capability.</p>
        </div>
      </aside>
    </>
  );
}

export default function UnifiedBusinessDocumentWorkspace({
  setPage,
  language = "en",
  initialDocument = "quote",
  job = {},
  quote,
  onApplyQuotePatch,
  onQuoteFieldChange,
  onAddPhotos,
  photos = [],
  photoBusy = false,
  onDownloadQuote,
  onPreviewQuote,
  onBack,
}) {
  const [activeDocument, setActiveDocument] = useState(() => normalizeBusinessDocumentTab(initialDocument));
  const [mobilePane, setMobilePane] = useState("conversation");
  const [savedFilesOpen, setSavedFilesOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [privateReminders, setPrivateReminders] = useState([]);
  const [photoRoles, setPhotoRoles] = useState({});
  const [turns, setTurns] = useState([
    { id: "welcome", actor: "meetro", text: "Tell me what you want to change. I’ll keep the working document updated in real time." },
  ]);
  const [invoice, setInvoice] = useState(() => ({
    ...createInvoiceContinuityDraft({ job, quote }),
    invoiceNumber: "",
    invoiceDate: todayLocalIsoDate(),
  }));
  const previewRef = useRef(null);
  const branding = useMemo(() => getBusinessIdentityProjection({}, { fallbackName: "Meetro Professional" }), []);
  const beforePhotos = photos.filter((photo) => photoRoles[photo.id] === "before");
  const afterPhotos = photos.filter((photo) => photoRoles[photo.id] === "after");

  function onInvoiceFieldChange(field, value) {
    setInvoice((current) => ({ ...current, [field]: value }));
  }

  function switchDocument(documentType) {
    setActiveDocument(normalizeBusinessDocumentTab(documentType));
    setManualOpen(false);
    setNotice("");
  }

  function submitMessage() {
    const instruction = message.trim();
    if (!instruction) return;
    const current = activeDocument === "quote" ? quote : invoice;
    const patch = buildBusinessDocumentConversationPatch({ documentType: activeDocument, instruction, current });
    const { privateReminder, photoIntent, ...documentPatch } = patch;
    if (privateReminder) setPrivateReminders((items) => [...items, privateReminder]);
    if (photoIntent) {
      setPhotoRoles((roles) => ({ ...roles, ...Object.fromEntries(photos.map((photo) => [photo.id, photoIntent])) }));
    }
    if (activeDocument === "quote") onApplyQuotePatch(documentPatch);
    else setInvoice((currentInvoice) => ({ ...currentInvoice, ...documentPatch }));
    setTurns((currentTurns) => [
      ...currentTurns,
      { id: `user-${Date.now()}`, actor: "you", text: instruction },
      {
        id: `meetro-${Date.now()}`,
        actor: "meetro",
        text: Object.keys(patch).length
          ? `${activeDocument === "quote" ? "Quote" : "Invoice"} working draft updated. Review the live document.`
          : "I kept your instruction in the conversation. Use manual edit for details that are not yet supported by the working-draft parser.",
      },
    ]);
    setMessage("");
  }

  function focusPreview() {
    setMobilePane("preview");
    requestAnimationFrame(() => previewRef.current?.focus());
  }

  async function downloadInvoice() {
    const customerVisible = customerVisibleWorkspaceDraft(invoice);
    const model = buildQuickInvoiceDocumentModel({
      ...customerVisible,
      total: Number(customerVisible.totalOverride || 0),
      subtotal: Number(customerVisible.totalOverride || 0),
      lineItems: [],
      serviceDescription: customerVisible.projectTitle,
    }, { locale: language, branding });
    const copy = getCustomerDocumentActionCopy(language);
    setNotice(await downloadCustomerDocumentPdf(model) ? copy.pdfReady : copy.pdfUnavailable);
  }

  function previewInvoice() {
    const customerVisible = customerVisibleWorkspaceDraft(invoice);
    const model = buildQuickInvoiceDocumentModel({
      ...customerVisible,
      total: Number(customerVisible.totalOverride || 0),
      subtotal: Number(customerVisible.totalOverride || 0),
      lineItems: [],
      serviceDescription: customerVisible.projectTitle,
    }, { locale: language, branding });
    const result = previewCustomerDocumentPdf(model);
    if (!result.ok) setNotice("PDF preview is unavailable. Nothing was saved or sent.");
  }

  function deliveryUnavailable(channel) {
    setNotice(`${channel} delivery is not available from this working draft. Nothing was sent or approved.`);
  }

  return (
    <div className="app-page meetro-wide-page business-document-workspace">
      <header className="business-document-header">
        <button type="button" className="business-document-back" onClick={onBack} aria-label="Leave Quote and Invoice workspace">←</button>
        <div><div className="business-document-title-row"><h1>{job.title || quote.projectTitle || "Quote & Invoice"}</h1><span>{job.canonical ? "Active Job" : "Working draft"}</span></div><p>{job.customerName || quote.customerName ? `Customer: ${job.customerName || quote.customerName}` : "Customer not selected"}{job.location || quote.customerLocation ? ` · ${job.location || quote.customerLocation}` : ""}</p></div>
      </header>

      <DocumentTabs activeDocument={activeDocument} onDocumentChange={switchDocument} onSavedFiles={() => setSavedFilesOpen(true)} />

      <div className="business-document-mobile-switch" role="tablist" aria-label="Workspace view">
        <button type="button" role="tab" aria-selected={mobilePane === "conversation"} onClick={() => setMobilePane("conversation")}>Conversation</button>
        <button type="button" role="tab" aria-selected={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Preview</button>
      </div>

      <main className="business-document-main">
        <section className={`business-document-conversation ${mobilePane === "conversation" ? "mobile-active" : ""}`} aria-labelledby="business-document-conversation-title">
          <div className="business-document-conversation-heading"><div><h2 id="business-document-conversation-title">{activeDocument === "quote" ? "Work with Meetro" : "Ask Meetro"}</h2><p>Chat, speak, or upload photos. The working {activeDocument} stays visible.</p></div><button type="button">How it works</button></div>
          <div className="business-document-entry-choice">
            <button type="button" onClick={() => document.getElementById("business-document-message")?.focus()}><MeetroIcon name="assistant" size={18} decorative /><span><strong>Let Meetro prefill the form</strong><small>Recommended</small></span></button>
            <button type="button" onClick={() => setManualOpen(true)}><MeetroIcon name="editPortfolio" size={18} decorative /><span><strong>Fill the form manually</strong><small>I’ll enter details myself</small></span></button>
          </div>
          <div className="business-document-turns" aria-live="polite">{turns.map((turn) => <article key={turn.id} className={turn.actor}><span>{turn.actor === "you" ? "You" : "M"}</span><p>{turn.text}</p></article>)}</div>
          {photos.length ? <section className="business-document-photo-workspace"><strong>Photos added</strong><PhotoStrip photos={photos} /><p>Photos stay private until you explicitly label them Before or After.</p></section> : null}
          <div className="business-document-composer">
            <textarea id="business-document-message" value={message} rows={3} placeholder={`Tell Meetro what to change on the ${activeDocument}…`} onChange={(event) => setMessage(event.target.value)} />
            <div>
              <WorkflowMicrophoneInput language={language} contextLabel={`business-${activeDocument}`} idleLabel="Speak" setPage={setPage} onTranscript={(transcript) => setMessage((current) => [current, transcript].filter(Boolean).join(" "))} />
              <button type="button" onClick={onAddPhotos} disabled={photoBusy}><MeetroIcon name="photoCount" size={17} decorative />Add Photos</button>
              <button type="button" className="business-document-send-message" onClick={submitMessage} disabled={!message.trim()}>Send</button>
            </div>
          </div>
          <div className="business-document-conversation-shortcuts"><button type="button" onClick={() => setMessage(`Note: `)}>Add to {activeDocument === "quote" ? "Quote" : "Invoice"} Notes</button><button type="button" onClick={() => setMessage("Keep this private: ")}>Private Reminder</button><button type="button" onClick={() => setManualOpen(true)}>Change Amount</button></div>
          {privateReminders.length ? <aside className="business-private-reminders"><strong>Private reminders</strong>{privateReminders.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}<small>Only you can see this. It never appears on customer documents.</small></aside> : null}
          <p className="business-document-draft-truth">This is a working draft only. Private costs and reminders stay internal. Nothing here issues, sends, approves, pays, or completes a document.</p>
        </section>

        <section ref={previewRef} tabIndex={-1} className={`business-document-preview ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-labelledby="business-document-preview-title">
          <header><h2 id="business-document-preview-title">Live {activeDocument === "quote" ? "Quote" : "Invoice"} Preview</h2><span>● Auto-updated</span></header>
          {activeDocument === "quote" ? <QuotePreview quote={quote} branding={branding} /> : <InvoicePreview invoice={invoice} branding={branding} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />}
          <div className="business-document-actions">
            <button type="button" onClick={() => {
              focusPreview();
              if (activeDocument === "quote") onPreviewQuote();
              else previewInvoice();
            }}>Preview PDF</button>
            <button type="button" onClick={() => activeDocument === "quote" ? onDownloadQuote() : void downloadInvoice()}>Download PDF</button>
            <DeliveryMenu kind={activeDocument} onUnavailable={deliveryUnavailable} />
          </div>
          {notice ? <p className="business-document-notice" role="status">{notice}</p> : null}
        </section>
      </main>

      {manualOpen ? <ManualEditor activeDocument={activeDocument} quote={quote} invoice={invoice} onQuoteFieldChange={onQuoteFieldChange} onInvoiceFieldChange={onInvoiceFieldChange} onClose={() => setManualOpen(false)} /> : null}
      {savedFilesOpen ? <SavedFilesDrawer onClose={() => setSavedFilesOpen(false)} /> : null}
      <BottomNav setPage={setPage} currentPage="quoteBuilder" />
    </div>
  );
}
