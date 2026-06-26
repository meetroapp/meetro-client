import test from "node:test";
import assert from "node:assert/strict";

import { getEvaluationPanelMode } from "../src/utils/evaluationPanelMode.js";

test("evaluation panel remains editable before proposal creation", () => {
  assert.deepEqual(
    getEvaluationPanelMode({
      workflowState: "evaluation_complete",
      hasEvaluation: true,
    }),
    {
      readOnly: false,
      canEdit: false,
      shouldDefaultReadOnly: false,
    }
  );
});

test("evaluation panel defaults to read-only after proposal creation", () => {
  assert.deepEqual(
    getEvaluationPanelMode({
      workflowState: "quote_created",
      hasEvaluation: true,
    }),
    {
      readOnly: true,
      canEdit: true,
      shouldDefaultReadOnly: true,
    }
  );
});

test("explicit edit mode keeps completed evaluation editable", () => {
  assert.deepEqual(
    getEvaluationPanelMode({
      workflowState: "proposal_sent",
      hasEvaluation: true,
      isEditing: true,
    }),
    {
      readOnly: false,
      canEdit: true,
      shouldDefaultReadOnly: true,
    }
  );
});

test("missing evaluation does not become read-only", () => {
  assert.equal(
    getEvaluationPanelMode({
      workflowState: "proposal_sent",
      hasEvaluation: false,
    }).readOnly,
    false
  );
});
