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
  assert.match(source, /Amount remaining after deposit/);
  assert.match(source, /The Quote supplies the customer, project, deposit amount, and payment terms/);
  assert.match(source, /Send is disabled until an approved Quote creates an unpaid canonical deposit requirement/);
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
  assert.match(source, /disabled=\{!eligible \|\| busy/);
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
  assert.match(
    source,
    /className="deposit-request-composer"[\s\S]*?<textarea rows=\{4\}[\s\S]*?Propose Change[\s\S]*?<\/div>/
  );
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
