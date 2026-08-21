import assert from "node:assert/strict";
import test from "node:test";

import {
  openBusinessDocumentEmailDraft,
  shareBusinessDocumentPdfArtifact,
} from "../src/utils/businessDocumentDeviceShare.js";

function artifact() {
  return Object.freeze({
    blob: new Blob(["%PDF-saved-version-10"], { type: "application/pdf" }),
    fileName: "quote-WQ-TEST-PARITY-v10.pdf",
    contentType: "application/pdf",
    documentId: "11111111-1111-4111-8111-111111111111",
    documentVersion: 10,
  });
}

for (const platform of ["ios", "android"]) {
  test(`${platform} native share hands the exact saved PDF artifact to the system share sheet`, async () => {
    const calls = [];
    const result = await shareBusinessDocumentPdfArtifact({
      artifact: artifact(),
      isNative: true,
      platform,
      nativeShareArtifactImpl: async (value) => calls.push(value),
    });
    assert.equal(result.ok, true);
    assert.equal(result.method, "native-pdf");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].documentVersion, 10);
    assert.equal(calls[0].fileName, "quote-WQ-TEST-PARITY-v10.pdf");
  });
}

test("compatible desktop Web Share uses a PDF File and exact saved filename", async () => {
  const shared = [];
  const capabilities = [];
  const result = await shareBusinessDocumentPdfArtifact({
    artifact: artifact(),
    isNative: false,
    navigatorObject: {
      canShare(value) { capabilities.push(value); return true; },
      async share(value) { shared.push(value); },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.method, "web-pdf");
  assert.equal(capabilities[0].files[0].name, "quote-WQ-TEST-PARITY-v10.pdf");
  assert.equal(shared[0].files[0].type, "application/pdf");
});

test("unsupported desktop sharing falls back without claiming send or delivery", async () => {
  const result = await shareBusinessDocumentPdfArtifact({ artifact: artifact(), isNative: false, navigatorObject: {} });
  assert.deepEqual(result, { ok: false, method: "fallback" });
});

test("email-draft fallback says the professional must attach the downloaded PDF", () => {
  const locationObject = { href: "" };
  assert.equal(openBusinessDocumentEmailDraft({
    recipient: "jack@example.test",
    subject: "Quote WQ-TEST-PARITY",
    message: "Please review.",
    locationObject,
  }), true);
  const decoded = decodeURIComponent(locationObject.href);
  assert.match(decoded, /^mailto:jack@example\.test/);
  assert.match(decoded, /Please attach the downloaded PDF before sending/);
  assert.doesNotMatch(decoded, /PDF (?:is|was) attached|sent|delivered/i);
});

test("cancelling the system share sheet does not claim an external handoff", async () => {
  const result = await shareBusinessDocumentPdfArtifact({
    artifact: artifact(),
    isNative: true,
    platform: "ios",
    nativeShareArtifactImpl: async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); },
  });
  assert.deepEqual(result, { ok: false, method: "cancelled" });
});
