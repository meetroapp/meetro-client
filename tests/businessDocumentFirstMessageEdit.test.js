import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBusinessDocumentConversationTurn,
} from "../src/utils/businessDocumentPersistence.js";
import {
  resolveBusinessDocumentConversationMessage,
} from "../src/utils/businessDocumentWorkspace.js";

const workspace = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
  "utf8"
);

function resolve(
  instruction,
  hasActiveAnalysisSession = false,
  documentType = "quote"
) {
  return resolveBusinessDocumentConversationMessage({
    documentType,
    instruction,
    current: {},
    hasActiveAnalysisSession,
  });
}

function turn({
  id,
  instruction,
  previousTurn = null,
  resolution,
  documentType = "quote",
}) {
  return buildBusinessDocumentConversationTurn({
    id,
    documentType,
    instruction,
    current: {},
    previousTurn,
    resolvedPatch: resolution.patch,
    now: previousTurn
      ? "2026-08-24T18:01:00.000Z"
      : "2026-08-24T18:00:00.000Z",
  }).turn;
}

test("first Jose message uses the same stable revision identity as later Quote and Invoice messages", () => {
  for (const documentType of ["quote", "invoice"]) {
    const initialResolution = resolve(
      "customer Jose ?Molina",
      false,
      documentType
    );
    assert.equal(initialResolution.capability, "ASK_MEETRO");

    const first = turn({
      id: `${documentType}-professional-instruction-first`,
      instruction: "customer Jose ?Molina",
      resolution: initialResolution,
      documentType,
    });
    assert.equal(first.id, `${documentType}-professional-instruction-first`);
    assert.equal(first.revisions, 0);
    assert.deepEqual(first.revisionHistory, []);

    const correctedResolution = resolve(
      "Customer Jose Molina",
      true,
      documentType
    );
    assert.equal(correctedResolution.capability, "DOCUMENT_MUTATION");
    const corrected = turn({
      id: first.id,
      instruction: "Customer Jose Molina",
      previousTurn: first,
      resolution: correctedResolution,
      documentType,
    });
    assert.equal(corrected.id, first.id);
    assert.equal(corrected.text, "Customer Jose Molina");
    assert.equal(corrected.revisions, 1);
    assert.deepEqual(corrected.revisionHistory, ["customer Jose ?Molina"]);

    const turns = [first].map((entry) =>
      entry.id === first.id ? corrected : entry
    );
    assert.equal(turns.length, 1);
    assert.equal(turns[0].id, first.id);

    const second = turn({
      id: `${documentType}-professional-instruction-second`,
      instruction: "Scope: Replace the damaged fan.",
      resolution: resolve(
        "Scope: Replace the damaged fan.",
        true,
        documentType
      ),
      documentType,
    });
    assert.equal(second.revisions, 0);
    assert.deepEqual(second.revisionHistory, []);
  }
});

test("first-message registration precedes intent-specific analysis or clarification routing", () => {
  const submit = workspace.slice(
    workspace.indexOf("async function submitInstruction"),
    workspace.indexOf("function focusComposer")
  );
  const register = submit.indexOf("setTurns(nextTurns)");
  const clarification = submit.indexOf(
    'resolution.capability === "CLARIFICATION_REQUIRED"',
    register
  );
  const ask = submit.indexOf("return submitAskMeetro(instruction)", register);

  assert.ok(register >= 0);
  assert.ok(clarification > register);
  assert.ok(ask > register);
  assert.doesNotMatch(submit, /!existingId[\s\S]*resolution\.capability === "ASK_MEETRO"/);

  for (const [instruction, capability] of [
    ["Customer: Jose Molina", "DOCUMENT_MUTATION"],
    ["Analyze these photos", "ASK_MEETRO"],
    ["Please handle this", "CLARIFICATION_REQUIRED"],
  ]) {
    for (const documentType of ["quote", "invoice"]) {
      const resolution = resolve(instruction, false, documentType);
      assert.equal(resolution.capability, capability);
      const first = turn({
        id: `${documentType}-${capability.toLowerCase()}`,
        instruction,
        resolution,
        documentType,
      });
      assert.equal(first.documentType, documentType);
      assert.equal(first.text, instruction);
      assert.equal(first.revisions, 0);
      assert.deepEqual(first.revisionHistory, []);
    }
  }
});

test("professional analysis projection is deduplicated while assistant and system turns stay non-editable", () => {
  assert.match(workspace, /representedProfessionalMessages/);
  assert.match(workspace, /visibleAnalysisConversationEntries/);
  assert.match(workspace, /pendingAnalysisMessageVisible/);
  assert.match(
    workspace,
    /entry\.kind === "DOCUMENT" \? <InstructionTurn[\s\S]*onEdit=/
  );

  const instructionTurn = workspace.slice(
    workspace.indexOf("function InstructionTurn"),
    workspace.indexOf("function SavedFilesDrawer")
  );
  assert.match(instructionTurn, />Edit<\/button>/);
  assert.match(instructionTurn, /revisionHistory/);

  const analysisTurn = workspace.slice(
    workspace.indexOf("function AnalysisConversationTurn"),
    workspace.indexOf("function invoiceRows")
  );
  assert.doesNotMatch(analysisTurn, />Edit<\/button>|onEdit|revisionHistory/);
});
