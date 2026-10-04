import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_ORIGIN_CONTEXT_KEY,
  captureConversationOriginContext,
  restoreConversationOriginContext,
} from "../src/utils/conversationOrigin.js";
import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";
import { shouldUseCommunicationCenterConversationRoute } from "../src/utils/communicationLayout.js";

function createStorage(seed = {}) {
  const values = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function withBrowserState({ hash, storage }, callback) {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  globalThis.localStorage = storage;
  globalThis.window = { location: { hash }, scrollY: 0 };

  try {
    return callback();
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test("desktop Project Journey return restores exact canonical Conversation and split shell", () => {
  const storage = createStorage({
    activeConversationId: "999",
    activeConversationName: "Display names are not authority",
    meetroConversationType: "canonical_conversation",
    conversationReturnPage: "messagesInbox",
    returnPage: "messagesInbox",
    selectedConversation: JSON.stringify({ id: 999, title: "Stale title" }),
  });

  withBrowserState(
    {
      hash:
        "#conversationThread?conversationId=340&returnPage=messagesInbox&shell=communicationCenter",
      storage,
    },
    () => {
      const context = captureConversationOriginContext({
        sourcePage: "messagesInbox",
        workspace: "projectDetails",
        viewerRole: "homeowner",
      });
      assert.equal(context.conversationId, 340);
      assert.equal(
        context.conversationShell,
        CANONICAL_CONVERSATION_COMMUNICATION_SHELL
      );

      let restoredRoute = "";
      assert.equal(
        restoreConversationOriginContext((route) => {
          restoredRoute = route;
        }),
        true
      );

      assert.equal(
        restoredRoute,
        "conversationThread?conversationId=340&returnPage=messagesInbox&shell=communicationCenter"
      );
      const parsed = parseCanonicalConversationRoute(restoredRoute);
      assert.equal(parsed.valid, true);
      assert.equal(parsed.conversationId, 340);
      assert.equal(
        shouldUseCommunicationCenterConversationRoute(parsed, {
          layoutMode: "desktop",
          contentWidth: 1200,
        }),
        true
      );
      assert.equal(storage.getItem("activeConversationId"), "340");
      assert.equal(storage.getItem(CONVERSATION_ORIGIN_CONTEXT_KEY), null);
    }
  );
});

test("compact Project Journey return restores exact full-page Conversation route", () => {
  const storage = createStorage({
    activeConversationId: "340",
    conversationReturnPage: "messagesInbox",
  });

  withBrowserState(
    {
      hash: "#conversationThread?conversationId=340&returnPage=messagesInbox",
      storage,
    },
    () => {
      captureConversationOriginContext({
        sourcePage: "conversationThread",
        workspace: "projectDetails",
        viewerRole: "homeowner",
      });

      let restoredRoute = "";
      restoreConversationOriginContext((route) => {
        restoredRoute = route;
      });

      const parsed = parseCanonicalConversationRoute(restoredRoute);
      assert.equal(parsed.valid, true);
      assert.equal(parsed.conversationId, 340);
      assert.equal(parsed.shell, "");
      assert.equal(
        shouldUseCommunicationCenterConversationRoute(parsed, {
          layoutMode: "mobile",
          contentWidth: 390,
        }),
        false
      );
      assert.notEqual(restoredRoute, "conversationThread");
    }
  );
});

test("direct Project Journey entry without captured origin keeps safe fallback", () => {
  const storage = createStorage();

  withBrowserState({ hash: "#projectDetails", storage }, () => {
    let routed = false;
    assert.equal(
      restoreConversationOriginContext(() => {
        routed = true;
      }),
      false
    );
    assert.equal(routed, false);
  });
});
