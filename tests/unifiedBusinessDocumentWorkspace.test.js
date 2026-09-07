import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createServer } from "vite";

import {
  buildBusinessDocumentConversationPatch,
  classifyBusinessDocumentConversationIntent,
  createInvoiceContinuityDraft,
  customerVisibleWorkspaceDraft,
  reconcileBusinessDocumentInstructions,
  resolveBusinessDocumentConversationMessage,
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

test("Quote, Deposit Request, Invoice, and closed-by-default Saved Files share the workspace", () => {
  const tabs = workspace.slice(
    workspace.indexOf("function DocumentTabs"),
    workspace.indexOf("function DocumentActionMenu")
  );

  const quoteIndex = tabs.indexOf('onDocumentChange("quote")');
  const depositIndex = tabs.indexOf('<MeetroIcon name="payment"');
  const invoiceIndex = tabs.indexOf('onDocumentChange("invoice")');

  assert.ok(quoteIndex >= 0);
  assert.ok(depositIndex > quoteIndex);
  assert.ok(invoiceIndex > depositIndex);
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
  assert.match(workspace, /businessDocumentApplyChanges/);
  assert.match(workspace, /onClick=\{onCancel\}>Cancel/);
});

test("manual builder keeps core fields editable, server number read-only, and Business Terms collapsed", () => {
  assert.match(workspace, /className="business-document-number-field"/);
  assert.match(workspace, /documentNumber \|\| "Assigned on first save"/);
  assert.match(workspace, /readOnly aria-readonly="true"/);
  assert.match(workspace, /businessDocumentQuoteDetails/);
  assert.match(workspace, /businessDocumentInvoiceDetails/);
  assert.match(workspace, /<h3 id="business-document-manual-pricing-title">Pricing<\/h3>/);
  assert.match(workspace, /<legend>Payment<\/legend>/);
  assert.match(workspace, /<legend>Customer notes<\/legend>/);
  assert.match(workspace, /<details className="business-document-agreement-editor"><summary>Business terms<\/summary>/);
  assert.match(workspace, /businessDocumentApplyChanges/);
  assert.match(workspace, /onClick=\{onCancel\}>Cancel<\/button>/);
  assert.match(workspace, /\["total", "canonicalStatus", "quoteNumber", "invoiceNumber"\]\.includes\(key\)/);
  assert.match(styles, /\.business-document-number-field input\[readonly\]/);
  assert.match(styles, /\.business-document-manual-fields > div/);
});

test("How it works control preserves its accessible name and existing toggle behavior", async () => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const { BusinessDocumentHowItWorksControl } = await vite.ssrLoadModule(
      "/src/components/UnifiedBusinessDocumentWorkspace.jsx"
    );
    let toggles = 0;
    const control = BusinessDocumentHowItWorksControl({
      expanded: false,
      triggerRef: null,
      onToggle: () => { toggles += 1; },
    });

    assert.equal(control.type, "button");
    assert.equal(control.props.className, "business-document-how-it-works");
    assert.equal(control.props["aria-label"], "How it works");
    assert.equal(control.props.title, "How it works");
    assert.equal(control.props["aria-expanded"], false);
    assert.equal(
      control.props["aria-controls"],
      "business-document-workflow-guide"
    );
    control.props.onClick();
    assert.equal(toggles, 1);
    assert.match(
      workspace,
      /onToggle=\{\(\) => setHowItWorksOpen\(\(open\) => !open\)\}/
    );
  } finally {
    await vite.close();
  }
});

test("server-owned document number requests remain non-mutating and outside Job Analysis", () => {
  const instruction = "quote number BG-0001020";
  assert.equal(
    classifyBusinessDocumentConversationIntent(instruction, {
      hasActiveAnalysisSession: true,
    }),
    "DOCUMENT_NUMBER_REQUEST"
  );
  assert.deepEqual(buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction,
    current: { projectDescription: "Existing scope", totalOverride: "2650" },
  }), {});
  for (const [documentType, request] of [
    ["quote", "quote number BG-0001020"],
    ["quote", "change the quote number"],
    ["invoice", "set the invoice number INV-0001234"],
  ]) {
    const resolution = resolveBusinessDocumentConversationMessage({
      documentType,
      instruction: request,
      current: documentType === "quote"
        ? { quoteNumber: "BG-0001000" }
        : { invoiceNumber: "INV-0001000" },
      hasActiveAnalysisSession: true,
    });
    assert.equal(resolution.capability, "DOCUMENT_NUMBER_REQUEST", request);
    assert.deepEqual(resolution.patch, {}, request);
  }
  assert.match(persistence, /Document numbers are assigned by Meetro/);
});

test("composer intercepts server-owned number requests before chat or durable document work", () => {
  const submitBlock = workspace.slice(
    workspace.indexOf("async function submitInstruction"),
    workspace.indexOf("function focusComposer")
  );
  const numberGuardStart = submitBlock.indexOf(
    'resolution.capability === "DOCUMENT_NUMBER_REQUEST"'
  );
  const askGuardStart = submitBlock.indexOf(
    'resolution.capability === "ASK_MEETRO"'
  );
  const existingTurnStart = submitBlock.indexOf("if (existingId)");
  const turnRegistrationStart = submitBlock.indexOf("let turnId = existingId");

  assert.ok(numberGuardStart >= 0);
  assert.ok(askGuardStart > numberGuardStart);
  assert.ok(existingTurnStart > numberGuardStart);
  assert.ok(turnRegistrationStart > numberGuardStart);

  const numberGuard = submitBlock.slice(numberGuardStart, turnRegistrationStart);
  assert.match(
    numberGuard,
    /activeDocument === "quote"[\s\S]*Quote numbers are assigned by Meetro when the document is first saved and cannot be changed manually\.[\s\S]*Invoice numbers are assigned by Meetro when the document is first saved and cannot be changed manually\./
  );
  assert.match(numberGuard, /setMessage\(""\)/);
  assert.match(numberGuard, /return true/);
  assert.doesNotMatch(numberGuard, /submitAskMeetro/);
  assert.doesNotMatch(numberGuard, /buildBusinessDocumentConversationTurn/);
  assert.doesNotMatch(numberGuard, /setTurns/);
  assert.doesNotMatch(numberGuard, /reconcileDocument/);
  assert.doesNotMatch(numberGuard, /assignPhotoIntent/);
  assert.doesNotMatch(numberGuard, /onApplyQuotePatch|setInvoice|setSavedDocuments/);
  assert.doesNotMatch(numberGuard, /JobAnalysis|AnalysisSession/);

  // The unconditional early return also protects edits of existing turns.
  assert.ok(numberGuardStart < existingTurnStart);

  // Existing non-number messages share stable turn registration before their
  // intent-specific routing, including the first professional message.
  assert.match(
    submitBlock,
    /setTurns\(nextTurns\)[\s\S]*resolution\.capability === "ASK_MEETRO"[\s\S]*return submitAskMeetro\(instruction\)/
  );
  assert.doesNotMatch(
    submitBlock,
    /!existingId[\s\S]*resolution\.capability === "ASK_MEETRO"/
  );
  assert.equal(
    (submitBlock.match(/nextTurns = \[\.\.\.turns, conversationTurn\.turn\]/g) || []).length,
    1
  );
});

test("compact workspace controls stay outside conversation history and open a non-mutating workflow guide", () => {
  const toolbarStart = workspace.indexOf('className="business-document-control-toolbar"');
  const turnsStart = workspace.indexOf('ref={turnsRef} className="business-document-turns"');
  const turnsEnd = workspace.indexOf("{newContentAvailable ?", turnsStart);
  const turnsBlock = workspace.slice(turnsStart, turnsEnd);

  assert.ok(toolbarStart > 0);
  assert.ok(toolbarStart < turnsStart);
  assert.match(workspace, /const \[howItWorksOpen, setHowItWorksOpen\] = useState\(false\)/);
  assert.match(workspace, /aria-label="Let Meetro prefill the form"/);
  assert.match(workspace, /aria-label="Fill the form manually"/);
  assert.match(workspace, /expanded=\{howItWorksOpen\}/);
  assert.match(workspace, /aria-expanded=\{expanded\}/);
  assert.match(workspace, /setHowItWorksOpen\(\(open\) => !open\)/);
  assert.match(workspace, /howItWorksOpen \? <BusinessDocumentWorkflowGuide onClose=\{closeHowItWorks\}/);
  assert.match(workspace, /function closeHowItWorks\(\)[\s\S]*setHowItWorksOpen\(false\)[\s\S]*howItWorksTriggerRef\.current\?\.focus/);
  assert.doesNotMatch(turnsBlock, /Let Meetro prefill|Fill form manually|How it works/);

  const guideBlock = workspace.slice(
    workspace.indexOf("function BusinessDocumentWorkflowGuide"),
    workspace.indexOf("function DeliveryReviewDialog")
  );
  assert.match(guideBlock, /role="dialog"/);
  assert.match(guideBlock, /aria-label="Close workflow guide"/);
  assert.match(guideBlock, /event\.key === "Escape"/);
  assert.doesNotMatch(
    guideBlock,
    /reconcileDocument\(|onApplyQuotePatch\(|setInvoice\(|beginDelivery\(|sendCurrentDelivery\(|lifecycle[A-Za-z]*\(/
  );
});

test("How It Works consolidates Quote, Invoice, continuity, and private-control guidance", () => {
  for (const heading of [
    "How Quote &amp; Invoice workflow works",
    "QUOTE WORKFLOW",
    "INVOICE WORKFLOW",
    "SAVED FILES / CONTINUITY",
    "PRIVACY &amp; CONTROL",
  ]) {
    assert.match(workspace, new RegExp(heading.replace(/[&/]/g, "\\$&")));
  }

  for (const step of [
    "Start",
    "Ask Meetro",
    "Build or Update Quote",
    "Review Job Evidence",
    "Review the Quote",
    "Save and Send Quote",
    "Create Invoice",
    "Review Invoice",
    "Send Invoice",
    "Saved Files",
    "Private by default",
  ]) {
    assert.match(workspace, new RegExp(`title="${step}"`));
  }

  assert.match(workspace, /Nothing is added to the customer document merely because it was discussed/);
  assert.match(workspace, /Only explicit document actions should change the working Quote/);
  assert.match(workspace, /Photo role and photo visibility remain separate/);
  assert.match(workspace, /Customer acceptance remains separate/);
  assert.match(workspace, /Creating an Invoice does not mean it has been sent or paid/);
  assert.match(workspace, /Sending an Invoice does not mean payment was received/);
  assert.match(workspace, /Only the explicit Send Quote to Customer action makes the saved Quote available for customer review/);
  assert.match(workspace, /Nothing automatically accepts a Quote, records payment, schedules work, creates an Invoice, or closes a Job/);
  assert.match(workspace, /Questions and photo analysis stay private/);
  assert.match(workspace, /Direct Quote facts or explicit document instructions can update the working draft/);
  assert.match(workspace, /Let Meetro prefill uses eligible professional-provided document facts/);
  assert.match(workspace, /Fill form manually always remains available/);
  assert.match(workspace, /Save Draft, Preview PDF, and Download PDF keep the Quote in your private workspace/);
});

test("normal conversation surface removes permanent explanatory clutter", () => {
  const conversation = workspace.slice(
    workspace.indexOf("<section className={`business-document-conversation"),
    workspace.indexOf("{documentPhotos.length ? <JobEvidencePanel")
  );

  assert.doesNotMatch(conversation, /business-document-conversation-heading/);
  assert.doesNotMatch(conversation, /photoNotice \?/);
  assert.doesNotMatch(conversation, /business-document-draft-truth/);
  assert.doesNotMatch(conversation, /Chat, speak, or upload photos\. The working/);
  assert.doesNotMatch(conversation, /Questions stay in private Job Analysis/);
  assert.doesNotMatch(conversation, /Nothing here issues, sends, approves, pays, or completes/);
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

test("photo review language routes to Ask Meetro while explicit document edits retain authority", () => {
  for (const instruction of [
    "Help me diagnose the photos",
    "I will send you some photos to review",
    "Review these photos for damage",
    "Check these pictures",
    "Look at these images",
    "Tell me what you see",
    "Tell me what you see in these photos",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(instruction),
      "ASK_MEETRO",
      instruction
    );
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

  for (const instruction of [
    "Add these photos to the Quote",
    "Make these photos customer visible",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(instruction),
      "DOCUMENT_EDIT",
      instruction
    );
  }
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


test("ordinary job context stays conversational while explicit document commands retain draft authority", () => {
  for (const instruction of [
    "Knee wall has a crack line and needs further evaluation",
    "The fan is running with no problem",
    "I see cracks on the concrete wall",
    "The fan sparked yesterday.",
    "That section feels loose.",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(
        instruction,
        { hasActiveAnalysisSession: true }
      ),
      "ASK_MEETRO",
      instruction
    );
  }

  for (const instruction of [
    "Add the cracks to the scope",
    "Change labor to $225",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(
        instruction,
        { hasActiveAnalysisSession: true }
      ),
      "DOCUMENT_EDIT",
      instruction
    );
  }

  // A missing analysis session no longer turns arbitrary statements into scope.
  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "I see cracks on the concrete wall."
    ),
    "ASK_MEETRO"
  );

  assert.match(
    workspace,
    /resolveBusinessDocumentConversationMessage\([\s\S]*hasActiveAnalysisSession:[\s\S]*Boolean\(jobAnalysisSessionIds\[activeDocument\]\)/
  );
});

test("per-message resolution validates structured mutation before choosing a capability", () => {
  const quote = { customerName: "Jack Smith", totalOverride: "2650" };
  assert.equal(resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "Change the amount.",
    current: quote,
    hasActiveAnalysisSession: true,
  }).capability, "CLARIFICATION_REQUIRED");
  assert.deepEqual(resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "Change the amount.",
    current: quote,
    hasActiveAnalysisSession: true,
  }).patch, {});

  const naturalQuote = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00",
    current: {},
    hasActiveAnalysisSession: true,
  });
  assert.equal(naturalQuote.capability, "DOCUMENT_MUTATION");
  assert.equal(naturalQuote.patch.customerName, "Jack Smith");
  assert.equal(naturalQuote.patch.materialItems[0].total, "89.99");
  assert.equal(naturalQuote.patch.laborItems[0].total, "180");
});

test("active Job Analysis yields to strong structured professional document input before the conversational fallback", () => {
  for (const instruction of [
    "Customer: Paul Becker",
    "Customer is Maria Lopez",
    "Price: $2,650",
    "Estimated duration: 3–4 working days",
    "Payment terms: 50% deposit",
    "Scope: Front knee wall reconstruction",
    "Project: Front knee wall reconstruction",
    "Customer note: Existing finish is two-tone.",
    "Quote note: Protect the existing landscaping.",
    "Customer: Paul Becker\nPrice: $2,650\nEstimated duration: 3–4 working days",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(
        instruction,
        { hasActiveAnalysisSession: true }
      ),
      "DOCUMENT_INPUT",
      instruction
    );
  }

  for (const instruction of [
    "I see cracking near the base",
    "The material could cost around $400",
    "Do you think this is a $2,000 repair?",
    "Does this look structural?",
    "The crack is about 4 feet.",
    "It may take several days.",
    "The fan cost 89.99 when I bought it.",
    "Materials total: $700",
    "Labor total: $1,950",
    "Tax total: $150",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(
        instruction,
        { hasActiveAnalysisSession: true }
      ),
      "ASK_MEETRO",
      instruction
    );
  }

  for (const instruction of [
    "Add the cracks to the scope",
    "Change price to $2,750",
    "Set payment terms to 50% deposit",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(
        instruction,
        { hasActiveAnalysisSession: true }
      ),
      "DOCUMENT_EDIT",
      instruction
    );
  }
});

test("same-line colon-labeled Quote facts escape active analysis without broadening ordinary observations", () => {
  const instruction = "Customer: Jack Smith Scope: Front knee wall reconstruction Price: $2,650 Estimated duration: 3–4 working days";
  assert.equal(
    classifyBusinessDocumentConversationIntent(instruction, {
      hasActiveAnalysisSession: true,
    }),
    "DOCUMENT_INPUT"
  );

  const patch = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction,
    current: {},
  });
  assert.equal(patch.customerName, "Jack Smith");
  assert.equal(patch.projectDescription, "Front knee wall reconstruction");
  assert.equal(patch.recommendedSolution, "Front knee wall reconstruction");
  assert.equal(patch.totalOverride, "2650");
  assert.equal(patch.estimatedDuration, "3–4 working days");
  assert.equal(Object.hasOwn(patch, "problemFound"), false);

  for (const observation of [
    "The material could cost around $400.",
    "The crack is about 4 feet.",
    "Do you think this is a $2,000 repair?",
    "I see cracking near the base.",
  ]) {
    assert.equal(
      classifyBusinessDocumentConversationIntent(observation, {
        hasActiveAnalysisSession: true,
      }),
      "ASK_MEETRO",
      observation
    );
  }
});

test("natural multi-field Quote facts stay in Build Quote while actual analysis requests stay governed", () => {
  const instruction = "Carlos Rivera QA, 239-555-0174, carlos.rivera.qa@example.test, Cape Coral QA. Repair the damaged section. Price $100. Should take about one day.";

  assert.equal(
    classifyBusinessDocumentConversationIntent(instruction),
    "DOCUMENT_INPUT"
  );
  const resolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction,
    current: {},
    hasActiveAnalysisSession: false,
  });
  assert.equal(resolution.capability, "DOCUMENT_MUTATION");
  assert.equal(resolution.analysisSessionActive, false);
  assert.deepEqual(resolution.patch, {
    projectDescription: "Repair the damaged section.",
    recommendedSolution: "Repair the damaged section.",
    projectTitle: "Repair the damaged section",
    customerName: "Carlos Rivera QA",
    customerEmail: "carlos.rivera.qa@example.test",
    customerPhone: "239-555-0174",
    customerAddress: "Cape Coral QA",
    customerLocation: "Cape Coral QA",
    timeline: "1 day",
    estimatedDuration: "1 day",
    totalOverride: "100",
  });

  for (const request of [
    "What do you think is wrong here?",
    "Analyze these photos.",
    "What materials would I need?",
    "How should this be repaired?",
    "What still needs verification?",
  ]) {
    const analysis = resolveBusinessDocumentConversationMessage({
      documentType: "quote",
      instruction: request,
      current: resolution.patch,
      hasActiveAnalysisSession: false,
    });
    assert.equal(analysis.capability, "ASK_MEETRO", request);
    assert.deepEqual(analysis.patch, {}, request);
  }
});

test("ambiguous statements require clarification instead of silently starting Job Analysis", () => {
  const resolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "The wall may need work.",
    current: { projectDescription: "Existing scope." },
    hasActiveAnalysisSession: false,
  });
  assert.equal(resolution.capability, "CLARIFICATION_REQUIRED");
  assert.equal(resolution.intent, "CLARIFICATION_REQUIRED");
  assert.deepEqual(resolution.patch, {});

  const activeContinuation = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "The wall may need work.",
    current: { projectDescription: "Existing scope." },
    hasActiveAnalysisSession: true,
  });
  assert.equal(activeContinuation.capability, "ASK_MEETRO");

  const submitBlock = workspace.slice(
    workspace.indexOf("async function submitInstruction"),
    workspace.indexOf("function focusComposer")
  );
  const clarificationStart = submitBlock.indexOf(
    'resolution.capability === "CLARIFICATION_REQUIRED"'
  );
  const askStart = submitBlock.indexOf(
    'resolution.capability === "ASK_MEETRO"'
  );
  assert.ok(clarificationStart >= 0);
  assert.ok(clarificationStart < askStart);
  assert.ok(submitBlock.indexOf("setTurns(nextTurns)") < clarificationStart);
  const clarificationGuard = submitBlock.slice(clarificationStart, askStart);
  assert.match(clarificationGuard, /businessDocumentClarificationNeeded/);
  assert.doesNotMatch(clarificationGuard, /submitAskMeetro/);
  assert.match(
    workspace,
    /instructions: nextTurns\.filter\([\s\S]*turn\.recognized !== false/
  );
});

test("knee-wall document facts update only supported working-draft fields and can alternate with private analysis", () => {
  const instruction = [
    "Customer: Paul Becker",
    "Scope: Front knee wall reconstruction.",
    "Price: $2,650.00",
    "Estimated duration: 3–4 working days, with an additional return visit as needed for proper curing, finishing, and paint touch-up.",
  ].join("\n");

  const patch = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction,
    current: {},
  });

  assert.equal(patch.customerName, "Paul Becker");
  assert.equal(patch.projectDescription, "Front knee wall reconstruction");
  assert.equal(patch.recommendedSolution, "Front knee wall reconstruction");
  assert.equal(Object.hasOwn(patch, "problemFound"), false);
  assert.equal(patch.totalOverride, "2650");
  assert.equal(
    patch.estimatedDuration,
    "3–4 working days, with an additional return visit as needed for proper curing, finishing, and paint touch-up"
  );

  for (const forbidden of [
    "canonicalStatus",
    "issuedAt",
    "approvedAt",
    "acceptedAt",
    "paidAt",
    "completedAt",
    "lifecycleStatus",
  ]) {
    assert.equal(Object.hasOwn(patch, forbidden), false, forbidden);
  }

  assert.equal(patch.photoIntent, undefined);
  assert.doesNotMatch(JSON.stringify(patch), /additional damage|private analysis/i);
  assert.equal(
    classifyBusinessDocumentConversationIntent(
      "Do you see any additional damage?",
      { hasActiveAnalysisSession: true }
    ),
    "ASK_MEETRO"
  );

  const revised = buildBusinessDocumentConversationPatch({
    documentType: "quote",
    instruction: "Add stucco repair to the scope.",
    current: patch,
  });
  assert.match(revised.projectDescription, /Front knee wall reconstruction/);
  assert.match(revised.projectDescription, /Stucco repair/);
  assert.equal(revised.totalOverride, undefined);
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

test("adaptive Job Evidence uses a wide sidecar and inline scrolling phone evidence", () => {
  assert.match(
    workspace,
    /function PhotoConversationEvidence/
  );

  assert.match(
    workspace,
    /function JobEvidencePanel/
  );

  assert.match(
    workspace,
    /className="business-document-inline-evidence"/
  );

  assert.match(
    workspace,
    /className="business-document-evidence-panel"/
  );

  assert.match(
    workspace,
    /business-document-main \$\{documentPhotos\.length \? "has-evidence" : ""\}/
  );

  assert.doesNotMatch(
    workspace,
    /PhotoAttachmentTray/
  );

  const turnsBlock = workspace.slice(
    workspace.indexOf('ref={turnsRef} className="business-document-turns"'),
    workspace.indexOf("{newContentAvailable ?")
  );

  assert.match(
    turnsBlock,
    /PhotoConversationEvidence[\s\S]*currentConversationEntries\.map/
  );

  assert.match(
    workspace,
    /JobEvidencePanel photos=\{documentPhotos\}/
  );

  assert.match(
    styles,
    /\.business-document-inline-evidence-photos\s*\{[\s\S]*overflow-x:\s*auto/
  );

  assert.match(
    styles,
    /\.business-document-evidence-panel\s*\{[\s\S]*display:\s*none/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-main\.has-evidence[\s\S]*grid-template-columns:[\s\S]*minmax\(300px,[\s\S]*minmax\(210px,[\s\S]*minmax\(430px,[\s\S]*\.business-document-evidence-panel\s*\{[\s\S]*display:\s*block[\s\S]*\.business-document-inline-evidence\s*\{[\s\S]*display:\s*none/
  );

  assert.match(
    styles,
    /@media \(orientation:\s*portrait\)[\s\S]*#root\[data-app-layout="tablet"\][\s\S]*\.business-document-evidence-panel[\s\S]*display:\s*none[\s\S]*\.business-document-inline-evidence[\s\S]*display:\s*grid/
  );

  assert.match(
    styles,
    /#root\[data-app-layout="mobile"\][\s\S]*\.business-document-evidence-panel[\s\S]*display:\s*none[\s\S]*\.business-document-inline-evidence[\s\S]*display:\s*grid/
  );

  assert.match(
    workspace,
    /Photos stay private unless you explicitly include them on the[\s\S]*customer document/
  );

  assert.match(
    workspace,
    /Review document photos/
  );
});

test("wide Quote workspace contains scrolling inside three panes while phone and iPad portrait remain document-flow layouts", () => {
  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-workspace\s*\{[\s\S]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-main\s*\{[\s\S]*height:\s*100%[\s\S]*overflow:\s*hidden/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-conversation,[\s\S]*\.business-document-conversation\.mobile-active\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto[\s\S]*min-height:\s*0[\s\S]*overflow:\s*hidden/
  );

  assert.match(
    styles,
    /\.business-document-workflow-guide\s*\{[\s\S]*position:\s*absolute[\s\S]*max-height:[\s\S]*overflow-y:\s*auto/
  );

  assert.match(
    styles,
    /\.business-document-chat-shell\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto auto[\s\S]*overflow:\s*hidden/
  );

  assert.match(
    styles,
    /\.business-document-turns\s*\{[\s\S]*grid-row:\s*1[\s\S]*height:\s*auto[\s\S]*overflow-y:\s*auto[\s\S]*scroll-padding-bottom:\s*24px/
  );

  assert.match(
    styles,
    /\.business-document-composer\s*\{[\s\S]*grid-row:\s*3[\s\S]*position:\s*relative[\s\S]*z-index:\s*1/
  );

  assert.match(
    styles,
    /\.business-document-new-message\s*\{[\s\S]*grid-row:\s*2[\s\S]*align-self:\s*center[\s\S]*width:\s*max-content[\s\S]*max-width:\s*calc\(100% - 16px\)/
  );

  assert.match(
    styles,
    /\.business-document-turns\s*\{[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/
  );

  assert.match(
    styles,
    /\.business-document-composer\s*\{[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-chat-shell\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto auto[\s\S]*height:\s*100%[\s\S]*min-height:\s*0/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-turns\s*\{[\s\S]*grid-row:\s*1[\s\S]*height:\s*auto[\s\S]*overflow-y:\s*auto/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-composer\s*\{[\s\S]*grid-row:\s*3[\s\S]*z-index:\s*1/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-evidence-inner\s*\{[\s\S]*height:\s*100%[\s\S]*overflow-y:\s*auto/
  );

  assert.match(
    styles,
    /@media \(min-width:\s*901px\)[\s\S]*\.business-document-preview,[\s\S]*\.business-document-preview\.mobile-active\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-y:\s*auto/
  );

  assert.match(
    styles,
    /@media \(max-width:\s*767px\)[\s\S]*#root\[data-app-layout="mobile"\] \.business-document-chat-shell\s*\{[\s\S]*height:\s*auto[\s\S]*min-height:\s*0/
  );

  assert.match(
    styles,
    /@media \(max-width:\s*767px\)[\s\S]*#root\[data-app-layout="mobile"\] \.business-document-workflow-backdrop\s*\{[\s\S]*position:\s*fixed[\s\S]*#root\[data-app-layout="mobile"\] \.business-document-workflow-guide\s*\{[\s\S]*position:\s*fixed[\s\S]*max-height:\s*min\(82dvh,\s*720px\)/
  );

  assert.match(
    styles,
    /@media \(orientation:\s*portrait\)[\s\S]*#root\[data-app-layout="tablet"\] \.business-document-workspace\s*\{[\s\S]*height:\s*auto[\s\S]*overflow-y:\s*visible/
  );

  assert.match(
    styles,
    /@media \(orientation:\s*portrait\)[\s\S]*#root\[data-app-layout="tablet"\] \.business-document-chat-shell\s*\{[\s\S]*display:\s*grid[\s\S]*height:\s*58dvh[\s\S]*#root\[data-app-layout="tablet"\] \.business-document-evidence-panel\s*\{[\s\S]*display:\s*none[\s\S]*#root\[data-app-layout="tablet"\] \.business-document-inline-evidence\s*\{[\s\S]*display:\s*grid/
  );

  assert.match(
    styles,
    /@media \(max-width:\s*900px\) and \(orientation:\s*portrait\)[\s\S]*#root\[data-app-layout="tablet"\] \.business-document-workflow-guide\s*\{[\s\S]*position:\s*fixed[\s\S]*max-height:\s*min\(82dvh,\s*720px\)/
  );
});

test("Speak, Type, Add Photos, and the live document remain reachable without suggestion cards", () => {
  assert.match(workspace, /<WorkflowMicrophoneInput/);
  assert.match(workspace, /<textarea[^>]*id="business-document-message"/);
  assert.match(workspace, /"Add Photos"/);
  assert.match(workspace, /Live \{activeDocument === "quote" \? "Quote" : "Invoice"\} Preview/);
  assert.doesNotMatch(workspace, /Use Suggestion|Edit & Use|Needs Verification|Dismiss Suggestion/);
});

test("Quote and Invoice form controls avoid iOS focus zoom and stay width-contained", () => {
  assert.match(styles, /\.business-document-workspace input,[\s\S]*\.business-document-workspace select\s*\{\s*font-size:\s*16px;/);
  assert.match(styles, /\.business-document-manual\s*\{[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0/);
  assert.match(styles, /\.business-document-confirm\s*\{[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0/);
  assert.match(styles, /@media \(max-width:\s*767px\)[\s\S]*\.business-document-manual\s*\{[\s\S]*env\(safe-area-inset-right\)[\s\S]*env\(safe-area-inset-left\)[\s\S]*width:\s*auto/);
});

test("Live Preview keeps customer Observation separate and shows truthful Invoice review money", () => {
  assert.match(workspace, /<h3>Observation<\/h3>/);
  assert.match(workspace, /quote\.recommendedSolution && quote\.projectDescription/);
  assert.match(workspace, /Confirm terms before delivery\./);
  assert.match(workspace, /No approved payment terms were provided\./);
  assert.match(workspace, /SAVED DRAFT/);
  assert.match(workspace, /DRAFT PREVIEW/);
  for (const label of ["Approved work", "Extra work", "Invoice total", "Payments received", "BALANCE DUE"]) assert.match(workspace, new RegExp(label));
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
  assert.match(workspace, /customerVisibleWorkspaceDraft\(invoicePreparation \?/);
});

test("Internal Estimate and Solution Ready are not mandatory visible workspace steps", () => {
  assert.doesNotMatch(workspace, /Analyze Job|Continue with My Details|Confirm Amounts|Internal Estimate|Solution Ready/);
  assert.match(workspace, /private working space for the job/);
  assert.match(workspace, /Editing, saving, previewing, and downloading do not send anything/);
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

test("numbering setup is a one-time WorkspaceDialog with explicit Quote and Invoice choices", () => {
  assert.match(workspace, /const \[numberingSetup, setNumberingSetup\] = useState\(null\)/);
  assert.match(workspace, /function NumberingSetupDialog/);
  assert.match(workspace, /title=\{`Set up \$\{label\} numbering`\}/);
  assert.match(workspace, /This is a one-time setup for this business/);
  assert.match(workspace, /Your current draft has not been sent or issued/);
  assert.match(workspace, /Start new numbering/);
  assert.match(workspace, /Continue existing numbering/);
  assert.match(workspace, /checked=\{state\.mode === "START_NEW"\}/);
  assert.match(workspace, /checked=\{continueExisting\}/);
  assert.match(workspace, /state\.checking \? <p role="status">Checking the business numbering status/);
  assert.match(workspace, /Last \{label\} number/);
  assert.match(workspace, /placeholder="BG-0001019"/);
  assert.match(workspace, /role="alert"/);
  assert.match(workspace, /numberingSetup \? <NumberingSetupDialog/);
  assert.match(styles, /\.business-document-numbering-setup/);
  assert.doesNotMatch(workspace, /numbering settings|Manage numbering|Change numbering/);
});

test("setup-required save preserves the save intent and bypasses the generic failure dialog", () => {
  const saveBlock = workspace.slice(
    workspace.indexOf("async function saveDocument"),
    workspace.indexOf("async function restoreJobAnalysisPresentation")
  );
  const successBlock = saveBlock.slice(saveBlock.indexOf("try {"), saveBlock.indexOf("} catch (error)"));
  const setupBranch = saveBlock.slice(
    saveBlock.indexOf('if (error?.code === "BUSINESS_DOCUMENT_NUMBERING_SETUP_REQUIRED")'),
    saveBlock.indexOf("if (!suppressFailureDialog) setSaveFailureOpen(true)")
  );
  assert.match(saveBlock, /saveJobId = prepared\.payload\.jobId \|\| null/);
  assert.match(saveBlock, /idempotencyKey: saveAttemptKeysRef\.current\[documentType\]/);
  assert.match(setupBranch, /openNumberingSetup\(\{ documentType, jobId: saveJobId, suppressFailureDialog \}\)/);
  assert.doesNotMatch(setupBranch, /saveAttemptKeysRef\.current\[documentType\] = ""/);
  assert.doesNotMatch(setupBranch, /setSaveFailureOpen\(true\)/);
  assert.doesNotMatch(successBlock, /setNumberingSetup|openNumberingSetup/);
  assert.match(successBlock, /saveAttemptKeysRef\.current\[documentType\] = ""/);
  assert.match(successBlock, /setSavedDocuments/);
});

test("numbering setup checks the server, preserves Job context, and retries the original save once", () => {
  const setupBlock = workspace.slice(
    workspace.indexOf("async function openNumberingSetup"),
    workspace.indexOf("async function restoreJobAnalysisPresentation")
  );
  assert.match(setupBlock, /getBusinessDocumentNumbering/);
  assert.match(setupBlock, /documentType: documentType\.toUpperCase\(\)/);
  assert.match(setupBlock, /jobId: setup\.jobId/);
  assert.match(setupBlock, /if \(numbering\.initialized\)/);
  assert.match(setupBlock, /setNumberingSetup\(\{ \.\.\.setup, busy: false, checking: false \}\)/);
  assert.match(setupBlock, /return saveDocument\(documentType, \{[\s\S]*numberingRetry: true/);
  assert.match(setupBlock, /initializeBusinessDocumentNumbering/);
  assert.match(setupBlock, /mode: setup\.mode/);
  assert.match(setupBlock, /previousDocumentNumber = setup\.previousDocumentNumber\.trim\(\)/);
  assert.match(setupBlock, /\{ previousDocumentNumber \}/);
  assert.match(setupBlock, /const saved = await saveDocument\(setup\.documentType/);
  assert.match(setupBlock, /setNumberingSetup\(null\)/);
  assert.match(setupBlock, /setNumberingSetup\(\(current\) => current\?\.busy \? current : null\)/);
  assert.doesNotMatch(setupBlock, /deliverBusinessDocumentDraft|sendCurrentDelivery|beginDelivery|issue|approve|payment|lifecycle|localStorage|sessionStorage/);
});

test("continuation validation stays in the dialog and the retry guard is bounded", () => {
  const dialogBlock = workspace.slice(
    workspace.indexOf("function NumberingSetupDialog"),
    workspace.indexOf("function DeliveryHistory")
  );
  const saveBlock = workspace.slice(
    workspace.indexOf("async function saveDocument"),
    workspace.indexOf("async function restoreJobAnalysisPresentation")
  );
  assert.match(dialogBlock, /value=\{state\.previousDocumentNumber\}/);
  assert.match(dialogBlock, /continueExisting && !state\.previousDocumentNumber\.trim\(\)/);
  assert.match(dialogBlock, /state\.error \? <p className="business-document-numbering-error" role="alert"/);
  assert.match(saveBlock, /if \(numberingRetry\)/);
  assert.match(saveBlock, /retryBlocked: true/);
  assert.match(dialogBlock, /state\.mode && !state\.retryBlocked/);
  assert.match(workspace, /saved === NUMBERING_SETUP_PENDING/);
  assert.match(workspace, /document === NUMBERING_SETUP_PENDING/);
  assert.match(workspace, /Nothing was sent/);
});

test("numbering setup leaves manual entry recovery and unrelated save failures intact", () => {
  assert.match(workspace, /if \(!suppressFailureDialog\) setSaveFailureOpen\(true\)/);
  assert.match(workspace, /title="We couldn't save your draft right now"/);
  assert.match(workspace, /<ManualEditor/);
  assert.match(workspace, /Continue Where I Left Off/);
  assert.match(workspace, /businessDocumentSavedResumeTarget/);
  const cancelBlock = workspace.slice(
    workspace.indexOf("function cancelNumberingSetup"),
    workspace.indexOf("async function submitNumberingSetup")
  );
  assert.doesNotMatch(cancelBlock, /setTurns|setInvoice|onApplyQuotePatch|setSavedDocuments|deliverBusinessDocumentDraft/);
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
  assert.match(workspace, /<summary>Business terms<\/summary>/);
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

test("Review document photos opens at the top and resets there on every reopen", () => {
  const dialogBlock = workspace.slice(
    workspace.indexOf("function WorkspaceDialog"),
    workspace.indexOf("function WorkflowGuideStep")
  );
  const photoDialogBlock = workspace.slice(
    workspace.indexOf("function PhotoReviewDialog"),
    workspace.indexOf("export default function UnifiedBusinessDocumentWorkspace")
  );

  assert.match(dialogBlock, /openAtTop = false/);
  assert.match(dialogBlock, /requestAnimationFrame/);
  assert.match(dialogBlock, /dialogRef\.current\.scrollTop = 0/g);
  assert.match(dialogBlock, /headingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(dialogBlock, /tabIndex=\{openAtTop \? -1 : undefined\}/);
  assert.match(photoDialogBlock, /title="Review document photos"[\s\S]*openAtTop/);
  assert.match(
    workspace,
    /photoReviewOpen && documentPhotos\.length \? <PhotoReviewDialog/
  );
  assert.match(
    workspace,
    /onCancel=\{\(\) => setPhotoReviewOpen\(false\)\}/
  );
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
  assert.match(workspace, /mode: "prefill"/);
  assert.match(workspace, /if \(message\.trim\(\)\) return submitInstruction\(message\)/);
  assert.match(workspace, /businessDocumentPrefillRefreshed/);
  assert.match(workspace, /businessDocumentPrefillReviewHelp/);
  assert.match(workspace, /business-document-prefill-details/);
  assert.match(workspace, /openManualEditor\("amount"\)/);
  assert.match(workspace, /role="dialog" aria-modal="true"/);
  assert.match(workspace, /manualOverrides/);
  assert.match(quoteBuilder, /ref=\{quickQuotePhotoInputRef\}[\s\S]*onChange=\{handleQuickQuotePhotoInput\}[\s\S]*<UnifiedBusinessDocumentWorkspace/);
  assert.match(quoteBuilder, /onAddPhotos=\{\(documentType = "quote"\) => \{/);
  assert.match(quoteBuilder, /quickQuotePhotoTargetDocumentRef\.current = documentType/);
  assert.match(quoteBuilder, /void openQuickQuotePhotoPicker\(\)/);
  assert.match(workspace, /businessDocumentPhotoVisibilityNotice/);
  assert.match(workspace, /customerPhotoGroups\.before/);
  assert.match(workspace, /customerPhotoGroups\.after/);

  const prefillBlock = workspace.slice(
    workspace.indexOf("function usePrefill"),
    workspace.indexOf("function switchDocument")
  );
  assert.doesNotMatch(
    prefillBlock,
    /currentAnalysisTurns|currentAnalysisEvidenceVersions|latestProposal|reviewedResult/
  );
});

test("shortcut focus is explicit without false selected state", () => {
  const shortcutsStart = workspace.indexOf("business-document-conversation-shortcuts");
  const shortcuts = workspace.slice(shortcutsStart, workspace.indexOf("\n        </section>", shortcutsStart));
  assert.match(shortcuts, /focusComposer\("Note: "\)/);
  assert.match(shortcuts, /focusComposer\("Keep this private: "\)/);
  assert.match(shortcuts, /openManualEditor\("amount"\)/);
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
    /resolveBusinessDocumentConversationMessage/
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
    /resolveBusinessDocumentConversationMessage\([\s\S]*instruction,[\s\S]*hasActiveAnalysisSession:[\s\S]*Boolean\(jobAnalysisSessionIds\[activeDocument\]\)[\s\S]*\)[\s\S]*resolution\.capability === "ASK_MEETRO"[\s\S]*submitAskMeetro\(instruction\)/
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
    /pendingAnalysisMessageVisible \? <article className="you"><span>You<\/span><p>\{pendingAnalysisMessage\}<\/p><\/article>/
  );

  assert.match(
    workspace,
    /pendingAnalysisMessageVisible[\s\S]*Analyzing the job…/
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

test("initial Job Analysis timeout keeps its session, evidence, instruction, and governed retry path", () => {
  const askBlock = workspace.slice(
    workspace.indexOf("async function submitAskMeetro"),
    workspace.indexOf("async function submitInstruction")
  );

  const createStart =
    askBlock.indexOf("if (!sessionId)");
  const sessionStored =
    askBlock.indexOf("setJobAnalysisSessionIds", createStart);
  const initialAnalyze =
    askBlock.indexOf("await analyzeQuickQuoteAnalysisSession", sessionStored);
  const failureStart =
    askBlock.indexOf("catch (error)");

  assert.ok(createStart >= 0);
  assert.ok(sessionStored > createStart);
  assert.ok(initialAnalyze > sessionStored);
  assert.ok(failureStart > initialAnalyze);

  // A governed provider timeout is not a missing-session response, so the
  // durable session identity remains available for the next attempt.
  const failureBlock =
    askBlock.slice(failureStart);
  assert.match(
    failureBlock,
    /if \(error\?\.status === 404\)[\s\S]*setJobAnalysisSessionIds/
  );
  assert.doesNotMatch(
    failureBlock,
    /setMessage\(\(current\)/
  );

  // Reloading the retained session compares the same instruction/photos,
  // skips evidence append when unchanged, and invokes initial analysis again.
  assert.match(
    askBlock,
    /const evidenceChanged =[\s\S]*String\([\s\S]*latestEvidence\.professionalInput[\s\S]*!== instruction/
  );
  assert.match(
    askBlock,
    /if \(evidenceChanged\) \{[\s\S]*appendQuickQuoteAnalysisEvidence[\s\S]*\}[\s\S]*await analyzeQuickQuoteAnalysisSession/
  );

  assert.doesNotMatch(askBlock, /reconcileDocument\(/);
  assert.doesNotMatch(askBlock, /onApplyQuotePatch\(/);
  assert.doesNotMatch(askBlock, /setInvoice\(/);
});
