import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const invoiceSource = readFileSync(
  new URL("../src/pages/InvoiceBuilder.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("Invoice Builder does not treat browser storage as invoice persistence", () => {
  assert.doesNotMatch(invoiceSource, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(invoiceSource, /activeInvoice|meetro_customer_invoice_history/);
  assert.doesNotMatch(invoiceSource, /saveInvoice|persistInvoice|Invoice saved|Factura guardada/);
  assert.doesNotMatch(invoiceSource, /invoiceStatus|receiptStatus/);
  assert.doesNotMatch(invoiceSource, /createdAt:\s*new Date|savedAt|sentAt/);
  assert.doesNotMatch(invoiceSource, /INV-\$\{Date\.now|Date\.now\(\).*invoice/i);
});

test("Invoice Builder cannot simulate delivery or cross-user workflow state", () => {
  assert.doesNotMatch(invoiceSource, /sendInvoice|navigator\.share/);
  assert.doesNotMatch(invoiceSource, /workflow_invoice_request|payment_requested/);
  assert.doesNotMatch(invoiceSource, /createNotification|markConversationUnreadForRecipient/);
  assert.doesNotMatch(invoiceSource, /meetroInvoiceUpdated|meetro-messages-updated/);
  assert.doesNotMatch(invoiceSource, /getBusinessSchedule|saveBusinessSchedule/);
  assert.doesNotMatch(invoiceSource, /Invoice sent|Factura enviada|deliveredAt/);
});

test("Invoice Builder presents a clear unavailable state and retains truthful review", () => {
  assert.match(invoiceSource, /Invoice saving and delivery are not available yet\./);
  assert.match(
    invoiceSource,
    /You can prepare and review this invoice on this page, but it is not saved or delivered to the customer\./
  );
  assert.doesNotMatch(invoiceSource, />\s*Save Invoice\s*</);
  assert.doesNotMatch(invoiceSource, />\s*Send Invoice\s*</);
  assert.match(invoiceSource, /Preview Invoice/);
  assert.match(invoiceSource, /Copy Summary/);
  assert.match(invoiceSource, /Print Invoice/);
  assert.match(invoiceSource, /navigator\.clipboard\?\.writeText/);
  assert.match(invoiceSource, /window\.print/);
});

test("Invoice preparation, totals, editing, and responsive containment remain intact", () => {
  assert.match(invoiceSource, /calculateInvoiceTotals/);
  assert.match(invoiceSource, /function buildInvoicePayload/);
  assert.match(invoiceSource, /function addLineItem/);
  assert.match(invoiceSource, /function updateLineItem/);
  assert.match(invoiceSource, /function removeLineItem/);
  assert.match(invoiceSource, /className="app-page meetro-form-page"/);
  assert.match(invoiceSource, /maxWidth: "100%"/);
  assert.match(invoiceSource, /overflowX: "hidden"/);
  assert.match(invoiceSource, /<BottomNav/);
});

test("Invoice Builder direct routing remains professional-only", () => {
  assert.match(appSource, /const professionalOnlyPages = \[[\s\S]*"invoiceBuilder"/);
  assert.match(appSource, /if \(page === "invoiceBuilder"\) \{/);
  assert.match(appSource, /!hasToken[\s\S]*window\.location\.hash = "login"/);
});
