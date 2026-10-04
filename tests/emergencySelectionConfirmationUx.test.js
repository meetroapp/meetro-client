import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL(
    "../src/pages/EmergencyRequest.jsx",
    import.meta.url
  ),
  "utf8"
);

function block(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(
    endText,
    start
  );

  assert.ok(
    start >= 0,
    `missing block start: ${startText}`
  );
  assert.ok(
    end > start,
    `missing block end: ${endText}`
  );

  return source.slice(start, end);
}

test(
  "Available Now selection confirmation is viewport owned",
  () => {
    assert.match(
      source,
      /const selectionDialogBackdrop = \{[\s\S]*position: "fixed"[\s\S]*inset: 0[\s\S]*zIndex: 1200/
    );

    assert.match(
      source,
      /maxHeight: "calc\(100dvh - 32px\)"/
    );

    const availableDialog = block(
      "{selectedAvailableProfessional && (",
      "{cancelConfirmationOpen && ("
    );

    assert.match(
      availableDialog,
      /style=\{selectionDialogBackdrop\}/
    );

    assert.match(
      availableDialog,
      /ref=\{selectionDialogRef\}/
    );

    assert.match(
      availableDialog,
      /tabIndex=\{-1\}/
    );

    assert.match(
      availableDialog,
      /aria-modal="true"/
    );

    assert.match(
      availableDialog,
      /confirmAvailableProfessionalSelection/
    );
  }
);

test(
  "professional response selection uses the same viewport confirmation",
  () => {
    const responseDialog = block(
      "{selectedResponse && (",
      "{selectedAvailableProfessional && ("
    );

    assert.match(
      responseDialog,
      /style=\{selectionDialogBackdrop\}/
    );

    assert.match(
      responseDialog,
      /ref=\{selectionDialogRef\}/
    );

    assert.match(
      responseDialog,
      /tabIndex=\{-1\}/
    );

    assert.match(
      responseDialog,
      /confirmProfessionalSelection/
    );
  }
);

test(
  "opening a selection focuses the visible dialog without scrolling the page",
  () => {
    assert.match(
      source,
      /selectionDialogRef\.current\?\.focus\(\{[\s\S]*preventScroll: true/
    );

    const focusEffect = block(
      "if (\n      !selectedResponse &&\n      !selectedAvailableProfessional",
      "const controller = routeSessionController;"
    );

    assert.doesNotMatch(
      focusEffect,
      /scrollIntoView/
    );
  }
);

test(
  "first Available Now tap remains confirmation-only",
  () => {
    const requestBlock = block(
      "function requestAvailableProfessionalSelectionById",
      "async function confirmAvailableProfessionalSelection"
    );

    assert.match(
      requestBlock,
      /setSelectedAvailableProfessional/
    );

    assert.doesNotMatch(
      requestBlock,
      /selectHomeownerAvailableEmergencyProfessional/
    );

    const confirmBlock = block(
      "async function confirmAvailableProfessionalSelection",
      "function requestProfessionalSelection"
    );

    assert.match(
      confirmBlock,
      /selectHomeownerAvailableEmergencyProfessional/
    );
  }
);
