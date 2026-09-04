import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(
    process.cwd(),
    "src",
    "components",
    "CanonicalJobEvaluation.jsx"
  ),
  "utf8"
);

test("Evaluation edit ownership is scoped to Job Request and Relationship", () => {
  assert.match(
    source,
    /const evaluationScopeRef = useRef\(""\)/
  );

  assert.match(
    source,
    /`\$\{jobId\}:\$\{requestId\}:\$\{relationshipId \|\| ""\}`/
  );

  assert.match(
    source,
    /evaluationScopeRef\.current !== scopeKey/
  );
});

test("same-record refresh preserves the active unsaved Evaluation form", () => {
  assert.match(
    source,
    /const preserveEditingDraft =[\s\S]*!scopeChanged[\s\S]*editingRef\.current[\s\S]*!forceServerReload[\s\S]*!serverReadOnly/
  );

  assert.match(
    source,
    /if \(!preserveEditingDraft\) \{\s*setForm\(formForEvaluation\(evaluation\)\);\s*\}/
  );
});

test("authority identity change resets Evaluation editing", () => {
  assert.match(
    source,
    /if \(scopeChanged\) \{[\s\S]*editingRef\.current = false;[\s\S]*setEditing\(false\);/
  );

  assert.match(
    source,
    /setDocumentationReminderDismissed\(false\)/
  );
});

test("completed or server-read-only Evaluation closes local editing", () => {
  assert.match(
    source,
    /evaluation\.evaluation\?\.status === "completed"/
  );

  assert.match(
    source,
    /evaluation\.evaluation\?\.capabilities\?\.canEditDraft !== true/
  );

  assert.match(
    source,
    /if \(serverReadOnly\) \{[\s\S]*setEditing\(false\);/
  );
});

test("stale Evaluation conflicts force canonical server reload", () => {
  const forced =
    source.match(
      /forceEvaluationReloadRef\.current = true;/g
    ) || [];

  assert.equal(forced.length, 2);

  assert.match(
    source,
    /const forceServerReload =\s*forceEvaluationReloadRef\.current/
  );
});

test("successful Evaluation save still adopts confirmed server truth and closes editing", () => {
  const start =
    source.indexOf("async function saveEvaluation()");

  const end =
    source.indexOf(
      "function reviewFindingsAndRecommendations()",
      start
    );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const block = source.slice(start, end);

  assert.match(
    block,
    /setForm\(formForEvaluation\(confirmed\)\)/
  );

  assert.match(
    block,
    /setEditing\(false\)/
  );
});
