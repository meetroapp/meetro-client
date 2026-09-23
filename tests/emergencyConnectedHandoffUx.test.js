import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const requestSource = readFileSync(
  new URL(
    "../src/pages/EmergencyRequest.jsx",
    import.meta.url
  ),
  "utf8"
);

const detailSource = readFileSync(
  new URL(
    "../src/components/EmergencyRelationshipDetail.jsx",
    import.meta.url
  ),
  "utf8"
);

function block(startText, endText) {
  const start = requestSource.indexOf(startText);
  const end = requestSource.indexOf(
    endText,
    start
  );

  assert.ok(
    start >= 0,
    `missing start: ${startText}`
  );

  assert.ok(
    end > start,
    `missing end: ${endText}`
  );

  return requestSource.slice(start, end);
}

test(
  "Available Now selection remains on the canonical Emergency request after success",
  () => {
    const selection = block(
      "async function confirmAvailableProfessionalSelection()",
      "function requestProfessionalSelection"
    );

    assert.match(
      selection,
      /selectHomeownerAvailableEmergencyProfessional/
    );

    assert.match(
      selection,
      /setCanonicalConversationId/
    );

    assert.match(
      selection,
      /await refreshCanonicalRequestAfterMutation\(\)/
    );

    assert.doesNotMatch(
      selection,
      /setPage\(\s*buildCanonicalConversationRoute/
    );
  }
);

test(
  "professional response selection uses the same Connected handoff",
  () => {
    const selection = block(
      "async function confirmProfessionalSelection()",
      "return ("
    );

    assert.match(
      selection,
      /selectHomeownerEmergencyResponse/
    );

    assert.match(
      selection,
      /setCanonicalConversationId/
    );

    assert.match(
      selection,
      /await refreshCanonicalRequestAfterMutation\(\)/
    );

    assert.doesNotMatch(
      selection,
      /setPage\(\s*buildCanonicalConversationRoute/
    );
  }
);

test(
  "Connected presentation already exposes explicit Message Professional action",
  () => {
    assert.match(
      detailSource,
      /selectedStatus: "Professional Connected"/
    );

    assert.match(
      detailSource,
      /messageProfessional: "Message Professional"/
    );

    assert.match(
      detailSource,
      /detail\.conversation\.available/
    );

    assert.match(
      detailSource,
      /onClick: onOpenConversation/
    );
  }
);

test(
  "conversation navigation remains explicit and preserves Emergency return route",
  () => {
    const openConversation = block(
      "function openCanonicalEmergencyConversation()",
      "async function confirmProfessionalSelection()"
    );

    assert.match(
      openConversation,
      /buildCanonicalConversationRoute/
    );

    assert.match(
      openConversation,
      /buildEmergencyRequestRoute\(canonicalRequestId\)/
    );

    assert.match(
      openConversation,
      /shell:\s*"communicationCenter"/
    );

    assert.match(
      openConversation,
      /setPage/
    );
  }
);
