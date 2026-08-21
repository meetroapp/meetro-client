import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBusinessDocumentConversationPatch,
  createInvoiceContinuityDraft,
  customerVisibleWorkspaceDraft,
} from "../src/utils/businessDocumentWorkspace.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const invoiceBuilder = read("src/pages/InvoiceBuilder.jsx");
const bottomNav = read("src/components/BottomNav.jsx");

test("one sidebar Quote & Invoice shortcut opens one shared workspace", () => {
  const shortcuts = bottomNav.slice(
    bottomNav.indexOf("const businessDesktopShortcutItems = ["),
    bottomNav.indexOf("useEffect(() => {", bottomNav.indexOf("const businessDesktopShortcutItems = ["))
  );
  assert.equal((shortcuts.match(/shortcut: "quoteInvoice"/g) || []).length, 1);
  assert.doesNotMatch(shortcuts, /shortcut: "quickQuote"|shortcut: "quickInvoice"/);
  assert.match(shortcuts, /page: "businessLeads"/);
  assert.match(quoteBuilder, /<UnifiedBusinessDocumentWorkspace/);
  assert.match(invoiceBuilder, /<QuoteBuilder setPage=\{setPage\} initialDocument="invoice"/);
});

test("Quote, Invoice, and closed-by-default Saved Files share the workspace", () => {
  assert.match(workspace, /\["quote", "Quote"/);
  assert.match(workspace, /\["invoice", "Invoice"/);
  assert.match(workspace, />\s*Saved Files\s*</);
  assert.match(workspace, /useState\(false\)[\s\S]*setSavedFilesOpen/);
  assert.match(workspace, /savedFilesOpen \? <SavedFilesDrawer/);
  assert.match(workspace, /setSavedFilesOpen\(false\)/);
  assert.match(styles, /\.business-saved-drawer[\s\S]*position:\s*fixed/);
  assert.match(styles, /inset:\s*0 0 0 auto/);
});

test("document switching preserves the component-owned Job and conversation context", () => {
  assert.match(workspace, /const \[activeDocument, setActiveDocument\]/);
  assert.match(workspace, /const \[turns, setTurns\]/);
  assert.match(workspace, /const \[invoice, setInvoice\]/);
  assert.match(workspace, /function switchDocument/);
  const switchBlock = workspace.slice(workspace.indexOf("function switchDocument"), workspace.indexOf("function submitMessage"));
  assert.doesNotMatch(switchBlock, /setTurns|setInvoice|setPage|localStorage/);
});

test("conversation and manual entry update one working Quote draft", () => {
  const patch = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Customer is Maria Lopez. Replace the wall. Final quote is $2,650.",
    current: {},
  });
  assert.equal(patch.customerName, "Maria Lopez");
  assert.equal(patch.totalOverride, "2650");
  assert.match(patch.projectDescription, /Replace the wall/);
  assert.match(workspace, /onApplyQuotePatch\(documentPatch\)/);
  assert.match(workspace, /onQuoteFieldChange/);
  assert.match(workspace, /Let Meetro prefill the form/);
  assert.match(workspace, /Fill the form manually/);
});

test("Speak, Type, Add Photos, and the live document remain reachable without suggestion cards", () => {
  assert.match(workspace, /<WorkflowMicrophoneInput/);
  assert.match(workspace, /<textarea id="business-document-message"/);
  assert.match(workspace, />Add Photos</);
  assert.match(workspace, /Live \{activeDocument === "quote" \? "Quote" : "Invoice"\} Preview/);
  assert.doesNotMatch(workspace, /Use Suggestion|Edit & Use|Needs Verification|Dismiss Suggestion/);
});

test("the existing PDF model and generator remain the document boundary", () => {
  assert.match(quoteBuilder, /buildQuickQuoteDocumentModel/);
  assert.match(quoteBuilder, /onDownloadQuote=\{\(\) => void exportQuickQuotePdf\(\)\}/);
  assert.match(workspace, /buildQuickInvoiceDocumentModel/);
  assert.match(workspace, /downloadCustomerDocumentPdf/);
  assert.match(workspace, /previewCustomerDocumentPdf/);
  assert.match(quoteBuilder, /onPreviewQuote=\{\(\) => previewCustomerDocumentPdf\(buildQuickQuotePdfModel\(\)\)\}/);
  assert.match(workspace, />Preview PDF</);
  assert.match(workspace, />Download PDF</);
});

test("private reminders, costs, and photos do not enter customer-visible models", () => {
  const visible = customerVisibleWorkspaceDraft({
    customerName: "Paul Becker",
    totalOverride: "2650",
    privateReminder: "Bring tester",
    privateCosts: { materials: 700 },
    privatePhotos: ["secret"],
  });
  assert.deepEqual(visible, { customerName: "Paul Becker", totalOverride: "2650" });
  assert.match(workspace, /Private reminders/);
  assert.match(workspace, /never appears on customer documents/);
  assert.match(workspace, /customerVisibleWorkspaceDraft\(invoice\)/);
});

test("Internal Estimate and Solution Ready are not mandatory visible workspace steps", () => {
  assert.doesNotMatch(workspace, /Analyze Job|Continue with My Details|Confirm Amounts|Internal Estimate|Solution Ready/);
  assert.match(workspace, /working draft only/);
  assert.match(workspace, /Nothing here issues, sends, approves, pays, or completes/);
});

test("Quote and Invoice delivery use one menu while PDF remains separate", () => {
  assert.match(workspace, /kind === "quote" \? "Send Quote" : "Send Invoice"/);
  assert.match(workspace, /role="menuitem"[\s\S]*Email/);
  assert.match(workspace, /role="menuitem"[\s\S]*Message/);
  assert.match(workspace, /Nothing was sent or approved/);
  assert.doesNotMatch(workspace, /navigator\.share|sendInvoice|sendQuote/);
  assert.doesNotMatch(workspace, />Save \{activeDocument === "quote"/);
});

test("natural language can revise an explicit labor amount without inventing hours", () => {
  const patch = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Change the labor to $175.",
    current: { projectDescription: "Repair the sink." },
  });
  assert.deepEqual(patch.laborItems, [{ description: "labor", total: "175" }]);
  assert.equal(patch.totalOverride, undefined);
});

test("Invoice continuity copies only context unless canonical Quote truth is accepted", () => {
  const draft = createInvoiceContinuityDraft({
    job: { customerName: "Paul Becker", title: "Wall repair" },
    quote: { quoteNumber: "QT-10", confirmedTotal: "2650", canonicalStatus: "DRAFT" },
  });
  assert.equal(draft.customerName, "Paul Becker");
  assert.equal(draft.projectTitle, "Wall repair");
  assert.equal(draft.quoteReference, "");
  assert.equal(draft.totalOverride, "");

  const accepted = createInvoiceContinuityDraft({
    job: { customerName: "Paul Becker", title: "Wall repair" },
    quote: { quoteNumber: "QT-10", confirmedTotal: "2650", canonicalStatus: "ACCEPTED" },
  });
  assert.equal(accepted.quoteReference, "QT-10");
  assert.equal(accepted.totalOverride, "2650");
});

test("Before and After photos require explicit conversation intent", () => {
  assert.equal(buildBusinessDocumentConversationPatch({
    documentType: "invoice",
    instruction: "Use the quote photos as before photos.",
  }).photoIntent, "before");
  assert.equal(buildBusinessDocumentConversationPatch({
    documentType: "invoice",
    instruction: "These photos are after photos.",
  }).photoIntent, "after");
  assert.equal(buildBusinessDocumentConversationPatch({
    documentType: "invoice",
    instruction: "Attach photos.",
  }).photoIntent, undefined);
  assert.match(workspace, /Photos stay private until you explicitly label them Before or After/);
});

test("Saved Files is a truthful governed-search seam with no browser authority", () => {
  assert.match(workspace, /No browser-stored or fabricated records are shown/);
  assert.match(workspace, /canonical backend listing capability/);
  assert.doesNotMatch(workspace, /localStorage|sessionStorage/);
});

test("mobile Conversation and Preview switch without horizontal overflow", () => {
  assert.match(workspace, /business-document-mobile-switch/);
  assert.match(workspace, /setMobilePane\("conversation"\)/);
  assert.match(workspace, /setMobilePane\("preview"\)/);
  assert.match(styles, /overflow-x:\s*clip/);
  assert.match(styles, /@media \(min-width: 768px\)/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 900px\) and \(orientation: portrait\)/);
  assert.match(styles, /\.business-document-mobile-switch \{ display: grid; \}/);
  assert.match(styles, /\.business-document-conversation\.mobile-active,[\s\S]*\.business-document-preview\.mobile-active \{ display: block; \}/);
  assert.match(styles, /\.business-saved-drawer \{ width: 100vw; \}/);
});

test("live customer documents show the canonical business identity field", () => {
  assert.match(workspace, /branding\.businessName/);
  assert.doesNotMatch(workspace, /branding\.name/);
  assert.match(styles, /\.business-saved-drawer h2 \{[^}]*color:\s*#142236/);
});
