import { useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "./BottomNav.jsx";
import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import {
  createInvoiceContinuityDraft,
  customerVisibleWorkspaceDraft,
  normalizeBusinessDocumentTab,
  reconcileBusinessDocumentInstructions,
  resolveBusinessDocumentConversationMessage,
} from "../utils/businessDocumentWorkspace.js";
import { getBusinessIdentityProjection } from "../utils/businessIdentity.js";
import {
  attachCustomerDocumentPhotoEvidence,
  buildQuickInvoiceDocumentModel,
} from "../utils/customerDocumentModel.js";
import {
  downloadCustomerDocumentPdf,
  getCustomerDocumentActionCopy,
  previewCustomerDocumentPdfWithMedia,
} from "../utils/customerDocumentPdf.js";
import {
  createBusinessDocumentDraft,
  createBusinessDocumentSaveKey,
  deleteBusinessDocumentDraft,
  getBusinessDocumentDraft,
  getBusinessDocumentCustomerPdf,
  getBusinessDocumentNumbering,
  initializeBusinessDocumentNumbering,
  listBusinessDocumentDrafts,
  updateBusinessDocumentDraft,
  deliverBusinessDocumentDraft,
  listBusinessDocumentDeliveries,
} from "../utils/businessDocumentDraftApi.js";
import {
  createWorkingQuoteCommandKeys,
  fetchWorkingQuoteReviewIdentity,
  issueAndSendWorkingQuote,
} from "../utils/workingQuoteCanonicalIssue.js";
import {
  copyBusinessDocumentShareMessage,
  downloadBusinessDocumentPdfArtifact,
  openBusinessDocumentEmailDraft,
  previewBusinessDocumentPdfArtifact,
  shareBusinessDocumentPdfArtifact,
} from "../utils/businessDocumentDeviceShare.js";
import {
  BUSINESS_DOCUMENT_AGREEMENT_FIELDS,
  BUSINESS_DOCUMENT_AGREEMENT_PRESETS,
  normalizeBusinessDocumentAgreement,
} from "../utils/businessDocumentAgreement.js";
import {
  businessDocumentDetailFields,
  cloneBusinessDocumentEditorSource,
  mergeBusinessDocumentEditorSource,
} from "../utils/businessDocumentEditor.js";
import {
  businessDocumentSavedResumeTarget,
  clearDeletedBusinessDocumentRecoveryIdentity,
  clearDeletedBusinessDocumentRecoverySnapshot,
  deleteBusinessDocumentRecovery,
  loadBusinessDocumentRecovery,
  saveBusinessDocumentRecovery,
} from "../utils/businessDocumentRecovery.js";
import {
  buildBusinessDocumentSavePayload,
  buildBusinessDocumentConversationTurn,
  buildNewBusinessDocumentDraftPayload,
  businessDocumentPhotoVisibilityNotice,
  businessDocumentRestoredSnapshotFingerprint,
  businessDocumentSavePresentation,
  businessDocumentSnapshotFingerprint,
  businessDocumentTurnResponse,
  customerVisibleBusinessDocumentPhotoGroups,
  defaultBusinessDocumentPhotoAssignment,
  hasMeaningfulBusinessDocumentDraft,
  normalizeBusinessDocumentPhotoAssignment,
  recoveryPhotoProjection,
  restoreBusinessDocumentConversationTurns,
  restoreBusinessDocumentDraft,
  validateNewBusinessDocumentDraft,
} from "../utils/businessDocumentPersistence.js";
import {
  analyzeQuickQuoteAnalysisSession,
  appendQuickQuoteAnalysisEvidence,
  applyQuickQuoteAnalysisExecutionToPresentationState,
  createQuickQuoteAnalysisPresentationState,
  createQuickQuoteAnalysisSession,
  continueQuickQuoteAnalysisSession,
  hydrateQuickQuoteAnalysisPresentationState,
  loadQuickQuoteAnalysisSession,
} from "../utils/quickQuoteAnalysisSession.js";
import { getAuthenticatedIdentitySnapshot } from "../utils/session.js";
import {
  assignBusinessContactRole,
  createBusinessContact,
  createBusinessContactCommandKey,
  createDeterministicBusinessContactKey,
  getBusinessContact,
  getBusinessContactActiveRoles,
  listBusinessContacts,
  loadBusinessContactProfileId,
} from "../utils/businessContactsApi.js";
import {
  createBusinessCustomerRelationshipCommandKey,
  establishBusinessCustomerRelationship,
  getBusinessCustomerRelationshipByContact,
} from "../utils/businessCustomerRelationshipsApi.js";
import {
  applyBusinessContactToDocumentSnapshot,
  businessContactDisplayName,
  completeBusinessDocumentCustomerWorkflow,
  filterBusinessDocumentCustomerContacts,
  findBusinessContactDuplicateCandidates,
  hasBusinessDocumentCustomerSnapshot,
  normalizeBusinessDocumentCustomerParty,
} from "../utils/businessDocumentCustomerParty.js";
import { t } from "../utils/language.js";
import "./UnifiedBusinessDocumentWorkspace.css";

const NUMBERING_SETUP_PENDING = Symbol("BUSINESS_DOCUMENT_NUMBERING_SETUP_PENDING");

function emptyCustomerControl() {
  return {
    open: false,
    mode: "choose",
    search: "",
    contacts: [],
    selectedId: "",
    busy: false,
    error: "",
    confirmReplacement: false,
    duplicateCandidates: [],
    duplicateConfirmed: false,
    replaceSnapshot: false,
    partyType: "PERSON",
    pendingContact: null,
    pendingRelationship: null,
    retryPhase: "",
    createKey: "",
  };
}

function money(value) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
    .format(Number.isFinite(parsed) ? parsed : 0);
}

function displayDocumentNumber(document = {}) {
  return String(document.documentNumber || document.reference || "").trim();
}

function todayLocalIsoDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function analysisTurnMessage(turn) {
  if (
    turn?.role === "PROFESSIONAL" &&
    typeof turn?.payload?.message === "string"
  ) {
    return turn.payload.message.trim();
  }

  if (
    turn?.role === "MEETRO" &&
    typeof turn?.payload?.assistantMessage === "string"
  ) {
    return turn.payload.assistantMessage.trim();
  }

  return "";
}

function analysisPhotoSignature(media = []) {
  return media
    .map((item) => {
      const publicId = String(item?.public_id || "").trim();
      const version = String(item?.version || "").trim();
      return publicId ? `${publicId}:${version}` : "";
    })
    .filter(Boolean)
    .sort()
    .join("|");
}

function analysisEvidencePhotoSignature(evidence) {
  return (evidence?.photoReferences || [])
    .map((item) => {
      const publicId = String(item?.publicId || "").trim();
      const version = String(item?.version || "").trim();
      return publicId ? `${publicId}:${version}` : "";
    })
    .filter(Boolean)
    .sort()
    .join("|");
}

function conversationTimestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed)
    ? parsed
    : Number.MAX_SAFE_INTEGER;
}

function conversationTurnMessageHistory(turn = {}) {
  return [
    turn.text,
    turn.originalText,
    ...(Array.isArray(turn.revisionHistory) ? turn.revisionHistory : []),
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function AnalysisConversationTurn({ turn }) {
  const message = analysisTurnMessage(turn);
  if (!message) return null;

  const professional = turn.role === "PROFESSIONAL";

  return (
    <article className={professional ? "you" : "meetro"}>
      <span>{professional ? "You" : "M"}</span>
      <p>{message}</p>
    </article>
  );
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

function DeliveryMenu({ kind, onSelect, disabled = false }) {
  const [open, setOpen] = useState(false);
  const label = kind === "quote" ? "Send Quote" : "Send Invoice";
  return (
    <div className="business-document-delivery">
      <button type="button" className="business-document-primary" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{label} <span aria-hidden="true">⌄</span></button>
      {open ? <div role="menu" className="business-document-delivery-menu"><button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect("EMAIL"); }}>Email with Meetro</button><button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect("MEETRO_MESSAGE"); }}>Meetro Message</button><button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect("DEVICE_SHARE"); }}>Share with device…</button></div> : null}
    </div>
  );
}

function CustomerPhotoEvidence({ generalPhotos = [], beforePhotos = [], afterPhotos = [] }) {
  if (!generalPhotos.length && !beforePhotos.length && !afterPhotos.length) return null;
  return <section className="business-document-proof" aria-label="Customer-visible Project Photos and Evidence">{generalPhotos.length ? <div><h3>Project Photos / Evidence</h3><PhotoStrip photos={generalPhotos} /></div> : null}{beforePhotos.length ? <div><h3>Before</h3><PhotoStrip photos={beforePhotos} /></div> : null}{afterPhotos.length ? <div><h3>After</h3><PhotoStrip photos={afterPhotos} /></div> : null}</section>;
}

function QuotePreview({ quote, branding, generalPhotos, beforePhotos, afterPhotos, saved = false, documentNumber = "", authorityState = null }) {
  const rows = quoteRows(quote);
  const agreement = normalizeBusinessDocumentAgreement(quote.agreement);
  const agreementSections = BUSINESS_DOCUMENT_AGREEMENT_FIELDS.filter(([key]) => agreement[key]);
  const observation = quote.recommendedSolution && quote.projectDescription &&
    String(quote.recommendedSolution).trim() !== String(quote.projectDescription).trim()
    ? quote.projectDescription
    : "";
  return (
    <article className="business-live-document" aria-label="Live Quote Preview">
      <header className="business-document-preview-heading"><strong>{branding.businessName}</strong><div><b>QUOTE</b><span>{authorityState?.status === "ISSUED" ? "SENT" : "WORKING DRAFT"}</span></div></header>
      <dl className="business-document-meta"><div><dt>Customer</dt><dd>{quote.customerName || "—"}</dd></div><div><dt>Project</dt><dd>{quote.projectTitle || "—"}</dd></div><div><dt>Quote #</dt><dd>{documentNumber || "Assigned on first save"}</dd></div><div><dt>Date</dt><dd>{quote.quoteDate || "—"}</dd></div></dl>
      {observation ? <section className="business-document-copy"><h3>Observation</h3><p>{observation}</p></section> : null}
      <section className="business-document-copy"><h3>Scope of Work</h3><p>{quote.recommendedSolution || quote.projectDescription || "Tell Meetro about the work to begin this draft."}</p></section>
      <CustomerPhotoEvidence generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />
      <div className="business-document-table" role="table" aria-label="Quote line items">
        <div className="head" role="row"><span>Description</span><span>Amount</span></div>
        {rows.length ? rows.map((item) => <div role="row" key={item.id || `${item.description}-${item.amount}`}><span>{item.description}</span><strong>{money(item.amount)}</strong></div>) : <div role="row"><span>Working draft</span><strong>—</strong></div>}
        <div className="total" role="row"><span>PROJECT PRICE</span><strong>{quote.total > 0 ? money(quote.total) : "—"}</strong></div>
      </div>
      <div className="business-document-footer-grid"><section><h3>Payment Terms</h3><p>{quote.terms || "Confirm terms before delivery."}</p></section><section><h3>Estimated Duration</h3><p>{quote.estimatedDuration || "Not confirmed."}</p></section><section><h3>Acceptance / Status</h3><p>{authorityState?.status === "ISSUED" ? "Sent to customer · Waiting for customer response" : saved ? "Saved working draft · Not sent" : "Draft only. Nothing has been sent or approved."}</p></section></div>
      {agreement.exclusions.length || agreementSections.length ? <section className="business-document-agreement-preview" aria-label="Quote Agreement"><h3>Quote Agreement</h3>{agreement.exclusions.length ? <div><strong>Not Included / Exclusions</strong><ul>{agreement.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{agreementSections.map(([key, label]) => <div key={key}><strong>{label}</strong><p>{agreement[key]}</p></div>)}</section> : null}
      <footer>{branding.businessName}<span>Prepared with Meetro</span></footer>
    </article>
  );
}

function InvoicePreview({ invoice, branding, generalPhotos, beforePhotos, afterPhotos, saved = false, documentNumber = "" }) {
  const rows = invoiceRows(invoice);
  const total = invoiceTotal(invoice);
  const paid = Number(invoice.paidAmount || 0) || 0;
  const balance = String(invoice.balanceDue ?? "").trim()
    ? Number(invoice.balanceDue) || 0
    : Math.max(0, total - paid);
  return (
    <article className="business-live-document" aria-label="Live Invoice Preview">
      <header className="business-document-preview-heading"><strong>{branding.businessName}</strong><div><b>INVOICE</b><span>WORKING DRAFT</span></div></header>
      <dl className="business-document-meta"><div><dt>Bill To</dt><dd>{invoice.customerName || "—"}</dd></div><div><dt>Job</dt><dd>{invoice.projectTitle || "—"}</dd></div><div><dt>Invoice #</dt><dd>{documentNumber || "Assigned on first save"}</dd></div><div><dt>Date</dt><dd>{invoice.invoiceDate || "—"}</dd></div><div><dt>Quote reference</dt><dd>{invoice.quoteReference || "Not linked"}</dd></div></dl>
      <section className="business-document-copy"><h3>Work Completed</h3><p>{invoice.workPerformed || "Completion details have not been confirmed."}</p></section>
      <CustomerPhotoEvidence generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} />
      <div className="business-document-table" role="table" aria-label="Invoice summary">
        <div className="head" role="row"><span>Invoice Summary</span><span>Amount</span></div>
        {rows.length ? rows.map((item) => <div role="row" key={item.id || `${item.description}-${item.amount}`}><span>{item.description}</span><strong>{money(item.amount)}</strong></div>) : <div role="row"><span>Working draft</span><strong>—</strong></div>}
        <div className="total" role="row"><span>TOTAL DUE</span><strong>{total > 0 ? money(total) : "—"}</strong></div>
      </div>
      <div className="business-document-footer-grid"><section><h3>Payment Terms</h3><p>{invoice.paymentTerms || "Not confirmed."}</p></section><section><h3>Due Date</h3><p>{invoice.dueDate || "Not confirmed."}</p></section><section><h3>Amount Paid</h3><p>{money(paid)}</p></section><section><h3>Balance Due</h3><p>{money(balance)}</p></section><section><h3>Status</h3><p>{saved ? "Ready for Customer Review" : "Draft only. Payment and completion are not inferred."}</p></section></div>
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

function ManualEditor({ activeDocument, quote, invoice, documentNumber, initialFocus, language, mode = "manual", onApply, onCancel, onModeChange }) {
  const source = activeDocument === "quote" ? quote : invoice;
  const initialSourceRef = useRef(null);
  if (!initialSourceRef.current) {
    initialSourceRef.current = cloneBusinessDocumentEditorSource(source);
  }
  const originalRef = useRef(initialSourceRef.current);
  const sourceFingerprintRef = useRef(JSON.stringify(source));
  const [draft, setDraft] = useState(initialSourceRef.current);
  const firstInputRef = useRef(null);
  const amountInputRef = useRef(null);
  useEffect(() => { (initialFocus === "amount" ? amountInputRef : firstInputRef).current?.focus(); }, [initialFocus]);
  const sourceFingerprint = JSON.stringify(source);
  useEffect(() => {
    if (sourceFingerprintRef.current === sourceFingerprint) return;
    const nextSource = cloneBusinessDocumentEditorSource(source);
    setDraft((current) => mergeBusinessDocumentEditorSource({
      draft: current,
      previousSource: originalRef.current,
      nextSource,
    }));
    originalRef.current = nextSource;
    sourceFingerprintRef.current = sourceFingerprint;
  }, [source, sourceFingerprint]);
  const detailFields = businessDocumentDetailFields(activeDocument)
    .map(([fieldName, labelKey]) => [fieldName, t(labelKey, language)]);
  const paymentFields = activeDocument === "quote"
    ? [["terms", "Deposit / payment terms"]]
    : [["paymentTerms", "Payment terms"]];
  const textareas = new Set(["projectDescription", "recommendedSolution", "workPerformed", "terms", "paymentTerms", "notes"]);
  function field([field, label]) {
    const control = textareas.has(field)
      ? <textarea ref={field === "customerName" ? firstInputRef : undefined} value={draft[field] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />
      : <input ref={field === "customerName" ? firstInputRef : field === "totalOverride" ? amountInputRef : undefined} type={field === "dueDate" ? "date" : "text"} inputMode={field === "totalOverride" ? "decimal" : undefined} value={draft[field] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />;
    return <label key={field}>{label}{control}</label>;
  }
  const detailFieldset = <fieldset className="business-document-manual-fields"><legend>{t(activeDocument === "quote" ? "businessDocumentQuoteDetails" : "businessDocumentInvoiceDetails", language)}</legend><div>{detailFields.map(field)}</div></fieldset>;
  if (mode === "prefill") {
    return <section id="business-document-prefill-details" className="business-document-prefill-details" aria-labelledby="business-document-prefill-details-title">
      <details open>
        <summary id="business-document-prefill-details-title">{t(activeDocument === "quote" ? "businessDocumentPrefillQuoteDetails" : "businessDocumentPrefillInvoiceDetails", language)}</summary>
        <div>
          <p>{t("businessDocumentPrefillDetailsHelp", language)}</p>
          {detailFieldset}
          <footer>
            <button type="button" onClick={onCancel}>{t("businessDocumentCloseDetails", language)}</button>
            <button type="button" onClick={() => onModeChange("manual")}>{t("businessDocumentOpenManualEntry", language)}</button>
            <button type="button" className="business-document-primary" onClick={() => onApply(draft, originalRef.current)}>{t("businessDocumentApplyChanges", language)}</button>
          </footer>
        </div>
      </details>
    </section>;
  }
  return (
    <><button type="button" className="business-document-manual-backdrop" aria-label="Cancel manual edit" onClick={onCancel} />
      <section className="business-document-manual" role="dialog" aria-modal="true" aria-labelledby="business-document-manual-title">
        <header><div><span>Manual entry</span><h2 id="business-document-manual-title">Edit the live {activeDocument}</h2></div><button type="button" onClick={onCancel}>Cancel</button></header>
        <label className="business-document-number-field">{activeDocument === "quote" ? "Quote number" : "Invoice number"}<input value={documentNumber || "Assigned on first save"} readOnly aria-readonly="true" /></label>
        {detailFieldset}
        <section className="business-document-manual-pricing" aria-labelledby="business-document-manual-pricing-title"><h3 id="business-document-manual-pricing-title">Pricing</h3>{field(["totalOverride", activeDocument === "quote" ? "Customer price" : "Invoice amount"])}<div className="business-document-manual-line-groups">
          {activeDocument === "quote" ? <><EditableRows title="Service items" rows={draft.lineItems || []} nameField="description" onChange={(lineItems) => setDraft((current) => ({ ...current, lineItems }))} /><EditableRows title="Materials" rows={draft.materialItems || []} nameField="name" onChange={(materialItems) => setDraft((current) => ({ ...current, materialItems }))} /><EditableRows title="Labor" rows={draft.laborItems || []} nameField="description" onChange={(laborItems) => setDraft((current) => ({ ...current, laborItems }))} /></> : <EditableRows title="Invoice items" rows={draft.lineItems || []} nameField="description" onChange={(lineItems) => setDraft((current) => ({ ...current, lineItems }))} />}
        </div></section>
        <fieldset className="business-document-manual-fields"><legend>Payment</legend><div>{paymentFields.map(field)}</div></fieldset>
        <fieldset className="business-document-manual-fields"><legend>Customer notes</legend><div>{field(["notes", "Notes shown to the customer"])}</div></fieldset>
        {activeDocument === "quote" ? <details className="business-document-agreement-editor"><summary>Business terms</summary><div><p>Review, edit, or remove every term before sending. Meetro does not provide legal advice.</p><div className="business-document-agreement-presets"><button type="button" onClick={() => setDraft((current) => ({ ...current, agreement: { ...normalizeBusinessDocumentAgreement(current.agreement), additionalWorkTerms: BUSINESS_DOCUMENT_AGREEMENT_PRESETS.additionalWorkTerms } }))}>Use outside-scope protection</button><button type="button" onClick={() => setDraft((current) => ({ ...current, agreement: { ...normalizeBusinessDocumentAgreement(current.agreement), hiddenConditionsTerms: BUSINESS_DOCUMENT_AGREEMENT_PRESETS.hiddenConditionsTerms } }))}>Use hidden-condition protection</button><button type="button" onClick={() => setDraft((current) => ({ ...current, agreement: { ...normalizeBusinessDocumentAgreement(current.agreement), diagnosticTerms: BUSINESS_DOCUMENT_AGREEMENT_PRESETS.diagnosticTerms } }))}>Use diagnostic terms</button></div><label>Not Included / Exclusions<textarea value={(draft.agreement?.exclusions || []).join("\n")} onChange={(event) => setDraft((current) => ({ ...current, agreement: { ...normalizeBusinessDocumentAgreement(current.agreement), exclusions: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) } }))} /></label>{BUSINESS_DOCUMENT_AGREEMENT_FIELDS.map(([key, label]) => <label key={key}>{label}<textarea value={draft.agreement?.[key] || ""} onChange={(event) => setDraft((current) => ({ ...current, agreement: { ...normalizeBusinessDocumentAgreement(current.agreement), [key]: event.target.value } }))} /></label>)}</div></details> : null}
        <footer><button type="button" onClick={onCancel}>Cancel</button><button type="button" onClick={() => onModeChange("prefill")}>{t("businessDocumentBackToPrefill", language)}</button><button type="button" className="business-document-primary" onClick={() => onApply(draft, originalRef.current)}>{t("businessDocumentApplyChanges", language)}</button></footer>
      </section></>
  );
}

function InstructionEditor({ turn, onSave, onCancel }) {
  const [value, setValue] = useState(turn.text);
  return <article className="you editing"><span>You</span><div className="business-document-turn-editor"><textarea aria-label="Edit prior instruction" value={value} onChange={(event) => setValue(event.target.value)} /><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" onClick={() => onSave(value)} disabled={!value.trim()}>Save</button></div></div></article>;
}

function InstructionTurn({ turn, onSave, onCancel, onEdit, showResponse = true }) {
  if (turn.editing) return <InstructionEditor turn={turn} onSave={onSave} onCancel={onCancel} />;
  return <><article className="you"><span>You</span><div className="business-document-turn-body"><p>{turn.text}</p><div><button type="button" onClick={onEdit}>Edit</button>{turn.revisions ? <small>Edited</small> : null}</div>{turn.revisionHistory?.length ? <details><summary>Revision history</summary><ol>{turn.revisionHistory.map((text, index) => <li key={`${turn.id}-revision-${index}`}>{text}</li>)}</ol></details> : null}</div></article>{showResponse ? <article className="meetro"><span>M</span><p>{businessDocumentTurnResponse(turn)}</p></article> : null}</>;
}

function SavedFilesDrawer({ currentSavedIds = [], onClose, onDeleted, onOpen, setPage }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [time, setTime] = useState("ALL");
  const [state, setState] = useState({ busy: true, error: "", documents: [] });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteState, setDeleteState] = useState({ busy: false, error: "" });
  const [notice, setNotice] = useState("");
  const closeRef = useRef(null);
  const deleteTriggerRef = useRef(null);

  async function load(successNotice = "") {
    setState((current) => ({ ...current, busy: true, error: "" }));
    try {
      const documents = await listBusinessDocumentDrafts({ search, type, time, setPage });
      setState({ busy: false, error: "", documents });
      if (successNotice) setNotice(successNotice);
    } catch {
      setState((current) => ({ ...current, busy: false, error: "Saved Files could not be loaded. Your current work is unchanged." }));
    }
  }

  function cancelDelete() {
    if (deleteState.busy) return;
    setDeleteTarget(null);
    setDeleteState({ busy: false, error: "" });
    requestAnimationFrame(() => deleteTriggerRef.current?.focus());
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteState.busy) return;
    setDeleteState({ busy: true, error: "" });
    try {
      await deleteBusinessDocumentDraft({
        draftId: deleteTarget.id,
        expectedVersion: deleteTarget.version,
        setPage,
      });
      setState((current) => ({
        ...current,
        documents: current.documents.filter((document) => document.id !== deleteTarget.id),
      }));
      await onDeleted(deleteTarget);
      setDeleteTarget(null);
      setDeleteState({ busy: false, error: "" });
      setNotice("Draft deleted.");
      await load("Draft deleted.");
      requestAnimationFrame(() => closeRef.current?.focus());
    } catch (error) {
      setDeleteState({
        busy: false,
        error: error?.message || "This draft could not be deleted. It remains in Saved Files.",
      });
    }
  }

  useEffect(() => {
    closeRef.current?.focus();
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function escape(event) { if (event.key === "Escape" && !deleteTarget) onClose(); }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [deleteTarget, onClose]);

  return <>
    <button type="button" className="business-saved-backdrop" aria-label="Close Saved Files" onClick={onClose} />
    <aside className="business-saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-files-title">
      <header><h2 id="saved-files-title">Saved Quotes &amp; Invoices</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close Saved Files">×</button></header>
      <form className="business-saved-search" onSubmit={(event) => { event.preventDefault(); void load(); }}><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, job, number, or address…" aria-label="Search saved documents" /><button type="submit">Search</button></form>
      <div className="business-saved-filters" aria-label="Saved document filters"><label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option value="">All Types</option><option value="QUOTE">Quotes</option><option value="INVOICE">Invoices</option></select></label><label>Status<select value="WORKING_DRAFT" disabled><option>WORKING_DRAFT</option></select></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)}><option value="ALL">All Time</option><option value="30D">Last 30 days</option><option value="90D">Last 90 days</option></select></label></div>
      {notice ? <p className="business-saved-notice" role="status">{notice}</p> : null}
      {state.busy ? <p role="status">Loading saved documents…</p> : state.error ? <div className="business-saved-empty" role="alert"><strong>{state.error}</strong><button type="button" onClick={() => void load()}>Try Again</button></div> : state.documents.length ? <div className="business-saved-results">{state.documents.map((document) => <article key={document.id}><button type="button" className="business-saved-open" onClick={() => onOpen(document.id)}><MeetroIcon name={document.documentType === "QUOTE" ? "quickQuote" : "quickInvoice"} size={20} decorative /><span><strong>{document.content.projectTitle || document.content.customerName || displayDocumentNumber(document)}</strong><small>{document.documentType === "QUOTE" ? "Quote" : "Invoice"} · {document.content.customerName || "Customer not entered"} · {displayDocumentNumber(document)}</small><small>Updated {new Date(document.updatedAt).toLocaleString()}</small></span></button><button type="button" className="business-saved-delete" onClick={(event) => { deleteTriggerRef.current = event.currentTarget; setDeleteState({ busy: false, error: "" }); setDeleteTarget(document); }} aria-haspopup="dialog">Delete Draft</button></article>)}</div> : <div className="business-saved-empty" role="status"><MeetroIcon name="history" size={28} decorative /><strong>No saved documents match.</strong><p>Only governed server-saved working drafts appear here.</p></div>}
    </aside>
    {deleteTarget ? <WorkspaceDialog titleId="business-document-delete-title" title="Delete this draft?" onClose={cancelDelete} actions={[{ label: "Cancel", onClick: cancelDelete, disabled: deleteState.busy }, { label: deleteState.busy ? "Deleting…" : "Delete Draft", destructive: true, disabled: deleteState.busy, onClick: () => void confirmDelete() }]}><p>This removes the saved working draft from Meetro. It does not delete the Job or customer.</p>{currentSavedIds.includes(deleteTarget.id) ? <p>Your currently open workspace will remain as an unsaved copy.</p> : null}{deleteState.error ? <p role="alert">{deleteState.error}</p> : null}</WorkspaceDialog> : null}
  </>;
}

function WorkspaceDialog({ titleId, title, children, actions, onClose, openAtTop = false }) {
  const firstRef = useRef(null);
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (openAtTop) {
        if (dialogRef.current) dialogRef.current.scrollTop = 0;
        headingRef.current?.focus({ preventScroll: true });
        if (dialogRef.current) dialogRef.current.scrollTop = 0;
      } else {
        firstRef.current?.focus();
      }
    });
    function escape(event) { if (event.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose, openAtTop]);
  return <>{onClose ? <button type="button" className="business-document-manual-backdrop" aria-label={`Close ${title}`} onClick={onClose} /> : <div className="business-document-manual-backdrop" aria-hidden="true" />}<section ref={dialogRef} className="business-document-confirm" role="dialog" aria-modal="true" aria-labelledby={titleId}><h2 ref={headingRef} id={titleId} tabIndex={openAtTop ? -1 : undefined}>{title}</h2>{children}<footer>{actions.map((action, index) => <button ref={index === 0 ? firstRef : undefined} key={action.label} type="button" className={action.primary ? "business-document-primary" : action.destructive ? "business-document-destructive" : ""} disabled={action.disabled} onClick={action.onClick}>{action.label}</button>)}</footer></section></>;
}

function WorkflowGuideStep({ number, title, children }) {
  return <article className="business-document-workflow-step"><span aria-hidden="true">{number}</span><div><h4>{title}</h4>{children}</div></article>;
}

function BusinessDocumentWorkflowGuide({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    function escape(event) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  return <>
    <button type="button" className="business-document-workflow-backdrop" aria-label="Close workflow guide" onClick={onClose} />
    <aside id="business-document-workflow-guide" className="business-document-workflow-guide" role="dialog" aria-labelledby="business-document-workflow-title">
      <header><h2 id="business-document-workflow-title">How Quote &amp; Invoice workflow works</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close workflow guide">×</button></header>
      <section><h3>QUOTE WORKFLOW</h3>
        <WorkflowGuideStep number="1" title="Start"><p>Chat with Meetro, speak, or upload photos to begin.</p><p>The conversation creates a private working space for the job. Nothing is added to the customer document merely because it was discussed.</p></WorkflowGuideStep>
        <WorkflowGuideStep number="2" title="Ask Meetro"><p>Ask questions about the job, photos, findings, repair options, materials, measurements, recommendations, or other job context.</p><p>Job Analysis stays private unless the professional explicitly chooses what belongs in the working document.</p></WorkflowGuideStep>
        <WorkflowGuideStep number="3" title="Build or Update Quote"><p>Questions and photo analysis stay private. Direct Quote facts or explicit document instructions can update the working draft, even while Job Analysis is active.</p><p>Only explicit document actions should change the working Quote. Let Meetro prefill uses eligible professional-provided document facts. Fill form manually always remains available.</p><ul><li>Customer: Paul Becker</li><li>Scope: Add this repair.</li><li>Price: $2,650.</li><li>Payment terms: 50% deposit.</li></ul></WorkflowGuideStep>
        <WorkflowGuideStep number="4" title="Review Job Evidence"><p>Photos and analysis are private working evidence by default. The professional decides what, if anything, should become customer-visible.</p><p>Photo role and photo visibility remain separate.</p></WorkflowGuideStep>
        <WorkflowGuideStep number="5" title="Review the Quote"><p>The Live Quote Preview stays visible while the professional works. Nothing is issued merely because the preview changes.</p><ul><li>Customer and scope</li><li>Line items and price</li><li>Payment terms and estimated duration</li><li>Customer-facing notes</li><li>Agreement and status information</li></ul></WorkflowGuideStep>
        <WorkflowGuideStep number="6" title="Save and Send Quote"><p>Save Draft, Preview PDF, and Download PDF keep the Quote in your private workspace. For a Job-linked Quote, Send Quote to Customer uses the exact saved version and makes it available in the customer conversation. Customer acceptance remains separate.</p></WorkflowGuideStep>
      </section>
      <section><h3>INVOICE WORKFLOW</h3>
        <WorkflowGuideStep number="7" title="Create Invoice"><p>When the Quote or work reaches the appropriate stage, switch to the Invoice tab. Use the same workspace and job context to prepare and refine the Invoice.</p><p>Creating an Invoice does not mean it has been sent or paid.</p></WorkflowGuideStep>
        <WorkflowGuideStep number="8" title="Review Invoice"><p>Review billable line items, totals, customer information, notes, payment information, and any applicable approved changes.</p><p>Quote and Invoice remain distinct business documents.</p></WorkflowGuideStep>
        <WorkflowGuideStep number="9" title="Send Invoice"><p>Invoice delivery remains a separate governed action. Preview, download, and send behavior continues using the existing Invoice controls.</p><p>Sending an Invoice does not mean payment was received.</p></WorkflowGuideStep>
      </section>
      <section><h3>SAVED FILES / CONTINUITY</h3>
        <WorkflowGuideStep number="10" title="Saved Files"><p>Saved Quotes and Invoices can be reopened from Saved Files. Reopening restores the existing saved workspace context.</p></WorkflowGuideStep>
      </section>
      <section><h3>PRIVACY &amp; CONTROL</h3>
        <WorkflowGuideStep number="11" title="Private by default"><p>Photos, Job Analysis, recommendations, private costs, and private reminders remain internal unless the professional explicitly chooses otherwise.</p><p>Editing, saving, previewing, and downloading do not send anything. Only the explicit Send Quote to Customer action makes the saved Quote available for customer review. Nothing automatically accepts a Quote, records payment, schedules work, creates an Invoice, or closes a Job.</p></WorkflowGuideStep>
      </section>
      <footer>Need help? Ask Meetro in the conversation.</footer>
    </aside>
  </>;
}

function DeliveryReviewDialog({ state, onChange, onCancel, onSend }) {
  const quote = state.documentType === "quote";
  const email = state.channel === "EMAIL";
  const label = quote ? "Quote" : "Invoice";
  const action = state.busy ? "Sending…" : state.failed ? `Retry ${email ? "Email" : "Message"}` : `${state.resend ? "Resend" : "Send"} ${email ? "Email" : "Message"}`;
  return <WorkspaceDialog titleId="business-document-delivery-review-title" title={`Review ${label} ${email ? "Email" : "Message"}`} onClose={state.busy ? undefined : onCancel} actions={[{ label: "Cancel", onClick: onCancel, disabled: state.busy }, { label: action, primary: true, disabled: state.busy || (email && !state.recipientEmail.trim()), onClick: onSend }]}><div className="business-document-delivery-review">{email ? <label>Recipient<input type="email" autoComplete="email" value={state.recipientEmail} onChange={(event) => onChange("recipientEmail", event.target.value)} /></label> : <p><strong>Recipient</strong><br />Active governed Meetro customer conversation</p>}<label>Subject<input value={state.subject} onChange={(event) => onChange("subject", event.target.value)} /></label><label>Customer message<textarea value={state.customerMessage} onChange={(event) => onChange("customerMessage", event.target.value)} /></label><dl><div><dt>{label} number</dt><dd>{displayDocumentNumber(state.document)}</dd></div><div><dt>Exact saved version</dt><dd>{state.document.version}</dd></div><div><dt>{quote ? "Quote amount" : "Total due"}</dt><dd>{money(state.total)}</dd></div><div><dt>Customer document</dt><dd>PDF included</dd></div><div><dt>{quote ? "Quote Agreement / Terms" : "Due terms"}</dt><dd>{state.termsIncluded ? "Included" : "No terms entered"}</dd></div><div><dt>Customer-visible photos</dt><dd>{state.photoCount}</dd></div></dl><p className="business-document-delivery-truth">This sends only the saved customer-facing package. Private reminders, private photos, working conversation, internal costs, and recovery data are excluded. Sending does not issue, accept, approve, pay, or close anything.</p>{state.error ? <p role="alert" className="business-document-delivery-error">{state.error}</p> : null}</div></WorkspaceDialog>;
}

function QuoteIssueReviewDialog({ state, onCancel, onConfirm }) {
  const issuedQuote = state.result?.issuedQuote || state.checkpoint?.issuedQuote || null;
  const deliveryRetry = state.errorPhase === "DELIVERY" && Boolean(issuedQuote);
  const success = state.stage === "success" && Boolean(issuedQuote);
  const actionLabel = state.busy
    ? deliveryRetry
      ? "Retrying…"
      : "Sending…"
    : deliveryRetry
      ? "Retry Sending"
      : "Send Quote to Customer";
  const actions = success
    ? [{ label: "Close", primary: true, onClick: onCancel }]
    : [
        { label: "Cancel", onClick: onCancel, disabled: state.busy },
        { label: actionLabel, primary: true, onClick: onConfirm, disabled: state.busy || !state.document || !state.identity },
      ];
  const documentNumber = state.document ? displayDocumentNumber(state.document) : "Save required";
  return (
    <WorkspaceDialog
      titleId="business-document-quote-issue-title"
      title={success ? "Quote sent to customer" : deliveryRetry ? "Quote ready — sending needs attention" : "Review & Send Quote"}
      onClose={state.busy ? undefined : onCancel}
      actions={actions}
    >
      <div className="business-document-delivery-review">
        <p>
          {success
            ? `${documentNumber} has been sent to ${state.identity?.customerName || "the customer"} for review.`
            : deliveryRetry
              ? "The quote was prepared successfully, but sending it to the customer needs to be retried."
              : "Review the details below before sending this quote to the customer."}
        </p>
        <dl>
          <div><dt>Customer</dt><dd>{state.identity?.customerName || "Unavailable"}</dd></div>
          <div><dt>Project</dt><dd>{state.identity?.projectTitle || "Unavailable"}</dd></div>
          <div><dt>Quote</dt><dd>{documentNumber}</dd></div>
          <div><dt>Version</dt><dd>{state.document?.version || "—"}</dd></div>
          <div><dt>Total</dt><dd>{money(state.total)} USD</dd></div>
        </dl>
        <p className="business-document-delivery-truth">
          {success
            ? "The customer can now review and accept this quote."
            : "Once sent, this quote will be available for the customer to review and accept. Sending the quote does not mean the customer has accepted it or made a payment. Scheduling and work remain separate next steps."}
        </p>
        {state.error ? <p role="alert" className="business-document-delivery-error">{state.error}</p> : null}
      </div>
    </WorkspaceDialog>
  );
}

function NumberingSetupDialog({ state, onModeChange, onPreviousNumberChange, onCancel, onSubmit }) {
  const label = state.documentType === "invoice" ? "Invoice" : "Quote";
  const continueExisting = state.mode === "CONTINUE_EXISTING";
  const actionLabel = continueExisting ? "Continue & Save" : "Start New & Save";
  const actions = [{ label: "Not Now", onClick: onCancel, disabled: state.busy }];
  if (state.mode && !state.retryBlocked) {
    actions.push({
      label: state.busy ? "Setting up…" : actionLabel,
      primary: true,
      disabled: state.busy || (continueExisting && !state.previousDocumentNumber.trim()),
      onClick: onSubmit,
    });
  }
  return <WorkspaceDialog titleId="business-document-numbering-title" title={`Set up ${label} numbering`} onClose={state.busy ? undefined : onCancel} actions={actions}><div className="business-document-numbering-setup"><p>This is a one-time setup for this business. Choose how you want Meetro to number future {label}s.</p><p>Your current draft has not been sent or issued.</p>{state.checking ? <p role="status">Checking the business numbering status…</p> : state.retryBlocked ? null : <fieldset><legend>Choose a numbering approach</legend><label><input type="radio" name="business-document-numbering-mode" value="START_NEW" checked={state.mode === "START_NEW"} disabled={state.busy} onChange={() => onModeChange("START_NEW")} /><span><strong>Start new numbering</strong><small>Let Meetro begin a new sequence using the server-owned defaults.</small></span></label><label><input type="radio" name="business-document-numbering-mode" value="CONTINUE_EXISTING" checked={continueExisting} disabled={state.busy} onChange={() => onModeChange("CONTINUE_EXISTING")} /><span><strong>Continue existing numbering</strong><small>Enter the last number you used. Meetro will use the next number.</small></span></label></fieldset>}{continueExisting && !state.retryBlocked && !state.checking ? <label htmlFor="business-document-previous-number">Last {label} number<input id="business-document-previous-number" value={state.previousDocumentNumber} disabled={state.busy} placeholder="BG-0001019" onChange={(event) => onPreviousNumberChange(event.target.value)} /></label> : null}{state.error ? <p className="business-document-numbering-error" role="alert">{state.error}</p> : null}</div></WorkspaceDialog>;
}

function DeliveryHistory({ deliveries = [] }) {
  if (!deliveries.length) return null;
  return <details className="business-document-delivery-history"><summary>Delivery history ({deliveries.length})</summary><ul>{deliveries.map((delivery) => <li key={delivery.id}><strong>{delivery.state === "FAILED" ? "Failed" : delivery.channel === "EMAIL" ? "Email delivery requested" : "Sent by Meetro Message"}</strong><span>{delivery.documentNumber || delivery.documentReference ? `${delivery.documentNumber || delivery.documentReference} · ` : ""}Version {delivery.documentVersion}{delivery.recipientEmail ? ` · ${delivery.recipientEmail}` : ""}</span><time dateTime={delivery.sentAt || delivery.requestedAt || ""}>{delivery.sentAt || delivery.requestedAt ? new Date(delivery.sentAt || delivery.requestedAt).toLocaleString() : "Timestamp pending"}</time></li>)}</ul></details>;
}

function photoEvidenceSummary(photos, assignments) {
  const customerCount = photos.filter(
    (photo) =>
      (assignments[photo.id] || defaultBusinessDocumentPhotoAssignment())
        .visibility === "CUSTOMER_VISIBLE"
  ).length;
  const privateCount = photos.length - customerCount;

  return {
    customerCount,
    privateCount,
    visibilityLabel:
      privateCount && customerCount
        ? `${privateCount} private · ${customerCount} customer`
        : customerCount
          ? "Customer document"
          : "Private",
  };
}

function PhotoConversationEvidence({ photos, assignments, onReview }) {
  const summary = photoEvidenceSummary(photos, assignments);
  const visibilityNotice =
    businessDocumentPhotoVisibilityNotice(
      photos,
      assignments
    );

  return (
    <section
      className="business-document-inline-evidence"
      aria-label="Photos attached to this conversation"
      title={visibilityNotice}
    >
      <header>
        <div>
          <MeetroIcon name="photoCount" size={17} decorative />
          <span>
            <strong>
              {photos.length} {photos.length === 1 ? "photo" : "photos"} attached
            </strong>
            <small>{summary.visibilityLabel}</small>
          </span>
        </div>

        <button type="button" onClick={onReview}>
          Review
        </button>
      </header>

      <div className="business-document-inline-evidence-photos">
        {photos.map((photo, index) => (
          <figure key={photo.id}>
            {photo.previewUrl ? (
              <img
                src={photo.previewUrl}
                alt={photo.name || `Job evidence photo ${index + 1}`}
              />
            ) : (
              <div aria-hidden="true">
                <MeetroIcon name="photoCount" size={20} decorative />
              </div>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

function JobEvidencePanel({
  photos,
  assignments,
  onReview,
  onAddPhotos,
  canAddPhotos,
  busy,
}) {
  const summary = photoEvidenceSummary(photos, assignments);

  return (
    <aside
      className="business-document-evidence-panel"
      aria-labelledby="business-document-evidence-title"
    >
      <div className="business-document-evidence-inner">
        <header className="business-document-evidence-heading">
          <div>
            <h2 id="business-document-evidence-title">Job Evidence</h2>
            <p>
              {photos.length} {photos.length === 1 ? "photo" : "photos"} attached
            </p>
          </div>

          <button type="button" onClick={onReview}>
            Review
          </button>
        </header>

        <div className="business-document-evidence-status">
          <MeetroIcon name="photoCount" size={16} decorative />
          <span>{summary.visibilityLabel}</span>
        </div>

        <div className="business-document-evidence-photo-list">
          {photos.map((photo, index) => {
            const assignment =
              assignments[photo.id] ||
              defaultBusinessDocumentPhotoAssignment();

            const role =
              ["UNCLASSIFIED", "GENERAL_EVIDENCE"].includes(assignment.role)
                ? "General"
                : assignment.role === "BEFORE"
                  ? "Before"
                  : "After";

            const visibility =
              assignment.visibility === "CUSTOMER_VISIBLE"
                ? "Customer"
                : "Private";

            return (
              <figure key={photo.id}>
                {photo.previewUrl ? (
                  <img
                    src={photo.previewUrl}
                    alt={photo.name || `Job evidence photo ${index + 1}`}
                  />
                ) : (
                  <div className="business-document-evidence-photo-placeholder">
                    <MeetroIcon name="photoCount" size={24} decorative />
                  </div>
                )}
                <figcaption>
                  <span>{index + 1}</span>
                  <small>{role} · {visibility}</small>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <button
          type="button"
          className="business-document-evidence-add"
          onClick={onAddPhotos}
          disabled={!canAddPhotos || busy}
        >
          <MeetroIcon name="photoCount" size={17} decorative />
          {busy ? "Adding…" : "Add more photos"}
        </button>

        <div className="business-document-evidence-truth">
          <strong>Private by default</strong>
          <p>
            Photos stay private unless you explicitly include them on the
            customer document.
          </p>
        </div>
      </div>
    </aside>
  );
}

function PhotoReviewDialog({ photos, assignments, onApply, onCancel }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(photos.map((photo) => [photo.id, normalizeBusinessDocumentPhotoAssignment(assignments[photo.id] || defaultBusinessDocumentPhotoAssignment())])));
  function update(id, field, value) { setDraft((current) => ({ ...current, [id]: normalizeBusinessDocumentPhotoAssignment({ ...current[id], [field]: value }) })); }
  function applyAll(field, value) { setDraft((current) => Object.fromEntries(Object.entries(current).map(([id, assignment]) => [id, normalizeBusinessDocumentPhotoAssignment({ ...assignment, [field]: value })]))); }
  return <WorkspaceDialog titleId="business-photo-review-title" title="Review document photos" onClose={onCancel} openAtTop actions={[{ label: "Cancel", onClick: onCancel }, { label: "Apply photo choices", primary: true, onClick: () => onApply(draft) }]}><p>Role and customer visibility are separate. Before or After remains private unless you explicitly include it.</p>{photos.length > 1 ? <div className="business-photo-apply-all"><label>Apply role to all<select defaultValue="" onChange={(event) => event.target.value && applyAll("role", event.target.value)}><option value="">Choose…</option><option value="UNCLASSIFIED">General / Unclassified</option><option value="GENERAL_EVIDENCE">General evidence</option><option value="BEFORE">Before</option><option value="AFTER">After</option></select></label><label>Apply visibility to all<select defaultValue="" onChange={(event) => event.target.value && applyAll("visibility", event.target.value)}><option value="">Choose…</option><option value="PRIVATE_INTERNAL">Private</option><option value="CUSTOMER_VISIBLE">Customer document</option></select></label></div> : null}<div className="business-photo-review-list">{photos.map((photo) => <article key={photo.id}>{photo.previewUrl ? <img src={photo.previewUrl} alt={photo.name || "Selected photo"} /> : null}<div><label>Role<select value={draft[photo.id]?.role || "UNCLASSIFIED"} onChange={(event) => update(photo.id, "role", event.target.value)}><option value="UNCLASSIFIED">General / Unclassified</option><option value="GENERAL_EVIDENCE">General evidence</option><option value="BEFORE">Before</option><option value="AFTER">After</option></select></label><label>Visibility<select value={draft[photo.id]?.visibility || "PRIVATE_INTERNAL"} onChange={(event) => update(photo.id, "visibility", event.target.value)}><option value="PRIVATE_INTERNAL">Private</option><option value="CUSTOMER_VISIBLE">Include on customer document</option></select></label></div></article>)}</div></WorkspaceDialog>;
}

function CustomerPartyControl({
  language,
  content,
  customerParty,
  linkedContact,
  linkedDurably,
  control,
  onOpen,
  onClose,
  onSearch,
  onSelect,
  onUse,
  onSaveContact,
  onPartyType,
  onRetry,
  onCreateAnyway,
}) {
  const visibleContacts = filterBusinessDocumentCustomerContacts(
    control.contacts,
    control.search
  );
  const selected = control.contacts.find((contact) => contact.id === control.selectedId);
  const durableContact = linkedContact || control.pendingContact;
  const status = linkedDurably
    ? t("businessDocumentCustomerLinked", language)
    : customerParty || durableContact
      ? t("businessDocumentCustomerSavedContact", language)
      : t("businessDocumentCustomerNotLinked", language);
  const linkedName = durableContact
    ? businessContactDisplayName(durableContact)
    : content.customerName;

  return <section className="business-document-customer-control" aria-labelledby="business-document-customer-title">
    <div className="business-document-customer-summary">
      <div>
        <span id="business-document-customer-title">{t("businessDocumentCustomerTitle", language)}</span>
        <strong>{linkedName || t("businessDocumentCustomerNotLinked", language)}</strong>
        <small>{status}{durableContact?.status === "ARCHIVED" ? ` · ${t("businessDocumentCustomerArchived", language)}` : ""}</small>
      </div>
      <div>
        <button type="button" onClick={() => onOpen("choose")}>{t("businessDocumentCustomerChoose", language)}</button>
        <button type="button" onClick={() => onOpen("save")}>{t("businessDocumentCustomerSave", language)}</button>
      </div>
    </div>
    {!customerParty ? <p>{t("businessDocumentCustomerNotLinkedHelp", language)}</p> : null}
    {control.open ? <div className="business-document-customer-panel">
      <header>
        <strong>{control.mode === "save" ? t("businessDocumentCustomerSave", language) : t("businessDocumentCustomerChoose", language)}</strong>
        <button type="button" onClick={onClose} aria-label={t("businessDocumentCustomerClose", language)}>×</button>
      </header>
      {control.mode === "choose" ? <>
        <label>{t("businessDocumentCustomerSearch", language)}<input type="search" value={control.search} placeholder={t("businessDocumentCustomerSearchPlaceholder", language)} onChange={(event) => onSearch(event.target.value)} /></label>
        {control.busy ? <p role="status">{t("businessDocumentCustomerLoading", language)}</p> : null}
        {!control.busy && !visibleContacts.length ? <p role="status">{t("businessDocumentCustomerEmpty", language)}</p> : null}
        <div className="business-document-customer-results" role="listbox" aria-label={t("businessDocumentCustomerSearch", language)}>
          {visibleContacts.map((contact) => <button type="button" role="option" aria-selected={control.selectedId === contact.id} className={control.selectedId === contact.id ? "selected" : ""} key={contact.id} onClick={() => onSelect(contact.id)}><strong>{businessContactDisplayName(contact)}</strong><small>{[contact.companyName, contact.email, contact.phone].filter(Boolean).join(" · ")}</small></button>)}
        </div>
        {selected && control.confirmReplacement ? <div className="business-document-customer-confirm" role="alert"><p>{t("businessDocumentCustomerReplaceWarning", language)}</p><button type="button" onClick={() => onUse(false)}>{t("businessDocumentCustomerKeep", language)}</button><button type="button" onClick={() => onUse(true)}>{t("businessDocumentCustomerReplace", language)}</button></div> : selected ? <button type="button" className="primary" onClick={() => onUse(false)}>{t("businessDocumentCustomerUse", language)}</button> : null}
      </> : <>
        <p>{t("businessDocumentCustomerSaveHelp", language)}</p>
        <label>{t("businessDocumentCustomerType", language)}<select value={control.partyType} onChange={(event) => onPartyType(event.target.value)}><option value="PERSON">{t("businessDocumentCustomerPerson", language)}</option><option value="ORGANIZATION">{t("businessDocumentCustomerOrganization", language)}</option></select></label>
        {control.duplicateCandidates.length ? <div className="business-document-customer-duplicates" role="alert"><strong>{t("businessDocumentCustomerDuplicateTitle", language)}</strong><p>{t("businessDocumentCustomerDuplicateHelp", language)}</p>{control.duplicateCandidates.map((contact) => <button type="button" key={contact.id} onClick={() => onSelect(contact.id)}>{businessContactDisplayName(contact)}{contact.email ? ` · ${contact.email}` : ""}</button>)}<button type="button" onClick={onCreateAnyway}>{t("businessDocumentCustomerCreateAnyway", language)}</button></div> : <button type="button" className="primary" onClick={onSaveContact}>{t("businessDocumentCustomerCreate", language)}</button>}
      </>}
      {control.retryPhase ? <button type="button" className="primary" onClick={onRetry}>{t("businessDocumentCustomerRetry", language)}</button> : null}
      {control.busy ? <p role="status">{t("businessDocumentCustomerWorking", language)}</p> : null}
      {control.error ? <p role="alert" className="business-document-customer-error">{control.error}</p> : null}
    </div> : null}
  </section>;
}

export default function UnifiedBusinessDocumentWorkspace({
  setPage, language = "en", initialDocument = "quote", job = {}, quote,
  onApplyQuotePatch, onAddPhotos, canAddPhotos = true, photos = [], photoBusy = false,
  onDownloadQuote, onPreviewQuote, onBack,
  onRestorePhotos, onEnsurePhotosDurable, onPhotosPersisted, onDiscardTransientPhotos,
}) {
  const [activeDocument, setActiveDocument] = useState(() => normalizeBusinessDocumentTab(initialDocument));
  const [mobilePane, setMobilePane] = useState("conversation");
  const [savedFilesOpen, setSavedFilesOpen] = useState(false);
  const [manualState, setManualState] = useState(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [photoAssignments, setPhotoAssignments] = useState({});
  const [photoReviewOpen, setPhotoReviewOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [quoteBaseline, setQuoteBaseline] = useState(() => quote);
  const [invoiceBaseline, setInvoiceBaseline] = useState(() => ({ ...createInvoiceContinuityDraft({ job, quote }), invoiceNumber: "", invoiceDate: todayLocalIsoDate(), lineItems: [] }));
  const initialDocumentBaselinesRef = useRef({ quote: quoteBaseline, invoice: invoiceBaseline });
  const [manualOverrides, setManualOverrides] = useState({ quote: {}, invoice: {} });
  const turnIdRef = useRef(0);
  const messageRef = useRef(null);
  const howItWorksTriggerRef = useRef(null);
  const previewRef = useRef(null);
  const turnsRef = useRef(null);
  const nearNewestRef = useRef(true);
  const seenPhotoIdsRef = useRef(new Set());
  const saveAttemptKeysRef = useRef({ quote: "", invoice: "" });
  const saveInFlightRef = useRef({ quote: null, invoice: null });
  const newDocumentAttemptKeysRef = useRef({ quote: "", invoice: "" });
  const quoteIssueAttemptRef = useRef(null);
  const quoteIssueInFlightRef = useRef(false);
  const startNewInFlightRef = useRef(null);
  const pendingStartNewRef = useRef(null);
  const pendingExitRef = useRef(null);
  const [invoice, setInvoice] = useState(invoiceBaseline);
  const [savedDocuments, setSavedDocuments] = useState({ quote: null, invoice: null });
  const [documentJobIds, setDocumentJobIds] = useState(() => ({
    quote: job.canonical ? job.id || null : null,
    invoice: job.canonical ? job.id || null : null,
  }));
  const [jobAnalysisSessionIds, setJobAnalysisSessionIds] = useState({
    quote: null,
    invoice: null,
  });
  const [jobAnalysisPresentations, setJobAnalysisPresentations] = useState(() => ({
    quote: createQuickQuoteAnalysisPresentationState(),
    invoice: createQuickQuoteAnalysisPresentationState(),
  }));
  const [jobAnalysisEvidenceVersions, setJobAnalysisEvidenceVersions] = useState({
    quote: [],
    invoice: [],
  });
  const [jobAnalysisRequestState, setJobAnalysisRequestState] = useState({
    quote: { busy: false, error: "" },
    invoice: { busy: false, error: "" },
  });
  const [pendingJobAnalysisMessages, setPendingJobAnalysisMessages] = useState({
    quote: "",
    invoice: "",
  });
  const [savedFingerprints, setSavedFingerprints] = useState({ quote: "", invoice: "" });
  const [saveState, setSaveState] = useState({ busy: false, error: "", lastSavedAt: "", documentType: "" });
  const [startNewState, setStartNewState] = useState({ busy: false, error: "", documentType: "" });
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [saveFailureOpen, setSaveFailureOpen] = useState(false);
  const [numberingSetup, setNumberingSetup] = useState(null);
  const [deliveryState, setDeliveryState] = useState(null);
  const [quoteIssueState, setQuoteIssueState] = useState(null);
  const [deliveryHistory, setDeliveryHistory] = useState({ quote: [], invoice: [] });
  const [recoveryRecord, setRecoveryRecord] = useState(null);
  const [recovered, setRecovered] = useState(false);
  const [newContentAvailable, setNewContentAvailable] = useState(false);
  const [customerParties, setCustomerParties] = useState({ quote: null, invoice: null });
  const [linkedCustomerContacts, setLinkedCustomerContacts] = useState({ quote: null, invoice: null });
  const [customerControl, setCustomerControl] = useState(() => emptyCustomerControl());
  const [businessContactProfileId, setBusinessContactProfileId] = useState(null);
  const relationshipCommandKeysRef = useRef(new Map());
  const branding = useMemo(() => getBusinessIdentityProjection({}, { fallbackName: "Meetro Professional" }), []);
  const documentPhotos = photos.filter((photo) => (photoAssignments[photo.id]?.documentType || activeDocument) === activeDocument);
  const customerPhotoGroups = customerVisibleBusinessDocumentPhotoGroups(documentPhotos, photoAssignments);
  const generalPhotos = customerPhotoGroups.general;
  const beforePhotos = customerPhotoGroups.before;
  const afterPhotos = customerPhotoGroups.after;
  const currentInstructions = turns.filter((turn) => turn.documentType === activeDocument);
  const currentAnalysisPresentation =
    jobAnalysisPresentations[activeDocument] ||
    createQuickQuoteAnalysisPresentationState();
  const currentAnalysisTurns = Array.isArray(currentAnalysisPresentation.turns)
    ? currentAnalysisPresentation.turns
    : [];
  const currentAnalysisEvidenceVersions = Array.isArray(
    jobAnalysisEvidenceVersions[activeDocument]
  )
    ? jobAnalysisEvidenceVersions[activeDocument]
    : [];
  const currentAnalysisRequest =
    jobAnalysisRequestState[activeDocument] || { busy: false, error: "" };
  const pendingAnalysisMessage =
    pendingJobAnalysisMessages[activeDocument] || "";
  const currentAnalysisEvidenceEntries =
    currentAnalysisEvidenceVersions
      .filter(
        (evidence) =>
          typeof evidence?.professionalInput === "string" &&
          evidence.professionalInput.trim()
      )
      .filter(
        (evidence) =>
          !currentAnalysisTurns.some(
            (turn) =>
              turn.role === "PROFESSIONAL" &&
              turn.evidenceVersion === evidence.version &&
              String(turn.payload?.message || "").trim() ===
                evidence.professionalInput.trim()
          )
      )
      .map((evidence, index) => ({
        kind: "ANALYSIS_EVIDENCE",
        id: `analysis-evidence-${evidence.version}`,
        timestamp: conversationTimestamp(evidence.createdAt),
        order: currentInstructions.length + index,
        turn: {
          role: "PROFESSIONAL",
          payload: {
            message: evidence.professionalInput,
          },
        },
      }));

  const representedProfessionalMessages = new Set(
    currentInstructions.flatMap(conversationTurnMessageHistory)
  );
  const analysisConversationEntries = [
    ...currentAnalysisEvidenceEntries,
    ...currentAnalysisTurns.map((turn, index) => ({
      kind: "ANALYSIS",
      id: `analysis-${turn.turnId}`,
      timestamp: conversationTimestamp(turn.createdAt),
      order:
        currentInstructions.length +
        currentAnalysisEvidenceEntries.length +
        index,
      turn,
    })),
  ];
  const analysisProfessionalMessages = new Set([
    pendingAnalysisMessage,
    ...analysisConversationEntries
      .filter((entry) => entry.turn.role === "PROFESSIONAL")
      .map((entry) => analysisTurnMessage(entry.turn)),
  ].map((value) => String(value || "").trim()).filter(Boolean));
  const visibleAnalysisConversationEntries = analysisConversationEntries.filter(
    (entry) => entry.turn.role !== "PROFESSIONAL" ||
      !representedProfessionalMessages.has(analysisTurnMessage(entry.turn))
  );
  const pendingAnalysisMessageVisible = Boolean(
    pendingAnalysisMessage &&
    !representedProfessionalMessages.has(pendingAnalysisMessage)
  );

  const currentConversationEntries = [
    ...currentInstructions.map((turn, index) => ({
      kind: "DOCUMENT",
      id: `document-${turn.id}`,
      timestamp: conversationTimestamp(turn.createdAt || turn.updatedAt),
      order: index,
      analysisRouted: analysisProfessionalMessages.has(String(turn.text || "").trim()),
      turn,
    })),
    ...visibleAnalysisConversationEntries,
  ].sort(
    (left, right) =>
      left.timestamp - right.timestamp ||
      left.order - right.order
  );
  const currentConversationLength =
    currentConversationEntries.length +
    (pendingAnalysisMessageVisible ? 1 : 0);
  const currentReconciliation = reconcileBusinessDocumentInstructions({ documentType: activeDocument, baseline: activeDocument === "quote" ? quoteBaseline : invoiceBaseline, instructions: currentInstructions, manualOverrides: manualOverrides[activeDocument] });
  const privateReminders = currentReconciliation.privateReminders;
  const quotePayload = useMemo(() => buildBusinessDocumentSavePayload({
    documentType: "quote", content: quote, turns, manualOverrides: manualOverrides.quote,
    photos: photos.filter((photo) => (photoAssignments[photo.id]?.documentType || "quote") === "quote"),
    photoAssignments,
    jobId: documentJobIds.quote,
    jobAnalysisSessionId: jobAnalysisSessionIds.quote,
    customerParty: customerParties.quote,
  }), [customerParties.quote, documentJobIds.quote, jobAnalysisSessionIds.quote, manualOverrides.quote, photoAssignments, photos, quote, turns]);
  const invoicePayload = useMemo(() => buildBusinessDocumentSavePayload({
    documentType: "invoice", content: invoice, turns, manualOverrides: manualOverrides.invoice,
    photos: photos.filter((photo) => photoAssignments[photo.id]?.documentType === "invoice"),
    photoAssignments,
    jobId: documentJobIds.invoice,
    jobAnalysisSessionId: jobAnalysisSessionIds.invoice,
    customerParty: customerParties.invoice,
  }), [customerParties.invoice, documentJobIds.invoice, invoice, jobAnalysisSessionIds.invoice, manualOverrides.invoice, photoAssignments, photos, turns]);
  const payloads = { quote: quotePayload, invoice: invoicePayload };
  const fingerprints = {
    quote: businessDocumentSnapshotFingerprint({ payload: quotePayload, recoveryPhotos: recoveryPhotoProjection(photos.filter((photo) => (photoAssignments[photo.id]?.documentType || "quote") === "quote"), photoAssignments) }),
    invoice: businessDocumentSnapshotFingerprint({ payload: invoicePayload, recoveryPhotos: recoveryPhotoProjection(photos.filter((photo) => photoAssignments[photo.id]?.documentType === "invoice"), photoAssignments) }),
  };
  const savePresentations = {
    quote: businessDocumentSavePresentation({ savedDocument: savedDocuments.quote, currentFingerprint: fingerprints.quote, savedFingerprint: savedFingerprints.quote, hasMeaningfulContent: hasMeaningfulBusinessDocumentDraft(quotePayload), busy: saveState.busy && saveState.documentType === "quote" }),
    invoice: businessDocumentSavePresentation({ savedDocument: savedDocuments.invoice, currentFingerprint: fingerprints.invoice, savedFingerprint: savedFingerprints.invoice, hasMeaningfulContent: hasMeaningfulBusinessDocumentDraft(invoicePayload), busy: saveState.busy && saveState.documentType === "invoice" }),
  };
  const dirty = {
    quote: savePresentations.quote.dirty,
    invoice: savePresentations.invoice.dirty,
  };
  const activeDirty = dirty[activeDocument];
  const activeSaved = savedDocuments[activeDocument];
  const activeContent = activeDocument === "quote" ? quote : invoice;
  const activeCustomerParty = customerParties[activeDocument];
  const activeLinkedCustomer = linkedCustomerContacts[activeDocument];
  const activeJobContext = documentJobIds[activeDocument] ? job : {};

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
  }, [currentConversationLength, documentPhotos.length]);

  function currentContent(documentType) {
    return documentType === "quote" ? quote : invoice;
  }

  function documentPayload(documentType, {
    durablePhotos = photos,
    assignments = photoAssignments,
    content = currentContent(documentType),
    customerParty = customerParties[documentType],
  } = {}) {
    return buildBusinessDocumentSavePayload({
      documentType,
      content,
      turns,
      manualOverrides: manualOverrides[documentType],
      photos: durablePhotos.filter((photo) => (assignments[photo.id]?.documentType || "quote") === documentType),
      photoAssignments: assignments,
      jobId: documentJobIds[documentType],
      jobAnalysisSessionId: jobAnalysisSessionIds[documentType],
      customerParty,
    });
  }

  async function durableSaveInput(documentType, overrides = {}) {
    const pending = photos.filter((photo) =>
      (photoAssignments[photo.id]?.documentType || "quote") === documentType && !photo.media?.public_id
    );
    if (!pending.length) return { payload: documentPayload(documentType, overrides), durablePhotos: photos, assignments: photoAssignments };
    if (typeof onEnsurePhotosDurable !== "function") throw new Error("Pending photos must finish uploading before this draft can be saved.");
    const result = await onEnsurePhotosDurable(pending);
    if (!result?.ok) throw new Error("One or more photos are not uploaded yet. Your work is still here.");
    const assignments = { ...photoAssignments };
    Object.entries(result.idMap || {}).forEach(([oldId, newId]) => {
      assignments[newId] = assignments[oldId];
      delete assignments[oldId];
    });
    setPhotoAssignments(assignments);
    return { payload: documentPayload(documentType, { ...overrides, durablePhotos: result.photos, assignments }), durablePhotos: result.photos, assignments };
  }

  async function durableJobAnalysisMedia(documentType) {
    const prepared = await durableSaveInput(documentType);
    const governedPhotos = prepared.durablePhotos
      .filter(
        (photo) =>
          (prepared.assignments[photo.id]?.documentType || "quote") ===
          documentType
      )
      .map((photo) => photo.media)
      .filter((media) => media?.public_id);

    if (governedPhotos.length > 5) {
      throw new Error(
        "Job Analysis can use up to 5 governed photos at a time."
      );
    }

    return governedPhotos;
  }

  async function saveDocument(documentType, options = {}) {
    const { bypassInFlight = false, ...saveOptions } = options;
    if (!bypassInFlight && saveInFlightRef.current[documentType]) {
      return saveInFlightRef.current[documentType];
    }
    if (!bypassInFlight && Object.values(saveInFlightRef.current).some(Boolean)) return false;
    if (bypassInFlight) return performSaveDocument(documentType, saveOptions);
    const operation = performSaveDocument(documentType, saveOptions);
    saveInFlightRef.current[documentType] = operation;
    try {
      return await operation;
    } finally {
      if (saveInFlightRef.current[documentType] === operation) {
        saveInFlightRef.current[documentType] = null;
      }
    }
  }

  async function performSaveDocument(documentType, {
    suppressFailureDialog = false,
    numberingRetry = false,
    contentOverride,
    customerPartyOverride,
  } = {}) {
    if (saveState.busy) return false;
    setSaveState((current) => ({ ...current, busy: true, error: "", documentType }));
    let saveJobId = documentJobIds[documentType] || null;
    try {
      const prepared = await durableSaveInput(documentType, {
        ...(contentOverride ? { content: contentOverride } : {}),
        ...(customerPartyOverride !== undefined
          ? { customerParty: customerPartyOverride }
          : {}),
      });
      saveJobId = prepared.payload.jobId || null;
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
      const restoredFingerprint = businessDocumentRestoredSnapshotFingerprint(document);
      if (fingerprint !== restoredFingerprint) {
        throw new Error("The saved draft response did not match the editable workspace. Reopen Saved Files before retrying.");
      }
      setSavedDocuments((current) => ({ ...current, [documentType]: document }));
      setCustomerParties((current) => ({
        ...current,
        [documentType]: normalizeBusinessDocumentCustomerParty(document.customerParty),
      }));
      setSavedFingerprints((current) => ({ ...current, [documentType]: restoredFingerprint }));
      saveAttemptKeysRef.current[documentType] = "";
      setSaveState({ busy: false, error: "", lastSavedAt: document.updatedAt, documentType });
      setRecovered(false);
      onPhotosPersisted?.(document.photos.map((photo) => photo.id));
      const identityKey = getAuthenticatedIdentitySnapshot().userId;
      if (identityKey) await deleteBusinessDocumentRecovery({ identityKey });
      setNotice(`Saved · ${new Date(document.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
      return document;
    } catch (error) {
      const errorMessage = error?.message || "We couldn't save your draft right now. Your work is still here.";
      setSaveState({ busy: false, error: errorMessage, lastSavedAt: "", documentType });
      if (error?.code === "BUSINESS_DOCUMENT_NUMBERING_SETUP_REQUIRED") {
        if (numberingRetry) {
          setNumberingSetup({
            documentType,
            jobId: saveJobId,
            mode: "",
            previousDocumentNumber: "",
            busy: false,
            checking: false,
            error: "Numbering was set up, but this draft still could not be saved. Your work is unchanged. Try saving again later.",
            retryBlocked: true,
            suppressFailureDialog,
          });
          return NUMBERING_SETUP_PENDING;
        }
        return openNumberingSetup({ documentType, jobId: saveJobId, suppressFailureDialog });
      }
      if (!suppressFailureDialog) setSaveFailureOpen(true);
      return false;
    }
  }

  async function openNumberingSetup({ documentType, jobId, suppressFailureDialog }) {
    const setup = {
      documentType,
      jobId: jobId || null,
      mode: "",
      previousDocumentNumber: "",
      busy: true,
      checking: true,
      error: "",
      retryBlocked: false,
      suppressFailureDialog,
    };
    setNumberingSetup(setup);
    try {
      const numbering = await getBusinessDocumentNumbering({
        documentType: documentType.toUpperCase(),
        jobId: setup.jobId,
        setPage,
      });
      if (numbering.initialized) {
        setNumberingSetup(null);
        return saveDocument(documentType, {
          suppressFailureDialog,
          numberingRetry: true,
          bypassInFlight: true,
        });
      }
      setNumberingSetup({ ...setup, busy: false, checking: false });
    } catch (error) {
      setNumberingSetup({
        ...setup,
        busy: false,
        checking: false,
        error: error?.message || "Numbering status could not be checked. Choose an option to try the governed setup.",
      });
    }
    return NUMBERING_SETUP_PENDING;
  }

  function chooseNumberingMode(mode) {
    setNumberingSetup((current) => current ? {
      ...current,
      mode,
      error: "",
    } : current);
  }

  function cancelNumberingSetup() {
    if (pendingStartNewRef.current) {
      pendingStartNewRef.current = null;
      setStartNewState({ busy: false, error: "", documentType: "" });
    }
    setNumberingSetup((current) => current?.busy ? current : null);
  }

  async function submitNumberingSetup() {
    const setup = numberingSetup;
    if (!setup || setup.busy || setup.retryBlocked || !setup.mode) return;
    const previousDocumentNumber = setup.previousDocumentNumber.trim();
    if (setup.mode === "CONTINUE_EXISTING" && !previousDocumentNumber) {
      setNumberingSetup((current) => current ? {
        ...current,
        error: `Enter the last ${setup.documentType === "invoice" ? "Invoice" : "Quote"} number you used.`,
      } : current);
      return;
    }
    setNumberingSetup((current) => current ? { ...current, busy: true, error: "" } : current);
    try {
      const numbering = await initializeBusinessDocumentNumbering({
        payload: {
          documentType: setup.documentType.toUpperCase(),
          jobId: setup.jobId,
          mode: setup.mode,
          ...(setup.mode === "CONTINUE_EXISTING" ? { previousDocumentNumber } : {}),
        },
        setPage,
      });
      if (!numbering.initialized) throw new Error("Numbering setup did not complete. Your draft is unchanged.");
      setNumberingSetup(null);
      const saved = await saveDocument(setup.documentType, {
        suppressFailureDialog: setup.suppressFailureDialog,
        numberingRetry: true,
      });
      if (saved === false && pendingStartNewRef.current === setup.documentType) {
        const errorMessage = t("businessDocumentStartNewSaveFailed", language);
        setStartNewState({ busy: false, error: errorMessage, documentType: setup.documentType });
        setNotice(errorMessage);
        setSaveFailureOpen(true);
        return;
      }
      if (saved === false && setup.suppressFailureDialog) setSaveFailureOpen(true);
      if (saved && saved !== NUMBERING_SETUP_PENDING && pendingStartNewRef.current === setup.documentType) {
        await createAndOpenNewDocument(setup.documentType, saved);
      }
    } catch (error) {
      setNumberingSetup((current) => current ? {
        ...current,
        busy: false,
        error: error?.message || "Numbering could not be set up. Your draft is unchanged.",
      } : current);
    }
  }

  async function restoreJobAnalysisPresentation(documentType, sessionId) {
    setPendingJobAnalysisMessages((current) => ({
      ...current,
      [documentType]: "",
    }));

    if (!sessionId) {
      setJobAnalysisEvidenceVersions((current) => ({
        ...current,
        [documentType]: [],
      }));
      setJobAnalysisPresentations((current) => ({
        ...current,
        [documentType]: createQuickQuoteAnalysisPresentationState(),
      }));
      setJobAnalysisRequestState((current) => ({
        ...current,
        [documentType]: { busy: false, error: "" },
      }));
      return;
    }

    setJobAnalysisRequestState((current) => ({
      ...current,
      [documentType]: { busy: true, error: "" },
    }));

    try {
      const loaded = await loadQuickQuoteAnalysisSession({
        sessionId,
        setPage,
      });

      const presentation =
        hydrateQuickQuoteAnalysisPresentationState(
          loaded.session
        );

      setJobAnalysisEvidenceVersions((current) => ({
        ...current,
        [documentType]: [...loaded.session.evidenceVersions],
      }));

      setJobAnalysisPresentations((current) => ({
        ...current,
        [documentType]: presentation,
      }));

      setJobAnalysisRequestState((current) => ({
        ...current,
        [documentType]: { busy: false, error: "" },
      }));
    } catch (error) {
      if (error?.status === 404) {
        setJobAnalysisSessionIds((current) => ({
          ...current,
          [documentType]: null,
        }));
        setJobAnalysisEvidenceVersions((current) => ({
          ...current,
          [documentType]: [],
        }));
        setJobAnalysisPresentations((current) => ({
          ...current,
          [documentType]: createQuickQuoteAnalysisPresentationState(),
        }));
      }

      setJobAnalysisRequestState((current) => ({
        ...current,
        [documentType]: {
          busy: false,
          error:
            error?.status === 404
              ? "The previous private Job Analysis is no longer available. Send your question again to start a new analysis."
              : error?.message ||
                "The private Job Analysis conversation could not be restored.",
        },
      }));
    }
  }

  function applyRestoredDocument(document, { startedNew = false, noticeMessage = "" } = {}) {
    const restored = restoreBusinessDocumentDraft(document);
    const type = restored.documentType;
    const restoredContent = startedNew && type === "quote"
      ? {
          ...restored.content,
          customerPhone: "",
          customerAddress: "",
          problemFound: "",
          timeline: "",
          labor: "",
          materials: "",
          discount: "",
          tax: "",
          travelFee: "",
          disposalFee: "",
          depositAmount: "",
          depositRequired: "No",
          startDate: "",
        }
      : restored.content;
    if (type === "quote") onApplyQuotePatch({ ...restoredContent, replaceCollections: true });
    else setInvoice(restored.content);
    if (type === "quote") {
      setQuoteBaseline(startedNew ? restored.content : initialDocumentBaselinesRef.current.quote);
    } else {
      setInvoiceBaseline(startedNew ? restored.content : initialDocumentBaselinesRef.current.invoice);
    }
    setTurns((current) => [...current.filter((turn) => turn.documentType !== type), ...restored.turns]);
    turnIdRef.current = Math.max(turnIdRef.current, restored.turns.length);
    setManualOverrides((current) => ({ ...current, [type]: restored.manualOverrides }));
    setPhotoAssignments((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([, assignment]) => assignment.documentType !== type)),
      ...Object.fromEntries(Object.entries(restored.photoAssignments).map(([id, assignment]) => [id, { ...assignment, documentType: type }])),
    }));
    restored.photos.forEach((photo) => seenPhotoIdsRef.current.add(photo.id));
    onRestorePhotos?.(restored.photos, { documentType: type, persisted: true });
    setSavedDocuments((current) => ({ ...current, [type]: document }));
    setCustomerParties((current) => ({ ...current, [type]: restored.customerParty }));
    setLinkedCustomerContacts((current) => ({ ...current, [type]: null }));
    void hydrateLinkedCustomer(type, restored.customerParty);
    setDocumentJobIds((current) => ({ ...current, [type]: document.jobId || null }));
    setJobAnalysisSessionIds((current) => ({
      ...current,
      [type]: restored.jobAnalysisSessionId || null,
    }));
    void restoreJobAnalysisPresentation(
      type,
      restored.jobAnalysisSessionId || null
    );
    setSavedFingerprints((current) => ({ ...current, [type]: businessDocumentRestoredSnapshotFingerprint(document) }));
    setDeliveryHistory((current) => ({ ...current, [type]: [] }));
    setQuoteIssueState(null);
    quoteIssueAttemptRef.current = null;
    quoteIssueInFlightRef.current = false;
    setActiveDocument(type);
    setSavedFilesOpen(false);
    setNotice(noticeMessage || `${displayDocumentNumber(document)} reopened. Continue editing this saved working draft.`);
    void refreshDeliveryHistory(type, document);
  }

  async function refreshDeliveryHistory(documentType, document = savedDocuments[documentType]) {
    if (!document?.id) return;
    try {
      const deliveries = await listBusinessDocumentDeliveries({ draftId: document.id, setPage });
      setDeliveryHistory((current) => ({ ...current, [documentType]: deliveries }));
    } catch {
      setNotice("The saved document reopened, but delivery history is temporarily unavailable.");
    }
  }

  async function openSavedDocument(draftId) {
    try {
      const document = await getBusinessDocumentDraft({ draftId, setPage });
      applyRestoredDocument(document);
    } catch (error) {
      setNotice(error?.message || "The saved document could not be opened.");
    }
  }

  async function ensureCurrentDocumentSaved(documentType) {
    if (saveInFlightRef.current[documentType]) {
      return saveInFlightRef.current[documentType];
    }
    const existing = savedDocuments[documentType];
    if (existing && !dirty[documentType]) return existing;
    return saveDocument(documentType, { suppressFailureDialog: true });
  }

  function resetNewDocumentTransientState(documentType) {
    setMessage("");
    setManualState(null);
    setHowItWorksOpen(false);
    setPhotoReviewOpen(false);
    setCustomerControl(emptyCustomerControl());
    setDeliveryState(null);
    setQuoteIssueState(null);
    quoteIssueAttemptRef.current = null;
    quoteIssueInFlightRef.current = false;
    setRecoveryRecord(null);
    setRecovered(false);
    setNewContentAvailable(false);
    setJobAnalysisRequestState((current) => ({
      ...current,
      [documentType]: { busy: false, error: "" },
    }));
    setPendingJobAnalysisMessages((current) => ({ ...current, [documentType]: "" }));
    relationshipCommandKeysRef.current.clear();
    saveAttemptKeysRef.current[documentType] = "";
    nearNewestRef.current = true;
  }

  async function createAndOpenNewDocument(documentType, previousDocument) {
    const labelKey = documentType === "quote"
      ? "businessDocumentNewQuoteReady"
      : "businessDocumentNewInvoiceReady";
    setStartNewState({ busy: true, error: "", documentType });
    try {
      if (!newDocumentAttemptKeysRef.current[documentType]) {
        newDocumentAttemptKeysRef.current[documentType] = createBusinessDocumentSaveKey();
      }
      const payload = buildNewBusinessDocumentDraftPayload({
        documentType,
        documentDate: todayLocalIsoDate(),
      });
      const document = await createBusinessDocumentDraft({
        payload,
        idempotencyKey: newDocumentAttemptKeysRef.current[documentType],
        setPage,
      });
      validateNewBusinessDocumentDraft({
        documentType,
        previousDocument,
        nextDocument: document,
      });
      resetNewDocumentTransientState(documentType);
      applyRestoredDocument(document, {
        startedNew: true,
        noticeMessage: t(labelKey, language),
      });
      newDocumentAttemptKeysRef.current[documentType] = "";
      pendingStartNewRef.current = null;
      setSaveState({
        busy: false,
        error: "",
        lastSavedAt: document.updatedAt,
        documentType,
      });
      setStartNewState({ busy: false, error: "", documentType: "" });
      return document;
    } catch {
      pendingStartNewRef.current = null;
      const errorMessage = t("businessDocumentStartNewCreateFailed", language);
      setStartNewState({ busy: false, error: errorMessage, documentType });
      setNotice(errorMessage);
      return false;
    }
  }

  async function startNewDocument(documentType = activeDocument) {
    const type = normalizeBusinessDocumentTab(documentType);
    if (startNewInFlightRef.current) return startNewInFlightRef.current;
    pendingStartNewRef.current = type;
    const operation = (async () => {
      setStartNewState({ busy: true, error: "", documentType: type });
      setNotice(t(
        type === "quote"
          ? "businessDocumentStartingNewQuote"
          : "businessDocumentStartingNewInvoice",
        language
      ));
      const currentDocument = await ensureCurrentDocumentSaved(type);
      if (currentDocument === NUMBERING_SETUP_PENDING) {
        setStartNewState({ busy: false, error: "", documentType: type });
        return currentDocument;
      }
      if (!currentDocument) {
        const errorMessage = t("businessDocumentStartNewSaveFailed", language);
        setStartNewState({ busy: false, error: errorMessage, documentType: type });
        setNotice(errorMessage);
        setSaveFailureOpen(true);
        return false;
      }
      return createAndOpenNewDocument(type, currentDocument);
    })();
    startNewInFlightRef.current = operation;
    try {
      return await operation;
    } finally {
      if (startNewInFlightRef.current === operation) startNewInFlightRef.current = null;
    }
  }

  function updateCustomerControl(patch) {
    setCustomerControl((current) => ({ ...current, ...patch }));
  }

  async function resolveBusinessProfileId() {
    if (businessContactProfileId) return businessContactProfileId;
    const profileId = await loadBusinessContactProfileId({ setPage });
    setBusinessContactProfileId(profileId);
    return profileId;
  }

  async function openCustomerControl(mode) {
    const createKey = mode === "save" ? createBusinessContactCommandKey() : "";
    setCustomerControl({
      ...emptyCustomerControl(),
      open: true,
      mode,
      busy: true,
      createKey,
    });
    try {
      const contractorProfileId = await resolveBusinessProfileId();
      const contacts = await listBusinessContacts({
        contractorProfileId,
        status: "ACTIVE",
        setPage,
      });
      updateCustomerControl({ contacts, busy: false, error: "" });
    } catch (error) {
      updateCustomerControl({
        busy: false,
        error: error?.message || t("businessDocumentCustomerLoadFailed", language),
      });
    }
  }

  async function hydrateLinkedCustomer(documentType, customerParty) {
    const party = normalizeBusinessDocumentCustomerParty(customerParty);
    if (!party) {
      setLinkedCustomerContacts((current) => ({ ...current, [documentType]: null }));
      return;
    }
    try {
      const contact = await getBusinessContact({
        contactId: party.businessContactId,
        setPage,
      });
      setLinkedCustomerContacts((current) => ({ ...current, [documentType]: contact }));
    } catch {
      setLinkedCustomerContacts((current) => ({ ...current, [documentType]: null }));
    }
  }

  function relationshipCommandKey(contactId) {
    if (!relationshipCommandKeysRef.current.has(contactId)) {
      relationshipCommandKeysRef.current.set(
        contactId,
        createBusinessCustomerRelationshipCommandKey()
      );
    }
    return relationshipCommandKeysRef.current.get(contactId);
  }

  async function resolveOrEstablishCustomerRelationship(contact) {
    const existing = await getBusinessCustomerRelationshipByContact({
      businessContactId: contact.id,
      setPage,
    });
    if (existing) return existing;
    const contractorProfileId = await resolveBusinessProfileId();
    return establishBusinessCustomerRelationship({
      contractorProfileId,
      businessContactId: contact.id,
      idempotencyKey: relationshipCommandKey(contact.id),
      setPage,
    });
  }

  function applyCustomerSnapshot(documentType, nextContent) {
    if (documentType === "quote") {
      onApplyQuotePatch({ ...nextContent, replaceCollections: true });
    } else {
      setInvoice(nextContent);
    }
  }

  async function persistCustomerLink(contact, relationship, { replace = false } = {}) {
    const documentType = activeDocument;
    const customerParty = normalizeBusinessDocumentCustomerParty({
      businessContactId: contact.id,
      customerRelationshipId: relationship.id,
    });
    const nextContent = applyBusinessContactToDocumentSnapshot({
      content: activeContent,
      contact,
      replace,
    });
    applyCustomerSnapshot(documentType, nextContent);
    setCustomerParties((current) => ({ ...current, [documentType]: customerParty }));
    setLinkedCustomerContacts((current) => ({ ...current, [documentType]: contact }));
    const saved = await saveDocument(documentType, {
      suppressFailureDialog: true,
      contentOverride: nextContent,
      customerPartyOverride: customerParty,
    });
    if (!saved || saved === NUMBERING_SETUP_PENDING) {
      updateCustomerControl({
        open: true,
        busy: false,
        pendingContact: contact,
        pendingRelationship: relationship,
        retryPhase: "LINK",
        error: t("businessDocumentCustomerLinkFailed", language),
      });
      return false;
    }
    setCustomerControl(emptyCustomerControl());
    setNotice(t("businessDocumentCustomerLinkedNotice", language, {
      name: businessContactDisplayName(contact),
      document: t(
        documentType === "quote"
          ? "businessDocumentCustomerQuoteLabel"
          : "businessDocumentCustomerInvoiceLabel",
        language
      ),
    }));
    return true;
  }

  async function applySavedCustomer(replace = false, explicitContact = null) {
    const contact = explicitContact || customerControl.contacts.find(
      (item) => item.id === customerControl.selectedId
    ) || customerControl.pendingContact;
    if (!contact) return;
    const switchingContact = activeCustomerParty?.businessContactId !== contact.id;
    if (
      switchingContact &&
      hasBusinessDocumentCustomerSnapshot(activeContent) &&
      !customerControl.confirmReplacement &&
      explicitContact === null
    ) {
      updateCustomerControl({ confirmReplacement: true });
      return;
    }
    updateCustomerControl({
      busy: true,
      error: "",
      confirmReplacement: false,
      replaceSnapshot: replace,
    });
    try {
      const relationship = customerControl.pendingRelationship ||
        await resolveOrEstablishCustomerRelationship(contact);
      updateCustomerControl({ pendingContact: contact, pendingRelationship: relationship });
      await persistCustomerLink(contact, relationship, { replace });
    } catch (error) {
      updateCustomerControl({
        busy: false,
        pendingContact: contact,
        retryPhase: "RELATIONSHIP",
        error: error?.message || t("businessDocumentCustomerRelationshipFailed", language),
      });
    }
  }

  async function saveCurrentCustomerAsContact({ bypassDuplicates = false } = {}) {
    if (!String(activeContent.customerName || "").trim()) {
      updateCustomerControl({ error: t("businessDocumentCustomerRequired", language) });
      return;
    }
    const candidates = findBusinessContactDuplicateCandidates(
      customerControl.contacts,
      activeContent
    );
    if (candidates.length && !bypassDuplicates && !customerControl.duplicateConfirmed) {
      updateCustomerControl({ duplicateCandidates: candidates, error: "" });
      return;
    }
    updateCustomerControl({ busy: true, error: "", duplicateCandidates: [] });
    try {
      const contractorProfileId = await resolveBusinessProfileId();
      await completeBusinessDocumentCustomerWorkflow({
        contact: customerControl.pendingContact,
        relationship: customerControl.pendingRelationship,
        createContact: async () => {
          const result = await createBusinessContact({
            contractorProfileId,
            partyType: customerControl.partyType,
            displayName: activeContent.customerName,
            companyName: customerControl.partyType === "ORGANIZATION"
              ? activeContent.customerName
              : undefined,
            email: activeContent.customerEmail,
            phone: activeContent.customerPhone,
            address: activeContent.customerAddress || activeContent.customerLocation,
            idempotencyKey: customerControl.createKey || createBusinessContactCommandKey(),
            setPage,
          });
          updateCustomerControl({ pendingContact: result.contact });
          return result.contact;
        },
        assignCustomerRole: async (contact) => {
          if (getBusinessContactActiveRoles(contact).includes("CUSTOMER")) return contact;
          const assigned = await assignBusinessContactRole({
            contactId: contact.id,
            expectedVersion: contact.version,
            role: "CUSTOMER",
            idempotencyKey: createDeterministicBusinessContactKey(
              `${customerControl.createKey}:assign:CUSTOMER`
            ),
            setPage,
          });
          updateCustomerControl({ pendingContact: assigned });
          return assigned;
        },
        resolveRelationship: async (contact) => {
          const relationship = await resolveOrEstablishCustomerRelationship(contact);
          updateCustomerControl({ pendingContact: contact, pendingRelationship: relationship });
          return relationship;
        },
        linkDocument: (contact, relationship) =>
          persistCustomerLink(contact, relationship, { replace: false }),
      });
    } catch (error) {
      const contactPersisted = error?.contact || error?.createdContact || null;
      updateCustomerControl({
        busy: false,
        pendingContact: contactPersisted || null,
        pendingRelationship: error?.relationship || customerControl.pendingRelationship,
        retryPhase: error?.phase || (contactPersisted ? "RELATIONSHIP" : "CONTACT"),
        error: error?.phase === "LINK"
          ? t("businessDocumentCustomerLinkFailed", language)
          : error?.message || (contactPersisted
            ? t("businessDocumentCustomerRelationshipFailed", language)
            : t("businessDocumentCustomerCreateFailed", language)),
      });
    }
  }

  async function retryCustomerWorkflow() {
    if (customerControl.retryPhase === "LINK" && customerControl.pendingContact && customerControl.pendingRelationship) {
      updateCustomerControl({ busy: true, error: "" });
      await persistCustomerLink(
        customerControl.pendingContact,
        customerControl.pendingRelationship,
        { replace: false }
      );
      return;
    }
    if (customerControl.mode === "save") {
      await saveCurrentCustomerAsContact({ bypassDuplicates: true });
      return;
    }
    await applySavedCustomer(
      customerControl.replaceSnapshot,
      customerControl.pendingContact
    );
  }

  async function handleDeletedDocument(document) {
    const type = document.documentType.toLowerCase();
    if (savedDocuments[type]?.id === document.id) {
      setSavedDocuments((current) => ({ ...current, [type]: null }));
      setSavedFingerprints((current) => ({ ...current, [type]: "" }));
      saveAttemptKeysRef.current[type] = "";
      setRecovered(false);
    }
    const identityKey = getAuthenticatedIdentitySnapshot().userId;
    if (identityKey) {
      await clearDeletedBusinessDocumentRecoveryIdentity({ identityKey, draftId: document.id });
    }
    setRecoveryRecord((current) => {
      if (!current?.snapshot) return current;
      const cleared = clearDeletedBusinessDocumentRecoverySnapshot(current.snapshot, document.id);
      return cleared.changed ? { ...current, snapshot: cleared.snapshot } : current;
    });
  }

  function workspaceRecoverySnapshot({
    documents = savedDocuments,
    resume = null,
  } = {}) {
    return {
      activeDocument,
      payloads,
      savedDocuments: documents,
      savedFingerprints,
      photoAssignments,
      photos: recoveryPhotoProjection(photos, photoAssignments),
      resume,
    };
  }

  async function rememberSavedWorkspaceAndExit(
    action,
    documents = savedDocuments
  ) {
    const identityKey = getAuthenticatedIdentitySnapshot().userId;
    const target = documents[activeDocument];
    if (identityKey && target?.id) {
      await saveBusinessDocumentRecovery({
        identityKey,
        snapshot: workspaceRecoverySnapshot({
          documents,
          resume: {
            mode: "SAVED_SERVER_DOCUMENT",
            draftId: target.id,
            documentType: activeDocument,
          },
        }),
      });
    }
    action?.();
  }

  function requestExit(action) {
    if (!dirty.quote && !dirty.invoice) {
      void rememberSavedWorkspaceAndExit(action);
      return;
    }
    pendingExitRef.current = action;
    setExitDialogOpen(true);
  }

  async function saveAllAndExit() {
    setExitDialogOpen(false);
    const documents = { ...savedDocuments };
    for (const type of ["quote", "invoice"]) {
      if (dirty[type]) {
        const saved = await saveDocument(type, {
          suppressFailureDialog: true,
        });
        if (saved === NUMBERING_SETUP_PENDING) return;
        if (!saved) {
          setSaveFailureOpen(true);
          return;
        }
        documents[type] = saved;
      }
    }
    const action = pendingExitRef.current;
    pendingExitRef.current = null;
    await rememberSavedWorkspaceAndExit(action, documents);
  }

  async function exitWithRecovery() {
    const identityKey = getAuthenticatedIdentitySnapshot().userId;
    const result = await saveBusinessDocumentRecovery({
      identityKey,
      snapshot: workspaceRecoverySnapshot(),
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
    pendingStartNewRef.current = null;
    setStartNewState({ busy: false, error: "", documentType: "" });
    setSaveFailureOpen(false);
  }

  function retryFailedSave() {
    setSaveFailureOpen(false);
    if (pendingStartNewRef.current) {
      void startNewDocument(pendingStartNewRef.current);
      return;
    }
    if (pendingExitRef.current) void saveAllAndExit();
    else void saveDocument(activeDocument);
  }

  function discardAndExit() {
    setExitDialogOpen(false);
    onDiscardTransientPhotos?.();
    const action = pendingExitRef.current;
    pendingExitRef.current = null;
    void rememberSavedWorkspaceAndExit(action);
  }

  async function continueRecovery() {
    const snapshot = recoveryRecord?.snapshot;
    if (!snapshot?.payloads) return setRecoveryRecord(null);
    const savedResume = businessDocumentSavedResumeTarget(snapshot);
    if (savedResume) {
      setRecoveryRecord(null);
      try {
        const document = await getBusinessDocumentDraft({
          draftId: savedResume.draftId,
          setPage,
        });
        applyRestoredDocument(document);
        const identityKey = getAuthenticatedIdentitySnapshot().userId;
        if (identityKey) await deleteBusinessDocumentRecovery({ identityKey });
        setNotice(`${displayDocumentNumber(document)} reopened from your last workspace.`);
      } catch (error) {
        const identityKey = getAuthenticatedIdentitySnapshot().userId;
        if (identityKey) await deleteBusinessDocumentRecovery({ identityKey });
        setNotice(error?.status === 404
          ? "That saved document is no longer available. Open Saved Files to choose another document."
          : error?.message || "The saved document could not be resumed. Open Saved Files to continue.");
        setSavedFilesOpen(true);
      }
      return;
    }
    const combinedTurns = [];
    for (const type of ["quote", "invoice"]) {
      const payload = snapshot.payloads[type];
      if (!payload) continue;
      if (type === "quote") onApplyQuotePatch({ ...payload.content, replaceCollections: true });
      else setInvoice(payload.content);
      combinedTurns.push(...restoreBusinessDocumentConversationTurns(payload.workspace?.instructions || [], type));
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
    const recoveredCustomerParties = {
      quote: normalizeBusinessDocumentCustomerParty(snapshot.payloads.quote?.customerParty),
      invoice: normalizeBusinessDocumentCustomerParty(snapshot.payloads.invoice?.customerParty),
    };
    setCustomerParties(recoveredCustomerParties);
    for (const type of ["quote", "invoice"]) {
      void hydrateLinkedCustomer(type, recoveredCustomerParties[type]);
    }
    setDocumentJobIds({
      quote: snapshot.payloads.quote?.jobId || null,
      invoice: snapshot.payloads.invoice?.jobId || null,
    });
    const recoveredAnalysisSessionIds = {
      quote: snapshot.payloads.quote?.workspace?.jobAnalysisSessionId || null,
      invoice: snapshot.payloads.invoice?.workspace?.jobAnalysisSessionId || null,
    };
    setJobAnalysisSessionIds(recoveredAnalysisSessionIds);
    for (const type of ["quote", "invoice"]) {
      void restoreJobAnalysisPresentation(
        type,
        recoveredAnalysisSessionIds[type]
      );
    }
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
    const result = reconcileBusinessDocumentInstructions({ documentType, baseline: documentType === "quote" ? quoteBaseline : invoiceBaseline, instructions: nextTurns.filter((turn) => turn.documentType === documentType && turn.recognized !== false), manualOverrides: overrides });
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

  async function submitAskMeetro(rawInstruction) {
    const instruction = String(rawInstruction || "").trim();
    const documentType = activeDocument;

    if (
      !instruction ||
      jobAnalysisRequestState[documentType]?.busy
    ) {
      return false;
    }

    setJobAnalysisRequestState((current) => ({
      ...current,
      [documentType]: {
        busy: true,
        error: "",
      },
    }));
    setPendingJobAnalysisMessages((current) => ({
      ...current,
      [documentType]: instruction,
    }));

    try {
      const governedPhotos =
        await durableJobAnalysisMedia(documentType);

      let sessionId =
        jobAnalysisSessionIds[documentType];

      let session = null;
      let presentation = null;
      let execution = null;

      if (!sessionId) {
        const created =
          await createQuickQuoteAnalysisSession({
            professionalInput: instruction,
            photos: governedPhotos,
            setPage,
          });

        session = created.session;
        presentation =
          hydrateQuickQuoteAnalysisPresentationState(
            session
          );
        setJobAnalysisEvidenceVersions((current) => ({
          ...current,
          [documentType]: [...session.evidenceVersions],
        }));
        sessionId = presentation.sessionId;

        setJobAnalysisSessionIds((current) => ({
          ...current,
          [documentType]: sessionId,
        }));

        setJobAnalysisPresentations((current) => ({
          ...current,
          [documentType]: presentation,
        }));

        execution =
          await analyzeQuickQuoteAnalysisSession({
            sessionId,
            locale: language,
            setPage,
          });
      } else {
        const loaded =
          await loadQuickQuoteAnalysisSession({
            sessionId,
            setPage,
          });

        session = loaded.session;
        presentation =
          hydrateQuickQuoteAnalysisPresentationState(
            session
          );

        setJobAnalysisEvidenceVersions((current) => ({
          ...current,
          [documentType]: [...session.evidenceVersions],
        }));

        setJobAnalysisPresentations((current) => ({
          ...current,
          [documentType]: presentation,
        }));

        const latestEvidence =
          session.evidenceVersions.at(-1) || null;

        const photosChanged =
          analysisPhotoSignature(governedPhotos) !==
          analysisEvidencePhotoSignature(latestEvidence);

        if (
          presentation.latestProposal &&
          !presentation.stale &&
          !photosChanged
        ) {
          execution =
            await continueQuickQuoteAnalysisSession({
              sessionId,
              priorProposalId:
                presentation.latestProposal.proposalId,
              message: instruction,
              locale: language,
              setPage,
            });
        } else {
          const evidenceChanged =
            photosChanged ||
            !latestEvidence ||
            String(
              latestEvidence.professionalInput || ""
            ).trim() !== instruction;

          if (evidenceChanged) {
            await appendQuickQuoteAnalysisEvidence({
              sessionId,
              professionalInput: instruction,
              photos: governedPhotos,
              setPage,
            });

            const refreshed =
              await loadQuickQuoteAnalysisSession({
                sessionId,
                setPage,
              });

            session = refreshed.session;
            presentation =
              hydrateQuickQuoteAnalysisPresentationState(
                session
              );

            setJobAnalysisEvidenceVersions((current) => ({
              ...current,
              [documentType]: [...session.evidenceVersions],
            }));

            setJobAnalysisPresentations((current) => ({
              ...current,
              [documentType]: presentation,
            }));
          }

          execution =
            await analyzeQuickQuoteAnalysisSession({
              sessionId,
              locale: language,
              setPage,
            });
        }
      }

      const nextPresentation =
        applyQuickQuoteAnalysisExecutionToPresentationState(
          presentation,
          execution
        );

      setJobAnalysisPresentations((current) => ({
        ...current,
        [documentType]: nextPresentation,
      }));

      setJobAnalysisRequestState((current) => ({
        ...current,
        [documentType]: {
          busy: false,
          error: "",
        },
      }));
      setPendingJobAnalysisMessages((current) => ({
        ...current,
        [documentType]: "",
      }));

      setMessage((current) =>
        current.trim() === instruction
          ? ""
          : current
      );

      setNotice(
        "Ask Meetro response added. Nothing was applied to the working document."
      );

      return true;
    } catch (error) {
      setPendingJobAnalysisMessages((current) => ({
        ...current,
        [documentType]: "",
      }));

      if (error?.status === 404) {
        setJobAnalysisSessionIds((current) => ({
          ...current,
          [documentType]: null,
        }));
        setJobAnalysisEvidenceVersions((current) => ({
          ...current,
          [documentType]: [],
        }));

        setJobAnalysisPresentations((current) => ({
          ...current,
          [documentType]: createQuickQuoteAnalysisPresentationState(),
        }));
      }

      setJobAnalysisRequestState((current) => ({
        ...current,
        [documentType]: {
          busy: false,
          error:
            error?.status === 404
              ? "The previous private Job Analysis is no longer available. Send your question again to start a new analysis."
              : error?.message ||
                "Ask Meetro could not analyze the job right now.",
        },
      }));

      return false;
    }
  }

  async function submitInstruction(rawInstruction, existingId = null) {
    const instruction = String(rawInstruction || "").trim();
    if (!instruction) return false;

    const current = activeDocument === "quote" ? quote : invoice;
    const resolution = resolveBusinessDocumentConversationMessage({
      documentType: activeDocument,
      instruction,
      current,
      hasActiveAnalysisSession: Boolean(jobAnalysisSessionIds[activeDocument]),
    });

    if (resolution.capability === "DOCUMENT_NUMBER_REQUEST") {
      setMessage("");
      setNotice(
        activeDocument === "quote"
          ? "Quote numbers are assigned by Meetro when the document is first saved and cannot be changed manually."
          : "Invoice numbers are assigned by Meetro when the document is first saved and cannot be changed manually."
      );
      return true;
    }

    let turnId = existingId;
    let nextTurns;
    let conversationTurn;
    if (existingId) {
      const previousTurn = turns.find((turn) => turn.id === existingId);
      conversationTurn = buildBusinessDocumentConversationTurn({ id: existingId, documentType: activeDocument, instruction, current, previousTurn, resolvedPatch: resolution.patch });
      nextTurns = turns.map((turn) => turn.id === existingId ? conversationTurn.turn : turn);
    } else {
      turnIdRef.current += 1;
      turnId = `professional-instruction-${Date.now()}-${turnIdRef.current}`;
      conversationTurn = buildBusinessDocumentConversationTurn({ id: turnId, documentType: activeDocument, instruction, current, resolvedPatch: resolution.patch });
      nextTurns = [...turns, conversationTurn.turn];
    }
    setTurns(nextTurns);
    reconcileDocument(activeDocument, nextTurns);
    assignPhotoIntent(turnId, conversationTurn.patch.photoIntent);
    setMessage("");

    if (resolution.capability === "CLARIFICATION_REQUIRED") {
      setNotice(t("businessDocumentClarificationNeeded", language));
      return true;
    }

    if (resolution.capability === "ASK_MEETRO") {
      return submitAskMeetro(instruction);
    }

    setNotice(conversationTurn.turn.recognized ? "Working draft updated from your instruction." : "Instruction preserved. Use manual edit for any unsupported detail.");
    return true;
  }

  function focusComposer(prefix = "") {
    setMessage(prefix);
    requestAnimationFrame(() => messageRef.current?.focus());
  }

  function usePrefill() {
    setManualState((current) => current
      ? { ...current, mode: "prefill", focus: "first" }
      : { mode: "prefill", focus: "first" });
    if (message.trim()) return submitInstruction(message);
    if (currentInstructions.length) {
      reconcileDocument(activeDocument, turns);
      setNotice(t("businessDocumentPrefillRefreshed", language));
      return;
    }
    setNotice(t("businessDocumentPrefillReviewHelp", language));
  }

  function openManualEditor(focus = "first") {
    setManualState((current) => current
      ? { ...current, mode: "manual", focus }
      : { mode: "manual", focus });
  }

  function changeEditorMode(mode) {
    setManualState((current) => current
      ? { ...current, mode, focus: "first" }
      : { mode, focus: "first" });
  }

  function switchDocument(documentType) {
    setActiveDocument(normalizeBusinessDocumentTab(documentType));
    setManualState(null);
    setCustomerControl(emptyCustomerControl());
    setNotice("");
    nearNewestRef.current = true;
  }

  function applyManualDraft(draft, original) {
    const overrides = { ...manualOverrides[activeDocument] };
    for (const [key, value] of Object.entries(draft)) {
      if (["total", "canonicalStatus", "quoteNumber", "invoiceNumber"].includes(key)) continue;
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
    return attachCustomerDocumentPhotoEvidence(
      buildQuickInvoiceDocumentModel({ ...customerVisible, total, subtotal: total, lineItems: rows.map((item) => ({ description: item.description, amount: item.amount })), serviceDescription: customerVisible.projectTitle }, { locale: language, branding, workingDraftStatus: activeSaved && !activeDirty ? "SAVED" : "UNSAVED" }),
      customerPhotoGroups
    );
  }

  async function downloadInvoice() {
    const copy = getCustomerDocumentActionCopy(language);
    setNotice(await downloadCustomerDocumentPdf(invoicePdfModel()) ? copy.pdfReady : copy.pdfUnavailable);
  }

  async function previewInvoice() {
    if (!(await previewCustomerDocumentPdfWithMedia(invoicePdfModel())).ok) setNotice("PDF preview is unavailable. Nothing was saved or sent.");
  }

  async function savedPdfArtifact(document) {
    return getBusinessDocumentCustomerPdf({
      draftId: document.id,
      expectedVersion: document.version,
      documentType: document.documentType,
      reference: displayDocumentNumber(document),
      setPage,
    });
  }

  async function previewActivePdf() {
    focusPreview();
    if (activeSaved && !activeDirty) {
      try {
        const artifact = await savedPdfArtifact(activeSaved);
        setNotice(previewBusinessDocumentPdfArtifact(artifact)
          ? `Previewing exact saved ${activeSaved.documentType.toLowerCase()} ${displayDocumentNumber(activeSaved)}, version ${activeSaved.version}.`
          : "PDF preview is unavailable. Nothing was saved or sent.");
      } catch (error) {
        setNotice(error?.message || "The exact saved PDF could not be prepared. Nothing was sent.");
      }
      return;
    }
    if (activeDocument === "quote") await onPreviewQuote(customerPhotoGroups, "UNSAVED");
    else await previewInvoice();
  }

  async function downloadActivePdf() {
    if (activeSaved && !activeDirty) {
      try {
        const artifact = await savedPdfArtifact(activeSaved);
        setNotice(downloadBusinessDocumentPdfArtifact(artifact)
          ? `Downloaded exact saved ${activeSaved.documentType.toLowerCase()} ${displayDocumentNumber(activeSaved)}, version ${activeSaved.version}.`
          : "PDF download is unavailable. Nothing was sent.");
      } catch (error) {
        setNotice(error?.message || "The exact saved PDF could not be prepared. Nothing was sent.");
      }
      return;
    }
    if (activeDocument === "quote") await onDownloadQuote(customerPhotoGroups, "UNSAVED");
    else await downloadInvoice();
  }

  function deliveryTotal(documentType, content) {
    const override = Number(content?.totalOverride);
    if (Number.isFinite(override) && String(content?.totalOverride || "").trim()) return override;
    if (documentType === "quote") return quoteRows(content).reduce((sum, item) => sum + item.amount, 0);
    return invoiceTotal(content);
  }

  function openDeliveryReview(channel, document) {
    const type = document.documentType.toLowerCase();
    const content = document.content || currentContent(type);
    const agreement = normalizeBusinessDocumentAgreement(content.agreement);
    const history = deliveryHistory[type] || [];
    setDeliveryState({
      stage: "review",
      channel,
      documentType: type,
      document,
      recipientEmail: content.customerEmail || "",
      subject: `${type === "quote" ? "Quote" : "Invoice"} ${displayDocumentNumber(document)}`,
      customerMessage: "Please review the attached customer document.",
      total: deliveryTotal(type, content),
      termsIncluded: Boolean(content.terms || content.paymentTerms || agreement.exclusions.length || BUSINESS_DOCUMENT_AGREEMENT_FIELDS.some(([key]) => agreement[key])),
      photoCount: document.photos.filter((photo) => photo.visibility === "CUSTOMER_VISIBLE" && ["GENERAL_EVIDENCE", "BEFORE", "AFTER"].includes(photo.role)).length,
      resend: history.some((delivery) => delivery.channel === channel && delivery.documentVersion === document.version && delivery.state !== "FAILED"),
      idempotencyKey: createBusinessDocumentSaveKey(),
      busy: false,
      error: "",
    });
  }

  function beginDelivery(channel) {
    if (deliveryState?.busy || deliveryState?.stage === "sharing") return;
    if (!activeSaved || activeDirty) {
      setDeliveryState({ stage: "saveRequired", channel, documentType: activeDocument, busy: false, error: "" });
      return;
    }
    if (channel === "DEVICE_SHARE") {
      void shareSavedDocument(activeSaved);
      return;
    }
    openDeliveryReview(channel, activeSaved);
  }

  async function beginGovernedQuoteIssue() {
    if (quoteIssueState?.busy || activeDocument !== "quote") return;
    setQuoteIssueState({ stage: "saving", busy: true, error: "", errorPhase: "", checkpoint: {}, result: null, document: activeSaved, identity: null, total: deliveryTotal("quote", quote) });
    const document = await ensureCurrentDocumentSaved("quote");
    if (document === NUMBERING_SETUP_PENDING) {
      setQuoteIssueState({
        stage: "review",
        busy: false,
        error: "Finish the one-time numbering setup and save this quote before sending it.",
        errorPhase: "IDENTITY",
        checkpoint: {},
        result: null,
        document: activeSaved,
        identity: null,
        total: deliveryTotal("quote", quote),
      });
      return;
    }
    if (!document) {
      setQuoteIssueState({
        stage: "review",
        busy: false,
        error: saveState.error || "The quote could not be saved. Nothing was sent.",
        errorPhase: "IDENTITY",
        checkpoint: {},
        result: null,
        document: activeSaved,
        identity: null,
        total: deliveryTotal("quote", quote),
      });
      return;
    }
    let identity;
    try {
      identity = await fetchWorkingQuoteReviewIdentity({
        document,
        jobId: documentJobIds.quote,
        setPage,
      });
    } catch {
      setQuoteIssueState({
        stage: "review",
        busy: false,
        error: "We couldn't verify the customer and project for this quote. Nothing was sent.",
        errorPhase: "IDENTITY",
        checkpoint: {},
        result: null,
        document,
        identity: null,
        total: deliveryTotal("quote", document.content || quote),
      });
      return;
    }
    const attemptIdentity = `${document.id}:${document.version}`;
    if (quoteIssueAttemptRef.current?.identity !== attemptIdentity) {
      quoteIssueAttemptRef.current = {
        identity: attemptIdentity,
        commandKeys: createWorkingQuoteCommandKeys(),
      };
    }
    setQuoteIssueState({
      stage: "review",
      busy: false,
      error: "",
      errorPhase: "",
      checkpoint: {},
      result: null,
      document,
      identity,
      total: deliveryTotal("quote", document.content || quote),
      commandKeys: quoteIssueAttemptRef.current.commandKeys,
    });
  }

  async function confirmGovernedQuoteIssue() {
    const current = quoteIssueState;
    if (
      !current?.document ||
      !current.identity ||
      current.identity.jobId !== documentJobIds.quote ||
      !current.commandKeys ||
      current.busy ||
      quoteIssueInFlightRef.current
    ) return;
    quoteIssueInFlightRef.current = true;
    setQuoteIssueState((state) => ({ ...state, busy: true, error: "" }));
    try {
      const result = await issueAndSendWorkingQuote({
        document: current.document,
        jobId: documentJobIds.quote,
        commandKeys: current.commandKeys,
        checkpoint: current.checkpoint,
        setPage,
      });
      setQuoteIssueState((state) => ({
        ...state,
        stage: "success",
        busy: false,
        error: "",
        errorPhase: "",
        checkpoint: {
          canonicalQuote: result.canonicalQuote,
          issuedQuote: result.issuedQuote,
          delivery: result.delivery,
        },
        result,
      }));
      setNotice(`${displayDocumentNumber(current.document)} has been sent to ${current.identity.customerName} for review. Customer acceptance is still pending.`);
    } catch (error) {
      const issuedQuote = error?.checkpoint?.issuedQuote;
      const errorMessage = issuedQuote
        ? "The quote was prepared successfully, but sending it to the customer needs to be retried."
        : error?.code === "QUOTE_EVALUATION_REQUIRED"
          ? "Complete and save the evaluation for this project before sending the quote."
          : error?.phase === "BRIDGE"
            ? "We couldn't prepare this quote for sending."
            : "The quote could not be sent yet.";
      setQuoteIssueState((state) => ({
        ...state,
        stage: "review",
        busy: false,
        errorPhase: error?.phase || "BRIDGE",
        checkpoint: error?.checkpoint || {},
        error: errorMessage,
      }));
    } finally {
      quoteIssueInFlightRef.current = false;
    }
  }

  async function shareSavedDocument(document) {
    const type = document.documentType.toLowerCase();
    const content = document.content || currentContent(type);
    const subject = `${type === "quote" ? "Quote" : "Invoice"} ${displayDocumentNumber(document)}`;
    const customerMessage = "Please review the attached customer document.";
    setDeliveryState({ stage: "sharing", channel: "DEVICE_SHARE", documentType: type, document, busy: true });
    try {
      const artifact = await savedPdfArtifact(document);
      const result = await shareBusinessDocumentPdfArtifact({ artifact, message: customerMessage });
      if (result.ok) {
        setDeliveryState(null);
        setNotice("External share opened. Meetro cannot confirm delivery. No Email or Meetro Message delivery event was created.");
      } else if (result.method === "cancelled") {
        setDeliveryState(null);
      } else {
        setDeliveryState({
          stage: "shareFallback", channel: "DEVICE_SHARE", documentType: type,
          document, artifact, busy: false, recipientEmail: content.customerEmail || "",
          subject, customerMessage,
        });
      }
    } catch (error) {
      setDeliveryState(null);
      setNotice(error?.message || "The exact saved PDF could not be prepared. Nothing was shared or sent.");
    }
  }

  async function saveAndContinueDelivery() {
    setDeliveryState((current) => ({ ...current, busy: true, error: "" }));
    const document = await saveDocument(activeDocument, { suppressFailureDialog: true });
    if (document === NUMBERING_SETUP_PENDING) {
      setDeliveryState((current) => ({ ...current, busy: false, error: "Finish the one-time numbering setup to save this draft. Nothing was sent." }));
      return;
    }
    if (!document) {
      setDeliveryState((current) => ({ ...current, busy: false, error: saveState.error || "The draft could not be saved. Nothing was sent." }));
      return;
    }
    if (deliveryState.channel === "DEVICE_SHARE") await shareSavedDocument(document);
    else openDeliveryReview(deliveryState.channel, document);
  }

  async function sendCurrentDelivery({ retry = false } = {}) {
    if (!deliveryState?.document || deliveryState.busy) return;
    const idempotencyKey = retry ? createBusinessDocumentSaveKey() : deliveryState.idempotencyKey;
    setDeliveryState((current) => ({ ...current, busy: true, error: "", idempotencyKey }));
    try {
      const delivery = await deliverBusinessDocumentDraft({
        draftId: deliveryState.document.id,
        expectedVersion: deliveryState.document.version,
        channel: deliveryState.channel,
        recipientEmail: deliveryState.recipientEmail,
        subject: deliveryState.subject,
        customerMessage: deliveryState.customerMessage,
        idempotencyKey,
        setPage,
      });
      setDeliveryHistory((current) => ({
        ...current,
        [deliveryState.documentType]: [delivery, ...current[deliveryState.documentType].filter((item) => item.id !== delivery.id)],
      }));
      setDeliveryState(null);
      setNotice(delivery.channel === "EMAIL"
        ? "Email delivery requested for the exact saved document version. No acceptance or payment was inferred."
        : "Sent in the governed Meetro conversation. No acceptance, payment, or Job closure was inferred.");
    } catch (error) {
      setDeliveryState((current) => ({
        ...current,
        busy: false,
        failed: true,
        error: error?.message || "Delivery failed. The saved document is unchanged.",
      }));
    }
  }

  function scrollToNewest() {
    const container = turnsRef.current;
    if (!container) return;
    nearNewestRef.current = true;
    container.scrollTo?.({ top: container.scrollHeight, behavior: "smooth" });
    if (!container.scrollTo) container.scrollTop = container.scrollHeight;
    setNewContentAvailable(false);
  }

  function closeHowItWorks() {
    setHowItWorksOpen(false);
    requestAnimationFrame(() => howItWorksTriggerRef.current?.focus());
  }

  const guardedSetPage = (page) => requestExit(() => setPage(page));
  const activeSavePresentation = savePresentations[activeDocument];
  const issuedQuotePresentation = quoteIssueState?.result?.issuedQuote ||
    quoteIssueState?.checkpoint?.issuedQuote || null;
  const activeIssuedQuote =
    activeDocument === "quote" &&
    activeSaved &&
    quoteIssueState?.document?.id === activeSaved.id &&
    quoteIssueState.document.version === activeSaved.version
      ? issuedQuotePresentation
      : null;
  const saveLabel = activeSavePresentation.label;
  const startNewLabel = t(
    startNewState.busy && startNewState.documentType === activeDocument
      ? activeDocument === "quote"
        ? "businessDocumentStartingNewQuote"
        : "businessDocumentStartingNewInvoice"
      : activeDocument === "quote"
        ? "businessDocumentStartNewQuote"
        : "businessDocumentStartNewInvoice",
    language
  );
  const startNewSaveFailure = Boolean(
    pendingStartNewRef.current && startNewState.error
  );

  return (
    <div className="app-page meetro-wide-page business-document-workspace">
      <header className="business-document-header">
        <button type="button" className="business-document-back" onClick={() => requestExit(onBack)} aria-label="Leave Quote and Invoice workspace">←</button>
        <div>
          <div className="business-document-title-row"><h1>{activeContent.projectTitle || activeJobContext.title || "Quote & Invoice"}</h1><span>{recovered ? "Recovered · Not saved" : documentJobIds[activeDocument] ? "Job linked" : "Working draft"}</span></div>
          <p>{activeContent.customerName || activeJobContext.customerName ? `Customer: ${activeContent.customerName || activeJobContext.customerName}` : "Customer not selected"}{activeContent.customerLocation || activeJobContext.location ? ` · ${activeContent.customerLocation || activeJobContext.location}` : ""}</p>
        </div>
        <div className="business-document-header-actions">
          <button type="button" className="business-document-start-new" disabled={startNewState.busy} aria-busy={startNewState.busy && startNewState.documentType === activeDocument} onClick={() => void startNewDocument(activeDocument)}>{startNewLabel}</button>
          <div className="business-document-save-status" aria-live="polite">{activeSavePresentation.savedAt ? `Saved · ${new Date(activeSavePresentation.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : activeDirty ? "Unsaved changes" : "Not saved"}</div>
          {startNewState.error && startNewState.documentType === activeDocument ? <p className="business-document-start-new-error" role="alert">{startNewState.error}</p> : null}
        </div>
      </header>
      <DocumentTabs activeDocument={activeDocument} onDocumentChange={switchDocument} onSavedFiles={() => setSavedFilesOpen(true)} />
      <div className="business-document-mobile-switch" role="tablist" aria-label="Workspace view"><button type="button" role="tab" aria-selected={mobilePane === "conversation"} onClick={() => setMobilePane("conversation")}>Conversation</button><button type="button" role="tab" aria-selected={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Preview</button></div>
      <main className={`business-document-main ${documentPhotos.length ? "has-evidence" : ""}`}>
        <section className={`business-document-conversation ${mobilePane === "conversation" ? "mobile-active" : ""}`} aria-labelledby="business-document-conversation-title">
          <h2 id="business-document-conversation-title" className="business-document-visually-hidden">{activeDocument === "quote" ? "Quote conversation" : "Invoice conversation"}</h2>
          <div className="business-document-control-toolbar" aria-label="Workspace controls"><button type="button" aria-label="Let Meetro prefill the form" aria-pressed={manualState?.mode === "prefill"} aria-controls="business-document-prefill-details" onClick={usePrefill}><MeetroIcon name="assistant" size={17} decorative /><span>Let Meetro prefill</span></button><button type="button" aria-label="Fill the form manually" aria-pressed={manualState?.mode === "manual"} onClick={() => openManualEditor("first")}><MeetroIcon name="editPortfolio" size={17} decorative /><span>Fill form manually</span></button><button ref={howItWorksTriggerRef} type="button" aria-expanded={howItWorksOpen} aria-controls="business-document-workflow-guide" onClick={() => setHowItWorksOpen((open) => !open)}><span aria-hidden="true">ⓘ</span><span>How it works</span></button>{howItWorksOpen ? <BusinessDocumentWorkflowGuide onClose={closeHowItWorks} /> : null}</div>
          {manualState ? <ManualEditor activeDocument={activeDocument} quote={quote} invoice={invoice} documentNumber={activeSaved?.documentNumber || ""} initialFocus={manualState.focus} language={language} mode={manualState.mode} onModeChange={changeEditorMode} onApply={applyManualDraft} onCancel={() => setManualState(null)} /> : null}
          <div className="business-document-chat-shell">
            <div ref={turnsRef} className="business-document-turns" aria-live="polite" onScroll={(event) => { const element = event.currentTarget; nearNewestRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 72; if (nearNewestRef.current) setNewContentAvailable(false); }}><article className="meetro"><span>M</span><p>Ask me about the job, photos, findings, or recommendations—or tell me exactly what you want changed on the working document.</p></article>{documentPhotos.length ? <PhotoConversationEvidence photos={documentPhotos} assignments={photoAssignments} onReview={() => setPhotoReviewOpen(true)} /> : null}{currentConversationEntries.map((entry) => entry.kind === "DOCUMENT" ? <InstructionTurn key={entry.id} turn={entry.turn} showResponse={!entry.analysisRouted} onEdit={() => setTurns((current) => current.map((item) => item.id === entry.turn.id ? { ...item, editing: true } : { ...item, editing: false }))} onCancel={() => setTurns((current) => current.map((item) => item.id === entry.turn.id ? { ...item, editing: false } : item))} onSave={(value) => void submitInstruction(value, entry.turn.id)} /> : <AnalysisConversationTurn key={entry.id} turn={entry.turn} />)}{pendingAnalysisMessageVisible ? <article className="you"><span>You</span><p>{pendingAnalysisMessage}</p></article> : null}{currentAnalysisRequest.busy ? <article className="meetro"><span>M</span><p>Analyzing the job…</p></article> : null}</div>
            {newContentAvailable ? <button type="button" className="business-document-new-message" onClick={scrollToNewest}>New message ↓</button> : null}
            <div className="business-document-composer"><textarea ref={messageRef} id="business-document-message" value={message} rows={3} placeholder={`Ask Meetro about the job or tell me what to change on the ${activeDocument}…`} onChange={(event) => setMessage(event.target.value)} /><div><WorkflowMicrophoneInput language={language} contextLabel={`business-${activeDocument}`} idleLabel="Speak" setPage={guardedSetPage} disabled={currentAnalysisRequest.busy} onTranscript={(transcript) => setMessage((current) => [current, transcript].filter(Boolean).join(" "))} /><button type="button" onClick={() => onAddPhotos(activeDocument)} disabled={!canAddPhotos || photoBusy || currentAnalysisRequest.busy}><MeetroIcon name="photoCount" size={17} decorative />{photoBusy ? "Adding…" : "Add Photos"}</button><button type="button" className="business-document-send-message" onClick={() => void submitInstruction(message)} disabled={!message.trim() || currentAnalysisRequest.busy}>{currentAnalysisRequest.busy ? "Thinking…" : "Send"}</button></div></div>
          </div>
          <div className="business-document-conversation-shortcuts"><button type="button" onClick={() => focusComposer("Note: ")}>Add to {activeDocument === "quote" ? "Quote" : "Invoice"} Notes</button><button type="button" onClick={() => focusComposer("Keep this private: ")}>Private Reminder</button><button type="button" onClick={() => openManualEditor("amount")}>Change Amount</button></div>
          {privateReminders.length ? <aside className="business-private-reminders"><strong>Private reminders</strong>{privateReminders.map((item) => <p key={item.id}>{item.text}</p>)}<small>Only you can see this. It never appears on customer documents.</small></aside> : null}
          {currentAnalysisRequest.error ? <p className="business-document-notice" role="alert">{currentAnalysisRequest.error}</p> : null}
          {notice && mobilePane === "conversation" ? <p className="business-document-notice" role="status">{notice}</p> : null}
        </section>
        {documentPhotos.length ? <JobEvidencePanel photos={documentPhotos} assignments={photoAssignments} onReview={() => setPhotoReviewOpen(true)} onAddPhotos={() => onAddPhotos(activeDocument)} canAddPhotos={canAddPhotos} busy={photoBusy || currentAnalysisRequest.busy} /> : null}
        <section ref={previewRef} tabIndex={-1} className={`business-document-preview ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-labelledby="business-document-preview-title"><header><h2 id="business-document-preview-title">Live {activeDocument === "quote" ? "Quote" : "Invoice"} Preview</h2><span>● Auto-updated</span></header><CustomerPartyControl language={language} content={activeContent} customerParty={activeCustomerParty} linkedContact={activeLinkedCustomer} linkedDurably={Boolean(activeSaved?.customerParty && activeSaved.customerParty.businessContactId === activeCustomerParty?.businessContactId && activeSaved.customerParty.customerRelationshipId === activeCustomerParty?.customerRelationshipId)} control={customerControl} onOpen={(mode) => void openCustomerControl(mode)} onClose={() => setCustomerControl(emptyCustomerControl())} onSearch={(search) => updateCustomerControl({ search })} onSelect={(selectedId) => updateCustomerControl({ selectedId, mode: "choose", duplicateCandidates: [], confirmReplacement: false })} onUse={(replace) => void applySavedCustomer(replace)} onSaveContact={() => void saveCurrentCustomerAsContact()} onPartyType={(partyType) => updateCustomerControl({ partyType })} onRetry={() => void retryCustomerWorkflow()} onCreateAnyway={() => { updateCustomerControl({ duplicateConfirmed: true, duplicateCandidates: [] }); void saveCurrentCustomerAsContact({ bypassDuplicates: true }); }} />{activeDocument === "quote" ? <QuotePreview quote={quote} branding={branding} generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} saved={Boolean(activeSaved && !activeDirty)} documentNumber={activeSaved?.documentNumber || ""} authorityState={activeIssuedQuote} /> : <InvoicePreview invoice={invoice} branding={branding} generalPhotos={generalPhotos} beforePhotos={beforePhotos} afterPhotos={afterPhotos} saved={Boolean(activeSaved && !activeDirty)} documentNumber={activeSaved?.documentNumber || ""} />}<div className="business-document-actions"><button type="button" className="business-document-save" disabled={saveState.busy || (activeSaved && !activeDirty)} onClick={() => void saveDocument(activeDocument)}>{saveLabel}</button><button type="button" onClick={() => void previewActivePdf()}>Preview PDF</button><button type="button" onClick={() => void downloadActivePdf()}>Download PDF</button>{activeDocument === "quote" && documentJobIds.quote ? <button type="button" className="business-document-primary" disabled={quoteIssueState?.busy || Boolean(activeIssuedQuote)} onClick={() => void beginGovernedQuoteIssue()}>{activeIssuedQuote ? "Quote Sent" : quoteIssueState?.busy ? "Preparing…" : "Send Quote to Customer"}</button> : <DeliveryMenu kind={activeDocument} onSelect={beginDelivery} disabled={deliveryState?.busy || deliveryState?.stage === "sharing"} />}</div><DeliveryHistory deliveries={deliveryHistory[activeDocument]} />{notice && mobilePane === "preview" ? <p className="business-document-notice" role="status">{notice}</p> : null}</section>
      </main>
      {savedFilesOpen ? <SavedFilesDrawer currentSavedIds={Object.values(savedDocuments).map((document) => document?.id).filter(Boolean)} setPage={setPage} onClose={() => setSavedFilesOpen(false)} onDeleted={handleDeletedDocument} onOpen={(draftId) => void openSavedDocument(draftId)} /> : null}
      {photoReviewOpen && documentPhotos.length ? <PhotoReviewDialog photos={documentPhotos} assignments={photoAssignments} onCancel={() => setPhotoReviewOpen(false)} onApply={(assignments) => { setPhotoAssignments((current) => ({ ...current, ...Object.fromEntries(Object.entries(assignments).map(([id, assignment]) => [id, { ...normalizeBusinessDocumentPhotoAssignment(assignment), documentType: activeDocument }])) })); setPhotoReviewOpen(false); }} /> : null}
      {deliveryState?.stage === "saveRequired" ? <WorkspaceDialog titleId="business-document-delivery-save-title" title={deliveryState.channel === "DEVICE_SHARE" ? "Save changes before sharing" : "Save changes before sending"} onClose={deliveryState.busy ? undefined : () => setDeliveryState(null)} actions={[{ label: "Cancel", disabled: deliveryState.busy, onClick: () => setDeliveryState(null) }, { label: deliveryState.busy ? "Saving…" : deliveryState.channel === "DEVICE_SHARE" ? "Save & Continue to Share" : "Save & Continue to Send", primary: true, disabled: deliveryState.busy, onClick: () => void saveAndContinueDelivery() }]}><p>The customer can receive only an exact durable document version. Saving does not send, share, issue, accept, approve, pay, or close anything.</p>{deliveryState.error ? <p role="alert">{deliveryState.error}</p> : null}</WorkspaceDialog> : null}
      {deliveryState?.stage === "shareFallback" ? <WorkspaceDialog titleId="business-document-share-fallback-title" title="Share this saved PDF" onClose={() => setDeliveryState(null)} actions={[{ label: "Close", onClick: () => setDeliveryState(null) }, { label: "Download PDF", primary: true, onClick: () => { downloadBusinessDocumentPdfArtifact(deliveryState.artifact); setNotice("PDF downloaded. No delivery has been confirmed."); } }]}><p>System file sharing is unavailable in this browser. Download the exact saved PDF, copy the customer message, or open an email draft.</p><div className="business-document-share-fallback"><button type="button" onClick={() => void copyBusinessDocumentShareMessage(deliveryState.customerMessage).then((copied) => setNotice(copied ? "Customer message copied. No document was sent." : "Clipboard access is unavailable."))}>Copy customer message</button><button type="button" onClick={() => openBusinessDocumentEmailDraft({ recipient: deliveryState.recipientEmail, subject: deliveryState.subject, message: deliveryState.customerMessage })}>Open email draft</button></div><p className="business-document-delivery-truth">The email draft cannot attach the PDF automatically. Attach the downloaded PDF before sending. Meetro cannot confirm external delivery.</p></WorkspaceDialog> : null}
      {deliveryState?.stage === "review" ? <DeliveryReviewDialog state={deliveryState} onChange={(field, value) => setDeliveryState((current) => ({ ...current, [field]: value }))} onCancel={() => setDeliveryState(null)} onSend={() => void sendCurrentDelivery({ retry: deliveryState.failed })} /> : null}
      {quoteIssueState && quoteIssueState.stage !== "saving" ? <QuoteIssueReviewDialog state={quoteIssueState} onCancel={() => setQuoteIssueState(null)} onConfirm={() => void confirmGovernedQuoteIssue()} /> : null}
      {exitDialogOpen ? <WorkspaceDialog titleId="business-document-exit-title" title="Save changes before leaving?" onClose={() => setExitDialogOpen(false)} actions={[{ label: "Keep Editing", onClick: () => setExitDialogOpen(false) }, { label: "Discard Changes", onClick: discardAndExit }, { label: "Save Draft & Exit", primary: true, onClick: () => void saveAllAndExit() }]}><p>Save keeps this private working document for your business. It does not send or issue anything.</p></WorkspaceDialog> : null}
      {numberingSetup ? <NumberingSetupDialog state={numberingSetup} onModeChange={chooseNumberingMode} onPreviousNumberChange={(value) => setNumberingSetup((current) => current ? { ...current, previousDocumentNumber: value } : current)} onCancel={cancelNumberingSetup} onSubmit={() => void submitNumberingSetup()} /> : null}
      {saveFailureOpen ? <WorkspaceDialog titleId="business-document-save-failure-title" title="We couldn't save your draft right now" onClose={keepEditingAfterSaveFailure} actions={startNewSaveFailure ? [{ label: "Keep Editing", onClick: keepEditingAfterSaveFailure }, { label: "Try Again", primary: true, onClick: retryFailedSave }] : [{ label: "Keep Editing", onClick: keepEditingAfterSaveFailure }, { label: "Exit with Recovery", onClick: () => void exitWithRecovery() }, { label: "Try Again", primary: true, onClick: retryFailedSave }]}><p>{saveState.error || startNewState.error || "Your work is still here."}</p>{startNewSaveFailure ? <p>No new document was created. The current working document remains open.</p> : <p>Exit with Recovery stores a temporary noncanonical copy on this device. It will not appear in Saved Files.</p>}</WorkspaceDialog> : null}
      {recoveryRecord ? <WorkspaceDialog titleId="business-document-recovery-title" title="Continue where you left off?" actions={[{ label: "Not Now", onClick: () => void discardRecovery() }, { label: "Continue Where I Left Off", primary: true, onClick: () => void continueRecovery() }]}><p>{businessDocumentSavedResumeTarget(recoveryRecord.snapshot) ? "Meetro will reopen the exact saved server document. The local record is only a resume pointer and cannot change document authority." : "We found changes that were not successfully saved to Meetro. Recovery is device-local and still unsaved."}</p></WorkspaceDialog> : null}
      <BottomNav setPage={guardedSetPage} currentPage="quoteBuilder" />
    </div>
  );
}
