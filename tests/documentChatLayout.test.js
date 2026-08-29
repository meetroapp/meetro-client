import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");
const builder = read("src/pages/QuoteBuilder.jsx");

const conversationStart = workspace.indexOf("<section className={`business-document-conversation");
const conversationEnd = workspace.indexOf("{documentPhotos.length ? <JobEvidencePanel", conversationStart);
const conversation = workspace.slice(conversationStart, conversationEnd);
const contextStart = conversation.indexOf('className="business-document-conversation-context"');
const chatStart = conversation.indexOf('className="business-document-chat-shell"');
const footerStart = conversation.indexOf('className="business-document-conversation-footer"');
const turnsStart = conversation.indexOf('ref={turnsRef} className="business-document-turns"');
const turnsEnd = conversation.indexOf("{newContentAvailable ?", turnsStart);
const turns = conversation.slice(turnsStart, turnsEnd);

test("document chat uses separate context, transcript/composer, and action regions in reading order", () => {
  assert.ok(contextStart > 0);
  assert.ok(chatStart > contextStart);
  assert.ok(footerStart > chatStart);
  assert.match(conversation, /data-document-chat-region="context"/);
  assert.match(conversation, /data-document-chat-region="actions"/);
});

test("Quote and Invoice context remain outside the transcript viewport", () => {
  const context = conversation.slice(contextStart, chatStart);
  assert.match(context, /activeDocument === "quote" \? <JobLinkedQuoteContext/);
  assert.match(context, /activeDocument === "invoice" && invoicePreparation \? <CompletedInvoiceReviewIntro/);
  assert.doesNotMatch(turns, /JobLinkedQuoteContext|CompletedInvoiceReviewIntro|business-document-job-context/);
  assert.match(workspace, /Linked from Job/);
  assert.match(workspace, /Read-only source context/);
});

test("mode controls are non-scrolling context content and never enter conversation history", () => {
  const context = conversation.slice(contextStart, chatStart);
  assert.match(context, /business-document-control-toolbar/);
  assert.match(context, /Let Meetro prefill/);
  assert.match(context, /Fill form manually/);
  assert.match(context, /How it works/);
  assert.doesNotMatch(turns, /business-document-control-toolbar|Let Meetro prefill|Fill form manually|How it works/);
});

test("wide layout gives the bounded chat shell the only flexible middle row", () => {
  assert.match(styles, /@media \(min-width:\s*901px\)[\s\S]*\.business-document-conversation,[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/);
  assert.doesNotMatch(styles, /grid-auto-rows:\s*auto/);
  assert.match(styles, /@media \(min-width:\s*901px\)[\s\S]*\.business-document-chat-shell\s*\{[\s\S]*height:\s*100%[\s\S]*min-height:\s*0[\s\S]*overflow:\s*hidden/);
});

test("short conversations stay intrinsically sized instead of stretching message tracks", () => {
  assert.match(styles, /\.business-document-turns\s*\{[\s\S]*align-content:\s*start/);
  assert.match(styles, /\.business-document-turns > article\.meetro,[\s\S]*align-items:\s*start/);
});

test("long conversations own one stable vertical scrollbar without horizontal spill", () => {
  assert.match(styles, /\.business-document-turns\s*\{[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/);
  assert.match(styles, /\.business-document-turns\s*\{[\s\S]*scrollbar-gutter:\s*stable/);
  assert.match(styles, /\.business-document-turns\s*\{[\s\S]*overscroll-behavior:\s*contain/);
});

test("the final message can clear the separately reserved composer row", () => {
  assert.match(styles, /\.business-document-chat-shell\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto auto/);
  assert.match(styles, /\.business-document-turns\s*\{[\s\S]*padding:\s*5px 2px 24px[\s\S]*scroll-padding-bottom:\s*24px/);
  assert.match(styles, /\.business-document-composer\s*\{\s*grid-row:\s*3[\s\S]*position:\s*relative/);
  assert.doesNotMatch(styles, /\.business-document-composer\s*\{[^}]*position:\s*(?:absolute|fixed|sticky)/);
});

test("compact desktop height preserves readable context and a fully usable Edit form", () => {
  const wide = styles.slice(styles.indexOf("@media (min-width: 901px)"), styles.indexOf("@media (min-width: 1180px)"));
  assert.match(wide, /\.business-document-job-context\s*\{[^}]*gap:\s*8px[^}]*margin-bottom:\s*8px[^}]*padding:\s*10px/);
  assert.match(wide, /\.business-document-composer textarea\s*\{\s*height:\s*58px;\s*min-height:\s*58px/);
  assert.match(wide, /\.business-document-turn-editor textarea\s*\{\s*height:\s*52px;\s*min-height:\s*52px/);
  assert.match(styles, /\.business-document-turn-body button,[\s\S]*min-height:\s*44px/);
  assert.doesNotMatch(wide, /font-size:\s*[0-8]px/);
});

test("new-message control has a dedicated non-overlay row and reaches the newest turn", () => {
  assert.match(styles, /\.business-document-new-message\s*\{\s*grid-row:\s*2/);
  assert.doesNotMatch(styles, /\.business-document-new-message\s*\{[^}]*position:\s*(?:absolute|fixed|sticky)/);
  assert.match(conversation, /className="business-document-new-message" onClick=\{scrollToNewest\}/);
  assert.match(workspace, /container\.scrollTo\?\.\(\{ top: container\.scrollHeight, behavior: "smooth" \}\)/);
});

test("Edit and proposal review controls remain inside the scrollable transcript", () => {
  assert.match(turns, /<InstructionTurn/);
  assert.match(turns, /<QuoteProposalReview/);
  assert.match(turns, /<InvoiceProposalReview/);
  assert.match(workspace, /aria-label="Edit prior instruction"/);
  assert.match(workspace, /onApply=\{applyQuoteProposal\}/);
  assert.match(workspace, /onDismiss=\{dismissInvoiceProposal\}/);
});

test("dynamic conversation notices scroll with messages instead of shrinking the composer region", () => {
  assert.match(turns, /privateReminders\.length/);
  assert.match(turns, /currentAnalysisRequest\.error/);
  assert.match(turns, /invoiceCreateState\.error/);
  assert.match(turns, /notice && mobilePane === "conversation"/);
  const footer = conversation.slice(footerStart);
  assert.doesNotMatch(footer, /privateReminders\.length|currentAnalysisRequest\.error|invoiceCreateState\.error|notice &&/);
});

test("right preview rendering cannot replace or key the left transcript structure", () => {
  const previewStart = workspace.indexOf('<section ref={previewRef}', conversationStart);
  assert.ok(previewStart > conversationEnd);
  assert.doesNotMatch(conversation, /key=\{(?:invoice|quote|activeContent|activeDocument)/);
  assert.match(workspace, /useEffect\(\(\) => \{[\s\S]*nearNewestRef\.current[\s\S]*\}, \[currentConversationLength, documentPhotos\.length\]\)/);
});

test("desktop and narrow layouts keep the document chat width-contained", () => {
  assert.match(styles, /\.business-document-main\s*\{\s*min-width:\s*0/);
  assert.match(styles, /\.business-document-turns\s*\{[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/);
  assert.match(styles, /@media \(max-width:\s*767px\)[\s\S]*\.business-document-chat-shell\s*\{[\s\S]*height:\s*56dvh/);
  assert.match(styles, /#root\[data-app-layout="mobile"\] \.business-document-conversation,[\s\S]*overflow:\s*visible/);
  assert.match(styles, /@media \(orientation:\s*portrait\)[\s\S]*#root\[data-app-layout="tablet"\] \.business-document-chat-shell\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto auto/);
});

test("018/019 Invoice initialization and review truth remain outside the layout change", () => {
  assert.match(builder, /existingRequest\?\.key === requestKey/);
  assert.match(builder, /fetchEffectiveApprovedInvoiceQuote/);
  assert.match(workspace, /return <CompletedJobInvoiceManualEditor/);
  for (const label of ["Approved work", "Payments received", "Amount still due"]) {
    assert.match(workspace, new RegExp(label));
  }
});

test("conversation layout activity has no Invoice creation authority", () => {
  const chat = conversation.slice(chatStart, footerStart);
  assert.doesNotMatch(chat, /createReviewedInvoice|onCreateCanonicalInvoice|saveDocument|deliverBusinessDocumentDraft/);
  assert.match(workspace, /Approved work/);
  assert.match(workspace, /Payments received/);
  assert.match(workspace, /Amount still due/);
});
