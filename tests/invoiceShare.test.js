import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvoiceEmailUrl,
  buildInvoiceSharePresentation,
  copyInvoiceDetails,
  shareInvoiceExternally,
} from "../src/utils/invoiceShare.js";

function invoice(overrides = {}) {
  return {
    invoiceId: "11111111-1111-4111-8111-111111111111",
    invoiceNumber: "INV-111111111111",
    status: "SENT",
    currency: "USD",
    totalMinor: 92000,
    balanceMinor: 92000,
    due: { mode: "DUE_ON_RECEIPT", date: null },
    business: { displayName: "BGone Services" },
    job: { title: "Kitchen repair" },
    lineItems: [{ quantity: 1, description: "Replace disposal", lineTotalMinor: 92000 }],
    customerNotes: null,
    terms: null,
    ...overrides,
  };
}

test("external Invoice presentation contains confirmed truth and no public link", () => {
  const presentation = buildInvoiceSharePresentation(invoice());
  assert.match(presentation.text, /INV-111111111111/);
  assert.match(presentation.text, /\$920\.00/);
  assert.match(presentation.text, /Replace disposal/);
  assert.doesNotMatch(presentation.text, /https?:|token|hash|margin|cost/i);
  assert.equal(buildInvoiceSharePresentation(invoice({ status: "DRAFT" })), null);
});
test("iOS uses native Share and desktop falls through web then copy", async () => {
  const native = [];
  assert.equal((await shareInvoiceExternally({ invoice: invoice(), platform: "ios", nativeShare: async (value) => native.push(value), webShare: null, copy: null })).method, "native");
  assert.equal(native.length, 1);
  const web = [];
  assert.equal((await shareInvoiceExternally({ invoice: invoice(), platform: "web", nativeShare: null, webShare: async (value) => web.push(value), copy: null })).method, "web");
  assert.equal(web.length, 1);
  const copied = [];
  assert.equal(await copyInvoiceDetails({ invoice: invoice(), copy: async (value) => copied.push(value) }), true);
  assert.equal(copied.length, 1);
});

test("email handoff contains Invoice text without a review URL", () => {
  const url = buildInvoiceEmailUrl(invoice());
  assert.match(url, /^mailto:\?subject=/);
  assert.doesNotMatch(decodeURIComponent(url), /https?:\/\//);
});
