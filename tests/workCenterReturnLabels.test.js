import test from "node:test";
import assert from "node:assert/strict";

import { getWorkCenterContextReturnLabel } from "../src/utils/workCenterReturnLabels.js";

test("uses generic Work Center return label without a customer name", () => {
  assert.equal(
    getWorkCenterContextReturnLabel({ language: "en" }),
    "Back to Work Center"
  );
});

test("uses active job return label when customer name is available", () => {
  assert.equal(
    getWorkCenterContextReturnLabel({
      language: "en",
      customerName: "Sarah",
    }),
    "Back to Sarah Job"
  );
});

test("uses Spanish Work Center return labels", () => {
  assert.equal(
    getWorkCenterContextReturnLabel({ language: "es" }),
    "Volver a Work Center"
  );
  assert.equal(
    getWorkCenterContextReturnLabel({
      language: "es",
      customerName: "Sarah",
    }),
    "Volver al trabajo de Sarah"
  );
});
