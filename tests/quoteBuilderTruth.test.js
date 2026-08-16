import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const quoteSource = readFileSync(
  new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("Quote Builder does not treat browser storage as quote persistence", () => {
  assert.doesNotMatch(quoteSource, /saveDraftQuote|getQuoteHistory|saveQuoteHistory/);
  assert.doesNotMatch(
    quoteSource,
    /localStorage\.setItem\(\s*"(?:workCenterQuoteHistory|meetroQuoteHistory|quoteHistory|lastManualQuoteNumber)"/
  );
  assert.doesNotMatch(quoteSource, /Draft saved|Borrador guardado/);
  assert.doesNotMatch(quoteSource, /status:\s*"draft"|quoteStatus:\s*"draft"/);
  assert.doesNotMatch(quoteSource, /updatedAt:\s*new Date|createdAt:\s*new Date/);
  assert.match(quoteSource, /const selectedQuoteForEdit = null;/);
  assert.doesNotMatch(quoteSource, /getItem\("selectedQuoteForEdit"\)/);
});

test("Quote Builder cannot simulate delivery or cross-user workflow state", () => {
  assert.doesNotMatch(quoteSource, /sendQuote|shareExternalQuote|shadowLinkQuote/);
  assert.doesNotMatch(quoteSource, /status:\s*"sent"|quoteStatus:\s*"sent"|sentAt/);
  assert.doesNotMatch(quoteSource, /workflow_quote_sent|WORKFLOW_QUOTE_SENT/);
  assert.doesNotMatch(quoteSource, /createNotification|markConversationUnreadForRecipient/);
  assert.doesNotMatch(quoteSource, /updateRequestById|appendTimelineEvent/);
  assert.doesNotMatch(quoteSource, /meetroQuoteLifecycleUpdated|meetro-messages-updated/);
  assert.doesNotMatch(quoteSource, /Quote ready to share|Quote sent to Meetro Chat/);
});

test("Quote Builder presents a clear unavailable state and retains truthful review", () => {
  assert.match(quoteSource, /quoteSavingDeliveryUnavailable/);
  assert.match(quoteSource, /quoteNotSavedDelivered/);
  assert.match(quoteSource, /ContextualAskMeetro/);
  assert.match(quoteSource, /applyConfirmedQuoteComposition/);
  assert.doesNotMatch(
    quoteSource,
    /Professional-confirmed|confirmed materials|materiales confirmados|After reviewing|Después de revisar/i
  );
  assert.doesNotMatch(quoteSource, />\s*Save Quote\s*</);
  assert.doesNotMatch(quoteSource, />\s*Send Through Meetro Chat\s*</);
  assert.doesNotMatch(quoteSource, />\s*Share Externally\s*</);
  assert.match(quoteSource, /Preview Quote/);
  assert.match(quoteSource, /Copy Summary/);
  assert.match(quoteSource, /navigator\.clipboard\?\.writeText/);
});

test("Quote preparation, totals, editing, and responsive containment remain intact", () => {
  assert.match(quoteSource, /calculateCustomerTotal/);
  assert.match(quoteSource, /normalizeLaborPricingType/);
  assert.match(quoteSource, /function getEditableRowTotal/);
  assert.match(quoteSource, /setLineItems/);
  assert.match(quoteSource, /function updateRow/);
  assert.match(quoteSource, /function removeRow/);
  assert.match(quoteSource, /className="app-page meetro-form-page"/);
  assert.match(quoteSource, /maxWidth: "100%"/);
  assert.match(quoteSource, /overflowX: "hidden"/);
  assert.match(quoteSource, /<BottomNav/);
});

test("Quote Builder direct routing remains professional-only", () => {
  assert.match(appSource, /const professionalOnlyPages = \[[\s\S]*"quoteBuilder"/);
  assert.match(appSource, /if \(page === "quoteBuilder"\) \{/);
  assert.match(appSource, /!hasToken[\s\S]*window\.location\.hash = "login"/);
});
