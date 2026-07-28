import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const messagesSource = readSource("src/pages/MessagesInbox.jsx");
const threadSource = readSource("src/pages/ConversationThread.jsx");
const dashboardSource = readSource("src/pages/BusinessDashboard.jsx");
const leadsSource = readSource("src/pages/BusinessLeads.jsx");
const coordinatorSource = readSource(
  "src/utils/professionalOpportunityCoordinator.js"
);

test("one module owns the professional opportunity endpoint", () => {
  assert.match(coordinatorSource, /"\/professional-request-opportunities"/);
  for (const consumer of [dashboardSource, leadsSource]) {
    assert.doesNotMatch(consumer, /"\/professional-request-opportunities"/);
    assert.match(consumer, /requestProfessionalOpportunities/);
  }
  assert.doesNotMatch(messagesSource, /requestProfessionalOpportunities/);
  assert.match(
    messagesSource,
    /getRequestCommunicationEndpoint\(activeAccountMode\)/
  );
});

test("all professional opportunity consumers subscribe to shared state", () => {
  for (const consumer of [dashboardSource, leadsSource]) {
    assert.match(consumer, /subscribeProfessionalOpportunities/);
  }
  assert.doesNotMatch(messagesSource, /subscribeProfessionalOpportunities/);
});

test("Communication Center has no independent opportunity polling loop", () => {
  const refreshEffect = messagesSource.match(
    /fetchConversations\("mount"\);([\s\S]*?)\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/
  );
  assert.ok(refreshEffect, "Conversation refresh effect was not found.");
  assert.doesNotMatch(refreshEffect[1], /setInterval/);
  assert.match(refreshEffect[1], /removeEventListener\("focus"/);
  assert.match(refreshEffect[1], /removeEventListener\("storage"/);
});

test("transient canonical refresh errors preserve the confirmed conversation projection", () => {
  assert.match(
    messagesSource,
    /const isInitialLoad = !hasLoadedConversationProjectionRef\.current/
  );
  assert.match(
    messagesSource,
    /A transient background refresh failure must not erase[\s\S]*if \(isInitialLoad\) \{\s*setQuotes\(\[\]\)/
  );
});

test("unread updates use a scoped event that cannot reload the inbox", () => {
  assert.match(
    messagesSource,
    /new CustomEvent\("meetro-unread-conversations-changed"/
  );
  assert.doesNotMatch(
    messagesSource.match(
      /useEffect\(\(\) => \{\s*writeUnreadConversationCount\(quotes\);([\s\S]*?)\}, \[quotes\]\);/
    )?.[1] || "",
    /dispatchEvent\(new Event\(["']storage["']\)\)/
  );
});

test("passive ConversationThread hydration does not dispatch inbox refresh events", () => {
  const loadMessagesStart = threadSource.indexOf("const loadMessages = async () =>");
  const pollingStart = threadSource.indexOf(
    "const pollingInterval = setInterval",
    loadMessagesStart
  );
  assert.ok(loadMessagesStart > -1);
  assert.ok(pollingStart > loadMessagesStart);
  assert.doesNotMatch(
    threadSource.slice(loadMessagesStart, pollingStart),
    /window\.dispatchEvent\(new Event\("meetro-messages-updated"\)\)/
  );
});

test("temporary component render instrumentation is not shipped", () => {
  assert.doesNotMatch(messagesSource, /MessagesInbox render|Workspace conversation update/);
  assert.doesNotMatch(threadSource, /ConversationThread render|ConversationThread mounted/);
});
