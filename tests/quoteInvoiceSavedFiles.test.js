import assert from "node:assert/strict";
import test from "node:test";
import { listQuoteInvoiceSavedFiles, quoteInvoiceFileType } from "../src/utils/quoteInvoiceSavedFiles.js";

const quote = { id: "quote", documentType: "QUOTE", updatedAt: "2026-09-06T12:00:00Z" };
const invoice = { id: "invoice", documentType: "INVOICE", updatedAt: "2026-09-07T12:00:00Z" };
const deposit = { id: "deposit", documentType: "DEPOSIT_REQUEST", updatedAt: "2026-09-07T13:00:00Z" };

test("All Types makes two restricted requests, merges by id, orders by update and excludes all other types", async () => {
  const calls = [];
  const result = await listQuoteInvoiceSavedFiles({ search: "Bob", time: "30D", listDocuments: async (options) => {
    calls.push(options);
    return [quote, invoice, quote, deposit, { id: "future", documentType: "FUTURE_DOCUMENT" }, null];
  } });
  assert.deepEqual(calls, [
    { search: "Bob", time: "30D", type: "QUOTE" },
    { search: "Bob", time: "30D", type: "INVOICE" },
  ]);
  assert.deepEqual(result, [invoice, quote]);
});

test("a specific supported filter requests and returns only that exact document type", async () => {
  for (const [type, expected] of [["QUOTE", quote], ["INVOICE", invoice]]) {
    const calls = [];
    const result = await listQuoteInvoiceSavedFiles({ type, listDocuments: async (options) => {
      calls.push(options.type); return [quote, invoice, deposit];
    } });
    assert.deepEqual(calls, [type]);
    assert.deepEqual(result, [expected]);
  }
});

test("unsupported type filters fail closed without requesting the generic API", async () => {
  for (const type of ["DEPOSIT_REQUEST", "quote", "FUTURE_DOCUMENT", "__proto__", "constructor"]) {
    const result = await listQuoteInvoiceSavedFiles({ type, listDocuments: async () => assert.fail("must not request unsupported type") });
    assert.deepEqual(result, []);
  }
});

test("exact file type mapping never labels an unexpected document Invoice", () => {
  assert.deepEqual(quoteInvoiceFileType(quote), { label: "Quote", icon: "quickQuote" });
  assert.deepEqual(quoteInvoiceFileType(invoice), { label: "Invoice", icon: "quickInvoice" });
  for (const value of [deposit, { documentType: "FUTURE_DOCUMENT" }, { documentType: "invoice" }, { documentType: "__proto__" }, {}, null]) {
    assert.equal(quoteInvoiceFileType(value), null);
  }
});

test("a partial All Types failure does not present an incomplete result as a successful list", async () => {
  await assert.rejects(listQuoteInvoiceSavedFiles({ listDocuments: async ({ type }) => {
    if (type === "INVOICE") throw new Error("unavailable");
    return [quote];
  } }), /unavailable/);
});
