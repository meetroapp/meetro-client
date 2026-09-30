import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );
}

const history = source(
  "src/components/CustomerCompletionHistory.jsx"
);

const home = source(
  "src/pages/Home.jsx"
);

test(
  "View History preserves accessible exact-Job navigation in the main workspace",
  () => {
    assert.match(
      home,
      /function openHistoryDetails\(request, invoker = null\)/
    );

    assert.match(
      home,
      /setCanonicalHistoryJobId\(request\.jobId\)/
    );

    assert.match(
      home,
      /canonicalHistoryInvokerRef\.current = invoker/
    );

    assert.match(
      home,
      /function HomeownerJobHistoryWorkspace/
    );

    assert.match(
      home,
      /data-homeowner-history-workspace=\{jobId\}/
    );

    assert.match(
      home,
      /className="homeowner-history-detail"/
    );

    assert.match(
      home,
      /event\.key === "Escape"/
    );

    assert.match(
      home,
      /historyReturnJobRef\.current = canonicalHistoryJobId/
    );

    assert.doesNotMatch(
      home,
      /CustomerInvoicePanel/
    );
  }
);

test(
  "full customer Job History is composed from existing customer-safe canonical reads",
  () => {
    for (const token of [
      "fetchCustomerJobHistory",
      "fetchCustomerJobQuotes",
      "fetchCustomerJobInvoice",
      "fetchCustomerJobWorkPlan",
      "fetchCustomerEfr",
    ]) {
      assert.match(
        history,
        new RegExp(token)
      );
    }

    assert.match(
      history,
      /Promise\.allSettled/
    );

    assert.doesNotMatch(
      history,
      /localStorage|sessionStorage/
    );
  }
);

test(
  "customer History adopts professional History information architecture",
  () => {
    assert.match(
      history,
      /CUSTOMER_JOB_HISTORY_TABS/
    );

    for (const tab of [
      "overview",
      "work",
      "quotes",
      "invoices",
      "documents",
    ]) {
      assert.match(
        history,
        new RegExp(`"${tab}"`)
      );
    }

    assert.match(
      history,
      /historyCopy\.documentsPhotos/
    );

    assert.match(
      history,
      /historyCopy\s*\.\s*paymentHistory/
    );
  }
);

test(
  "customer-safe preserved work, assessment, Quote and Invoice records are presented",
  () => {
    assert.match(
      history,
      /assessment\.findings/
    );

    assert.match(
      history,
      /assessment[\s\S]*recommendations/
    );

    assert.match(
      history,
      /workPlan\.workstreams/
    );

    assert.match(
      history,
      /quote\.quoteNumber/
    );

    assert.match(
      history,
      /quote\.lineageLabel/
    );

    assert.match(
      history,
      /invoice\.invoiceNumber/
    );

    assert.match(
      history,
      /invoice\.lineItems/
    );

    assert.match(
      history,
      /invoice\.payments/
    );
  }
);

test(
  "Emergency preserved-record wording remains intact",
  () => {
    assert.match(
      history,
      /history\.sourceType ===[\s\S]*"emergency_request"/
    );

    assert.match(
      history,
      /copy\.emergencyPreservedRecordBody/
    );
  }
);

test(
  "History remains exact Job scoped and read-only",
  () => {
    assert.match(
      history,
      /data-customer-job-history-job-id=\{[\s\S]*history\.jobId/
    );

    assert.match(
      history,
      /data-customer-full-job-history=\{[\s\S]*history\.jobId/
    );

    assert.match(
      history,
      /Historical records are not changed from this screen/
    );

    assert.doesNotMatch(
      history,
      /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/
    );

    assert.doesNotMatch(
      history,
      /completeCanonicalJob|recordCanonicalPayment|createCanonicalInvoice/
    );
  }
);
