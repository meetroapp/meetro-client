import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  shouldUseCommunicationCenterConversationRoute,
} from "../src/utils/communicationLayout.js";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);

const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);

const explicitCommunicationRoute = {
  valid: true,
  returnPage: "messagesInbox",
  shell: "communicationCenter",
};

test("explicit Communication Center route remains shell-owned through desktop to tablet resize", () => {
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      explicitCommunicationRoute,
      {
        layoutMode: "desktop",
        contentWidth: 1100,
      }
    ),
    true
  );

  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      explicitCommunicationRoute,
      {
        layoutMode: "tablet",
        contentWidth: 760,
      }
    ),
    true
  );
});

test("phone continues using the standalone conversation experience", () => {
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      explicitCommunicationRoute,
      {
        layoutMode: "mobile",
        contentWidth: 390,
      }
    ),
    false
  );
});

test("plain Messages return route still follows desktop-only shell behavior", () => {
  const route = {
    valid: true,
    returnPage: "messagesInbox",
    shell: "",
  };

  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      route,
      {
        layoutMode: "desktop",
        contentWidth: 1100,
      }
    ),
    true
  );

  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      route,
      {
        layoutMode: "tablet",
        contentWidth: 760,
      }
    ),
    false
  );
});

test("MessagesInbox preserves an explicit Communication shell through tablet widths", () => {
  assert.match(
    messagesSource,
    /routeRequestsCommunicationShell/
  );

  assert.match(
    messagesSource,
    /appLayoutMetrics\.layoutMode === "tablet"/
  );

  assert.match(
    messagesSource,
    /communicationLayout\.mode === "desktop"/
  );
});

test("three-column Communication Center favors readable context without oversized composer growth", () => {
  assert.match(
    messagesSource,
    /minmax\(230px, 0\.8fr\) minmax\(390px, 1\.35fr\) minmax\(270px, 1fr\)/
  );

  assert.match(
    messagesSource,
    /maxWidth: "1240px"/
  );

  assert.match(
    messagesSource,
    /minmax\(190px, 0\.75fr\) minmax\(350px, 1\.35fr\) minmax\(260px, 1fr\)/
  );

  assert.match(
    messagesSource,
    /maxWidth: "1180px"/
  );
});

test("App keeps canonical conversation routing behind the shared Communication shell policy", () => {
  assert.match(
    appSource,
    /shouldUseCommunicationCenterConversationRoute/
  );

  assert.match(
    appSource,
    /useCommunicationCenterShell[\s\S]*<MessagesInbox[\s\S]*<ConversationThread/
  );
});
