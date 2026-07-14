import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const conversationThreadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);

const deliveryBlock = conversationThreadSource.slice(
  conversationThreadSource.indexOf("const addOutgoingMessage = async (message) =>"),
  conversationThreadSource.indexOf("const handleQuickReply = (reply) =>")
);

test("backend-confirmed message persistence is the only path marked sent", () => {
  assert.match(
    deliveryBlock,
    /result\?\.response\?\.ok && result\?\.data\?\.data\?\.id[\s\S]*backendId: result\.data\.data\.id,[\s\S]*status: "sent"/
  );
  assert.equal(
    deliveryBlock.match(/status: "sent"/g)?.length,
    1,
    "only a backend-confirmed message may be marked sent"
  );
});

test("backend rejection and transport failure mark the visible message failed", () => {
  assert.match(
    deliveryBlock,
    /else \{\s*updateMessageStatus\(messageWithRole\.id, "failed", 0\);\s*\}/
  );
  assert.match(
    deliveryBlock,
    /catch \(err\) \{[\s\S]*Failed to persist message to backend[\s\S]*updateMessageStatus\(messageWithRole\.id, "failed", 0\)/
  );
});

test("missing backend message prerequisites never simulate delivery", () => {
  assert.match(
    deliveryBlock,
    /selectedQuoteRequestId &&[\s\S]*receiverId &&[\s\S]*!String\(selectedQuoteRequestId\)\.startsWith\("demo"\)/
  );
  assert.match(
    deliveryBlock,
    /\} else \{\s*updateMessageStatus\(messageWithRole\.id, "failed", 400\);\s*\}/
  );
});

test("failed delivery remains visible and has a truthful status label", () => {
  assert.match(deliveryBlock, /mergeConversationMessages\(prev, \[messageWithRole\]\)/);
  assert.match(conversationThreadSource, /if \(status === "failed"\) return "Failed"/);
  assert.match(conversationThreadSource, /if \(status === "failed"\) return "Falló"/);
  assert.match(
    conversationThreadSource,
    /mine && !msg\.unsent && <span>\{getStatusLabel\(msg\.status\)\}<\/span>/
  );
});
