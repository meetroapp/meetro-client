import test from "node:test";
import assert from "node:assert/strict";

import { createWorkCenterJobListPresentation } from "../src/utils/workCenterJobListPresentation.js";

test("Current Jobs list presentation prefers resolved workflow status", () => {
  const presentation = createWorkCenterJobListPresentation(
    {
      statusLabel: "Waiting For Customer Confirmation",
      nextActionLabel: "Customer can confirm or request a different time in Meetro.",
    },
    {
      statusLabel: "Visit Confirmed",
      nextStepLabel: "Record Evaluation Notes.",
    }
  );

  assert.equal(presentation.statusLabel, "Waiting For Customer Confirmation");
  assert.equal(
    presentation.nextStepLabel,
    "Customer can confirm or request a different time in Meetro."
  );
});

test("Current Jobs list presentation falls back safely when workflow state is missing", () => {
  const presentation = createWorkCenterJobListPresentation(
    {},
    {
      statusLabel: "Work Scheduled",
      nextStepLabel: "Go on the way when it is time.",
    }
  );

  assert.deepEqual(presentation, {
    statusLabel: "Work Scheduled",
    nextStepLabel: "Go on the way when it is time.",
  });
});
