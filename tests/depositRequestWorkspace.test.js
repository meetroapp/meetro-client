import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateBusinessDocumentDraft,
} from "../src/utils/businessDocumentDraftApi.js";
import {
  normalizeBusinessDocumentTab,
} from "../src/utils/businessDocumentWorkspace.js";
import { getAppLayoutMode } from "../src/utils/appLayout.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const REQUIREMENT_ID = "22222222-2222-4222-8222-222222222222";

function draft(overrides = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    documentType: "DEPOSIT_REQUEST",
    status: "WORKING_DRAFT",
    reference: "WDR-ABCDEF12",
    documentNumber: null,
    jobId: JOB_ID,
    paymentRequirementId: REQUIREMENT_ID,
    depositRequestAuthority: {
      paymentRequirementId: REQUIREMENT_ID,
      jobId: JOB_ID,
      relationshipId: 341,
      quoteId: "44444444-4444-4444-8444-444444444444",
      issuedQuoteVersion: 13,
      customerDecisionId: "55555555-5555-4555-8555-555555555555",
      state: "DUE",
      currency: "USD",
      quoteTotalMinor: 68000,
      requiredMinor: 51000,
      appliedMinor: 0,
      remainingMinor: 51000,
      latestVersion: 1,
      quoteReference: "Q-0000001",
      depositRule: { type: "PERCENT", percentBasisPoints: 7500, fixedMinor: null },
    },
    version: 1,
    createdAt: "2026-08-29T12:00:00.000Z",
    updatedAt: "2026-08-29T12:00:00.000Z",
    content: { customerName: "Customer Example", projectTitle: "Cabinet repair" },
    customerParty: null,
    customerDisplayName: "Customer Example",
    workspace: {
      activeDocument: "DEPOSIT_REQUEST",
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos: [],
    ...overrides,
  };
}

test("Deposit Request is a distinct workspace purpose with exact authority hydration", () => {
  assert.equal(normalizeBusinessDocumentTab("depositRequest"), "depositRequest");
  assert.equal(normalizeBusinessDocumentTab("DEPOSIT_REQUEST"), "depositRequest");
  const normalized = validateBusinessDocumentDraft(draft());
  assert.equal(normalized.paymentRequirementId, REQUIREMENT_ID);
  assert.equal(normalized.documentNumber, null);
  assert.equal(normalized.depositRequestAuthority.quoteTotalMinor, 68000);
  assert.equal(normalized.depositRequestAuthority.requiredMinor, 51000);
});

test("Deposit Request projections fail closed for numbering, mixed requirement, or satisfied authority", () => {
  assert.equal(validateBusinessDocumentDraft(draft({ documentNumber: "INV-0000001" })), null);
  assert.equal(validateBusinessDocumentDraft(draft({ paymentRequirementId: "66666666-6666-4666-8666-666666666666" })), null);
  assert.equal(validateBusinessDocumentDraft(draft({
    depositRequestAuthority: {
      ...draft().depositRequestAuthority,
      state: "SATISFIED",
      appliedMinor: 51000,
      remainingMinor: 0,
    },
  })), null);
});

test("workspace exposes explicit prepare, review, send, retry, resend, history, and zero-payment language", () => {
  const source = readFileSync(new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url), "utf8");
  assert.match(source, /Prepare Deposit Request/);
  assert.match(source, /Review Deposit Request delivery/);
  assert.match(source, /Send Deposit Request/);
  assert.match(source, /Retry Send/);
  assert.match(source, /Resend Deposit Request/);
  assert.match(source, /Delivery history/);
  assert.match(source, /does not record payment or satisfy the deposit/);
  assert.match(source, /Project total/);
  assert.match(source, /Deposit requested/);
  assert.match(source, /Remaining project balance/);
  assert.match(source, /Deposit already received/);
  assert.match(source, /No Deposit Request needs to be sent/);
  assert.match(source, /t\("wc52depositSendLocked"\)/);
  assert.match(source, /Carried from Quote/);
  assert.match(source, /quoteCarryoverContent/);
  assert.match(
    source,
    /Customer, project, Quote reference, deposit amount, and payment terms carry forward automatically/
  );
  assert.match(
    source,
    /Change the customer, project, or deposit terms on the Quote/
  );
  assert.doesNotMatch(
    source,
    />Choose existing customer</
  );
  assert.doesNotMatch(
    source,
    />Create external customer</
  );
  assert.match(source, /customerParty: customerParty \|\| null/);
  assert.match(source, /\{eligible \? \(/);
  assert.match(source, /if \(!deposit\?\.obligationId \|\| !eligible\)/);
  assert.match(source, /if \(!eligible\) \{/);
});

test("business document order is Quote, Deposit Request, Invoice", () => {
  const source = readFileSync(
    new URL(
      "../src/components/UnifiedBusinessDocumentWorkspace.jsx",
      import.meta.url
    ),
    "utf8"
  );

  const start = source.indexOf("function DocumentTabs");
  const end = source.indexOf(
    "function DocumentActionMenu",
    start
  );
  const tabs = source.slice(start, end);

  const quoteIndex = tabs.indexOf(
    'onDocumentChange("quote")'
  );
  const depositIndex = tabs.indexOf(
    '<MeetroIcon name="payment"'
  );
  const invoiceIndex = tabs.indexOf(
    'onDocumentChange("invoice")'
  );

  assert.ok(quoteIndex >= 0);
  assert.ok(depositIndex > quoteIndex);
  assert.ok(invoiceIndex > depositIndex);
});

test("Deposit Request carries the exact owned saved Quote forward", () => {
  const source = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /depositRequestSourceQuoteDocument/
  );
  assert.match(
    source,
    /savedProtection\.status === "exact"/
  );
  assert.match(
    source,
    /isUnifiedDepositRequestEntry[\s\S]*unifiedDepositRequestQuote/
  );
});

test("Deposit Request uses one-pane iPhone Details and Preview containment", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /const \[mobilePane, setMobilePane\] = useState\("details"\)/
  );
  assert.match(source, />\s*Details\s*</);
  assert.match(source, />\s*Preview\s*</);
  assert.match(source, /deposit-request-panel deposit-request-editor/);
  assert.match(source, /deposit-request-panel deposit-request-preview/);
  assert.match(source, /mobilePane === "details"/);
  assert.match(source, /mobilePane === "preview"/);

  assert.doesNotMatch(
    source,
    /gridTemplateColumns:\s*"minmax\(280px,\s*\.8fr\)\s*minmax\(360px,\s*1\.2fr\)"/
  );

  assert.match(
    styles,
    /\.deposit-request-main\s*\{[\s\S]*grid-template-columns:[\s\S]*minmax\(280px,\s*\.8fr\)[\s\S]*minmax\(360px,\s*1\.2fr\)/
  );
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*\.deposit-request-panel\s*\{[\s\S]*display:\s*none !important/
  );
  assert.match(
    styles,
    /\.deposit-request-panel\.mobile-active\s*\{[\s\S]*display:\s*grid !important/
  );
  assert.match(
    styles,
    /\.deposit-request-document-summary\s*\{[\s\S]*grid-template-columns:\s*1fr !important/
  );
});

test("Deposit Request keeps one selector-owned scrollable panel in iPad portrait", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );
  const responsiveStyles = styles.slice(
    styles.indexOf("/* DEPOSIT REQUEST RESPONSIVE DOCUMENT WORKSPACE */")
  );
  const sharedTabletStyles = styles.slice(
    styles.indexOf('#root[data-app-layout="tablet"] .deposit-request-workspace'),
    styles.indexOf(
      '#root[data-app-layout="tablet"][data-app-orientation="portrait"] .deposit-request-main',
      styles.indexOf("/* DEPOSIT REQUEST RESPONSIVE")
    )
  );
  const portraitStyles = responsiveStyles.slice(
    responsiveStyles.indexOf(
      '#root[data-app-layout="tablet"][data-app-orientation="portrait"] .deposit-request-main'
    ),
    responsiveStyles.indexOf(
      '#root[data-app-layout="tablet"][data-app-orientation="landscape"] .deposit-request-main'
    )
  );

  assert.equal(getAppLayoutMode(768), "tablet");

  assert.match(
    source,
    /const \[mobilePane, setMobilePane\] = useState\("details"\)/
  );
  assert.match(source, /aria-selected=\{mobilePane === "details"\}/);
  assert.match(source, /aria-selected=\{mobilePane === "preview"\}/);
  assert.match(source, /onClick=\{\(\) => setMobilePane\("details"\)\}/);
  assert.match(source, /onClick=\{\(\) => setMobilePane\("preview"\)\}/);
  assert.match(source, /mobilePane === "details" \? "mobile-active" : ""/);
  assert.match(source, /mobilePane === "preview" \? "mobile-active" : ""/);

  assert.match(sharedTabletStyles, /grid-template-rows:\s*auto auto auto minmax\(0, 1fr\)/);
  assert.match(sharedTabletStyles, /\.deposit-request-workspace\s*\{[\s\S]*block-size:\s*100dvh/);
  assert.match(sharedTabletStyles, /\.deposit-request-mobile-switch\s*\{[\s\S]*display:\s*grid/);
  assert.match(sharedTabletStyles, /\.deposit-request-main\s*\{[\s\S]*min-height:\s*0/);
  assert.match(sharedTabletStyles, /\.deposit-request-main\s*\{[\s\S]*block-size:\s*100%/);
  assert.match(sharedTabletStyles, /\.deposit-request-main\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(sharedTabletStyles, /\.deposit-request-panel\s*\{[\s\S]*block-size:\s*100%/);
  assert.match(sharedTabletStyles, /\.deposit-request-panel\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(portraitStyles, /\.deposit-request-main\s*\{[\s\S]*display:\s*grid/);
  assert.match(portraitStyles, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(portraitStyles, /grid-template-rows:\s*minmax\(0, 1fr\)/);
  assert.match(portraitStyles, /block-size:\s*100%/);
  assert.match(portraitStyles, /\.deposit-request-panel\s*\{[\s\S]*display:\s*none !important/);
  assert.match(portraitStyles, /\.deposit-request-panel\.mobile-active\s*\{[\s\S]*display:\s*grid !important[\s\S]*block-size:\s*100%/);
  assert.doesNotMatch(responsiveStyles, /@media\s*\(orientation:\s*portrait\)/);

  const selectorBlock = source.slice(
    source.indexOf('aria-label="Deposit Request view"'),
    source.indexOf('<main className="deposit-request-main">')
  );
  assert.doesNotMatch(selectorBlock, /setContent|setBaseline|setDocument/);
});

test("Deposit Request uses a two-column independently scrolling iPad landscape", () => {
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );
  const responsiveStyles = styles.slice(
    styles.indexOf("/* DEPOSIT REQUEST RESPONSIVE DOCUMENT WORKSPACE */")
  );
  const landscapeStyles = responsiveStyles.slice(
    responsiveStyles.indexOf(
      '#root[data-app-layout="tablet"][data-app-orientation="landscape"] .deposit-request-main'
    ),
    responsiveStyles.indexOf("@media (max-width: 767px)")
  );

  assert.equal(getAppLayoutMode(1024), "tablet");
  assert.match(landscapeStyles, /\.deposit-request-main\s*\{[\s\S]*display:\s*grid/);
  assert.match(
    landscapeStyles,
    /grid-template-columns:\s*minmax\(0, 2fr\) 1px minmax\(0, 3fr\)/
  );
  assert.match(landscapeStyles, /grid-template-rows:\s*minmax\(0, 1fr\)/);
  assert.match(landscapeStyles, /\.deposit-request-main::before\s*\{[\s\S]*grid-column:\s*2[\s\S]*background:/);
  assert.match(landscapeStyles, /\.deposit-request-editor[\s\S]*display:\s*grid !important/);
  assert.match(landscapeStyles, /\.deposit-request-preview[\s\S]*display:\s*grid !important/);
  assert.doesNotMatch(landscapeStyles, /\.deposit-request-panel\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(responsiveStyles, /@media\s*\(orientation:\s*landscape\)/);
});

test("Deposit Request rotation preserves selector state while landscape CSS shows both panes", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /const \[mobilePane, setMobilePane\] = useState\("details"\)/);
  assert.match(source, /onClick=\{\(\) => setMobilePane\("preview"\)\}/);
  assert.match(source, /mobilePane === "preview" \? "mobile-active" : ""/);
  assert.doesNotMatch(source, /orientationchange[\s\S]*setMobilePane/);
  assert.doesNotMatch(source, /visualViewport[\s\S]*setMobilePane/);
});

test("Deposit Request iPad composer occupies a viewport-owned row above the keyboard", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );
  const composerStart = styles.indexOf(
    '#root[data-app-layout="tablet"] .deposit-request-composer'
  );
  const keyboardStart = styles.indexOf(
    '#root[data-app-layout="tablet"][data-app-keyboard="open"]'
  );
  const composerStyles = styles.slice(composerStart, keyboardStart);
  const editorStyles = styles.slice(
    styles.indexOf('#root[data-app-layout="tablet"] .deposit-request-editor {'),
    composerStart
  );
  const keyboardStyles = styles.slice(
    keyboardStart,
    styles.indexOf("/*\n * In portrait the normal tablet document layout", keyboardStart)
  );

  assert.ok(composerStart >= 0);
  assert.ok(keyboardStart > composerStart);
  assert.match(source, /\{!depositSatisfied \? \(/);
  assert.match(source, /className="deposit-request-composer"/);
  assert.match(source, /rows=\{4\}/);
  assert.match(source, /Propose Change/);
  assert.match(source, /className="deposit-request-editor-scroll"/);
  assert.match(editorStyles, /grid-template-rows:\s*minmax\(0, 1fr\) auto/);
  assert.match(editorStyles, /\.deposit-request-editor-scroll\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(composerStyles, /position:\s*relative/);
  assert.match(composerStyles, /bottom:\s*auto/);
  assert.doesNotMatch(composerStyles, /position:\s*sticky/);
  assert.doesNotMatch(composerStyles, /(?:min-|max-)?height:/);
  assert.match(
    keyboardStyles,
    /var\(--meetro-visual-viewport-height, 100dvh\)[\s\S]*var\(--meetro-visual-viewport-offset-top, 0px\)/
  );
  assert.match(keyboardStyles, /min-height:\s*0/);
  assert.match(keyboardStyles, /padding-bottom:\s*0/);
  assert.doesNotMatch(keyboardStyles, /safe-area-inset-bottom/);
  assert.doesNotMatch(keyboardStyles, /business-document-composer/);
  assert.doesNotMatch(keyboardStyles, /orientation/);

  assert.match(
    styles,
    /#root\[data-app-layout="tablet"\] \.deposit-request-workspace\s*\{[\s\S]*?block-size:\s*100dvh/
  );
  assert.match(
    styles,
    /#root\[data-app-layout="tablet"\] \.deposit-request-panel\s*\{[\s\S]*?overflow-y:\s*auto/
  );
  assert.match(
    styles,
    /#root\[data-app-layout="tablet"\]\[data-app-orientation="landscape"\] \.deposit-request-main\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 2fr\) 1px minmax\(0, 3fr\)/
  );
});

test("accepted unpaid Work Center exposes preparation while confirmed payment remains separate", () => {
  const source = readFileSync(new URL("../src/components/ProfessionalDepositCard.jsx", import.meta.url), "utf8");
  assert.match(source, /Prepare Deposit Request/);
  assert.match(source, /Confirm Deposit Received/);
  assert.match(source, /depositRequestBuilder\?jobId=/);
});

test("Deposit phone portrait gives Details content its own scroll row outside the composer", () => {
  const styles = readFileSync(new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url), "utf8");
  const start = styles.indexOf("/* 90453 PHONE DOCUMENT BASE");
  const end = styles.indexOf("/* END 90453 PHONE DOCUMENT BASE */", start);
  assert.ok(start >= 0 && end > start);
  const phone = styles.slice(start, end);
  assert.match(phone, /\.deposit-request-panel\.mobile-active\s*\{[^}]*display: grid !important/);
  assert.match(phone, /\.deposit-request-editor\.mobile-active\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\) auto[^}]*overflow: hidden/);
  assert.match(phone, /\.deposit-request-editor-scroll\s*\{[^}]*display: grid[^}]*min-height: 0[^}]*overflow-y: auto/);
  assert.match(phone, /\.deposit-request-composer\s*\{[^}]*position: relative/);
  assert.match(phone, /\.deposit-request-composer textarea\s*\{[^}]*max-height: 88px[^}]*overflow-y: auto[^}]*font-size: 16px/);
  assert.match(phone, /\.deposit-request-preview\.mobile-active\s*\{[^}]*overflow-y: auto/);
  assert.match(phone, /\.deposit-request-panel :is\(p, dd, dt, li\)\s*\{[^}]*overflow-wrap: normal[^}]*word-break: normal/);
  assert.doesNotMatch(phone, /@media|data-app-layout="tablet"/);
});

test("Deposit phone keyboard focus frees room before its fixed-size action row can overflow", () => {
  const styles = readFileSync(new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url), "utf8");
  const start = styles.indexOf("/* Deposit Request — native iPhone landscape");
  const end = styles.indexOf("/* END 90452 NATIVE IPHONE LANDSCAPE DOCUMENT CONTAINMENT */", start);
  assert.ok(start >= 0 && end > start);
  const section = styles.slice(start, end);
  assert.match(section, /#root\[data-app-layout="mobile"\]\[data-app-keyboard="open"\]\s*\.deposit-request-workspace\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\)[^}]*padding-block: 0/);
  assert.match(section, /data-app-keyboard="open"\][^{]*\.deposit-request-mobile-switch\s*\)\s*\{[^}]*display: none !important/);
  assert.match(section, /data-app-keyboard="open"\]\s*\.deposit-request-editor\.mobile-active\s*\{[^}]*padding-bottom: 0 !important/);
});

test("Deposit Request iPhone landscape stays selector-owned one-pane with keyboard containment", () => {
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );

  const start = styles.indexOf(
    "/* 90452 NATIVE IPHONE LANDSCAPE DOCUMENT CONTAINMENT"
  );
  const end = styles.indexOf("/* END 90452 NATIVE IPHONE LANDSCAPE DOCUMENT CONTAINMENT */", start);
  assert.ok(end > start);
  const mobileLandscape = styles.slice(start, end);

  assert.ok(start >= 0);

  assert.match(
    mobileLandscape,
    /#root\[data-app-layout="mobile"\]\[data-app-orientation="landscape"\][\s\S]*deposit-request-workspace/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-mobile-switch[\s\S]*display:\s*grid !important/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-main[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\)/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-panel[\s\S]*display:\s*none !important/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-panel\.mobile-active[\s\S]*display:\s*grid !important/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-editor\.mobile-active[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) auto/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-editor-scroll[\s\S]*overflow-y:\s*auto/
  );

  assert.match(
    mobileLandscape,
    /deposit-request-composer[\s\S]*position:\s*relative[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/
  );

  assert.match(
    mobileLandscape,
    /data-app-keyboard="open"[\s\S]*deposit-request-workspace[\s\S]*var\(--meetro-visual-viewport-height, 100dvh\)[\s\S]*var\(--meetro-visual-viewport-offset-top, 0px\)/
  );

  assert.match(
    mobileLandscape,
    /data-app-keyboard="open"[\s\S]*business-document-header,[\s\S]*business-document-tabs,[\s\S]*deposit-request-mobile-switch[\s\S]*display:\s*none !important/
  );

  assert.doesNotMatch(
    mobileLandscape,
    /grid-template-columns:\s*minmax\(0, 2fr\) 1px minmax\(0, 3fr\)/
  );
});

test("R4 Deposit Request uses live canonical payment state and blocks Invoice until the requirement clears", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /const authority = deposit;/);
  assert.match(source, /const invoiceAllowed = Boolean/);
  assert.match(source, /"NOT_REQUIRED", "SATISFIED"/);
  assert.match(source, /disabled=\{!invoiceAllowed\}/);
  assert.match(source, /depositSatisfied: true/);
  assert.match(source, /<span>Received<\/span>/);
  assert.match(source, /Payment needed/);
  assert.match(source, /Partially paid/);
  assert.match(source, /Deposit satisfied/);
});

test("R4 Deposit Request carries service address, approved scope, Quote version, and deposit terms", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /serviceLocation/);
  assert.match(source, /projectDescription/);
  assert.match(source, /recommendedSolution/);
  assert.match(source, /Quote version/);
  assert.match(source, /Service address/);
  assert.match(source, /Approved scope/);
  assert.match(source, /Deposit terms/);
  assert.match(source, /partial payment request/);
  assert.match(source, /not a Final Invoice/);
});

test("R4 Deposit Request reuses canonical payment confirmation instead of creating another payment ledger", () => {
  const workspace = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  const card = readFileSync(
    new URL("../src/components/ProfessionalDepositCard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(workspace, /ProfessionalDepositCard/);
  assert.match(workspace, /showRequestAction=\{false\}/);
  assert.match(workspace, /onCanonicalChange/);
  assert.match(card, /showRequestAction = true/);
  assert.match(card, /confirmProfessionalPreWorkDepositReceived/);
});

test("R4 visible Quote to Invoice tab routes through Deposit Request when Quote requires a deposit", () => {
  const source = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /function switchDocument\(documentType, options = \{\}\)/);
  assert.match(source, /quoteCustomerPricingProjection\(quote\)/);
  assert.match(source, /pricing\.deposit\.mode !== "NONE"/);
  assert.match(source, /openDepositRequest\(\)/);
  assert.match(source, /options\.depositSatisfied !== true/);
});

test("Deposit Request wide desktop owns two independently scrollable panes", () => {
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );
  const desktopStart = styles.indexOf("@media (min-width: 1024px)");
  assert.notEqual(desktopStart, -1, "desktop workspace media block must exist");
  const desktop = styles.slice(desktopStart);

  assert.match(
    desktop,
    /\.deposit-request-workspace\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)[^}]*block-size:\s*100dvh[^}]*overflow:\s*hidden/
  );

  assert.match(
    desktop,
    /\.deposit-request-main\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)[^}]*min-height:\s*0[^}]*overflow:\s*hidden/
  );

  assert.match(
    desktop,
    /\.deposit-request-editor\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto[^}]*overflow:\s*hidden/
  );

  assert.match(
    desktop,
    /\.deposit-request-editor-scroll\s*\{[^}]*display:\s*grid[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/
  );

  assert.match(
    desktop,
    /\.deposit-request-preview\s*\{[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/
  );
});

test("Deposit Request wide preview gives long Quote metadata readable width", () => {
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );
  const desktopStart = styles.indexOf("@media (min-width: 1024px)");
  assert.notEqual(desktopStart, -1, "desktop workspace media block must exist");
  const desktop = styles.slice(desktopStart);

  assert.match(
    desktop,
    /\.deposit-request-document-summary\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/
  );

  assert.match(
    desktop,
    /\.deposit-request-document-summary\s*>\s*div:nth-child\(5\),[\s\S]*div:nth-child\(6\)[^{]*\{[^}]*grid-column:\s*1\s*\/\s*-1/
  );

  assert.match(
    desktop,
    /\.deposit-request-document-summary dd\s*\{[^}]*overflow-wrap:\s*normal[^}]*word-break:\s*normal/
  );
});


test("Deposit Request preview separates status identity money scope and customer-facing details", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /className="deposit-request-status-banner/);
  assert.match(
    source,
    /className="deposit-request-preview-section deposit-request-preview-identity"/
  );
  assert.match(source, /className="deposit-request-money-grid"/);
  assert.match(
    source,
    /className="deposit-request-preview-section deposit-request-preview-scope"/
  );
  assert.match(
    source,
    /className="deposit-request-preview-section deposit-request-preview-message"/
  );

  assert.match(source, /Deposit already received/);
  assert.match(source, /No Deposit Request needs to be sent/);
});

test("Deposit Request keeps long approved scope outside the compact identity summary", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  const start = source.indexOf(
    '<dl className="deposit-request-document-summary"'
  );
  assert.notEqual(start, -1);

  const end = source.indexOf("</dl>", start);
  assert.notEqual(end, -1);

  const identitySummary = source.slice(start, end);

  assert.doesNotMatch(identitySummary, /Approved scope/);

  const afterSummary = source.slice(end);
  assert.match(
    afterSummary,
    /deposit-request-preview-section deposit-request-preview-scope/
  );
});

test("Deposit Request preview uses scan-friendly status and financial cards", () => {
  const styles = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
    "utf8"
  );

  assert.match(
    styles,
    /\.deposit-request-status-banner\s*\{[^}]*display:\s*grid/
  );

  assert.match(
    styles,
    /\.deposit-request-money-grid\s*\{[^}]*display:\s*grid/
  );

  assert.match(
    styles,
    /\.deposit-request-money-card\s*\{[^}]*min-width:\s*0/
  );

  assert.match(
    styles,
    /\.deposit-request-preview-scope\s*\{[^}]*min-width:\s*0/
  );
});


test("Deposit Request preview status is customer-source neutral for Meetro and external customers", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  const statusStart = source.indexOf("const depositPreviewStatus =");
  const statusEnd = source.indexOf(
    "const customerState = businessDocumentCustomerState",
    statusStart
  );

  assert.notEqual(statusStart, -1);
  assert.notEqual(statusEnd, -1);

  const statusModel = source.slice(statusStart, statusEnd);

  // Payment/readiness presentation comes only from canonical deposit authority.
  assert.match(statusModel, /depositSatisfied/);
  assert.match(statusModel, /authority\?\.state/);
  assert.match(statusModel, /money\.received/);
  assert.match(statusModel, /money\.needed/);

  // It must not fork the Deposit preview by customer source.
  assert.doesNotMatch(statusModel, /customerParty/);
  assert.doesNotMatch(statusModel, /customerState/);
  assert.doesNotMatch(statusModel, /businessContactId/);
  assert.doesNotMatch(statusModel, /customerDecisionId/);

  // External-customer support remains present in the shared owner.
  assert.match(source, /External customer linked to this Deposit Request/);
  assert.match(source, /External customer created/);

  // Both customer sources therefore use the same Deposit status presentation.
  assert.match(source, /Deposit already received/);
  assert.match(source, /Deposit partially received/);
  assert.match(source, /Deposit payment required/);
  assert.match(source, /No pre-work deposit required/);
});


test("Satisfied Deposit Request stops requesting payment and exposes the governed next step", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /className="deposit-request-satisfied-editor-state"/);
  assert.match(source, /Deposit received in full/);
  assert.match(source, /No additional Deposit Request is needed/);

  assert.match(source, /className="deposit-request-next-step"/);
  assert.match(source, /Next step/);
  assert.match(source, /Continue to Invoice/);
  assert.match(
    source,
    /onDocumentChange\("invoice", \{ depositSatisfied: true \}\)/
  );
});

test("Satisfied Deposit Request marks old customer request wording as historical instead of active", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /Payment status/);
  assert.match(source, /Deposit received in full/);
  assert.match(source, /Original request message/);
  assert.match(source, /Historical wording · no longer active/);
});

test("Satisfied Deposit Request cleanup is customer-source neutral", () => {
  const source = readFileSync(
    new URL("../src/components/DepositRequestWorkspace.jsx", import.meta.url),
    "utf8"
  );

  const start = source.indexOf(
    'className="deposit-request-satisfied-editor-state"'
  );
  const end = source.indexOf(
    'aria-label="Live Deposit Request Preview"',
    start
  );

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const satisfiedExperience = source.slice(start, end);

  assert.match(satisfiedExperience, /depositSatisfied/);
  assert.doesNotMatch(satisfiedExperience, /customerParty/);
  assert.doesNotMatch(satisfiedExperience, /customerState/);
  assert.doesNotMatch(satisfiedExperience, /businessContactId/);
});
