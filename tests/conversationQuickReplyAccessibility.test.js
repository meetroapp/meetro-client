import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const threadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);

test("Conversation quick replies provide a semantic 44px minimum touch target", () => {
  assert.match(
    threadSource,
    /<button[\s\S]*className="conversation-quick-reply"[\s\S]*onClick=\{\(\) => handleQuickReply\(reply\)\}/
  );
  assert.match(threadSource, /const quickBtn = \{[\s\S]*minHeight: "44px"/);
  assert.match(
    threadSource,
    /const quickBtn = \{[\s\S]*display: "flex"[\s\S]*alignItems: "center"[\s\S]*justifyContent: "center"/
  );
});

test("localized quick replies may wrap and grow without clipping or overlapping targets", () => {
  assert.match(
    threadSource,
    /const quickBtn = \{[\s\S]*whiteSpace: "normal"[\s\S]*overflowWrap: "anywhere"/
  );
  assert.doesNotMatch(
    threadSource.match(/const quickBtn = \{[\s\S]*?\n\};/)?.[0] || "",
    /height: "44px"|textOverflow: "ellipsis"|overflow: "hidden"/
  );
});

test("quick replies preserve keyboard focus and existing reply authority", () => {
  assert.match(
    threadSource,
    /\.conversation-quick-reply:focus-visible \{[\s\S]*outline: 3px solid[\s\S]*outline-offset: 2px/
  );
  assert.match(threadSource, /const handleQuickReply = \(reply\) =>/);
  assert.match(threadSource, /onClick=\{\(\) => handleQuickReply\(reply\)\}/);
});
