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
import {
  createBusinessDocumentDraft,
  createBusinessDocumentSaveKey,
  getBusinessDocumentDraft,
  listBusinessDocumentDrafts,
  updateBusinessDocumentDraft,
} from "../utils/businessDocumentDraftApi.js";
import {
  deleteBusinessDocumentRecovery,
  loadBusinessDocumentRecovery,
  saveBusinessDocumentRecovery,
} from "../utils/businessDocumentRecovery.js";
import {
  buildBusinessDocumentSavePayload,
  businessDocumentSnapshotFingerprint,
  customerVisibleBusinessDocumentPhotoGroups,
  defaultBusinessDocumentPhotoAssignment,
  hasMeaningfulBusinessDocumentDraft,
  normalizeBusinessDocumentPhotoAssignment,
  recoveryPhotoProjection,
  restoreBusinessDocumentDraft,
} from "../utils/businessDocumentPersistence.js";
import { getAuthenticatedIdentitySnapshot } from "../utils/session.js";
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

function CustomerPhotoEvidence({ generalPhotos = [], beforePhotos = [], afterPhotos = [] }) {
  if (!generalPhotos.length && !beforePhotos.length && !afterPhotos.length) return null;
  return <section className="business-document-proof" aria-label="Customer-visible Project Photos and Evidence">{generalPhotos.length ? <div><h3>Project Photos / Evidence</h3><PhotoStrip photos={generalPhotos} /></div> : null}{beforePhotos.length ? <div><h3>Before</h3><PhotoStrip photos={beforePhotos} /></div> : null}{afterPhotos.length ? <div><h3>After</h3><PhotoStrip photos={afterPhotos} /></div> : null}</section>;
}

function QuotePreview({ quote, branding, generalPhotos, beforePhotos, afterPhotos }) {
  const rows = quoteRows(quote);
  return (
    <article className="business-live-document" aria-label="Live Quote Preview">
      <header className="business-document-preview-heading"><strong>{branding.businessName}</strong><div><b>QUOTE</b><span>DRAFT PREVIEW</span></div></header>
      <dl className="business-document-meta"><div><dt>Customer</dt><dd>{quote.customerName || "—"}</dd></div><div><dt>Project</dt><dd>{quote.projectTitle || "—"}</dd></div><div><dt>Quote #</dt><dd>{quote.quoteNumber || "Draft"}</dd></div><div><dt>Date</dt><dd>{quote.quoteDate || "—"}</dd></div></dl>
      <section className="business-document-copy"><h3>Scope of Work</h3><p>{quote.recommendedSolution || quote.projectDescription || "Tell Meetro about the work to begin this draft."}</p></section>
      <CustomerPhotoEvidence generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />
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

function InvoicePreview({ invoice, branding, generalPhotos, beforePhotos, afterPhotos }) {
  const rows = invoiceRows(invoice);
  const total = invoiceTotal(invoice);
  return (
    <article className="business-live-document" aria-label="Live Invoice Preview">
      <header className="business-document-preview-heading"><strong>{branding.businessName}</strong><div><b>INVOICE</b><span>DRAFT PREVIEW</span></div></header>
      <dl className="business-document-meta"><div><dt>Bill To</dt><dd>{invoice.customerName || "—"}</dd></div><div><dt>Job</dt><dd>{invoice.projectTitle || "—"}</dd></div><div><dt>Invoice #</dt><dd>{invoice.invoiceNumber || "Draft"}</dd></div><div><dt>Date</dt><dd>{invoice.invoiceDate || "—"}</dd></div><div><dt>Quote reference</dt><dd>{invoice.quoteReference || "Not linked"}</dd></div></dl>
      <section className="business-document-copy"><h3>Work Completed</h3><p>{invoice.workPerformed || "Completion details have not been confirmed."}</p></section>
      <CustomerPhotoEvidence generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />
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

function SavedFilesDrawer({ onClose, onOpen, setPage }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [time, setTime] = useState("ALL");
  const [state, setState] = useState({ busy: true, error: "", documents: [] });
  const closeRef = useRef(null);

  async function load() {
    setState((current) => ({ ...current, busy: true, error: "" }));
    try {
      const documents = await listBusinessDocumentDrafts({ search, type, time, setPage });
      setState({ busy: false, error: "", documents });
    } catch {
      setState((current) => ({ ...current, busy: false, error: "Saved Files could not be loaded. Your current work is unchanged." }));
    }
  }

  useEffect(() => {
    closeRef.current?.focus();
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function escape(event) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  return <><button type="button" className="business-saved-backdrop" aria-label="Close Saved Files" onClick={onClose} /><aside className="business-saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-files-title"><header><h2 id="saved-files-title">Saved Quotes &amp; Invoices</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close Saved Files">×</button></header><form className="business-saved-search" onSubmit={(event) => { event.preventDefault(); void load(); }}><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, job, number, or address…" aria-label="Search saved documents" /><button type="submit">Search</button></form><div className="business-saved-filters" aria-label="Saved document filters"><label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option value="">All Types</option><option value="QUOTE">Quotes</option><option value="INVOICE">Invoices</option></select></label><label>Status<select value="WORKING_DRAFT" disabled><option>WORKING_DRAFT</option></select></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)}><option value="ALL">All Time</option><option value="30D">Last 30 days</option><option value="90D">Last 90 days</option></select></label></div>{state.busy ? <p role="status">Loading saved documents…</p> : state.error ? <div className="business-saved-empty" role="alert"><strong>{state.error}</strong><button type="button" onClick={() => void load()}>Try Again</button></div> : state.documents.length ? <div className="business-saved-results">{state.documents.map((document) => <button type="button" key={document.id} onClick={() => onOpen(document.id)}><MeetroIcon name={document.documentType === "QUOTE" ? "quickQuote" : "quickInvoice"} size={20} decorative /><span><strong>{document.content.projectTitle || document.content.customerName || document.reference}</strong><small>{document.documentType === "QUOTE" ? "Quote" : "Invoice"} · {document.content.customerName || "Customer not entered"} · {document.reference}</small><small>Updated {new Date(document.updatedAt).toLocaleString()}</small></span></button>)}</div> : <div className="business-saved-empty" role="status"><MeetroIcon name="history" size={28} decorative /><strong>No saved documents match.</strong><p>Only governed server-saved working drafts appear here.</p></div>}</aside></>;
}

function WorkspaceDialog({ titleId, title, children, actions, onClose }) {
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    function escape(event) { if (event.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return <>{onClose ? <button type="button" className="business-document-manual-backdrop" aria-label={`Close ${title}`} onClick={onClose} /> : <div className="business-document-manual-backdrop" aria-hidden="true" />}<section className="business-document-confirm" role="dialog" aria-modal="true" aria-labelledby={titleId}><h2 id={titleId}>{title}</h2>{children}<footer>{actions.map((action, index) => <button ref={index === 0 ? firstRef : undefined} key={action.label} type="button" className={action.primary ? "business-document-primary" : ""} disabled={action.disabled} onClick={action.onClick}>{action.label}</button>)}</footer></section></>;
}

function PhotoWorkspace({ photos, assignments, onChange, onReview }) {
  return <section className="business-document-photo-workspace"><div><strong>Photos added</strong><button type="button" onClick={onReview}>Review photos</button></div><div className="business-document-photo-cards">{photos.map((photo) => { const assignment = assignments[photo.id] || defaultBusinessDocumentPhotoAssignment(); return <article key={photo.id}>{photo.previewUrl ? <img src={photo.previewUrl} alt={photo.name || "Documented work"} /> : null}<span>{["UNCLASSIFIED", "GENERAL_EVIDENCE"].includes(assignment.role) ? "General" : assignment.role === "BEFORE" ? "Before" : "After"} · {assignment.visibility === "CUSTOMER_VISIBLE" ? "Customer" : "Private"}</span><button type="button" onClick={() => onChange(photo.id)}>Change</button></article>; })}</div><p>Photos are private by default. Choose Before, After, or General, and decide separately whether to include them on the customer document.</p></section>;
}

function PhotoReviewDialog({ photos, assignments, onApply, onCancel }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(photos.map((photo) => [photo.id, normalizeBusinessDocumentPhotoAssignment(assignments[photo.id] || defaultBusinessDocumentPhotoAssignment())])));
  function update(id, field, value) { setDraft((current) => ({ ...current, [id]: normalizeBusinessDocumentPhotoAssignment({ ...current[id], [field]: value }) })); }
  function applyAll(field, value) { setDraft((current) => Object.fromEntries(Object.entries(current).map(([id, assignment]) => [id, normalizeBusinessDocumentPhotoAssignment({ ...assignment, [field]: value })]))); }
  return <WorkspaceDialog titleId="business-photo-review-title" title="Review document photos" onClose={onCancel} actions={[{ label: "Cancel", onClick: onCancel }, { label: "Apply photo choices", primary: true, onClick: () => onApply(draft) }]}><p>Role and customer visibility are separate. Before or After remains private unless you explicitly include it.</p>{photos.length > 1 ? <div className="business-photo-apply-all"><label>Apply role to all<select defaultValue="" onChange={(event) => event.target.value && applyAll("role", event.target.value)}><option value="">Choose…</option><option value="UNCLASSIFIED">General / Unclassified</option><option value="GENERAL_EVIDENCE">General evidence</option><option value="BEFORE">Before</option><option value="AFTER">After</option></select></label><label>Apply visibility to all<select defaultValue="" onChange={(event) => event.target.value && applyAll("visibility", event.target.value)}><option value="">Choose…</option><option value="PRIVATE_INTERNAL">Private</option><option value="CUSTOMER_VISIBLE">Customer document</option></select></label></div> : null}<div className="business-photo-review-list">{photos.map((photo) => <article key={photo.id}>{photo.previewUrl ? <img src={photo.previewUrl} alt={photo.name || "Selected photo"} /> : null}<div><label>Role<select value={draft[photo.id]?.role || "UNCLASSIFIED"} onChange={(event) => update(photo.id, "role", event.target.value)}><option value="UNCLASSIFIED">General / Unclassified</option><option value="GENERAL_EVIDENCE">General evidence</option><option value="BEFORE">Before</option><option value="AFTER">After</option></select></label><label>Visibility<select value={draft[photo.id]?.visibility || "PRIVATE_INTERNAL"} onChange={(event) => update(photo.id, "visibility", event.target.value)}><option value="PRIVATE_INTERNAL">Private</option><option value="CUSTOMER_VISIBLE">Include on customer document</option></select></label></div></article>)}</div></WorkspaceDialog>;
}

export default function UnifiedBusinessDocumentWorkspace({
  setPage, language = "en", initialDocument = "quote", job = {}, quote,
  onApplyQuotePatch, onAddPhotos, canAddPhotos = true, photos = [], photoBusy = false,
  photoNotice = "", onDownloadQuote, onPreviewQuote, onBack,
  onRestorePhotos, onEnsurePhotosDurable, onPhotosPersisted, onDiscardTransientPhotos,
}) {
  const [activeDocument, setActiveDocument] = useState(() => normalizeBusinessDocumentTab(initialDocument));
  const [mobilePane, setMobilePane] = useState("conversation");
  const [savedFilesOpen, setSavedFilesOpen] = useState(false);
  const [manualState, setManualState] = useState(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [photoAssignments, setPhotoAssignments] = useState({});
  const [photoReviewOpen, setPhotoReviewOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [quoteBaseline] = useState(() => quote);
  const [invoiceBaseline] = useState(() => ({ ...createInvoiceContinuityDraft({ job, quote }), invoiceNumber: "", invoiceDate: todayLocalIsoDate(), lineItems: [] }));
  const [manualOverrides, setManualOverrides] = useState({ quote: {}, invoice: {} });
  const turnIdRef = useRef(0);
  const messageRef = useRef(null);
  const previewRef = useRef(null);
  const turnsRef = useRef(null);
  const nearNewestRef = useRef(true);
  const seenPhotoIdsRef = useRef(new Set());
  const saveAttemptKeysRef = useRef({ quote: "", invoice: "" });
  const pendingExitRef = useRef(null);
  const [invoice, setInvoice] = useState(invoiceBaseline);
  const [savedDocuments, setSavedDocuments] = useState({ quote: null, invoice: null });
  const [documentJobIds, setDocumentJobIds] = useState(() => ({
    quote: job.canonical ? job.id || null : null,
    invoice: job.canonical ? job.id || null : null,
  }));
  const [savedFingerprints, setSavedFingerprints] = useState({ quote: "", invoice: "" });
  const [saveState, setSaveState] = useState({ busy: false, error: "", lastSavedAt: "", documentType: "" });
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [saveFailureOpen, setSaveFailureOpen] = useState(false);
  const [recoveryRecord, setRecoveryRecord] = useState(null);
  const [recovered, setRecovered] = useState(false);
  const [newContentAvailable, setNewContentAvailable] = useState(false);
  const branding = useMemo(() => getBusinessIdentityProjection({}, { fallbackName: "Meetro Professional" }), []);
  const documentPhotos = photos.filter((photo) => (photoAssignments[photo.id]?.documentType || activeDocument) === activeDocument);
  const customerPhotoGroups = customerVisibleBusinessDocumentPhotoGroups(documentPhotos, photoAssignments);
  const generalPhotos = customerPhotoGroups.general;
  const beforePhotos = customerPhotoGroups.before;
  const afterPhotos = customerPhotoGroups.after;
  const currentInstructions = turns.filter((turn) => turn.documentType === activeDocument);
  const currentReconciliation = reconcileBusinessDocumentInstructions({ documentType: activeDocument, baseline: activeDocument === "quote" ? quoteBaseline : invoiceBaseline, instructions: currentInstructions, manualOverrides: manualOverrides[activeDocument] });
  const privateReminders = currentReconciliation.privateReminders;
  const quotePayload = useMemo(() => buildBusinessDocumentSavePayload({
    documentType: "quote", content: quote, turns, manualOverrides: manualOverrides.quote,
    photos: photos.filter((photo) => (photoAssignments[photo.id]?.documentType || "quote") === "quote"),
    photoAssignments, jobId: documentJobIds.quote,
  }), [documentJobIds.quote, manualOverrides.quote, photoAssignments, photos, quote, turns]);
  const invoicePayload = useMemo(() => buildBusinessDocumentSavePayload({
    documentType: "invoice", content: invoice, turns, manualOverrides: manualOverrides.invoice,
    photos: photos.filter((photo) => photoAssignments[photo.id]?.documentType === "invoice"),
    photoAssignments, jobId: documentJobIds.invoice,
  }), [documentJobIds.invoice, invoice, manualOverrides.invoice, photoAssignments, photos, turns]);
  const payloads = { quote: quotePayload, invoice: invoicePayload };
  const fingerprints = {
    quote: businessDocumentSnapshotFingerprint({ payload: quotePayload, recoveryPhotos: recoveryPhotoProjection(photos.filter((photo) => (photoAssignments[photo.id]?.documentType || "quote") === "quote"), photoAssignments) }),
    invoice: businessDocumentSnapshotFingerprint({ payload: invoicePayload, recoveryPhotos: recoveryPhotoProjection(photos.filter((photo) => photoAssignments[photo.id]?.documentType === "invoice"), photoAssignments) }),
  };
  const dirty = {
    quote: savedDocuments.quote ? fingerprints.quote !== savedFingerprints.quote : hasMeaningfulBusinessDocumentDraft(quotePayload),
    invoice: savedDocuments.invoice ? fingerprints.invoice !== savedFingerprints.invoice : hasMeaningfulBusinessDocumentDraft(invoicePayload),
  };
  const activeDirty = dirty[activeDocument];
  const activeSaved = savedDocuments[activeDocument];
  const activeContent = activeDocument === "quote" ? quote : invoice;

  useEffect(() => {
    const additions = photos.filter((photo) => !seenPhotoIdsRef.current.has(photo.id));
    if (!additions.length) return;
    additions.forEach((photo) => seenPhotoIdsRef.current.add(photo.id));
    setPhotoAssignments((current) => {
      const next = { ...current };
      additions.forEach((photo) => {
        if (!next[photo.id]) next[photo.id] = { ...defaultBusinessDocumentPhotoAssignment(), documentType: activeDocument };
      });
      return next;
    });
    setPhotoReviewOpen(true);
  }, [activeDocument, photos]);

  useEffect(() => {
    function protectUnload(event) {
      if (!dirty.quote && !dirty.invoice) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", protectUnload);
    return () => window.removeEventListener("beforeunload", protectUnload);
  }, [dirty.invoice, dirty.quote]);

  useEffect(() => {
    const identityKey = getAuthenticatedIdentitySnapshot().userId;
    if (!identityKey) return;
    let active = true;
    void loadBusinessDocumentRecovery({ identityKey }).then((record) => {
      if (active && record) setRecoveryRecord(record);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function connectionRestored() {
      if (recovered || dirty.quote || dirty.invoice) setNotice("Connection restored — Save Draft now when you’re ready.");
    }
    window.addEventListener("online", connectionRestored);
    return () => window.removeEventListener("online", connectionRestored);
  }, [dirty.invoice, dirty.quote, recovered]);

  useEffect(() => {
    const container = turnsRef.current;
    if (!container) return;
    if (nearNewestRef.current) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        setNewContentAvailable(false);
      });
    } else {
      setNewContentAvailable(true);
    }
  }, [currentInstructions.length, documentPhotos.length]);

  function currentContent(documentType) {
    return documentType === "quote" ? quote : invoice;
  }

  function documentPayload(documentType, { durablePhotos = photos, assignments = photoAssignments } = {}) {
    return buildBusinessDocumentSavePayload({
      documentType,
      content: currentContent(documentType),
      turns,
      manualOverrides: manualOverrides[documentType],
      photos: durablePhotos.filter((photo) => (assignments[photo.id]?.documentType || "quote") === documentType),
      photoAssignments: assignments,
      jobId: documentJobIds[documentType],
    });
  }

  async function durableSaveInput(documentType) {
    const pending = photos.filter((photo) =>
      (photoAssignments[photo.id]?.documentType || "quote") === documentType && !photo.media?.public_id
    );
    if (!pending.length) return { payload: documentPayload(documentType), durablePhotos: photos, assignments: photoAssignments };
    if (typeof onEnsurePhotosDurable !== "function") throw new Error("Pending photos must finish uploading before this draft can be saved.");
    const result = await onEnsurePhotosDurable(pending);
    if (!result?.ok) throw new Error("One or more photos are not uploaded yet. Your work is still here.");
    const assignments = { ...photoAssignments };
    Object.entries(result.idMap || {}).forEach(([oldId, newId]) => {
      assignments[newId] = assignments[oldId];
      delete assignments[oldId];
    });
    setPhotoAssignments(assignments);
    return { payload: documentPayload(documentType, { durablePhotos: result.photos, assignments }), durablePhotos: result.photos, assignments };
  }

  async function saveDocument(documentType, { suppressFailureDialog = false } = {}) {
    if (saveState.busy) return false;
    setSaveState((current) => ({ ...current, busy: true, error: "", documentType }));
    try {
      const prepared = await durableSaveInput(documentType);
      if (!saveAttemptKeysRef.current[documentType]) saveAttemptKeysRef.current[documentType] = createBusinessDocumentSaveKey();
      const existing = savedDocuments[documentType];
      const document = existing
        ? await updateBusinessDocumentDraft({
            draftId: existing.id,
            expectedVersion: existing.version,
            payload: prepared.payload,
            idempotencyKey: saveAttemptKeysRef.current[documentType],
            setPage,
          })
        : await createBusinessDocumentDraft({
            payload: prepared.payload,
            idempotencyKey: saveAttemptKeysRef.current[documentType],
            setPage,
          });
      const fingerprint = businessDocumentSnapshotFingerprint({
        payload: prepared.payload,
        recoveryPhotos: recoveryPhotoProjection(
          prepared.durablePhotos.filter((photo) => (prepared.assignments[photo.id]?.documentType || "quote") === documentType),
          prepared.assignments
        ),
      });
      setSavedDocuments((current) => ({ ...current, [documentType]: document }));
      setSavedFingerprints((current) => ({ ...current, [documentType]: fingerprint }));
      saveAttemptKeysRef.current[documentType] = "";
      setSaveState({ busy: false, error: "", lastSavedAt: document.updatedAt, documentType });
      setRecovered(false);
      onPhotosPersisted?.(document.photos.map((photo) => photo.id));
      const identityKey = getAuthenticatedIdentitySnapshot().userId;
      if (identityKey) await deleteBusinessDocumentRecovery({ identityKey });
      setNotice(`Saved · ${new Date(document.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
      return true;
    } catch (error) {
      setSaveState({ busy: false, error: error?.message || "We couldn't save your draft right now. Your work is still here.", lastSavedAt: "", documentType });
      if (!suppressFailureDialog) setSaveFailureOpen(true);
      return false;
    }
  }

  function restoredFingerprint(document) {
    const payload = {
      documentType: document.documentType,
      jobId: document.jobId,
      content: document.content,
      workspace: document.workspace,
      photos: document.photos.map((photo) => ({ id: photo.id, name: photo.name, purpose: "quote-draft-photo", media: photo.media, role: photo.role, visibility: photo.visibility })),
    };
    const recoveredPhotos = document.photos.map((photo) => ({ id: photo.id, name: photo.name, media: photo.media, uploadState: "durable", assignment: { role: photo.role, visibility: photo.visibility } }));
    return businessDocumentSnapshotFingerprint({ payload, recoveryPhotos: recoveredPhotos });
  }

  function applyRestoredDocument(document) {
    const restored = restoreBusinessDocumentDraft(document);
    const type = restored.documentType;
    if (type === "quote") onApplyQuotePatch({ ...restored.content, replaceCollections: true });
    else setInvoice(restored.content);
    setTurns((current) => [...current.filter((turn) => turn.documentType !== type), ...restored.turns]);
    setManualOverrides((current) => ({ ...current, [type]: restored.manualOverrides }));
    setPhotoAssignments((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([, assignment]) => assignment.documentType !== type)),
      ...Object.fromEntries(Object.entries(restored.photoAssignments).map(([id, assignment]) => [id, { ...assignment, documentType: type }])),
    }));
    restored.photos.forEach((photo) => seenPhotoIdsRef.current.add(photo.id));
    onRestorePhotos?.(restored.photos, { documentType: type, persisted: true });
    setSavedDocuments((current) => ({ ...current, [type]: document }));
    setDocumentJobIds((current) => ({ ...current, [type]: document.jobId || null }));
    setSavedFingerprints((current) => ({ ...current, [type]: restoredFingerprint(document) }));
    setActiveDocument(type);
    setSavedFilesOpen(false);
    setNotice(`${document.reference} reopened. Continue editing this saved working draft.`);
  }

  async function openSavedDocument(draftId) {
    try {
      const document = await getBusinessDocumentDraft({ draftId, setPage });
      applyRestoredDocument(document);
    } catch (error) {
      setNotice(error?.message || "The saved document could not be opened.");
    }
  }

  function requestExit(action) {
    if (!dirty.quote && !dirty.invoice) return action();
    pendingExitRef.current = action;
    setExitDialogOpen(true);
  }

  async function saveAllAndExit() {
    setExitDialogOpen(false);
    for (const type of ["quote", "invoice"]) {
      if (dirty[type] && !(await saveDocument(type, { suppressFailureDialog: true }))) {
        setSaveFailureOpen(true);
        return;
      }
    }
    const action = pendingExitRef.current;
    pendingExitRef.current = null;
    action?.();
  }

  async function exitWithRecovery() {
    const identityKey = getAuthenticatedIdentitySnapshot().userId;
    const result = await saveBusinessDocumentRecovery({
      identityKey,
      snapshot: {
        activeDocument,
        payloads,
        savedDocuments,
        savedFingerprints,
        photoAssignments,
        photos: recoveryPhotoProjection(photos, photoAssignments),
      },
    });
    if (!result.ok) {
      setNotice("Local recovery is unavailable. Keep editing or try the server save again.");
      setSaveFailureOpen(false);
      return;
    }
    const action = pendingExitRef.current || onBack;
    pendingExitRef.current = null;
    setSaveFailureOpen(false);
    action?.();
  }

  function keepEditingAfterSaveFailure() {
    pendingExitRef.current = null;
    setSaveFailureOpen(false);
  }

  function retryFailedSave() {
    setSaveFailureOpen(false);
    if (pendingExitRef.current) void saveAllAndExit();
    else void saveDocument(activeDocument);
  }

  function discardAndExit() {
    setExitDialogOpen(false);
    onDiscardTransientPhotos?.();
    const action = pendingExitRef.current;
    pendingExitRef.current = null;
    action?.();
  }

  function continueRecovery() {
    const snapshot = recoveryRecord?.snapshot;
    if (!snapshot?.payloads) return setRecoveryRecord(null);
    const combinedTurns = [];
    for (const type of ["quote", "invoice"]) {
      const payload = snapshot.payloads[type];
      if (!payload) continue;
      if (type === "quote") onApplyQuotePatch({ ...payload.content, replaceCollections: true });
      else setInvoice(payload.content);
      combinedTurns.push(...(payload.workspace?.instructions || []).map((turn) => ({ ...turn, documentType: type, editing: false })));
    }
    setTurns(combinedTurns);
    setManualOverrides({
      quote: { ...(snapshot.payloads.quote?.workspace?.manualOverrides || {}) },
      invoice: { ...(snapshot.payloads.invoice?.workspace?.manualOverrides || {}) },
    });
    const recoveredPhotos = (snapshot.photos || []).map((photo) => ({
      id: photo.id,
      name: photo.name,
      media: photo.media,
      pendingFile: photo.pendingFile,
      uploadState: photo.uploadState,
      previewUrl: photo.media?.secure_url || (photo.pendingFile ? URL.createObjectURL(photo.pendingFile) : ""),
    }));
    recoveredPhotos.forEach((photo) => seenPhotoIdsRef.current.add(photo.id));
    setPhotoAssignments(Object.fromEntries(Object.entries(snapshot.photoAssignments || {}).map(([id, assignment]) => [id, normalizeBusinessDocumentPhotoAssignment(assignment)])));
    onRestorePhotos?.(recoveredPhotos, { replaceAll: true, persisted: false });
    setSavedDocuments(snapshot.savedDocuments || { quote: null, invoice: null });
    setDocumentJobIds({
      quote: snapshot.payloads.quote?.jobId || null,
      invoice: snapshot.payloads.invoice?.jobId || null,
    });
    setSavedFingerprints(snapshot.savedFingerprints || { quote: "", invoice: "" });
    setActiveDocument(normalizeBusinessDocumentTab(snapshot.activeDocument));
    setRecovered(true);
    setRecoveryRecord(null);
    setNotice("Recovered locally. This session is not server-saved yet.");
  }

  async function discardRecovery() {
    const identityKey = getAuthenticatedIdentitySnapshot().userId;
    if (identityKey) await deleteBusinessDocumentRecovery({ identityKey });
    setRecoveryRecord(null);
  }

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
      photos.forEach((photo) => {
        if ((next[photo.id]?.documentType || activeDocument) !== activeDocument) return;
        next[photo.id] = {
          ...(next[photo.id] || defaultBusinessDocumentPhotoAssignment()),
          documentType: activeDocument,
          turnId,
          role: intent === "before" ? "BEFORE" : "AFTER",
        };
      });
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
    nearNewestRef.current = true;
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

  function scrollToNewest() {
    const container = turnsRef.current;
    if (!container) return;
    nearNewestRef.current = true;
    container.scrollTo?.({ top: container.scrollHeight, behavior: "smooth" });
    if (!container.scrollTo) container.scrollTop = container.scrollHeight;
    setNewContentAvailable(false);
  }

  const guardedSetPage = (page) => requestExit(() => setPage(page));
  const saveLabel = saveState.busy && saveState.documentType === activeDocument
    ? "Saving…"
    : activeSaved
    ? activeDirty ? "Save Changes" : "Saved ✓"
    : "Save Draft";

  return (
    <div className="app-page meetro-wide-page business-document-workspace">
      <header className="business-document-header"><button type="button" className="business-document-back" onClick={() => requestExit(onBack)} aria-label="Leave Quote and Invoice workspace">←</button><div><div className="business-document-title-row"><h1>{activeContent.projectTitle || job.title || "Quote & Invoice"}</h1><span>{recovered ? "Recovered · Not saved" : documentJobIds[activeDocument] ? "Job linked" : "Working draft"}</span></div><p>{activeContent.customerName || job.customerName ? `Customer: ${activeContent.customerName || job.customerName}` : "Customer not selected"}{activeContent.customerLocation || job.location ? ` · ${activeContent.customerLocation || job.location}` : ""}</p></div><div className="business-document-save-status" aria-live="polite">{activeSaved && !activeDirty ? `Saved · ${new Date(activeSaved.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : activeDirty ? "Unsaved changes" : "Not saved"}</div></header>
      <DocumentTabs activeDocument={activeDocument} onDocumentChange={switchDocument} onSavedFiles={() => setSavedFilesOpen(true)} />
      <div className="business-document-mobile-switch" role="tablist" aria-label="Workspace view"><button type="button" role="tab" aria-selected={mobilePane === "conversation"} onClick={() => setMobilePane("conversation")}>Conversation</button><button type="button" role="tab" aria-selected={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Preview</button></div>
      <main className="business-document-main">
        <section className={`business-document-conversation ${mobilePane === "conversation" ? "mobile-active" : ""}`} aria-labelledby="business-document-conversation-title">
          <div className="business-document-conversation-heading"><div><h2 id="business-document-conversation-title">{activeDocument === "quote" ? "Work with Meetro" : "Ask Meetro"}</h2><p>Chat, speak, or upload photos. The working {activeDocument} stays visible.</p></div><button type="button" onClick={() => setNotice("Your words and manual edits update this private working draft. Customer delivery and PDF actions remain separate.")}>How it works</button></div>
          <div className="business-document-entry-choice"><button type="button" onClick={usePrefill}><MeetroIcon name="assistant" size={18} decorative /><span><strong>Let Meetro prefill the form</strong><small>Use my conversation details</small></span></button><button type="button" onClick={() => setManualState({ focus: "first" })}><MeetroIcon name="editPortfolio" size={18} decorative /><span><strong>Fill the form manually</strong><small>I’ll enter details myself</small></span></button></div>
          <div ref={turnsRef} className="business-document-turns" aria-live="polite" onScroll={(event) => { const element = event.currentTarget; nearNewestRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 72; if (nearNewestRef.current) setNewContentAvailable(false); }}><article className="meetro"><span>M</span><p>Tell me what you want to change. I’ll keep the working document updated in real time.</p></article>{currentInstructions.map((turn) => <InstructionTurn key={turn.id} turn={turn} onEdit={() => setTurns((current) => current.map((item) => item.id === turn.id ? { ...item, editing: true } : { ...item, editing: false }))} onCancel={() => setTurns((current) => current.map((item) => item.id === turn.id ? { ...item, editing: false } : item))} onSave={(value) => submitInstruction(value, turn.id)} />)}</div>
          {newContentAvailable ? <button type="button" className="business-document-new-message" onClick={scrollToNewest}>New message ↓</button> : null}
          {documentPhotos.length ? <PhotoWorkspace photos={documentPhotos} assignments={photoAssignments} onReview={() => setPhotoReviewOpen(true)} onChange={() => setPhotoReviewOpen(true)} /> : null}
          <div className="business-document-composer"><textarea ref={messageRef} id="business-document-message" value={message} rows={3} placeholder={`Tell Meetro what to change on the ${activeDocument}…`} onChange={(event) => setMessage(event.target.value)} /><div><WorkflowMicrophoneInput language={language} contextLabel={`business-${activeDocument}`} idleLabel="Speak" setPage={guardedSetPage} onTranscript={(transcript) => setMessage((current) => [current, transcript].filter(Boolean).join(" "))} /><button type="button" onClick={() => onAddPhotos(activeDocument)} disabled={!canAddPhotos || photoBusy}><MeetroIcon name="photoCount" size={17} decorative />{photoBusy ? "Adding…" : "Add Photos"}</button><button type="button" className="business-document-send-message" onClick={() => submitInstruction(message)} disabled={!message.trim()}>Send</button></div></div>
          <div className="business-document-conversation-shortcuts"><button type="button" onClick={() => focusComposer("Note: ")}>Add to {activeDocument === "quote" ? "Quote" : "Invoice"} Notes</button><button type="button" onClick={() => focusComposer("Keep this private: ")}>Private Reminder</button><button type="button" onClick={() => setManualState({ focus: "amount" })}>Change Amount</button></div>
          {privateReminders.length ? <aside className="business-private-reminders"><strong>Private reminders</strong>{privateReminders.map((item) => <p key={item.id}>{item.text}</p>)}<small>Only you can see this. It never appears on customer documents.</small></aside> : null}
          {photoNotice ? <p className="business-document-notice" role="status">{photoNotice}</p> : null}
          {notice && mobilePane === "conversation" ? <p className="business-document-notice" role="status">{notice}</p> : null}
          <p className="business-document-draft-truth">This is a working draft only. Private costs and reminders stay internal. Nothing here issues, sends, approves, pays, or completes a document.</p>
        </section>
        <section ref={previewRef} tabIndex={-1} className={`business-document-preview ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-labelledby="business-document-preview-title"><header><h2 id="business-document-preview-title">Live {activeDocument === "quote" ? "Quote" : "Invoice"} Preview</h2><span>● Auto-updated</span></header>{activeDocument === "quote" ? <QuotePreview quote={quote} branding={branding} generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} /> : <InvoicePreview invoice={invoice} branding={branding} generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />}<div className="business-document-actions"><button type="button" className="business-document-save" disabled={saveState.busy || (activeSaved && !activeDirty)} onClick={() => void saveDocument(activeDocument)}>{saveLabel}</button><button type="button" onClick={() => { focusPreview(); if (activeDocument === "quote") onPreviewQuote(); else previewInvoice(); }}>Preview PDF</button><button type="button" onClick={() => activeDocument === "quote" ? onDownloadQuote() : void downloadInvoice()}>Download PDF</button><DeliveryMenu kind={activeDocument} onUnavailable={deliveryUnavailable} /></div>{notice && mobilePane === "preview" ? <p className="business-document-notice" role="status">{notice}</p> : null}</section>
      </main>
      {manualState ? <ManualEditor activeDocument={activeDocument} quote={quote} invoice={invoice} initialFocus={manualState.focus} onApply={applyManualDraft} onCancel={() => setManualState(null)} /> : null}
      {savedFilesOpen ? <SavedFilesDrawer setPage={setPage} onClose={() => setSavedFilesOpen(false)} onOpen={(draftId) => void openSavedDocument(draftId)} /> : null}
      {photoReviewOpen && documentPhotos.length ? <PhotoReviewDialog photos={documentPhotos} assignments={photoAssignments} onCancel={() => setPhotoReviewOpen(false)} onApply={(assignments) => { setPhotoAssignments((current) => ({ ...current, ...Object.fromEntries(Object.entries(assignments).map(([id, assignment]) => [id, { ...normalizeBusinessDocumentPhotoAssignment(assignment), documentType: activeDocument }])) })); setPhotoReviewOpen(false); }} /> : null}
      {exitDialogOpen ? <WorkspaceDialog titleId="business-document-exit-title" title="Save changes before leaving?" onClose={() => setExitDialogOpen(false)} actions={[{ label: "Keep Editing", onClick: () => setExitDialogOpen(false) }, { label: "Discard Changes", onClick: discardAndExit }, { label: "Save Draft & Exit", primary: true, onClick: () => void saveAllAndExit() }]}><p>Save keeps this private working document for your business. It does not send or issue anything.</p></WorkspaceDialog> : null}
      {saveFailureOpen ? <WorkspaceDialog titleId="business-document-save-failure-title" title="We couldn't save your draft right now" onClose={keepEditingAfterSaveFailure} actions={[{ label: "Keep Editing", onClick: keepEditingAfterSaveFailure }, { label: "Exit with Recovery", onClick: () => void exitWithRecovery() }, { label: "Try Again", primary: true, onClick: retryFailedSave }]}><p>{saveState.error || "Your work is still here."}</p><p>Exit with Recovery stores a temporary noncanonical copy on this device. It will not appear in Saved Files.</p></WorkspaceDialog> : null}
      {recoveryRecord ? <WorkspaceDialog titleId="business-document-recovery-title" title="Recover your last unsaved session?" actions={[{ label: "Discard Recovery", onClick: () => void discardRecovery() }, { label: "Continue Where I Left Off", primary: true, onClick: continueRecovery }]}><p>We found changes that were not successfully saved to Meetro. Recovery is device-local and still unsaved.</p></WorkspaceDialog> : null}
      <BottomNav setPage={guardedSetPage} currentPage="quoteBuilder" />
    </div>
  );
}
