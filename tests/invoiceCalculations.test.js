import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateInvoiceLineItemAmount,
  calculateInvoiceTotals,
  moneyValue,
  normalizeInvoiceLineItems,
} from "../src/utils/invoiceCalculations.js";

test("invoice line item total calculation uses quantity and unit price", () => {
  assert.equal(
    calculateInvoiceLineItemAmount({ quantity: "2", unitPrice: "125.50" }),
    251
  );
});

test("invoice totals use line item subtotal when line items exist", () => {
  const totals = calculateInvoiceTotals({
    lineItems: [
      { description: "Labor", quantity: 3, unitPrice: 100 },
      { description: "Materials", quantity: 1, unitPrice: 80 },
    ],
    labor: "999",
    discount: "30",
    tax: "12",
  });

  assert.equal(totals.subtotal, 380);
  assert.equal(totals.discountTotal, 30);
  assert.equal(totals.taxTotal, 12);
  assert.equal(totals.totalDue, 362);
  assert.equal(totals.usesLineItems, true);
});

test("invoice totals preserve fallback labor and materials compatibility", () => {
  const totals = calculateInvoiceTotals({
    labor: "250",
    materials: "$75",
    serviceFee: "25",
    otherCharges: "10",
    discount: "20",
    tax: "8",
  });

  assert.equal(totals.subtotal, 360);
  assert.equal(totals.totalDue, 348);
  assert.equal(totals.usesLineItems, false);
});

test("invoice totals include supported fees when line items exist", () => {
  const totals = calculateInvoiceTotals({
    lineItems: [{ type: "labor", quantity: 2, unitPrice: 100 }],
    serviceFee: "25",
    otherCharges: "10",
  });

  assert.equal(totals.subtotal, 235);
  assert.equal(totals.totalDue, 235);
  assert.equal(totals.usesLineItems, true);
});

test("invoice total due never goes below zero after discount", () => {
  const totals = calculateInvoiceTotals({
    lineItems: [{ quantity: 1, unitPrice: 50 }],
    discount: 100,
  });

  assert.equal(totals.totalDue, 0);
});

test("invoice line items normalize known object fields and amounts", () => {
  assert.deepEqual(
    normalizeInvoiceLineItems([
      {
        id: "custom",
        category: "materials",
        description: "Paint",
        quantity: "2",
        unit_price: "40",
      },
    ]),
    [
      {
        id: "custom",
        type: "materials",
        description: "Paint",
        quantity: "2",
        unitPrice: "40",
        amount: 80,
      },
    ]
  );
});

test("money values strip currency formatting safely", () => {
  assert.equal(moneyValue("$1,250.75"), 1250.75);
  assert.equal(moneyValue("not a price"), 0);
});
