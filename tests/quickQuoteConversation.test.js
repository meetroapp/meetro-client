import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildQuickQuoteConversationPatch,
  mergeQuickQuoteConversationPatch,
} from "../src/utils/quickQuoteConversationDraft.js";
import {
  getQuickQuoteConversationCopy,
  QUICK_QUOTE_CONVERSATION_LANGUAGES,
} from "../src/utils/quickQuoteConversationLanguage.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const builder = read("src/pages/QuoteBuilder.jsx");
const conversation = read("src/components/QuickQuoteConversation.jsx");
const microphone = read("src/components/WorkflowMicrophoneInput.jsx");
const styles = read("src/index.css");

test("Quick Quote opens conversation-first while keeping the detailed editor secondary", () => {
  assert.match(builder, /isUniversalQuickQuote \? "entry" : "details"/);
  assert.match(builder, /<QuickQuoteConversation/);
  assert.match(builder, /view=\{quickQuoteView === "details" \? "review" : quickQuoteView\}/);
  assert.match(builder, /\(!isUniversalQuickQuote \|\| quickQuoteView === "details"\)/);
  assert.match(builder, /onEditDetails=\{openQuickQuoteDetails\}/);
  assert.match(builder, /Customer Name/);
  assert.match(builder, /Manual Total Override/);
});

test("entry and review expose concise optional-workflow guidance", () => {
  const copy = getQuickQuoteConversationCopy("en");
  assert.equal(copy.entryGuidanceTitle, "Tell Meetro about the job in your own words.");
  assert.match(copy.entryGuidanceBody, /review everything before anything is shared/i);
  assert.equal(copy.reviewGuidanceTitle, "Review what Meetro prepared.");
  assert.match(copy.reviewGuidanceBody, /edit any detail yourself/i);
  assert.match(conversation, /copy\.entryGuidanceTitle/);
  assert.match(conversation, /copy\.reviewGuidanceTitle/);
});

test("full details are collapsed by default and share one accessible editor", () => {
  assert.match(conversation, /detailsExpanded = false/);
  assert.match(conversation, /aria-expanded=\{detailsExpanded\}/);
  assert.match(conversation, /aria-controls="quick-quote-full-details"/);
  assert.match(conversation, /onClick=\{onToggleDetails\}/);
  assert.match(builder, /detailsExpanded=\{quickQuoteView === "details"\}/);
  assert.match(builder, /setQuickQuoteView\("review"\)/);
  assert.match(builder, /setQuickQuoteView\("details"\)/);
  assert.equal((builder.match(/id=\{isUniversalQuickQuote \? "quick-quote-full-details"/g) || []).length, 1);
  assert.match(builder, /details\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(builder, /details\?\.scrollIntoView/);
});

test("conversation revisions and manual fields update the same review and PDF draft", () => {
  assert.match(builder, /applyQuickQuoteConversationPatch\(patch\)/);
  assert.match(builder, /value=\{projectDescription\}/);
  assert.match(builder, /onChange=\{\(event\) => setProjectDescription\(event\.target\.value\)\}/);
  assert.match(builder, /scope: recommendedSolution \|\| projectDescription \|\| problemFound/);
  assert.match(builder, /summary=\{quickQuoteReviewSummary\}/);
  assert.match(builder, /function buildQuickQuotePdfModel\(\)/);
  assert.match(builder, /model: buildQuickQuotePdfModel\(\)/);
  assert.doesNotMatch(builder, /quickQuoteDetailsDraft|setQuickQuoteDetailsDraft/);
});

test("conversation entry locks Speak Type Add Photos and one governed microphone", () => {
  assert.match(conversation, /idleLabel=\{copy\.speak\}/);
  assert.match(conversation, /\{copy\.type\}/);
  assert.match(conversation, /\{copy\.addPhotos\}/);
  assert.equal((conversation.match(/<WorkflowMicrophoneInput/g) || []).length, 1);
  assert.match(microphone, /idleLabel \|\| copy\.startRecording/);
  assert.match(builder, /meetro-quote-builder-open/);
  assert.match(styles, /\.meetro-quote-builder-open \.meetro-assistant-launcher/);
});

test("Quick Quote photo control fails closed without governed draft media", () => {
  assert.match(builder, /canAddPhotos=\{false\}/);
  assert.match(conversation, /disabled=\{!canAddPhotos\}/);
  assert.match(conversation, /quick-quote-photo-authority/);
  assert.doesNotMatch(`${builder}\n${conversation}`, /URL\.createObjectURL\([^)]*photo|localStorage[^\n]*photo/i);
});

test("explicit professional instructions prepare structured fields without invented commercial values", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Repair cracked knee wall and repaint two-tone. About 3–4 days. Final price $2,650 with 75% deposit.",
    current: {},
  });
  assert.equal(patch.estimatedDuration, "3–4 days");
  assert.equal(patch.totalOverride, "2650");
  assert.equal(patch.depositRequired, "Yes");
  assert.equal(patch.depositTerms, "75% deposit");
  assert.match(patch.projectDescription, /cracked knee wall/);
  assert.equal(patch.materialAmount, undefined);
});

test("revision changes only explicit targeted fields and professional price wins", () => {
  const current = {
    projectTitle: "Knee wall repair",
    projectDescription: "Repair a 24 inch knee wall and paint two-tone",
    problemFound: "Cracked 24 inch knee wall",
    recommendedSolution: "Repair the 24 inch section and paint two-tone",
    totalOverride: "2200",
    notes: "Protect adjacent finishes",
  };
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Make the duration 3–4 days. Final price is $2,650.",
    current,
    revision: true,
  });
  const revised = mergeQuickQuoteConversationPatch(current, patch);
  assert.equal(revised.estimatedDuration, "3–4 days");
  assert.equal(revised.totalOverride, "2650");
  assert.equal(revised.projectDescription, current.projectDescription);
  assert.equal(revised.notes, current.notes);
  assert.deepEqual(Object.keys(patch).sort(), ["estimatedDuration", "timeline", "totalOverride"]);
});

test("duration revision removes stale timing from the clean review scope", () => {
  const current = {
    projectDescription: "Repair a cracked wall. Duration 3–4 days. Final price $2,650.",
    problemFound: "Cracked wall requiring 3–4 days of work.",
    recommendedSolution: "Repair and repaint in 3–4 days.",
    totalOverride: "2650",
  };
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Make the duration 4–5 days.",
    current,
    revision: true,
  });
  const revised = mergeQuickQuoteConversationPatch(current, patch);
  assert.equal(revised.estimatedDuration, "4–5 days");
  assert.doesNotMatch(revised.projectDescription, /3–4 days/);
  assert.doesNotMatch(revised.problemFound, /3–4 days/);
  assert.doesNotMatch(revised.recommendedSolution, /3–4 days/);
  assert.match(revised.projectDescription, /4–5 days/);
  assert.equal(revised.totalOverride, "2650");
});

test("explicit materials and removal instructions do not alter unrelated commercial truth", () => {
  const current = {
    projectDescription: "Repair the 24 inch section and paint two-tone",
    problemFound: "Cracked 24 inch section",
    recommendedSolution: "Rebuild the 24 inch section and paint two-tone",
    totalOverride: "2650",
  };
  const materialsPatch = buildQuickQuoteConversationPatch({
    prompt: "Use $500 materials.", current, revision: true,
  });
  assert.equal(materialsPatch.materialAmount, "500");
  assert.equal(materialsPatch.totalOverride, undefined);
  const removalPatch = buildQuickQuoteConversationPatch({
    prompt: "Remove 24 inch.", current, revision: true,
  });
  assert.doesNotMatch(removalPatch.projectDescription, /24 inch/);
  assert.equal(removalPatch.totalOverride, undefined);
});

test("working and review screens expose concise stages, summaries, and current-draft PDF actions", () => {
  for (const stage of ["Analyze notes", "Organize scope", "Capture labor", "Capture materials", "Draft terms"]) {
    assert.match(read("src/utils/quickQuoteConversationLanguage.js"), new RegExp(stage));
  }
  for (const label of ["customer", "scope", "materials", "laborDuration", "paymentTerms", "notes", "total"]) {
    assert.match(conversation, new RegExp(`copy\\.${label}`));
  }
  assert.match(builder, /summary=\{quickQuoteReviewSummary\}/);
  assert.match(builder, /onPreviewPdf=\{previewQuickQuotePdf\}/);
  assert.match(builder, /onSharePdf=\{\(\) => void shareQuickQuotePdf\(\)\}/);
  assert.match(builder, /buildQuickQuotePdfModel\(\)/);
  assert.match(conversation, /copy\.draftTruth/);
});

test("Quick Quote conversation copy has exact EN ES FR PT-BR parity", () => {
  assert.deepEqual(QUICK_QUOTE_CONVERSATION_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  const keys = Object.keys(getQuickQuoteConversationCopy("en")).sort();
  for (const language of QUICK_QUOTE_CONVERSATION_LANGUAGES) {
    const copy = getQuickQuoteConversationCopy(language);
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const key of keys) {
      if (Array.isArray(copy[key])) assert.equal(copy[key].length, 5);
      else assert.ok(String(copy[key]).trim(), `${language}.${key}`);
    }
  }
});

test("review and input controls remain contained at exact 390px capability", () => {
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*\.quick-quote-input-row[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.quick-quote-input-row > :nth-child\(3\)[\s\S]*grid-column: 1 \/ -1/);
  assert.match(styles, /\.quick-quote-input-row button[\s\S]*min-height: 48px/);
  assert.match(styles, /\.quick-quote-details-toggle[\s\S]*min-height: 48px/);
  assert.match(styles, /\.quick-quote-review-grid[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.quick-quote-review-grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(conversation, /ref=\{surfaceRef\} tabIndex=\{-1\}/);
});
