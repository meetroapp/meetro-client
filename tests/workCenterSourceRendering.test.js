import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { readFileSync } from "node:fs";
const certified=JSON.parse(readFileSync(new URL("./fixtures/emergencyCertifiedResponses.json",import.meta.url)));
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

// Render the captured certified server responses; normal backward compatibility remains explicit.
test("source controls, invoice credits and Paid identity render from supplied canonical presentation data", async (t) => {
  const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false } });
  try {
    const { WorkCenterSourceBadge, WorkCenterSourceFilter } = await vite.ssrLoadModule("/src/components/WorkCenterSource.jsx");
    const { default: Invoice } = await vite.ssrLoadModule("/src/components/CanonicalInvoiceDetail.jsx");
    const emergency = certified.picker.jobs[0];
    const ordinary = { requestId: 12, relationshipId: 7 };
    const render = (Component, props) => new JSDOM(renderToStaticMarkup(React.createElement(Component, props))).window.document;
    await t.test("badges use the existing SVG icon and exact source labels", () => {
      const doc = render(WorkCenterSourceBadge, { record: emergency });
      assert.equal(doc.querySelector('[data-job-source="emergency"]').textContent, "Emergency");
      assert.ok(doc.querySelector("svg"));
      assert.equal(render(WorkCenterSourceBadge, { record: ordinary }).body.textContent, "Job Request");
      assert.equal(render(WorkCenterSourceBadge, { record: { authority: { kind: "BUSINESS_CUSTOMER" } } }).body.textContent, "");
    });
    await t.test("filter buttons expose selection and dispatch the selected source", () => {
      const selections = [];
      const props = { records: [ordinary, emergency], value: "emergency", onChange: (value) => selections.push(value) };
      const doc = render(WorkCenterSourceFilter, props);
      assert.deepEqual([...doc.querySelectorAll("button")].map((button) => button.textContent), ["All (2)", "Job Requests (1)", "Emergency (1)"]);
      assert.equal(doc.querySelector('[aria-pressed="true"]').textContent, "Emergency (1)");
      WorkCenterSourceFilter(props).props.children[1].props.onClick();
      assert.deepEqual(selections, ["request"]);
    });
    const invoice = certified.invoicePartial.invoice;
    await t.test("$100 Invoice preserves canonical $50 credit and $50 balance", () => {
      const doc = render(Invoice, { invoice, sourceRecord: emergency });
      assert.ok(doc.querySelector('[data-job-source="emergency"]'));
      const text = doc.body.textContent;
      assert.match(text, /\$100\.00/);
      assert.match(text, /\$50\.00/);
      assert.deepEqual([...doc.querySelector("article > div").children].map((item) => item.querySelector("strong").textContent), ["$100.00", "$50.00", "$50.00"]);
      assert.equal(doc.querySelector('[data-invoice-money="prior-applied"]').textContent, "$50.00");
    });
    await t.test("Invoice does not inherit another Job's Emergency identity", () => {
      const doc = render(Invoice, { invoice: {...invoice, sourceType:undefined, sourceLabel:undefined}, sourceRecord: { ...emergency, jobId: "different-job" } });
      assert.equal(doc.querySelector('[data-job-source="emergency"]'), null);
    });
    await t.test("final payment keeps Emergency identity and renders Paid with zero balance", () => {
      const doc = render(Invoice, { invoice: certified.invoicePaid.invoice, sourceRecord: emergency });
      assert.ok(doc.querySelector('[data-canonical-invoice-status="PAID"]'));
      assert.ok(doc.querySelector('[data-job-source="emergency"]'));
      assert.match(doc.body.textContent, /\$0\.00/);
    });
  } finally { await vite.close(); }
});
