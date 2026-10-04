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
test("Invoice sharing delegates the exact server PDF artifact", async () => {
  const shared = [];
  assert.equal((await shareInvoiceExternally({
    invoice: invoice(),
    getPdf: async () => ({ blob: new Blob(["%PDF-1.4"]), fileName: "Invoice.pdf", contentType: "application/pdf" }),
    sharePdf: async (value) => {
      shared.push(value);
      return { ok: true, method: "web-pdf" };
    },
  })).method, "web-pdf");
  assert.equal(shared.length, 1);
  assert.equal(await shared[0].artifact.blob.text(), "%PDF-1.4");
  assert.match(shared[0].message, /INV-111111111111/);
  const copied = [];
  assert.equal(await copyInvoiceDetails({ invoice: invoice(), copy: async (value) => copied.push(value) }), true);
  assert.equal(copied.length, 1);
});

test("email handoff contains Invoice text without a review URL", () => {
  const url = buildInvoiceEmailUrl(invoice());
  assert.match(url, /^mailto:\?subject=/);
  assert.match(decodeURIComponent(url), /attach the downloaded PDF/);
  assert.doesNotMatch(decodeURIComponent(url), /https?:\/\//);
});
test('canonical PDF transport binds Invoice identity/version and accepts only actual PDF bytes',async()=>{
  const {fetchCanonicalInvoicePdf}=await import('../src/utils/invoicePaymentApi.js');
  const calls=[];
  const result=await fetchCanonicalInvoicePdf({invoiceId:invoice().invoiceId,expectedVersion:7,authFetchImpl:async(path,options)=>{
    calls.push({path,options});return {response:{ok:true,status:200},data:new Blob(['%PDF-1.4 exact document'],{type:'application/pdf'})};
  }});
  assert.equal(calls[0].path,`/professional/invoices/${invoice().invoiceId}/customer-pdf?version=7`);
  assert.equal(calls[0].options.method,'GET');assert.equal(result.invoiceId,invoice().invoiceId);
  assert.equal(await result.blob.text(),'%PDF-1.4 exact document');
});
test('canonical PDF rejects denied reads and text pretending to be PDF',async()=>{
  const {fetchCanonicalInvoicePdf}=await import('../src/utils/invoicePaymentApi.js');
  for(const [ok,type,body] of [[false,'application/pdf','%PDF-denied'],[true,'text/plain','Invoice details'],[true,'application/pdf','Invoice details']]) {
    await assert.rejects(fetchCanonicalInvoicePdf({invoiceId:invoice().invoiceId,authFetchImpl:async()=>({response:{ok,status:ok?200:403},data:new Blob([body],{type})})}),/exact Invoice PDF is unavailable/);
  }
});
