import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBusinessDocumentConversationPatch,
  classifyBusinessDocumentConversationIntent,
  createInvoiceContinuityDraft,
  customerVisibleWorkspaceDraft,
  reconcileBusinessDocumentInstructions,
} from "../src/utils/businessDocumentWorkspace.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const persistence = read("src/utils/businessDocumentPersistence.js");
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
  const switchBlock = workspace.slice(workspace.indexOf("function switchDocument"), workspace.indexOf("function applyManualDraft"));
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
  assert.match(workspace, /reconcileDocument\(activeDocument, nextTurns\)/);
  assert.match(workspace, /onApplyQuotePatch\(\{ \.\.\.result\.draft, replaceCollections: true \}\)/);
  assert.match(workspace, /Let Meetro prefill the form/);
  assert.match(workspace, /Fill the form manually/);
  assert.match(workspace, />Apply changes</);
  assert.match(workspace, /onClick=\{onCancel\}>Cancel/);
});

test("Ask Meetro questions and analysis requests cannot silently mutate the working document", () => {
  for (const instruction of [
    "Do you find visible damage?",
    "What do you see in these photos?",
    "Should I replace the fan or repair it?",
    "Analyze these photos for damage.",
    "Assess the condition of this fan.",
  ]) {
    assert.deepEqual(
      buildBusinessDocumentConversationPatch({
        documentType: "quote",
        instruction,
        current: {},
      }),
      {},
      instruction
    );
  }

  const baseline = {
    projectDescription: "Replace the existing fan.",
    recommendedSolution: "Replace the existing fan.",
    totalOverride: "289.99",
  };

  const reconciled = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline,
    instructions: [
      { id: "analysis-question", text: "Do you find visible damage?" },
    ],
  });

  assert.deepEqual(reconciled.draft, baseline);
  assert.equal(reconciled.privateReminders.length, 0);
  assert.equal(reconciled.photoIntents.length, 0);
});

test("explicit document edits still bypass the Ask Meetro question guard", () => {
  const labor = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Can you change labor to $225?",
    current: {},
  });
  assert.deepEqual(labor.laborItems, [
    { description: "labor", total: "225" },
  ]);

  const privatePatch = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Can you keep this private?",
    current: {},
  });
  assert.equal(privatePatch.privateReminder, "Can you keep this private?");

  const scope = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Replace the wall.",
    current: {},
  });
  assert.equal(scope.projectDescription, "Replace the wall.");
  assert.equal(scope.recommendedSolution, "Replace the wall.");
});


test("active Job Analysis keeps ordinary job context conversational while explicit document commands retain draft authority", () => {
  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "I see cracks on the concrete wall.",
      { hasActiveAnalysisSession: true }
    ),
    "ASK_MEETRO"
  );

  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "The fan sparked yesterday.",
      { hasActiveAnalysisSession: true }
    ),
    "ASK_MEETRO"
  );

  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "That section feels loose.",
      { hasActiveAnalysisSession: true }
    ),
    "ASK_MEETRO"
  );

  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "Add the cracks to the scope.",
      { hasActiveAnalysisSession: true }
    ),
    "DOCUMENT_EDIT"
  );

  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "Change labor to $225.",
      { hasActiveAnalysisSession: true }
    ),
    "DOCUMENT_EDIT"
  );

  // Legacy no-session behavior remains unchanged.
  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "I see cracks on the concrete wall."
    ),
    "DOCUMENT_EDIT"
  );

  assert.match(
    workspace,
    /hasActiveAnalysisSession:[\s\S]*Boolean\(jobAnalysisSessionIds\[activeDocument\]\)/
  );
});

test("initial Ask Meetro professional input remains visible from server-owned evidence after analysis completes", () => {
  assert.match(
    workspace,
    /jobAnalysisEvidenceVersions/
  );

  assert.match(
    workspace,
    /currentAnalysisEvidenceVersions/
  );

  assert.match(
    workspace,
    /evidence\.professionalInput/
  );

  assert.match(
    workspace,
    /kind: "ANALYSIS_EVIDENCE"/
  );

  assert.match(
    workspace,
    /analysis-evidence-\$\{evidence\.version\}/
  );

  assert.match(
    workspace,
    /setJobAnalysisEvidenceVersions[\s\S]*session\.evidenceVersions/
  );
});

test("photo evidence uses a compact keyboard-safe attachment tray instead of consuming conversation scroll space", () => {
  assert.match(
    workspace,
    /function PhotoAttachmentTray/
  );

  assert.match(
    workspace,
    /className="business-document-attachment-tray"/
  );

  assert.match(
    workspace,
    /\{photos\.length\} \{photos\.length === 1 \? "photo" : "photos"\} attached/
  );

  assert.match(
    workspace,
    /<button[\s\S]*onClick=\{onReview\}[\s\S]*>\s*Review\s*<\/button>/
  );

  assert.doesNotMatch(
    workspace,
    /<PhotoWorkspace photos=/
  );

  assert.match(
    workspace,
    /className="business-document-chat-shell"/
  );

  assert.match(
    styles,
    /\.business-document-chat-shell\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/
  );

  assert.match(
    styles,
    /\.business-document-turns\s*\{[\s\S]*flex:\s*1 1 auto[\s\S]*overflow-y:\s*auto/
  );

  assert.match(
    styles,
    /@media \(max-width:\s*767px\)[\s\S]*\.business-document-chat-shell\s*\{[\s\S]*height:\s*56dvh/
  );

  assert.match(
    workspace,
    /Review document photos/
  );
});

test("Speak, Type, Add Photos, and the live document remain reachable without suggestion cards", () => {
  assert.match(workspace, /<WorkflowMicrophoneInput/);
  assert.match(workspace, /<textarea[^>]*id="business-document-message"/);
  assert.match(workspace, /"Add Photos"/);
  assert.match(workspace, /Live \{activeDocument === "quote" \? "Quote" : "Invoice"\} Preview/);
  assert.doesNotMatch(workspace, /Use Suggestion|Edit & Use|Needs Verification|Dismiss Suggestion/);
});

test("Live Preview keeps customer Observation separate and uses truthful saved footer parity", () => {
  assert.match(workspace, /<h3>Observation<\/h3>/);
  assert.match(workspace, /quote\.recommendedSolution && quote\.projectDescription/);
  assert.match(workspace, /Confirm terms before delivery\./);
  assert.match(workspace, /Not confirmed\./);
  assert.match(workspace, /Ready for Customer Review/);
  assert.match(workspace, /READY FOR CUSTOMER REVIEW/);
  for (const label of ["Due Date", "Amount Paid", "Balance Due"]) {
    assert.match(workspace, new RegExp(`<h3>${label}<\\/h3>`));
  }
  assert.match(workspace, /saved=\{Boolean\(activeSaved && !activeDirty\)\}/);
});

test("saved Preview and Download use the authoritative server PDF while unsaved preview remains local", () => {
  assert.match(quoteBuilder, /buildQuickQuoteDocumentModel/);
  assert.match(quoteBuilder, /onDownloadQuote=\{\(photoEvidence, workingDraftStatus\) => void exportQuickQuotePdf\(photoEvidence, workingDraftStatus\)\}/);
  assert.match(workspace, /buildQuickInvoiceDocumentModel/);
  assert.match(workspace, /downloadCustomerDocumentPdf/);
  assert.match(workspace, /previewCustomerDocumentPdfWithMedia/);
  assert.match(quoteBuilder, /onPreviewQuote=\{\(photoEvidence, workingDraftStatus\) => previewQuickQuotePdfWithPhotos\(photoEvidence, workingDraftStatus\)\}/);
  assert.match(quoteBuilder, /attachCustomerDocumentPhotoEvidence/);
  assert.match(workspace, /getBusinessDocumentCustomerPdf/);
  assert.match(workspace, /draftId: document\.id/);
  assert.match(workspace, /expectedVersion: document\.version/);
  assert.match(workspace, /activeSaved && !activeDirty/);
  assert.match(workspace, /onPreviewQuote\(customerPhotoGroups, "UNSAVED"\)/);
  assert.match(workspace, /onDownloadQuote\(customerPhotoGroups, "UNSAVED"\)/);
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
  assert.match(workspace, /Email with Meetro/);
  assert.match(workspace, /Meetro Message/);
  assert.match(workspace, /Share with device…/);
  assert.match(workspace, /Save & Continue to Send/);
  assert.match(workspace, /Save & Continue to Share/);
  assert.match(workspace, /deliverBusinessDocumentDraft/);
  assert.match(workspace, /listBusinessDocumentDeliveries/);
  assert.match(workspace, /PDF included/);
  assert.match(workspace, /Sending does not issue, accept, approve, pay, or close anything/);
  assert.match(workspace, /shareBusinessDocumentPdfArtifact/);
  assert.match(workspace, /External share opened\. Meetro cannot confirm delivery/);
  assert.match(workspace, /No Email or Meetro Message delivery event was created/);
  assert.match(workspace, /email draft cannot attach the PDF automatically/);
  const shareBlock = workspace.slice(workspace.indexOf("async function shareSavedDocument"), workspace.indexOf("async function saveAndContinueDelivery"));
  assert.doesNotMatch(shareBlock, /deliverBusinessDocumentDraft|setDeliveryHistory|SENT|DELIVERED/);
  assert.doesNotMatch(workspace, /deliveryUnavailable/);
  assert.doesNotMatch(workspace, />Save \{activeDocument === "quote"/);
});

test("explicit professional instructions update structured Quote Agreement terms without changing scope", () => {
  const hidden = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "Add standard hidden-condition protection.", current: { projectDescription: "Replace the fan." } });
  assert.match(hidden.agreement.hiddenConditionsTerms, /Concealed or reasonably undiscoverable conditions/);
  assert.equal(hidden.projectDescription, undefined);
  const excluded = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "Exclude painting from this Quote.", current: { agreement: {} } });
  assert.deepEqual(excluded.agreement.exclusions, ["Painting"]);
  const additional = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "Add that extra work requires approval.", current: {} });
  assert.match(additional.agreement.additionalWorkTerms, /additional authorization/);
  const diagnostic = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "This is diagnostic work; add diagnostic service terms.", current: {} });
  assert.match(diagnostic.agreement.diagnosticTerms, /remain due/);
  const limit = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "Additional work up to $150 may proceed without a separate Change Order.", current: {} });
  assert.equal(limit.agreement.preauthorizedAdditionalWorkLimit, "$150");
  assert.match(workspace, /Suggested business terms/);
  assert.match(workspace, /Use hidden-condition protection/);
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

test("Before and After photos require explicit conversation intent and independent customer visibility", () => {
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
  assert.match(workspace, /businessDocumentPhotoVisibilityNotice/);
  assert.match(workspace, /Role and customer visibility are separate/);
  assert.match(workspace, /customerVisibleBusinessDocumentPhotoGroups/);
  assert.match(workspace, /Project Photos \/ Evidence/);
  assert.match(workspace, /<h3>Before<\/h3>/);
  assert.match(workspace, /<h3>After<\/h3>/);
  assert.match(workspace, /normalizeBusinessDocumentPhotoAssignment/);
});

test("Saved Files uses governed server listing and reopening with no browser authority", () => {
  assert.match(workspace, /listBusinessDocumentDrafts/);
  assert.match(workspace, /getBusinessDocumentDraft/);
  assert.match(workspace, /Only governed server-saved working drafts appear here/);
  assert.match(workspace, /Search customer, job, number, or address/);
  assert.doesNotMatch(workspace, /localStorage|sessionStorage/);
});

test("Saved Files deletion requires confirmation and preserves the open workspace as an unsaved copy", () => {
  assert.match(workspace, /className="business-saved-delete"/);
  assert.match(workspace, /setDeleteTarget\(document\)/);
  assert.match(workspace, /Delete this draft\?/);
  assert.match(workspace, /label: "Cancel"/);
  assert.match(workspace, /Delete Draft", destructive: true/);
  assert.match(workspace, /await deleteBusinessDocumentDraft/);
  assert.match(workspace, /documents\.filter\(\(document\) => document\.id !== deleteTarget\.id\)/);
  assert.match(workspace, /await load\("Draft deleted\."\)/);
  assert.match(workspace, /currently open workspace will remain as an unsaved copy/i);
  assert.match(workspace, /setSavedDocuments\(\(current\) => \(\{ \.\.\.current, \[type\]: null \}\)\)/);
  assert.match(workspace, /setSavedFingerprints\(\(current\) => \(\{ \.\.\.current, \[type\]: "" \}\)\)/);
  assert.match(workspace, /clearDeletedBusinessDocumentRecoveryIdentity/);
  assert.match(styles, /\.business-saved-delete[^}]*min-height:\s*44px/);
  assert.match(styles, /\.business-document-destructive/);
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

test("working-draft customer language supports explicit forms without guessing ambiguous for-language", () => {
  for (const instruction of [
    "Customer Jack Smith.",
    "Customer is Jack Smith.",
    "Customer name Jack Smith.",
    "Set customer to Jack Smith.",
    "Change customer to Jack Smith.",
  ]) {
    assert.equal(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction, current: {} }).customerName, "Jack Smith");
  }

  const service = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "fan replacement for Jack Smith.",
    current: {},
  });
  assert.equal(service.customerName, "Jack Smith");
  assert.equal(service.projectTitle, "Fan replacement");
  assert.doesNotMatch(service.projectDescription, /Jack Smith/);

  const ambiguous = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Fan replacement for the kitchen.",
    current: {},
  });
  assert.equal(ambiguous.customerName, undefined);
});

test("bare money requires financial language and preserves intended grouping", () => {
  const fanDecimal = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "fan cost 89.99", current: {} });
  assert.deepEqual(fanDecimal.materialItems, [{ name: "Fan", total: "89.99" }]);
  assert.equal(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "fan cost 89", current: {} }).materialItems[0].total, "89");
  assert.equal(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "fan cost $89.99", current: {} }).materialItems[0].total, "89.99");

  for (const instruction of ["labor 180", "labor 180.00", "installation cost 180.00", "labor is 220", "labor 180 dollars"]) {
    const patch = buildBusinessDocumentConversationPatch({ documentType: "quote", instruction, current: {} });
    assert.equal(patch.laborItems[0].total, instruction.includes("220") ? "220" : "180");
  }

  assert.deepEqual(
    buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "materials cost 42.50", current: {} }).materialItems,
    [{ name: "Materials", total: "42.5" }]
  );
  for (const instruction of ["price 265", "project price 265", "total 265"]) {
    assert.equal(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction, current: {} }).totalOverride, "265");
  }
  assert.deepEqual(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "charge 75", current: {} }).materialItems, [{ name: "Charge", total: "75" }]);
  assert.deepEqual(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "charge 75 for service call", current: {} }).materialItems, [{ name: "Service call", total: "75" }]);
  assert.deepEqual(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "add 50 for microwave handle", current: {} }).materialItems, [{ name: "Microwave handle", total: "50" }]);
  assert.deepEqual(buildBusinessDocumentConversationPatch({ documentType: "quote", instruction: "fan is 65", current: {} }).materialItems, [{ name: "Fan", total: "65" }]);
});

test("dates addresses dimensions counts and durations do not become prices", () => {
  const patch = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Install 2 fans, 24 inches wide, at 117 SE 2nd Ave on August 20, 2026. Model 8842. Crew of 3. Should take 4 hours.",
    current: {},
  });
  assert.equal(patch.totalOverride, undefined);
  assert.equal(patch.materialItems, undefined);
  assert.equal(patch.laborItems, undefined);
  assert.equal(patch.estimatedDuration, "4 hours");
});

test("exact Jack Smith workflow produces two priced rows and no zero-dollar scope row", () => {
  const result = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline: {},
    instructions: [{ id: "first", text: "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00" }],
  });
  assert.equal(result.draft.customerName, "Jack Smith");
  assert.equal(result.draft.projectTitle, "Fan replacement");
  assert.deepEqual(result.draft.materialItems, [{ name: "Fan", total: "89.99" }]);
  assert.deepEqual(result.draft.laborItems, [{ description: "installation", total: "180" }]);
  assert.equal(Number(result.draft.materialItems[0].total) + Number(result.draft.laborItems[0].total), 269.99);
  assert.equal(result.draft.lineItemDescription, undefined);
  assert.match(workspace, /filter\(\(item\) => item\.description && item\.amount > 0\)/);
});

test("editing an earlier instruction reconstructs pricing and preserves deliberate manual overrides", () => {
  const baseline = {};
  const edited = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline,
    instructions: [{ id: "first", text: "fan replacement for Jack Smith. fan cost 89.99 installation cost 200.00" }],
    manualOverrides: { terms: "Due on acceptance" },
  });
  assert.deepEqual(edited.draft.materialItems, [{ name: "Fan", total: "89.99" }]);
  assert.deepEqual(edited.draft.laborItems, [{ description: "installation", total: "200" }]);
  assert.equal(edited.draft.terms, "Due on acceptance");
  assert.equal(Number(edited.draft.materialItems[0].total) + Number(edited.draft.laborItems[0].total), 289.99);
  assert.doesNotMatch(JSON.stringify(edited.draft), /180/);
  assert.match(persistence, /revisionHistory:/);
  assert.match(workspace, />Edited</);
  assert.match(workspace, />Revision history</);
});

test("private instruction editing remains private and outside customer-visible document truth", () => {
  const result = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    instructions: [{ id: "private-one", text: "Keep this private: bring a ladder" }],
  });
  assert.deepEqual(result.privateReminders, [{ id: "private-one", text: "Keep this private: bring a ladder" }]);
  assert.equal(result.draft.privateReminder, undefined);
  assert.equal(customerVisibleWorkspaceDraft(result.draft).privateReminder, undefined);

  const invoicePrivate = buildBusinessDocumentConversationPatch({
    documentType: "invoice",
    instruction: "Keep this private: customer requested a quiet arrival",
  });
  assert.deepEqual(invoicePrivate, { privateReminder: "Keep this private: customer requested a quiet arrival" });

  const invoicePhoto = buildBusinessDocumentConversationPatch({
    documentType: "invoice",
    instruction: "These photos are after photos.",
  });
  assert.equal(invoicePhoto.photoIntent, "after");
  assert.equal(invoicePhoto.projectTitle, undefined);
});

test("prefill manual amount shortcuts and governed photo input are functional shared-draft affordances", () => {
  assert.match(workspace, /function usePrefill/);
  assert.match(workspace, /Prefill refreshed from your saved conversation instructions/);
  assert.match(workspace, /messageRef\.current\?\.focus/);
  assert.match(workspace, /setManualState\(\{ focus: "amount" \}\)/);
  assert.match(workspace, /role="dialog" aria-modal="true"/);
  assert.match(workspace, /manualOverrides/);
  assert.match(quoteBuilder, /ref=\{quickQuotePhotoInputRef\}[\s\S]*onChange=\{handleQuickQuotePhotoInput\}[\s\S]*<UnifiedBusinessDocumentWorkspace/);
  assert.match(quoteBuilder, /onAddPhotos=\{\(documentType = "quote"\) => \{/);
  assert.match(quoteBuilder, /quickQuotePhotoTargetDocumentRef\.current = documentType/);
  assert.match(quoteBuilder, /void openQuickQuotePhotoPicker\(\)/);
  assert.match(workspace, /businessDocumentPhotoVisibilityNotice/);
  assert.match(workspace, /customerPhotoGroups\.before/);
  assert.match(workspace, /customerPhotoGroups\.after/);
});

test("shortcut focus is explicit without false selected state", () => {
  const shortcuts = workspace.slice(workspace.indexOf("business-document-conversation-shortcuts"), workspace.indexOf("business-private-reminders"));
  assert.match(shortcuts, /focusComposer\("Note: "\)/);
  assert.match(shortcuts, /focusComposer\("Keep this private: "\)/);
  assert.match(shortcuts, /setManualState\(\{ focus: "amount" \}\)/);
  assert.doesNotMatch(shortcuts, /aria-pressed|aria-selected|className=.*active/);
  assert.match(styles, /business-document-conversation-shortcuts button:focus-visible/);
});


test("unified workspace preserves the private Job Analysis session through save, reopen, and recovery", () => {
  assert.match(
    workspace,
    /const \[jobAnalysisSessionIds, setJobAnalysisSessionIds\]/
  );

  assert.match(
    workspace,
    /jobAnalysisSessionId: jobAnalysisSessionIds\[documentType\]/
  );

  assert.match(
    workspace,
    /jobAnalysisSessionId: jobAnalysisSessionIds\.quote/
  );

  assert.match(
    workspace,
    /jobAnalysisSessionId: jobAnalysisSessionIds\.invoice/
  );

  assert.match(
    workspace,
    /setJobAnalysisSessionIds\(\(current\) => \(\{[\s\S]*\[type\]: restored\.jobAnalysisSessionId \|\| null/
  );

  assert.match(
    workspace,
    /snapshot\.payloads\.quote\?\.workspace\?\.jobAnalysisSessionId/
  );

  assert.match(
    workspace,
    /snapshot\.payloads\.invoice\?\.workspace\?\.jobAnalysisSessionId/
  );

  // Canonical Job authority remains independent from the private AI session.
  assert.match(
    workspace,
    /jobId: documentJobIds\[documentType\]/
  );
});


test("Ask Meetro uses the durable governed Job Analysis conversation without direct working-document mutation", () => {
  assert.match(
    workspace,
    /classifyBusinessDocumentConversationIntent/
  );
  assert.match(
    workspace,
    /createQuickQuoteAnalysisSession/
  );
  assert.match(
    workspace,
    /loadQuickQuoteAnalysisSession/
  );
  assert.match(
    workspace,
    /appendQuickQuoteAnalysisEvidence/
  );
  assert.match(
    workspace,
    /analyzeQuickQuoteAnalysisSession/
  );
  assert.match(
    workspace,
    /continueQuickQuoteAnalysisSession/
  );
  assert.match(
    workspace,
    /applyQuickQuoteAnalysisExecutionToPresentationState/
  );
  assert.match(
    workspace,
    /hydrateQuickQuoteAnalysisPresentationState/
  );

  const askBlock = workspace.slice(
    workspace.indexOf("async function submitAskMeetro"),
    workspace.indexOf("async function submitInstruction")
  );

  assert.match(
    askBlock,
    /durableJobAnalysisMedia/
  );
  assert.match(
    askBlock,
    /photosChanged/
  );
  assert.match(
    askBlock,
    /presentation\.latestProposal\.proposalId/
  );
  assert.match(
    askBlock,
    /canonicalMutationPerformed|Nothing was applied to the working document/
  );

  assert.doesNotMatch(
    askBlock,
    /reconcileDocument\(/
  );
  assert.doesNotMatch(
    askBlock,
    /onApplyQuotePatch\(/
  );
  assert.doesNotMatch(
    askBlock,
    /setInvoice\(/
  );

  const submitBlock = workspace.slice(
    workspace.indexOf("async function submitInstruction"),
    workspace.indexOf("function focusComposer")
  );

  assert.match(
    submitBlock,
    /classifyBusinessDocumentConversationIntent\([\s\S]*instruction,[\s\S]*hasActiveAnalysisSession:[\s\S]*Boolean\(jobAnalysisSessionIds\[activeDocument\]\)[\s\S]*\)[\s\S]*ASK_MEETRO[\s\S]*submitAskMeetro\(instruction\)/
  );

  assert.match(
    workspace,
    /turn\?\.role === "PROFESSIONAL"[\s\S]*turn\?\.payload\?\.message/
  );
  assert.match(
    workspace,
    /turn\?\.role === "MEETRO"[\s\S]*turn\?\.payload\?\.assistantMessage/
  );
  assert.match(
    workspace,
    /currentConversationEntries/
  );
  assert.match(
    workspace,
    /restoreJobAnalysisPresentation/
  );
  assert.match(
    workspace,
    /Analyzing the job…/
  );
  assert.match(
    workspace,
    /Thinking…/
  );
});


test("Ask Meetro immediately shows the submitted professional message while governed analysis is pending", () => {
  assert.match(
    workspace,
    /const \[pendingJobAnalysisMessages, setPendingJobAnalysisMessages\]/
  );

  assert.match(
    workspace,
    /const pendingAnalysisMessage =[\s\S]*pendingJobAnalysisMessages\[activeDocument\]/
  );

  const askBlock = workspace.slice(
    workspace.indexOf("async function submitAskMeetro"),
    workspace.indexOf("async function submitInstruction")
  );

  assert.match(
    askBlock,
    /setPendingJobAnalysisMessages\(\(current\) => \(\{[\s\S]*\[documentType\]: instruction/
  );

  assert.match(
    workspace,
    /pendingAnalysisMessage \? <article className="you"><span>You<\/span><p>\{pendingAnalysisMessage\}<\/p><\/article>/
  );

  assert.match(
    workspace,
    /pendingAnalysisMessage[\s\S]*Analyzing the job…/
  );

  assert.match(
    askBlock,
    /catch \(error\)[\s\S]*setPendingJobAnalysisMessages\(\(current\) => \(\{[\s\S]*\[documentType\]: ""/
  );

  const restoreBlock = workspace.slice(
    workspace.indexOf("async function restoreJobAnalysisPresentation"),
    workspace.indexOf("function applyRestoredDocument")
  );

  assert.match(
    restoreBlock,
    /setPendingJobAnalysisMessages\(\(current\) => \(\{[\s\S]*\[documentType\]: ""/
  );

  // Pending receipt is presentation only.
  assert.doesNotMatch(askBlock, /reconcileDocument\(/);
  assert.doesNotMatch(askBlock, /onApplyQuotePatch\(/);
  assert.doesNotMatch(askBlock, /setInvoice\(/);
});
