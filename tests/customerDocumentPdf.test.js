import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { jsPDF } from "jspdf";

import {
  buildCanonicalInvoiceDocumentModel,
  buildCanonicalQuoteDocumentModel,
  buildCustomerSafeBusinessBranding,
  buildQuickInvoiceDocumentModel,
  buildQuickQuoteDocumentModel,
} from "../src/utils/customerDocumentModel.js";
import {
  collectCustomerDocumentText,
  createCustomerDocumentPdfArtifact,
  getCustomerDocumentActionCopy,
  previewCustomerDocumentPdf,
  renderCustomerDocumentPdf,
  shareCustomerDocumentPdf,
} from "../src/utils/customerDocumentPdf.js";

const QUOTE_ID = "decf3f61-acd2-4756-b5fa-8d610eb9b8d0";
const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";

function quoteDelivery(overrides = {}) {
  return {
    source: "PROFESSIONAL_QUOTE_DELIVERY",
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    snapshot: {
      schemaVersion: 1,
      quoteId: QUOTE_ID,
      jobId: JOB_ID,
      lineageLabel: "Original",
      businessStatus: "WAITING_ON_CUSTOMER",
      totalMinor: 92000,
      currency: "USD",
      scopeItems: [
        { description: "Cabinet repair materials", quantity: 1, amountMinor: 42000 },
        { description: "Cabinet repair labor", quantity: 1, amountMinor: 50000 },
      ],
      conditions: ["Work area must be accessible."],
      exclusions: [{ description: "Concealed structural repairs", quantity: 1 }],
      issuedAt: "2026-08-16T12:00:00.000Z",
      decidedAt: null,
      business: { displayName: "Handyman LLC" },
      job: { title: "Kitchen cabinet repair", service: "Carpentry" },
      ...overrides,
    },
  };
}

function invoice(overrides = {}) {
  return {
    invoiceId: "11111111-1111-4111-8111-111111111111",
    invoiceNumber: "INV-1001",
    status: "PARTIALLY_PAID",
    currency: "USD",
    invoiceDate: "2026-08-16",
    due: { mode: "SPECIFIC_DATE", date: "2026-08-30" },
    business: { displayName: "Handyman LLC", privateAccountId: "never-render" },
    customer: { displayName: "Taylor Customer", privateEmail: "hidden@example.com" },
    job: { title: "Kitchen cabinet repair", service: "Cabinet repair" },
    lineItems: [{
      lineItemId: "22222222-2222-4222-8222-222222222222",
      description: "Completed cabinet repair",
      quantity: 1,
      unitAmountMinor: 92000,
      lineTotalMinor: 92000,
      internalCostMinor: 20000,
    }],
    subtotalMinor: 92000,
    totalMinor: 92000,
    paidMinor: 20000,
    balanceMinor: 72000,
    customerNotes: "Thank you for your business.",
    terms: "Payment due by the listed date.",
    marginMinor: 72000,
    model: "gpt-sentinel",
    provider: "provider-sentinel",
    ...overrides,
  };
}

test("canonical Quote creates an explicit customer document with authoritative total and no private fields", () => {
  const model = buildCanonicalQuoteDocumentModel(quoteDelivery(), {
    locale: "en",
    quoteContext: {
      customer: { displayName: "Taylor Customer", reviewerEmail: "hidden@example.com" },
      job: { title: "Kitchen cabinet repair" },
      internalEstimate: { materialCostMinor: 12000, marginMinor: 30000 },
    },
    branding: { phone: "555-0100", internalUserId: "private-user" },
  });
  assert.equal(model.kind, "QUOTE");
  assert.equal(model.totalMinor, 92000);
  assert.equal(model.customer.name, "Taylor Customer");
  assert.deepEqual(Object.keys(model).sort(), [
    "acceptance", "balanceMinor", "branding", "conditions", "currency", "customer",
    "customerMessage", "discountMinor", "documentDate", "documentNumber", "draft",
    "dueDate", "estimatedDuration", "exclusions", "feesMinor", "kind", "lineItems",
    "locale", "notes", "paidMinor", "paymentTerms", "projectLocation", "projectTitle",
    "schemaVersion", "scopeSummary", "status", "subtotalMinor", "taxMinor", "totalMinor",
    "warrantyNotes",
  ].sort());
  assert.doesNotMatch(collectCustomerDocumentText(model), /hidden@example|private-user|materialCost|margin|estimate|uuid|Home Depot|gpt/i);
});

test("canonical Invoice preserves only server financial truth", () => {
  const model = buildCanonicalInvoiceDocumentModel(invoice());
  assert.equal(model.totalMinor, 92000);
  assert.equal(model.paidMinor, 20000);
  assert.equal(model.balanceMinor, 72000);
  assert.equal(model.lineItems[0].lineTotalMinor, 92000);
  assert.doesNotMatch(collectCustomerDocumentText(model), /11111111|22222222|internalCost|margin|provider-sentinel|gpt-sentinel|hidden@example/i);
});

test("Quick Quote and Quick Invoice render truthful draft models without canonical save claims", () => {
  const branding = buildCustomerSafeBusinessBranding({ businessName: "Handyman LLC" });
  const quote = buildQuickQuoteDocumentModel({
    customerName: "Taylor Customer", projectTitle: "Cabinet repair", quoteDate: "2026-08-16",
    lineItems: [{ description: "Repair work", quantity: 1, unitPrice: 920, total: 920 }],
    subtotal: 920, total: 920, terms: "50% deposit", retailerReference: "private",
  }, { branding });
  const bill = buildQuickInvoiceDocumentModel({
    customerName: "Taylor Customer", serviceDescription: "Cabinet repair", invoiceDate: "2026-08-16",
    lineItems: [{ description: "Repair work", quantity: 1, unitPrice: 920, amount: 920 }],
    subtotal: 920, total: 920, paymentTerms: "Due on receipt", internalNotes: "private",
  }, { branding });
  assert.equal(quote.draft, true);
  assert.equal(quote.acceptance, "DRAFT_PREVIEW_NOT_ISSUED");
  assert.equal(bill.draft, true);
  assert.equal(bill.acceptance, "DRAFT_PREVIEW_NOT_RECORDED");
  assert.doesNotMatch(`${collectCustomerDocumentText(quote)}\n${collectCustomerDocumentText(bill)}`, /retailerReference|internalNotes|saved|delivered/i);
});

test("branding allowlist accepts safe Cloudinary logos and gracefully falls back to the business name", () => {
  const safe = buildCustomerSafeBusinessBranding({
    businessName: "Handyman LLC", logoUrl: "https://res.cloudinary.com/demo/image/upload/logo.png",
    phone: "555-0100", serviceArea: "15 miles", passwordHash: "never", apiKey: "never",
  });
  assert.equal(safe.name, "Handyman LLC");
  assert.match(safe.logoUrl, /^https:\/\/res\.cloudinary\.com/);
  assert.deepEqual(Object.keys(safe), ["name", "logoUrl", "phone", "email", "website", "region"]);
  assert.equal(safe.region, null);
  const fallback = buildCustomerSafeBusinessBranding({ logoUrl: "https://example.com/private.png" }, "Meetro Pro");
  assert.equal(fallback.name, "Meetro Pro");
  assert.equal(fallback.logoUrl, null);
});

test("fixed-price Quick Quote PDF keeps work scope clean and suppresses empty pricing rows", () => {
  const model = buildQuickQuoteDocumentModel({
    projectTitle: "Synthetic wall repair",
    customerName: "",
    customerLocation: "",
    recommendedSolution: "Repair the cracked wall and paint to match. Duration 3–4 days. Final price $2,650. 50% deposit.",
    lineItems: [
      { description: "Repair labor", quantity: 1, unitPrice: 0, total: 0 },
      { description: "Materials", quantity: 1, unitPrice: 0, total: 0 },
    ],
    subtotal: 0,
    total: 2650,
    terms: "50% deposit",
    estimatedDuration: "3–4 days",
    fixedPrice: true,
  }, {
    branding: { businessName: "Handyman LLC", serviceArea: "15 miles" },
  });
  assert.equal(model.scopeSummary, "Repair the cracked wall and paint to match.");
  assert.equal(model.paymentTerms, "50% deposit required");
  assert.equal(model.lineItems.length, 0);
  assert.equal(model.subtotalMinor, null);
  assert.equal(model.totalMinor, 265000);
  assert.equal(model.customer.name, null);
  assert.equal(model.projectLocation, null);
  assert.equal(model.branding.region, null);

  const commands = renderCustomerDocumentPdf(model).internal.pages.flat().join("\n");
  assert.equal((commands.match(/Scope of Work/g) || []).length, 1);
  assert.doesNotMatch(commands, /\$0\.00|15 miles|\(CUSTOMER\)|Duration 3|Final price|50% deposit\.\)/);
  assert.match(commands, /\(50% deposit required\)/);
  assert.match(commands, /\(\$2,650\.00\)/);
  assert.match(commands, /\(DRAFT PREVIEW\)/);
});

test("renderer creates a real searchable multi-page PDF and long rows paginate", () => {
  const base = buildQuickQuoteDocumentModel({
    customerName: "Taylor Customer", projectTitle: "Large renovation", quoteDate: "2026-08-16",
    lineItems: Array.from({ length: 70 }, (_, index) => ({
      description: `Detailed customer-facing scope item ${index + 1} with enough words to wrap safely across the document table`,
      quantity: 1, unitPrice: 100, total: 100,
    })),
    subtotal: 7000, total: 7000, terms: "Customer-facing terms.",
  }, { branding: { businessName: "Handyman LLC" } });
  const doc = renderCustomerDocumentPdf(base);
  assert.ok(doc.getNumberOfPages() > 1);
  const artifact = createCustomerDocumentPdfArtifact(base);
  assert.equal(artifact.blob.type, "application/pdf");
  assert.ok(artifact.blob.size > 2000);
  assert.match(artifact.fileName, /^Quote-/);
});

test("share uses the actual PDF file and never degrades into text-only success", async () => {
  const model = buildQuickInvoiceDocumentModel({
    invoiceNumber: "INV-1001", customerName: "Taylor", serviceDescription: "Repair",
    lineItems: [{ description: "Repair", quantity: 1, unitPrice: 100, amount: 100 }],
    subtotal: 100, total: 100,
  }, { branding: { businessName: "Handyman LLC" } });
  const calls = [];
  const result = await shareCustomerDocumentPdf({
    model,
    message: "Please review the attached PDF.",
    platform: "web",
    isNative: false,
    webShare: async (payload) => calls.push(payload),
    canShare: ({ files }) => files.length === 1 && files[0].type === "application/pdf",
    download: () => { throw new Error("download fallback should not run"); },
  });
  assert.equal(result.method, "web-pdf");
  assert.equal(calls[0].files.length, 1);
  assert.equal(calls[0].files[0].type, "application/pdf");
  assert.match(calls[0].text, /attached PDF/);
});

test("native mobile sharing receives a PDF artifact and desktop falls back to PDF download", async () => {
  const model = buildQuickQuoteDocumentModel({
    quoteNumber: "QQ-1001", customerName: "Taylor", projectTitle: "Repair",
    lineItems: [{ description: "Repair", quantity: 1, unitPrice: 100, total: 100 }],
    subtotal: 100, total: 100,
  }, { branding: { businessName: "Handyman LLC" } });
  const native = [];
  const nativeResult = await shareCustomerDocumentPdf({
    model,
    platform: "ios",
    isNative: true,
    nativePdfShare: async (artifact) => native.push(artifact),
    webShare: null,
  });
  assert.equal(nativeResult.method, "native-pdf");
  assert.equal(native[0].blob.type, "application/pdf");
  assert.match(native[0].fileName, /\.pdf$/);

  const downloads = [];
  const desktopResult = await shareCustomerDocumentPdf({
    model,
    platform: "web",
    isNative: false,
    webShare: null,
    canShare: null,
    download: (value) => {
      downloads.push(value);
      return true;
    },
  });
  assert.equal(desktopResult.method, "download");
  assert.equal(downloads[0], model);
});

test("PDF preview opens the current customer-safe artifact without changing document authority", () => {
  const model = buildQuickQuoteDocumentModel({
    quoteNumber: "QQ-1002", customerName: "Taylor", projectTitle: "Repair",
    lineItems: [{ description: "Repair", quantity: 1, unitPrice: 100, total: 100 }],
    subtotal: 100, total: 100,
  }, { branding: { businessName: "Handyman LLC" } });
  const calls = [];
  const urlApi = {
    createObjectURL(blob) { calls.push(["create", blob.type]); return "blob:quote-preview"; },
    revokeObjectURL(url) { calls.push(["revoke", url]); },
  };
  const result = previewCustomerDocumentPdf(model, {
    urlApi,
    openWindow(url, target, features) {
      calls.push(["open", url, target, features]);
      return {};
    },
    scheduleRevoke(callback, delay) {
      calls.push(["schedule", delay]);
      callback();
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.method, "pdf-preview");
  assert.deepEqual(calls, [
    ["create", "application/pdf"],
    ["open", "blob:quote-preview", "_blank", "noopener,noreferrer"],
    ["schedule", 60000],
    ["revoke", "blob:quote-preview"],
  ]);
  assert.equal(model.draft, true);
  assert.equal(model.acceptance, "DRAFT_PREVIEW_NOT_ISSUED");
});

test("PDF preview succeeds when noopener returns a null window and cleans up only on delay", () => {
  const model = buildQuickQuoteDocumentModel({
    quoteNumber: "QQ-1003", customerName: "Taylor", projectTitle: "Repair",
    lineItems: [{ description: "Repair", quantity: 1, unitPrice: 100, total: 100 }],
    subtotal: 100, total: 100,
  }, { branding: { businessName: "Handyman LLC" } });
  const calls = [];
  let delayedCleanup;
  const result = previewCustomerDocumentPdf(model, {
    urlApi: {
      createObjectURL: () => "blob:null-window-preview",
      revokeObjectURL: (url) => calls.push(["revoke", url]),
    },
    openWindow: (url, target, features) => {
      calls.push(["open", url, target, features]);
      return null;
    },
    scheduleRevoke: (callback, delay) => {
      calls.push(["schedule", delay]);
      delayedCleanup = callback;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.method, "pdf-preview");
  assert.deepEqual(calls, [["open", "blob:null-window-preview", "_blank", "noopener,noreferrer"], ["schedule", 60000]]);
  delayedCleanup();
  assert.deepEqual(calls, [
    ["open", "blob:null-window-preview", "_blank", "noopener,noreferrer"],
    ["schedule", 60000],
    ["revoke", "blob:null-window-preview"],
  ]);
});

test("metadata box grows around wrapped Project values and contains Scope of Work", () => {
  const model = buildQuickQuoteDocumentModel({
    customerName: "Paul Becker",
    projectTitle: "Reconstruct the damaged front knee wall",
    quoteDate: "2026-08-16",
    recommendedSolution: "Repair the damaged wall.",
    lineItems: [],
    subtotal: 0,
    total: 2650,
  }, { branding: { businessName: "Handyman LLC" } });
  const rectangles = [];
  const texts = [];
  class RecordingJsPDF extends jsPDF {
    constructor(...args) {
      super(...args);
      const rect = this.rect.bind(this);
      const text = this.text.bind(this);
      this.rect = (...rectArgs) => {
        rectangles.push(rectArgs);
        return rect(...rectArgs);
      };
      this.text = (...textArgs) => {
        texts.push(textArgs);
        return text(...textArgs);
      };
    }
  }
  renderCustomerDocumentPdf(model, { jsPDFImpl: RecordingJsPDF });
  const metadataRect = rectangles.find(([, , width, , style]) => width === 516 && style === "FD");
  assert.ok(metadataRect);
  assert.ok(metadataRect[3] > 34);
  const projectText = texts.find(([value]) => Array.isArray(value) && value.includes("Reconstruct the damaged"));
  assert.ok(projectText);
  assert.ok(projectText[0].length >= 2);
  assert.ok(projectText[2] + (projectText[0].length - 1) * 8.5 * 1.25 < metadataRect[1] + metadataRect[3]);
  const scopeText = texts.find(([value]) => Array.isArray(value) && value[0] === "Scope of Work");
  assert.ok(scopeText);
  assert.ok(scopeText[2] > metadataRect[1] + metadataRect[3]);
});

test("single-line metadata keeps the original 34pt box height", () => {
  const model = buildQuickQuoteDocumentModel({
    customerName: "Paul Becker", projectTitle: "Repair", quoteDate: "2026-08-16",
    lineItems: [], subtotal: 0, total: 100,
  }, { branding: { businessName: "Handyman LLC" } });
  const rectangles = [];
  class RecordingJsPDF extends jsPDF {
    constructor(...args) {
      super(...args);
      const rect = this.rect.bind(this);
      this.rect = (...rectArgs) => {
        rectangles.push(rectArgs);
        return rect(...rectArgs);
      };
    }
  }
  renderCustomerDocumentPdf(model, { jsPDFImpl: RecordingJsPDF });
  const metadataRect = rectangles.find(([, , width, , style]) => width === 516 && style === "FD");
  assert.equal(metadataRect[3], 34);
});

test("customer document actions have EN ES FR PT-BR parity and Quick controls remain bounded", () => {
  for (const locale of ["en", "es", "fr", "pt-BR"]) {
    const copy = getCustomerDocumentActionCopy(locale);
    assert.ok(copy.exportPdf);
    assert.ok(copy.sharePdf);
  }
  const quoteSource = readFileSync(new URL("../src/pages/QuoteBuilder.jsx", import.meta.url), "utf8");
  const invoiceSource = readFileSync(new URL("../src/pages/InvoiceBuilder.jsx", import.meta.url), "utf8");
  assert.match(quoteSource, /buildQuickQuoteDocumentModel/);
  assert.match(invoiceSource, /buildQuickInvoiceDocumentModel/);
  assert.match(quoteSource, /const secondaryActionButton = \{[\s\S]{0,120}minHeight: "44px"/);
  assert.match(invoiceSource, /const secondaryBtn = \{[\s\S]{0,120}minHeight: "44px"/);
  assert.doesNotMatch(`${quoteSource}\n${invoiceSource}`, /Quote saved|Invoice saved|Quote delivered|Invoice delivered/);
});
