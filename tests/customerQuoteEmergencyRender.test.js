import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { normalizeCustomerJobQuotes } from "../src/utils/customerJobQuotesApi.js";
import { normalizeCustomerQuoteDetail } from "../src/utils/customerQuoteDetailApi.js";

const jobId = "60000000-0000-4000-8000-000000000006";
const quoteId = "10000000-0000-4000-8000-000000000001";
const issuedAt = "2026-08-12T12:00:00.000Z";
const summary = {
  quoteId, jobId, businessStatus: "WAITING_ON_CUSTOMER", status: "ISSUED",
  customerDecision: null, totalMinor: 92500, currency: "USD",
  lineageLabel: "Original", createdAt: issuedAt, updatedAt: issuedAt,
  issuedAt, decidedAt: null,
  actions: { canViewQuote: true, canApprove: true, canDecline: true },
};

test("shared customer review renders the exact Emergency Quote with null requestId", async () => {
  const discovery = normalizeCustomerJobQuotes({
    success: true, code: "CUSTOMER_JOB_QUOTES_LOADED",
    job: { id: jobId, sourceType: "emergency_request", requestId: null,
      title: "Emergency leak", service: "Plumbing", issuerName: "ABC Plumbing" },
    quotes: [summary],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  }, { jobId });
  const detail = normalizeCustomerQuoteDetail({
    success: true, code: "CUSTOMER_QUOTE_FOUND",
    quote: {
      quoteId, jobId, status: "ISSUED", businessStatus: "WAITING_ON_CUSTOMER",
      customerDecision: null, lineageLabel: "Original", totalMinor: 92500,
      currency: "USD", scopeItems: [{ description: "Repair leak", quantity: 1,
        amountMinor: 92500 }], conditions: [], exclusions: [], issuedAt,
      decidedAt: null, decisionCommandVersion: 3,
      actions: { canViewQuote: true, canApprove: true, canDecline: true },
    },
  }, { quoteId, jobId });
  assert.ok(discovery);
  assert.ok(detail);
  const cacheDir = await mkdtemp(join(tmpdir(), "task62a-review-"));
  const vite = await createServer({ configFile: false, cacheDir,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const { default: CustomerQuoteReviewPanel } = await vite.ssrLoadModule(
      "/src/components/CustomerQuoteReviewPanel.jsx"
    );
    const html = renderToString(React.createElement(CustomerQuoteReviewPanel, {
      language: "en", discovery: { status: "confirmed", quotes: discovery },
      detail: { status: "confirmed", quoteId, detail }, selectedQuoteId: quoteId,
    }));
    assert.match(html, /Emergency leak/);
    assert.match(html, /ABC Plumbing/);
    assert.match(html, /Repair leak/);
    assert.match(html, /customer-quote-detail-title/);
  } finally {
    await vite.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
