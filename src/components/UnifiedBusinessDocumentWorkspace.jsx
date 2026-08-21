import { useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "./BottomNav.jsx";
import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import {
  buildBusinessDocumentConversationPatch,
  createInvoiceContinuityDraft,
  customerVisibleWorkspaceDraft,
  normalizeBusinessDocumentTab,
  reconcileBusinessDocumentInstructions,
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
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
    .format(Number.isFinite(parsed) ? parsed : 0);
}

function todayLocalIsoDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function quoteRows(quote) {
  return [
    ...(quote.lineItems || []).map((item) => ({ id: item.id, description: item.description, amount: Number(item.total || 0) })),
    ...(quote.materialItems || []).map((item) => ({ id: item.id, description: item.name, amount: Number(item.total || 0) })),
    ...(quote.laborItems || []).map((item) => ({
      id: item.id,
      description: item.description,
      amount: Number(item.total || (Number(item.hours || 0) * Number(item.rate || 0))),
    })),
  ].filter((item) => item.description && item.amount > 0);
}

function invoiceRows(invoice) {
  return (invoice.lineItems || []).map((item) => ({
    ...item,
    amount: Number(item.total || item.amount || (Number(item.quantity || 0) * Number(item.unitPrice || 0))),
  })).filter((item) => item.description && item.amount > 0);
}

function invoiceTotal(invoice) {
  const override = String(invoice.totalOverride || "").trim();
  return override ? Number(override) || 0 : invoiceRows(invoice).reduce((sum, item) => sum + item.amount, 0);
}

function DocumentTabs({ activeDocument, onDocumentChange, onSavedFiles }) {
  return (
    <nav className="business-document-tabs" aria-label="Business documents">
      {[["quote", "Quote", "quickQuote"], ["invoice", "Invoice", "quickInvoice"]].map(([id, label, icon]) => (
        <button key={id} type="button" className={activeDocument === id ? "active" : ""} aria-current={activeDocument === id ? "page" : undefined} onClick={() => onDocumentChange(id)}>
          <MeetroIcon name={icon} size={17} decorative />{label}
        </button>
      ))}
      <button type="button" onClick={onSavedFiles} aria-haspopup="dialog"><MeetroIcon name="history" size={17} decorative />Saved Files</button>
    </nav>
  );
}

function DeliveryMenu({ kind, onUnavailable }) {
  const [open, setOpen] = useState(false);
  const label = kind === "quote" ? "Send Quote" : "Send Invoice";
  return (
    <div className="business-document-delivery">
      <button type="button" className="business-document-primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{label} <span aria-hidden="true">⌄</span></button>
      {open ? <div role="menu" className="business-document-delivery-menu"><button type="button" role="menuitem" onClick={() => onUnavailable("Email")}>Email</button><button type="button" role="menuitem" onClick={() => onUnavailable("Message")}>Message</button></div> : null}
    </div>
  );
}

function QuotePreview({ quote, branding }) {
  const rows = quoteRows(quote);
  return (
    <article className="business-live-document" aria-label="Live Quote Preview">
      <header className="business-document-preview-heading"><strong>{branding.businessName}</strong><div><b>QUOTE</b><span>DRAFT PREVIEW</span></div></header>
      <dl className="business-document-meta"><div><dt>Customer</dt><dd>{quote.customerName || "—"}</dd></div><div><dt>Project</dt><dd>{quote.projectTitle || "—"}</dd></div><div><dt>Quote #</dt><dd>{quote.quoteNumber || "Draft"}</dd></div><div><dt>Date</dt><dd>{quote.quoteDate || "—"}</dd></div></dl>
      <section className="business-document-copy"><h3>Scope of Work</h3><p>{quote.recommendedSolution || quote.projectDescription || "Tell Meetro about the work to begin this draft."}</p></section>
      <div className="business-document-table" role="table" aria-label="Quote line items">
        <div className="head" role="row"><span>Description</span><span>Amount</span></div>
        {rows.length ? rows.map((item) => <div role="row" key={item.id || `${item.description}-${item.amount}`}><span>{item.description}</span><strong>{money(item.amount)}</strong></div>) : <div role="row"><span>Working draft</span><strong>—</strong></div>}
        <div className="total" role="row"><span>PROJECT PRICE</span><strong>{quote.total > 0 ? money(quote.total) : "—"}</strong></div>
      </div>
      <div className="business-document-footer-grid"><section><h3>Payment Terms</h3><p>{quote.terms || "Confirm terms before delivery."}</p></section><section><h3>Estimated Duration</h3><p>{quote.estimatedDuration || "Not confirmed"}</p></section><section><h3>Acceptance / Status</h3><p>Draft only. Nothing is issued or approved.</p></section></div>
      <footer>{branding.businessName}<span>Prepared with Meetro</span></footer>
    </article>
  );
}

function InvoicePreview({ invoice, branding, beforePhotos, afterPhotos }) {
  const rows = invoiceRows(invoice);
  const total = invoiceTotal(invoice);
  return (
    <article className="business-live-document" aria-label="Live Invoice Preview">
      <header className="business-document-preview-heading"><strong>{branding.businessName}</strong><div><b>INVOICE</b><span>DRAFT PREVIEW</span></div></header>
      <dl className="business-document-meta"><div><dt>Bill To</dt><dd>{invoice.customerName || "—"}</dd></div><div><dt>Job</dt><dd>{invoice.projectTitle || "—"}</dd></div><div><dt>Invoice #</dt><dd>{invoice.invoiceNumber || "Draft"}</dd></div><div><dt>Date</dt><dd>{invoice.invoiceDate || "—"}</dd></div><div><dt>Quote reference</dt><dd>{invoice.quoteReference || "Not linked"}</dd></div></dl>
      <section className="business-document-copy"><h3>Work Completed</h3><p>{invoice.workPerformed || "Completion details have not been confirmed."}</p></section>
      {(beforePhotos.length || afterPhotos.length) ? <section className="business-document-proof" aria-label="Before and After Photos"><div><h3>Before</h3><PhotoStrip photos={beforePhotos} /></div><div><h3>After</h3><PhotoStrip photos={afterPhotos} /></div></section> : null}
      <div className="business-document-table" role="table" aria-label="Invoice summary">
        <div className="head" role="row"><span>Invoice Summary</span><span>Amount</span></div>
        {rows.length ? rows.map((item) => <div role="row" key={item.id || `${item.description}-${item.amount}`}><span>{item.description}</span><strong>{money(item.amount)}</strong></div>) : <div role="row"><span>Working draft</span><strong>—</strong></div>}
        <div className="total" role="row"><span>TOTAL DUE</span><strong>{total > 0 ? money(total) : "—"}</strong></div>
      </div>
      <div className="business-document-footer-grid"><section><h3>Payment Terms</h3><p>{invoice.paymentTerms || "Not confirmed"}</p></section><section><h3>Status</h3><p>Draft only. Payment and completion are not inferred.</p></section></div>
      <footer>{branding.businessName}<span>Prepared with Meetro</span></footer>
    </article>
  );
}

function PhotoStrip({ photos }) {
  return <div className="business-document-photo-strip">{photos.map((photo) => photo.previewUrl ? <img key={photo.id} src={photo.previewUrl} alt="Documented work" /> : null)}</div>;
}

function EditableRows({ title, rows, nameField, onChange }) {
  function update(index, field, value) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }
  return (
    <fieldset className="business-document-manual-rows">
      <legend>{title}</legend>
      {rows.map((row, index) => <div key={row.id || `${title}-${index}`}><label>Description<input value={row[nameField] || ""} onChange={(event) => update(index, nameField, event.target.value)} /></label><label>Amount<input inputMode="decimal" value={row.total || row.amount || ""} onChange={(event) => update(index, "total", event.target.value)} /></label><button type="button" aria-label={`Remove ${title} row ${index + 1}`} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button></div>)}
      <button type="button" onClick={() => onChange([...rows, { id: `manual-${nameField}-${Date.now()}`, [nameField]: "", total: "" }])}>Add row</button>
    </fieldset>
  );
}

function ManualEditor({ activeDocument, quote, invoice, initialFocus, onApply, onCancel }) {
  const source = activeDocument === "quote" ? quote : invoice;
  const cloneSource = () => ({ ...source, lineItems: (source.lineItems || []).map((item) => ({ ...item })), materialItems: (source.materialItems || []).map((item) => ({ ...item })), laborItems: (source.laborItems || []).map((item) => ({ ...item })) });
  const [original] = useState(cloneSource);
  const [draft, setDraft] = useState(cloneSource);
  const firstInputRef = useRef(null);
  const amountInputRef = useRef(null);
  useEffect(() => { (initialFocus === "amount" ? amountInputRef : firstInputRef).current?.focus(); }, [initialFocus]);
  const fields = activeDocument === "quote"
    ? [["customerName", "Customer"], ["projectTitle", "Project"], ["projectDescription", "Customer-facing description"], ["recommendedSolution", "Scope of Work"], ["totalOverride", "Customer price"], ["terms", "Payment terms / conditions"], ["estimatedDuration", "Estimated duration"], ["notes", "Customer notes"]]
    : [["customerName", "Customer"], ["projectTitle", "Job"], ["workPerformed", "Work completed"], ["totalOverride", "Invoice amount"], ["paymentTerms", "Payment terms"], ["dueDate", "Due date"], ["notes", "Customer notes"]];
  const textareas = new Set(["projectDescription", "recommendedSolution", "workPerformed", "terms", "paymentTerms", "notes"]);
  return (
    <><button type="button" className="business-document-manual-backdrop" aria-label="Cancel manual edit" onClick={onCancel} />
      <section className="business-document-manual" role="dialog" aria-modal="true" aria-labelledby="business-document-manual-title">
        <header><div><span>Manual entry</span><h2 id="business-document-manual-title">Edit the live {activeDocument}</h2></div><button type="button" onClick={onCancel}>Cancel</button></header>
        <div>{fields.map(([field, label], index) => <label key={field}>{label}{textareas.has(field) ? <textarea ref={index === 0 ? firstInputRef : undefined} value={draft[field] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} /> : <input ref={field === "totalOverride" ? amountInputRef : index === 0 ? firstInputRef : undefined} type={field === "dueDate" ? "date" : "text"} inputMode={field === "totalOverride" ? "decimal" : undefined} value={draft[field] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />}</label>)}</div>
        <div className="business-document-manual-line-groups">
          {activeDocument === "quote" ? <><EditableRows title="Service items" rows={draft.lineItems || []} nameField="description" onChange={(lineItems) => setDraft((current) => ({ ...current, lineItems }))} /><EditableRows title="Materials" rows={draft.materialItems || []} nameField="name" onChange={(materialItems) => setDraft((current) => ({ ...current, materialItems }))} /><EditableRows title="Labor" rows={draft.laborItems || []} nameField="description" onChange={(laborItems) => setDraft((current) => ({ ...current, laborItems }))} /></> : <EditableRows title="Invoice items" rows={draft.lineItems || []} nameField="description" onChange={(lineItems) => setDraft((current) => ({ ...current, lineItems }))} />}
        </div>
        <footer><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="business-document-primary" onClick={() => onApply(draft, original)}>Apply changes</button></footer>
      </section></>
  );
}

function InstructionTurn({ turn, onSave, onCancel, onEdit }) {
  const [value, setValue] = useState(turn.text);
  if (turn.editing) return <article className="you editing"><span>You</span><div className="business-document-turn-editor"><textarea aria-label="Edit prior instruction" value={value} onChange={(event) => setValue(event.target.value)} /><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" onClick={() => onSave(value)} disabled={!value.trim()}>Save</button></div></div></article>;
  return <><article className="you"><span>You</span><div className="business-document-turn-body"><p>{turn.text}</p><div><button type="button" onClick={onEdit}>Edit</button>{turn.revisions ? <small>Edited</small> : null}</div></div></article><article className="meetro"><span>M</span><p>{turn.recognized ? `${turn.documentType === "quote" ? "Quote" : "Invoice"} working draft updated. Review the live document.` : "I kept your instruction here. Use manual edit for unsupported details."}</p></article></>;
}

function SavedFilesDrawer({ onClose }) {
  return <><button type="button" className="business-saved-backdrop" aria-label="Close Saved Files" onClick={onClose} /><aside className="business-saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-files-title"><header><h2 id="saved-files-title">Saved Quotes &amp; Invoices</h2><button type="button" onClick={onClose} aria-label="Close Saved Files">×</button></header><input type="search" placeholder="Search customer, job, number, or address…" aria-label="Search saved documents" /><div className="business-saved-filters" aria-label="Saved document filters"><button type="button">All Types</button><button type="button">All Status</button><button type="button">All Time</button></div><div className="business-saved-empty" role="status"><MeetroIcon name="history" size={28} decorative /><strong>Governed document history will appear here.</strong><p>No browser-stored or fabricated records are shown. Complete Quote and Invoice search requires a canonical backend listing capability.</p></div></aside></>;
}

export default function UnifiedBusinessDocumentWorkspace({
  setPage, language = "en", initialDocument = "quote", job = {}, quote,
  onApplyQuotePatch, onAddPhotos, canAddPhotos = true, photos = [], photoBusy = false,
  photoNotice = "", onDownloadQuote, onPreviewQuote, onBack,
}) {
  const [activeDocument, setActiveDocument] = useState(() => normalizeBusinessDocumentTab(initialDocument));
  const [mobilePane, setMobilePane] = useState("conversation");
  const [savedFilesOpen, setSavedFilesOpen] = useState(false);
  const [manualState, setManualState] = useState(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [photoAssignments, setPhotoAssignments] = useState({});
  const [turns, setTurns] = useState([]);
  const [quoteBaseline] = useState(() => quote);
  const [invoiceBaseline] = useState(() => ({ ...createInvoiceContinuityDraft({ job, quote }), invoiceNumber: "", invoiceDate: todayLocalIsoDate(), lineItems: [] }));
  const [manualOverrides, setManualOverrides] = useState({ quote: {}, invoice: {} });
  const turnIdRef = useRef(0);
  const messageRef = useRef(null);
  const previewRef = useRef(null);
  const [invoice, setInvoice] = useState(invoiceBaseline);
  const branding = useMemo(() => getBusinessIdentityProjection({}, { fallbackName: "Meetro Professional" }), []);
  const beforePhotos = photos.filter((photo) => photoAssignments[photo.id]?.intent === "before");
  const afterPhotos = photos.filter((photo) => photoAssignments[photo.id]?.intent === "after");
  const currentInstructions = turns.filter((turn) => turn.documentType === activeDocument);
  const currentReconciliation = reconcileBusinessDocumentInstructions({ documentType: activeDocument, baseline: activeDocument === "quote" ? quoteBaseline : invoiceBaseline, instructions: currentInstructions, manualOverrides: manualOverrides[activeDocument] });
  const privateReminders = currentReconciliation.privateReminders;

  function reconcileDocument(documentType, nextTurns, overrides = manualOverrides[documentType]) {
    const result = reconcileBusinessDocumentInstructions({ documentType, baseline: documentType === "quote" ? quoteBaseline : invoiceBaseline, instructions: nextTurns.filter((turn) => turn.documentType === documentType), manualOverrides: overrides });
    if (documentType === "quote") onApplyQuotePatch({ ...result.draft, replaceCollections: true });
    else setInvoice(result.draft);
    return result;
  }

  function assignPhotoIntent(turnId, intent) {
    setPhotoAssignments((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([, assignment]) => assignment.turnId !== turnId));
      if (!intent) return next;
      photos.forEach((photo) => { if (!next[photo.id]) next[photo.id] = { turnId, intent }; });
      return next;
    });
  }

  function submitInstruction(rawInstruction, existingId = null) {
    const instruction = String(rawInstruction || "").trim();
    if (!instruction) return;
    const current = activeDocument === "quote" ? quote : invoice;
    const parsed = buildBusinessDocumentConversationPatch({ documentType: activeDocument, instruction, current });
    const recognized = Object.keys(parsed).length > 0;
    let turnId = existingId;
    let nextTurns;
    if (existingId) nextTurns = turns.map((turn) => turn.id === existingId ? {
      ...turn,
      text: instruction,
      editing: false,
      recognized,
      revisions: (turn.revisions || 0) + 1,
      revisionHistory: [...(turn.revisionHistory || []), turn.text],
    } : turn);
    else {
      turnIdRef.current += 1;
      turnId = `professional-instruction-${turnIdRef.current}`;
      nextTurns = [...turns, { id: turnId, documentType: activeDocument, text: instruction, recognized, revisions: 0, editing: false }];
    }
    setTurns(nextTurns);
    reconcileDocument(activeDocument, nextTurns);
    assignPhotoIntent(turnId, parsed.photoIntent);
    setMessage("");
    setNotice(recognized ? "Working draft updated from your instruction." : "Instruction preserved. Use manual edit for any unsupported detail.");
  }

  function focusComposer(prefix = "") {
    setMessage(prefix);
    requestAnimationFrame(() => messageRef.current?.focus());
  }

  function usePrefill() {
    if (message.trim()) return submitInstruction(message);
    if (currentInstructions.length) {
      reconcileDocument(activeDocument, turns);
      setNotice("Prefill refreshed from your saved conversation instructions.");
      return;
    }
    setNotice("Describe the customer, work, and pricing below, then send it to prefill the draft.");
    requestAnimationFrame(() => messageRef.current?.focus());
  }

  function switchDocument(documentType) {
    setActiveDocument(normalizeBusinessDocumentTab(documentType));
    setManualState(null);
    setNotice("");
  }

  function applyManualDraft(draft, original) {
    const overrides = { ...manualOverrides[activeDocument] };
    for (const [key, value] of Object.entries(draft)) {
      if (key === "total" || key === "canonicalStatus") continue;
      if (JSON.stringify(value) !== JSON.stringify(original[key])) overrides[key] = value;
    }
    setManualOverrides((current) => ({ ...current, [activeDocument]: overrides }));
    reconcileDocument(activeDocument, turns, overrides);
    setManualState(null);
    setNotice(`Manual ${activeDocument} changes applied to the working draft.`);
  }

  function focusPreview() {
    setMobilePane("preview");
    requestAnimationFrame(() => previewRef.current?.focus());
  }

  function invoicePdfModel() {
    const customerVisible = customerVisibleWorkspaceDraft(invoice);
    const rows = invoiceRows(customerVisible);
    const total = invoiceTotal(customerVisible);
    return buildQuickInvoiceDocumentModel({ ...customerVisible, total, subtotal: total, lineItems: rows.map((item) => ({ description: item.description, amount: item.amount })), serviceDescription: customerVisible.projectTitle }, { locale: language, branding });
  }

  async function downloadInvoice() {
    const copy = getCustomerDocumentActionCopy(language);
    setNotice(await downloadCustomerDocumentPdf(invoicePdfModel()) ? copy.pdfReady : copy.pdfUnavailable);
  }

  function previewInvoice() {
    if (!previewCustomerDocumentPdf(invoicePdfModel()).ok) setNotice("PDF preview is unavailable. Nothing was saved or sent.");
  }

  function deliveryUnavailable(channel) {
    setNotice(`${channel} delivery is not available from this working draft. Nothing was sent or approved.`);
  }

  return (
    <div className="app-page meetro-wide-page business-document-workspace">
      <header className="business-document-header"><button type="button" className="business-document-back" onClick={onBack} aria-label="Leave Quote and Invoice workspace">←</button><div><div className="business-document-title-row"><h1>{job.title || quote.projectTitle || "Quote & Invoice"}</h1><span>{job.canonical ? "Active Job" : "Working draft"}</span></div><p>{job.customerName || quote.customerName ? `Customer: ${job.customerName || quote.customerName}` : "Customer not selected"}{job.location || quote.customerLocation ? ` · ${job.location || quote.customerLocation}` : ""}</p></div></header>
      <DocumentTabs activeDocument={activeDocument} onDocumentChange={switchDocument} onSavedFiles={() => setSavedFilesOpen(true)} />
      <div className="business-document-mobile-switch" role="tablist" aria-label="Workspace view"><button type="button" role="tab" aria-selected={mobilePane === "conversation"} onClick={() => setMobilePane("conversation")}>Conversation</button><button type="button" role="tab" aria-selected={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Preview</button></div>
      <main className="business-document-main">
        <section className={`business-document-conversation ${mobilePane === "conversation" ? "mobile-active" : ""}`} aria-labelledby="business-document-conversation-title">
          <div className="business-document-conversation-heading"><div><h2 id="business-document-conversation-title">{activeDocument === "quote" ? "Work with Meetro" : "Ask Meetro"}</h2><p>Chat, speak, or upload photos. The working {activeDocument} stays visible.</p></div><button type="button" onClick={() => setNotice("Your words and manual edits update this private working draft. Customer delivery and PDF actions remain separate.")}>How it works</button></div>
          <div className="business-document-entry-choice"><button type="button" onClick={usePrefill}><MeetroIcon name="assistant" size={18} decorative /><span><strong>Let Meetro prefill the form</strong><small>Use my conversation details</small></span></button><button type="button" onClick={() => setManualState({ focus: "first" })}><MeetroIcon name="editPortfolio" size={18} decorative /><span><strong>Fill the form manually</strong><small>I’ll enter details myself</small></span></button></div>
          <div className="business-document-turns" aria-live="polite"><article className="meetro"><span>M</span><p>Tell me what you want to change. I’ll keep the working document updated in real time.</p></article>{currentInstructions.map((turn) => <InstructionTurn key={turn.id} turn={turn} onEdit={() => setTurns((current) => current.map((item) => item.id === turn.id ? { ...item, editing: true } : { ...item, editing: false }))} onCancel={() => setTurns((current) => current.map((item) => item.id === turn.id ? { ...item, editing: false } : item))} onSave={(value) => submitInstruction(value, turn.id)} />)}</div>
          {photos.length ? <section className="business-document-photo-workspace"><strong>Photos added</strong><PhotoStrip photos={photos} /><p>Photos stay private until you explicitly label them Before or After.</p></section> : null}
          <div className="business-document-composer"><textarea ref={messageRef} id="business-document-message" value={message} rows={3} placeholder={`Tell Meetro what to change on the ${activeDocument}…`} onChange={(event) => setMessage(event.target.value)} /><div><WorkflowMicrophoneInput language={language} contextLabel={`business-${activeDocument}`} idleLabel="Speak" setPage={setPage} onTranscript={(transcript) => setMessage((current) => [current, transcript].filter(Boolean).join(" "))} /><button type="button" onClick={onAddPhotos} disabled={!canAddPhotos || photoBusy}><MeetroIcon name="photoCount" size={17} decorative />{photoBusy ? "Adding…" : "Add Photos"}</button><button type="button" className="business-document-send-message" onClick={() => submitInstruction(message)} disabled={!message.trim()}>Send</button></div></div>
          <div className="business-document-conversation-shortcuts"><button type="button" onClick={() => focusComposer("Note: ")}>Add to {activeDocument === "quote" ? "Quote" : "Invoice"} Notes</button><button type="button" onClick={() => focusComposer("Keep this private: ")}>Private Reminder</button><button type="button" onClick={() => setManualState({ focus: "amount" })}>Change Amount</button></div>
          {privateReminders.length ? <aside className="business-private-reminders"><strong>Private reminders</strong>{privateReminders.map((item) => <p key={item.id}>{item.text}</p>)}<small>Only you can see this. It never appears on customer documents.</small></aside> : null}
          {photoNotice ? <p className="business-document-notice" role="status">{photoNotice}</p> : null}
          {notice && mobilePane === "conversation" ? <p className="business-document-notice" role="status">{notice}</p> : null}
          <p className="business-document-draft-truth">This is a working draft only. Private costs and reminders stay internal. Nothing here issues, sends, approves, pays, or completes a document.</p>
        </section>
        <section ref={previewRef} tabIndex={-1} className={`business-document-preview ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-labelledby="business-document-preview-title"><header><h2 id="business-document-preview-title">Live {activeDocument === "quote" ? "Quote" : "Invoice"} Preview</h2><span>● Auto-updated</span></header>{activeDocument === "quote" ? <QuotePreview quote={quote} branding={branding} /> : <InvoicePreview invoice={invoice} branding={branding} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />}<div className="business-document-actions"><button type="button" onClick={() => { focusPreview(); if (activeDocument === "quote") onPreviewQuote(); else previewInvoice(); }}>Preview PDF</button><button type="button" onClick={() => activeDocument === "quote" ? onDownloadQuote() : void downloadInvoice()}>Download PDF</button><DeliveryMenu kind={activeDocument} onUnavailable={deliveryUnavailable} /></div>{notice && mobilePane === "preview" ? <p className="business-document-notice" role="status">{notice}</p> : null}</section>
      </main>
      {manualState ? <ManualEditor activeDocument={activeDocument} quote={quote} invoice={invoice} initialFocus={manualState.focus} onApply={applyManualDraft} onCancel={() => setManualState(null)} /> : null}
      {savedFilesOpen ? <SavedFilesDrawer onClose={() => setSavedFilesOpen(false)} /> : null}
      <BottomNav setPage={setPage} currentPage="quoteBuilder" />
    </div>
  );
}
