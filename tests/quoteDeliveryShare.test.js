import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQuoteEmailUrl,
  buildQuoteSharePresentation,
  copyQuoteDetails,
  shareQuoteExternally,
} from "../src/utils/quoteDeliveryShare.js";

function delivery() {
  return {
    source: "PROFESSIONAL_QUOTE_DELIVERY",
    quoteId: "decf3f61-acd2-4756-b5fa-8d610eb9b8d0",
    jobId: "7e742dc1-e2a2-49c6-a493-11e351c80d54",
    snapshot: {
      quoteId: "decf3f61-acd2-4756-b5fa-8d610eb9b8d0",
      jobId: "7e742dc1-e2a2-49c6-a493-11e351c80d54",
      totalMinor: 92000,
      currency: "USD",
      lineageLabel: "Original",
      scopeItems: [{ description: "Replace disposal", quantity: 1, amountMinor: 92000 }],
      business: { displayName: "Handyman LLC" },
    },
  };
}

test("external presentation is informational, customer-safe, localized, and has no review link", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    const presentation = buildQuoteSharePresentation(delivery(), { language });
    assert.ok(presentation.title);
    assert.match(presentation.text, /920/);
    assert.match(presentation.text, /Replace disposal/);
    assert.doesNotMatch(
      `${presentation.title}\n${presentation.text}`,
      /https?:|approve|aprobar|approuver|aprovar|cost|margin|retailer|Home Depot|Ask Meetro|idempotency|uuid/i
    );
  }
});

test("iOS uses Capacitor Share and desktop uses web share before safe copy fallback", async () => {
  const calls = [];
  assert.deepEqual(await shareQuoteExternally({
    delivery: delivery(),
    platform: "ios",
    nativeShare: async (payload) => calls.push(["native", payload]),
    webShare: async () => calls.push(["web"]),
  }), { ok: true, method: "native" });
  assert.equal(calls[0][0], "native");

  assert.deepEqual(await shareQuoteExternally({
    delivery: delivery(),
    platform: "web",
    nativeShare: null,
    webShare: async (payload) => calls.push(["web", payload]),
  }), { ok: true, method: "web" });

  assert.deepEqual(await shareQuoteExternally({
    delivery: delivery(),
    platform: "web",
    nativeShare: null,
    webShare: null,
    copy: async (text) => calls.push(["copy", text]),
  }), { ok: true, method: "copy" });
});

test("email and copy contain safe details but no public Quote link", async () => {
  const copied = [];
  assert.equal(await copyQuoteDetails({
    delivery: delivery(),
    copy: async (text) => copied.push(text),
  }), true);
  assert.match(copied[0], /Handyman LLC/);
  const email = buildQuoteEmailUrl(delivery());
  assert.match(email, /^mailto:\?subject=/);
  assert.doesNotMatch(decodeURIComponent(email), /https?:|click here|review link/i);
});
