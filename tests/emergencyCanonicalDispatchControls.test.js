import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);

test("canonical Emergency conversation exposes exactly the server-authorized dispatch action", () => {
  assert.match(
    source,
    /canonicalEmergencyAllowedActions\.length === 1[\s\S]*?Object\.values\(EMERGENCY_DISPATCH_ACTIONS\)\.includes/
  );

  assert.match(
    source,
    /isCanonicalEmergencyThread &&[\s\S]*?canonicalEmergencyDispatchAction \? \([\s\S]*?data-canonical-emergency-dispatch-action/
  );

  assert.match(
    source,
    /onClick=\{\(\) =>[\s\S]*?advanceEmergencyFromChat\([\s\S]*?canonicalEmergencyDispatchAction/
  );

  assert.match(
    source,
    /disabled=\{canonicalDispatchPending\}/
  );
});

test("canonical Emergency dispatch labels stay mapped to the four governed server actions", () => {
  for (const [action, languageKey] of [
    ["MARK_EN_ROUTE", "onTheWay"],
    ["MARK_ARRIVED", "markArrived"],
    ["START_WORK", "startWork"],
    ["COMPLETE_WORK", "completeService"],
  ]) {
    assert.match(
      source,
      new RegExp(
        `EMERGENCY_DISPATCH_ACTIONS\\.${action}\\]:[\\s\\S]*?t\\("${languageKey}", language\\)`
      )
    );
  }
});

test("canonical Emergency dispatch remains server-owned and refreshes canonical truth", () => {
  const start = source.indexOf(
    "const advanceEmergencyFromChat = async"
  );
  const end = source.indexOf(
    "const emergencyStatusSubtitle",
    start
  );
  const handler = source.slice(start, end);

  assert.ok(start >= 0);
  assert.match(handler, /isCanonicalEmergencyThread/);
  assert.match(handler, /canonicalEmergencyAllowedActions\.includes/);
  assert.match(handler, /transitionEmergencyDispatch/);
  assert.match(handler, /setCanonicalReloadKey/);

  const canonicalBranchEnd = handler.indexOf(
    "if (!isLegacyEmergencyThread) return;"
  );
  const canonicalBranch = handler.slice(0, canonicalBranchEnd);

  assert.doesNotMatch(
    canonicalBranch,
    /transitionEmergencyStatus/
  );
  assert.doesNotMatch(
    canonicalBranch,
    /localStorage\.setItem/
  );
});

test("completed canonical Emergency does not expose another dispatch action", () => {
  assert.match(
    source,
    /canonicalEmergencyDispatchAction \? \(/
  );
  assert.doesNotMatch(
    source,
    /EMERGENCY_DISPATCH_ACTIONS\.(?:CLOSE|ARCHIVE|INVOICE|COMPLETE_JOB)/
  );
});
