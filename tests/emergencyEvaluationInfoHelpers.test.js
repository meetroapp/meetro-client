import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/EmergencyWorkCenterDetail.jsx", import.meta.url),
  "utf8"
);

test("Emergency Evaluation exposes contextual help for Observations and Recommendation", () => {
  assert.match(source, /aria-label="About Observations"/);
  assert.match(source, /aria-label="About Recommendation"/);

  assert.match(
    source,
    /aria-controls="emergency-evaluation-observations-help"/
  );

  assert.match(
    source,
    /aria-controls="emergency-evaluation-recommendation-help"/
  );

  assert.match(
    source,
    /What did you see, test, measure, or confirm during the evaluation\?/
  );

  assert.match(
    source,
    /What do you recommend doing to control or resolve the emergency\?/
  );
});

test("Emergency Evaluation preserves existing field bindings", () => {
  assert.match(source, /value=\{form\.notes\}/);
  assert.match(source, /value=\{form\.findings\}/);
  assert.match(source, /findingRecords:\[\]/);
});

test("Emergency Evaluation help is user-controlled and mutually scoped", () => {
  assert.match(
    source,
    /setEvaluationHelp\(current=>current==='observations'\?'':'observations'\)/
  );

  assert.match(
    source,
    /setEvaluationHelp\(current=>current==='recommendation'\?'':'recommendation'\)/
  );

  assert.match(source, /evaluationHelp==='observations'/);
  assert.match(source, /evaluationHelp==='recommendation'/);
});
