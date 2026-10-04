import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

test("Invoice list headline uses canonical Invoice total rather than remaining balance", () => {
  const source = read("../src/components/ProfessionalInvoiceWorkspace.jsx");
  const start = source.indexOf("workspace.invoices.map");
  const end = source.indexOf("</section>", start);
  const invoiceList = source.slice(start, end);

  assert.ok(start >= 0);
  assert.match(
    invoiceList,
    /money\(invoice\.totalMinor,\s*invoice\.currency\)/
  );
  assert.doesNotMatch(
    invoiceList,
    /money\(invoice\.balanceMinor,\s*invoice\.currency\)/
  );
  assert.match(invoiceList, /invoice\.status === "PAID" \? copy\.paid/);
});

test("Customer History prefers canonical date-only Invoice payment date", () => {
  const source = read("../src/pages/CustomerRelationshipsCenter.jsx");

  assert.match(
    source,
    /item\.receivedDate \|\| item\.receivedAt/
  );

  // Existing date-only presentation deliberately constructs a local-noon
  // calendar value so YYYY-MM-DD does not shift to the previous day.
  assert.match(
    source,
    /`\$\{source\}T12:00:00`/
  );
});
