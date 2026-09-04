import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const dashboard = read("src/pages/ContractorDashboard.jsx");
const visits = read("src/components/CanonicalJobVisits.jsx");
const quoteCard = read("src/components/CanonicalQuoteCard.jsx");
const depositCard = read("src/components/ProfessionalDepositCard.jsx");

test("Meetro Work Center exposes Deposit & Scheduling after Quote & Approval", () => {
  const quoteSection = dashboard.indexOf('id="canonical-job-quotes"');
  const depositSection = dashboard.indexOf(
    'id="canonical-job-deposit-scheduling"'
  );
  const workPlanSection = dashboard.indexOf(
    'id="canonical-job-work-plan"'
  );

  assert.ok(quoteSection >= 0);
  assert.ok(depositSection > quoteSection);
  assert.ok(workPlanSection > depositSection);

  const bridge = dashboard.slice(depositSection, workPlanSection);

  assert.match(bridge, /title="Deposit & Scheduling"/);
  assert.match(bridge, /purposeFilter="APPROVED_WORK"/);
  assert.match(bridge, /showDeposit/);
  assert.match(bridge, /depositActionLabel="Request Deposit"/);
});

test("Work Center Continue Quote actually opens the Job-scoped Quote Builder", () => {
  const start = dashboard.indexOf(
    "onOpenQuote={({ quoteId, jobId, quote })"
  );
  const end = dashboard.indexOf("\n          }}", start);
  const handler = dashboard.slice(start, end);

  assert.match(handler, /quote\?\.classification === "DRAFT"/);
  assert.match(
    handler,
    /quoteBuilder\?jobId=\$\{encodeURIComponent\(jobId\)\}/
  );
});

test("read-only Job Quote card does not own Draft continuation command", () => {
  assert.doesNotMatch(
    quoteCard,
    /detail\.status === "DRAFT"[\s\S]*Continue Quote/
  );
  assert.doesNotMatch(
    quoteCard,
    /quoteBuilder\?jobId=\$\{encodeURIComponent\(jobId\)\}/
  );
});

test("Meetro Deposit CTA is Request Deposit while existing defaults remain intact", () => {
  assert.match(
    visits,
    /depositActionLabel = "Prepare Deposit Request"/
  );
  assert.match(
    visits,
    /requestActionLabel=\{depositActionLabel\}/
  );

  assert.match(
    depositCard,
    /requestActionLabel = "Prepare Deposit Request"/
  );
  assert.match(
    depositCard,
    /\{requestActionLabel\}/
  );

  assert.match(
    depositCard,
    /depositRequestBuilder\?jobId=\$\{encodeURIComponent\(jobId\)\}&quoteId=\$\{encodeURIComponent\(quoteId\)\}/
  );
});
