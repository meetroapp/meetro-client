import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  businessDocumentDetailFields,
  cloneBusinessDocumentEditorSource,
  mergeBusinessDocumentEditorSource,
} from "../src/utils/businessDocumentEditor.js";
import { SUPPORTED_LANGUAGES, t } from "../src/utils/language.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");

test("Prefill exposes the existing structured Quote and Invoice detail fields", () => {
  assert.deepEqual(
    businessDocumentDetailFields("quote").map(([field]) => field),
    [
      "customerName",
      "customerEmail",
      "customerPhone",
      "customerAddress",
      "projectTitle",
      "recommendedSolution",
      "projectDescription",
      "estimatedDuration",
    ]
  );
  assert.deepEqual(
    businessDocumentDetailFields("invoice").map(([field]) => field),
    [
      "customerName",
      "customerEmail",
      "customerPhone",
      "customerAddress",
      "projectTitle",
      "workPerformed",
      "dueDate",
    ]
  );
  assert.match(workspace, /mode === "prefill"/);
  assert.match(workspace, /id="business-document-prefill-details"/);
  assert.match(workspace, /\{detailFieldset\}/);
});

test("Prefill and Manual Entry render one editor over the same working-document values", () => {
  const editorRender = workspace.slice(
    workspace.indexOf("{manualState ? <ManualEditor"),
    workspace.indexOf("<div className=\"business-document-chat-shell\"")
  );
  assert.match(editorRender, /quote=\{quote\}/);
  assert.match(editorRender, /invoice=\{invoice\}/);
  assert.match(editorRender, /mode=\{manualState\.mode\}/);
  assert.match(editorRender, /onModeChange=\{changeEditorMode\}/);
  assert.equal((workspace.match(/manualState \? <ManualEditor/g) || []).length, 1);
  assert.match(workspace, /const detailFieldset =/);
  assert.doesNotMatch(workspace, /prefillQuote|prefillInvoice|prefillCustomer/);
});

test("switching Prefill and Manual presentation preserves the editor instead of resetting draft values", () => {
  const modeBlock = workspace.slice(
    workspace.indexOf("function openManualEditor"),
    workspace.indexOf("function switchDocument")
  );
  assert.match(modeBlock, /setManualState\(\(current\) => current/);
  assert.match(modeBlock, /\{ \.\.\.current, mode, focus: "first" \}/);
  assert.doesNotMatch(modeBlock, /setManualOverrides|setCustomerParties|setLinkedCustomerContacts|setTurns/);
  assert.match(workspace, /onModeChange\("manual"\)/);
  assert.match(workspace, /onModeChange\("prefill"\)/);
});

test("Meetro proposals refresh untouched fields while professional edits stay reviewable and editable", () => {
  const previousSource = cloneBusinessDocumentEditorSource({
    customerName: "Maggie Rivera",
    projectTitle: "Fan repair",
    projectDescription: "Replace fan",
    estimatedDuration: "1 day",
  });
  const draft = {
    ...previousSource,
    customerName: "Maggie A. Rivera",
    projectDescription: "Replace fan and protect flooring",
  };
  const nextSource = {
    ...previousSource,
    projectTitle: "Ceiling fan replacement",
    projectDescription: "Replace fan with Meetro proposal",
    estimatedDuration: "2 days",
  };
  const merged = mergeBusinessDocumentEditorSource({
    draft,
    previousSource,
    nextSource,
  });
  assert.equal(merged.customerName, "Maggie A. Rivera");
  assert.equal(merged.projectDescription, "Replace fan and protect flooring");
  assert.equal(merged.projectTitle, "Ceiling fan replacement");
  assert.equal(merged.estimatedDuration, "2 days");
  assert.match(workspace, /mergeBusinessDocumentEditorSource/);
  assert.match(workspace, /onApply\(draft, originalRef\.current\)/);
});

test("mode changes preserve customer-party linkage and cannot create duplicate identity records", () => {
  const prefillBlock = workspace.slice(
    workspace.indexOf("function usePrefill"),
    workspace.indexOf("function switchDocument")
  );
  for (const forbidden of [
    "createBusinessContact",
    "assignBusinessContactRole",
    "establishBusinessCustomerRelationship",
    "setCustomerParties",
    "setLinkedCustomerContacts",
    "saveDocument",
  ]) {
    assert.doesNotMatch(prefillBlock, new RegExp(forbidden), forbidden);
  }
  assert.match(workspace, /const \[customerParties, setCustomerParties\]/);
  assert.match(workspace, /customerParty=\{activeCustomerParty\}/);
  assert.match(workspace, /linkedContact=\{activeLinkedCustomer\}/);
});

test("Prefill field parity copy is complete in every supported language", () => {
  const keys = [
    "businessDocumentPrefillQuoteDetails",
    "businessDocumentPrefillInvoiceDetails",
    "businessDocumentPrefillDetailsHelp",
    "businessDocumentClarificationNeeded",
    "businessDocumentFieldCustomer",
    "businessDocumentFieldCustomerEmail",
    "businessDocumentFieldCustomerPhone",
    "businessDocumentFieldCustomerAddress",
    "businessDocumentFieldProject",
    "businessDocumentFieldScope",
    "businessDocumentFieldCustomerDescription",
    "businessDocumentFieldEstimatedDuration",
    "businessDocumentOpenManualEntry",
    "businessDocumentBackToPrefill",
    "businessDocumentApplyChanges",
  ];
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      assert.ok(t(key, code).trim(), `${code}:${key}`);
      assert.notEqual(t(key, code), key, `${code}:${key}`);
    }
  }
});

test("compact Prefill details remain keyboard-native and width-contained", () => {
  assert.match(styles, /\.business-document-prefill-details \{[^}]*min-width:\s*0/);
  assert.match(styles, /\.business-document-prefill-details input,[\s\S]*width:\s*100%/);
  assert.match(styles, /\.business-document-prefill-details footer \{[^}]*flex-wrap:\s*wrap/);
  assert.match(workspace, /<details open>/);
  assert.match(workspace, /<summary id="business-document-prefill-details-title">/);
  assert.match(workspace, /aria-pressed=\{manualState\?\.mode === "prefill"\}/);
  assert.match(workspace, /aria-controls="business-document-prefill-details"/);
});
