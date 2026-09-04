import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL(
    "../src/pages/MyRequests.jsx",
    import.meta.url
  ),
  "utf8"
);

test("Customer Work Center subscribes to canonical Alert attention", () => {
  assert.match(
    source,
    /subscribeAlertCounts/
  );

  assert.match(
    source,
    /canonicalAlertCountSnapshot/
  );

  assert.match(
    source,
    /getWorkCenterRequestAttention/
  );
});

test("exact Customer Job card exposes canonical unread Alert count", () => {
  assert.match(
    source,
    /requestAlertCount/
  );

  assert.match(
    source,
    /<WorkCenterAttentionBadge[\s\S]{0,120}count=\{requestAlertCount\}/
  );
});

test("Customer lifecycle sections own semantic Alert stage counts", () => {
  for (const stage of [
    '"schedule"',
    '"evaluation"',
    '"quote"',
    '"deposit"',
    '"work"',
    '"invoice"',
    '"completion"',
    '"review"',
  ]) {
    assert.match(
      source,
      new RegExp(stage)
    );
  }

  assert.match(
    source,
    /getWorkCenterGroupedStageUnread/
  );

  assert.match(
    source,
    /data-homeowner-work-center-section/
  );
});

test("Customer Alert route focuses exact lifecycle section without mutating Alert truth", () => {
  assert.match(
    source,
    /getHomeownerWorkCenterSection/
  );

  assert.match(
    source,
    /data-homeowner-work-center-content/
  );

  assert.match(
    source,
    /scrollIntoView/
  );

  assert.doesNotMatch(
    source,
    /markAlertRead|dismissAlert/
  );
});

test("Quote lifecycle Alert can focus real Quote review content", () => {
  assert.match(
    source,
    /data-homeowner-work-center-content="quote"/
  );
});
