import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { cwd } from "node:process";

test("loaded history preserves rows and exposes a localized page failure with retry", async () => {
  const vite = await createServer({ root: cwd(), configFile: false, cacheDir: "/tmp/task63j4a-history-vite", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false } });
  try {
    const { default: History } = await vite.ssrLoadModule("/src/components/ProfessionalJobHistoryWorkspace.jsx");
    const history = { contractVersion: 1, totalCount: 1, jobs: [{ jobId: "11111111-1111-4111-8111-111111111111", customerName: "Fixture Customer", serviceTitle: "Fixture Job", completedAt: "2026-09-28T12:00:00Z", approvedQuote: null, sourceType: "ordinary_request" }], pagination: { limit: 20, nextCursor: "opaque-cursor" } };
    const html = renderToString(React.createElement(History, { sourceState: { status: "ready", history, error: "JOB_HISTORY_FAILED", loadingMore: false }, language: "en", onRetry() {}, onLoadMore() {} }));
    assert.match(html, /Fixture Customer/);
    assert.match(html, /role="alert"/);
    assert.match(html, /Retry/);
  } finally {
    await vite.close();
  }
});
