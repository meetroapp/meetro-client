import { fetchProfessionalInvoiceWorkspace } from "./invoicePaymentApi.js";
import { fetchEffectiveApprovedInvoiceQuote } from "./invoiceReviewDraft.js";
import { listBusinessDocumentDrafts, getBusinessDocumentDraft } from "./businessDocumentDraftApi.js";
import { hydrateSavedQuoteAuthority } from "./savedQuoteAuthorityHydration.js";

const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const nameKey = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function normalizeSourceQuoteNumber(value) {
  const match = clean(value).match(/^(?:(?:quote|cotizaci[oó]n)\s+)?q\s*-?\s*(\d+)$/i);
  return match ? `Q-${match[1]}` : "";
}

export function extractQuoteInvoiceCustomer(instruction) {
  const text = clean(instruction);
  const before = text.match(/\b(?:invoice|factura)\s+(?:for|para)\s+(.+?)(?=\s*,?\s*(?:quote\b|cotizaci[oó]n\b|q\s*-?\s*\d)|[.!?]|$)/i)?.[1];
  const after = text.match(/\bq\s*-?\s*\d+\b\s*,?\s+(?:for|para)\s+([^.!?]+)/i)?.[1];
  const customers = [before, after].filter(Boolean).map((value) => {
    let name = clean(value).replace(/[,;]$/, "").trim();
    const job = name.match(/^(.+?)(['’]s)?\s+job$/i);
    if (job) {
      name = job[1];
      // Only the lower-case article in "for the … job" is grammatical.
      // Preserve a proper-name "The", including possessive company names.
      if (!job[2]) name = name.replace(/^the\s+/, "");
    }
    const spanishJob = name.match(/^(?:el\s+)?trabajo\s+de\s+(.+)$/i);
    return clean(spanishJob?.[1] || name);
  });
  return { customerName: customers[0] || "", ambiguous: new Set(customers.map(nameKey)).size > 1 };
}

export function parseQuoteInvoiceCommand(instruction) {
  const text = clean(instruction);
  if (/\b(?:do not|don[’']t|never|no crear|no prepares)\b/i.test(text)) return null;
  if (!/\b(?:create|prepare|build|draft|make|start|crear|crea|preparar|prepara|hacer)\b[^.!?]*\b(?:invoice|factura)\b/i.test(text)) return null;
  const refs = [...text.matchAll(/\bq\s*-?\s*\d+\b/gi)];
  const number = refs.length === 1 ? normalizeSourceQuoteNumber(refs[0][0]) : "";
  const customer = extractQuoteInvoiceCustomer(text);
  return { state: customer.ambiguous || refs.length > 1 ? "AMBIGUOUS" : number ? "LOOKUP" : "INVALID", number, customerName: customer.customerName, instruction: text };
}

export function resolveExactSourceQuote({ number, customerName = "", documents = [] } = {}) {
  const normalized = normalizeSourceQuoteNumber(number);
  if (!normalized) return { state: "INVALID" };
  const matches = documents.filter((doc) => doc?.documentType === "QUOTE" && doc.status === "WORKING_DRAFT" && normalizeSourceQuoteNumber(doc.documentNumber) === normalized);
  if (!matches.length) return { state: "NOT_FOUND" };
  if (matches.length !== 1) return { state: "AMBIGUOUS" };
  const document = matches[0];
  if (!uuid(document.id) || !Number.isSafeInteger(document.version) || document.version < 1) return { state: "INVALID" };
  const names = [document.content?.customerName, document.customerDisplayName].filter(Boolean).map(nameKey);
  if (new Set(names).size > 1) return { state: "AMBIGUOUS" };
  if (customerName && (!names.length || names.some((name) => name !== nameKey(customerName)))) return { state: "BLOCKED_MISMATCH" };
  return { state: "EXACT_QUOTE", document };
}

export function resolveExactQuoteToInvoice(input = {}) {
  const resolution = resolveExactSourceQuote(input);
  if (resolution.state !== "EXACT_QUOTE") return resolution;
  const { document } = resolution;
  const params = new URLSearchParams({ sourceQuoteDraftId: document.id, sourceQuoteVersion: String(document.version), sourceQuoteNumber: normalizeSourceQuoteNumber(document.documentNumber) });
  return { state: "EXACT_QUOTE_TO_INVOICE", document, route: `invoiceBuilder?${params}` };
}

export async function lookupQuoteInvoiceCommand(command, { setPage, listDocuments = listBusinessDocumentDrafts } = {}) {
  if (!command || command.state !== "LOOKUP") return { state: command?.state || "INVALID" };
  try {
    const documents = await listDocuments({ search: command.number, type: "QUOTE", setPage });
    return resolveExactQuoteToInvoice({ number: command.number, customerName: command.customerName, documents });
  } catch { return { state: "UNAVAILABLE" }; }
}

export function quoteInvoiceResolutionMessage(state, language = "en") {
  const messages = language === "es" ? {
    BLOCKED_MISMATCH: "El cliente no coincide con la cotización. Verifica el cliente y el número.",
    NOT_FOUND: "No encontré esa cotización exacta. Verifica el número.",
    AMBIGUOUS: "Hay identidades de cotización en conflicto. Abre la cotización exacta desde Archivos guardados.",
    INVALID: "Indica el número exacto de cotización para preparar la factura.",
  } : {
    BLOCKED_MISMATCH: "The customer does not match this Quote. Check the customer and Quote number.",
    NOT_FOUND: "That exact Quote was not found. Check the Quote number.",
    AMBIGUOUS: "Conflicting Quote identities were found. Open the exact Quote from Saved Files.",
    INVALID: "Which exact Quote number should this Invoice use? Open the Job or supply its Quote number.",
  };
  return messages[state] || (language === "es" ? "No se pudo verificar la cotización. Inténtalo de nuevo." : "The Quote could not be verified. Please try again.");
}

export function parseQuoteInvoiceSourceRoute(route) {
  const [page, query = ""] = String(route || "").replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  const present = [...params.keys()].some((key) => key.startsWith("sourceQuote"));
  if (!present) return null;
  const id = params.get("sourceQuoteDraftId"), version = Number(params.get("sourceQuoteVersion")), number = normalizeSourceQuoteNumber(params.get("sourceQuoteNumber"));
  const valid = page === "invoiceBuilder" && uuid(id) && Number.isSafeInteger(version) && version > 0 && Boolean(number)
    && [...params.keys()].every((key) => ["sourceQuoteDraftId", "sourceQuoteVersion", "sourceQuoteNumber"].includes(key) && params.getAll(key).length === 1);
  return { valid, id, version, number };
}

// Transient language is never route authority and never placed in a URL/storage.
const proposals = new Map();
export function stageQuoteInvoiceInstruction(route, instruction) { proposals.clear(); proposals.set(route, instruction); }
export function takeQuoteInvoiceInstruction(route) { const text = proposals.get(route) || ""; proposals.delete(route); return text; }

export async function loadExactInvoiceSource(route, { setPage, getDocument = getBusinessDocumentDraft, getAuthority = hydrateSavedQuoteAuthority, getInvoiceWorkspace = fetchProfessionalInvoiceWorkspace, getEffectiveQuote = fetchEffectiveApprovedInvoiceQuote } = {}) {
  if (!route?.valid) throw new Error("Invalid source Quote route.");
  const document = await getDocument({ draftId: route.id, setPage });
  const exact = resolveExactQuoteToInvoice({ number: route.number, documents: [document] });
  if (exact.state !== "EXACT_QUOTE_TO_INVOICE" || document.id !== route.id || document.version !== route.version) throw new Error("The source Quote changed or is unavailable. Resolve the Quote again.");
  let authority = null;
  if (document.jobId) authority = await getAuthority({ document, setPage });
  let paymentEvidence = null;
  const canonical = authority?.canonicalQuote;
  if (projectQuoteToInvoiceWorkingDraft({ quoteDocument: document, quoteAuthority: authority }).invoiceDraft.lineItems.length) {
    // A bounded workspace read can supply payment continuity only when its exact
    // Job and current effective approved Quote both agree with this source.
    try {
      const workspace = await getInvoiceWorkspace({ limit: 50, setPage });
      const jobs = workspace.readyJobs.filter((job) => job.jobId === document.jobId);
      if (jobs.length === 1 && jobs[0].approvedAmount?.totalMinor === canonical.totalMinor && jobs[0].approvedAmount?.currency === canonical.currency) {
        const effective = await getEffectiveQuote({ jobId: document.jobId, approvedTotalMinor: canonical.totalMinor, setPage });
        if (effective.quoteId === canonical.id && effective.quoteVersion === canonical.decisionVersion) {
          paymentEvidence = { jobId: document.jobId, quoteId: canonical.id, quoteVersion: canonical.decisionVersion, receivedMinor: jobs[0].paymentsReceivedMinor };
        }
      }
    } catch { /* Unverified payments stay absent; they are never inferred. */ }
  }
  return { document, authority, paymentEvidence };
}

// Only identity is transferable by default. Approval must bind the exact saved
// snapshot; editable Quote content and amount flags cannot grant billing authority.
export function projectQuoteToInvoiceWorkingDraft({ quoteDocument, quoteAuthority, customerContact, relationship, job = {}, paymentEvidence } = {}) {
  const content = quoteDocument?.content || {};
  const number = quoteDocument?.documentType === "QUOTE" && uuid(quoteDocument.id) ? normalizeSourceQuoteNumber(quoteDocument.documentNumber) : "";
  const party = quoteDocument?.customerParty || null;
  const sourceQuote = { documentId: number ? quoteDocument.id : null, documentNumber: number || null, version: number ? quoteDocument.version : null, jobId: quoteDocument?.jobId || (!number && job.canonical ? job.id : null) || null, customerRelationshipId: party?.customerRelationshipId || party?.businessCustomerRelationshipId || relationship?.id || null };
  const contact = customerContact?.id && customerContact.id === party?.businessContactId ? customerContact : {};
  const invoiceDraft = {
    customerName: clean(content.customerName || contact.displayName), customerEmail: clean(content.customerEmail || contact.email),
    customerPhone: clean(content.customerPhone || contact.phone), customerAddress: clean(content.customerAddress || contact.address),
    customerLocation: clean(content.customerLocation || content.customerAddress || contact.address),
    serviceAddress: clean(content.serviceLocation || content.customerLocation || content.customerAddress || contact.address),
    projectTitle: clean(content.projectTitle || job.title), quoteReference: number, invoiceNumber: "", workPerformed: "", notes: "", paymentTerms: "", dueDate: "", totalOverride: "", paidAmount: "", lineItems: [],
  };
  const canonical = quoteAuthority?.canonicalQuote;
  const binding = canonical?.sourceBusinessDocument;
  const approved = Boolean(number && canonical?.status === "ISSUED" && canonical.decisionState === "APPROVED"
    && canonical.jobId === sourceQuote.jobId && binding?.documentId === sourceQuote.documentId && binding.documentVersion === sourceQuote.version
    && binding.currentSnapshotMatchesSource === true && binding.currentDocumentVersion === sourceQuote.version
    && Number.isSafeInteger(canonical.totalMinor) && canonical.totalMinor >= 0);
  if (approved) {
    invoiceDraft.currency = canonical.currency || "USD";
    // Quote approval supplies scope and price, never evidence of completed work.
    const approvedScope = clean(content.recommendedSolution || content.projectDescription);
    invoiceDraft.lineItems = [{ id: `approved-${canonical.id}`, description: approvedScope || "Approved work", quantity: "1", unitPrice: String(canonical.totalMinor / 100) }];
    if (paymentEvidence?.jobId === canonical.jobId && paymentEvidence?.quoteId === canonical.id && paymentEvidence?.quoteVersion === canonical.decisionVersion && Number.isSafeInteger(paymentEvidence.receivedMinor) && paymentEvidence.receivedMinor >= 0) invoiceDraft.paidAmount = String(paymentEvidence.receivedMinor / 100);
  }
  return { invoiceDraft, sourceQuote, warnings: approved ? (invoiceDraft.paidAmount === "" ? ["Payment evidence is not verified; review payments before saving."] : []) : ["Approved commercial context is not verified; review scope, charges, and payments."] };
}
