import test from "node:test";
import assert from "node:assert/strict";

import {
  getSupportingRecordActionStyleVariant,
  getSupportingRecordsDefaultOpen,
} from "../src/utils/supportingRecordsPresentation.js";

test("Supporting Records are collapsed by default", () => {
  assert.equal(getSupportingRecordsDefaultOpen(), false);
});

test("Supporting Records actions use secondary styling", () => {
  assert.equal(getSupportingRecordActionStyleVariant(), "secondary");
});
