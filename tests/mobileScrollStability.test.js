import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

const appSource = read("src/App.jsx");
const homeSource = read("src/pages/Home.jsx");
const messagesSource = read("src/pages/MessagesInbox.jsx");

test("ordinary application pages do not subscribe the App root to live viewport metrics", () => {
  const appStart =
    appSource.indexOf("function App() {");

  const appPreludeEnd =
    appSource.indexOf(
      "const professionalOnlyPages",
      appStart
    );

  assert.ok(appStart >= 0);
  assert.ok(appPreludeEnd > appStart);

  const appPrelude =
    appSource.slice(
      appStart,
      appPreludeEnd
    );

  assert.doesNotMatch(
    appPrelude,
    /useAppLayoutMetrics\(\)/
  );
});

test("conversation routing owns the layout subscription locally", () => {
  const start =
    appSource.indexOf(
      "function ResponsiveConversationThreadRoute"
    );

  const end =
    appSource.indexOf(
      "function App()",
      start
    );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const routeSource =
    appSource.slice(start, end);

  assert.match(
    routeSource,
    /const appLayoutMetrics = useAppLayoutMetrics\(\)/
  );

  assert.match(
    routeSource,
    /shouldUseCommunicationCenterConversationRoute/
  );

  assert.match(
    routeSource,
    /<MessagesInbox/
  );

  assert.match(
    routeSource,
    /<ConversationThread/
  );
});

test("Home horizontal rails use proximity snap instead of mandatory snap", () => {
  const proximityCount =
    (
      homeSource.match(
        /scrollSnapType: "x proximity"/g
      ) || []
    ).length;

  assert.equal(
    proximityCount,
    2
  );

  assert.doesNotMatch(
    homeSource,
    /scrollSnapType: "x mandatory"/
  );
});

test("both Home horizontal rails contain horizontal overscroll without disabling vertical page scrolling", () => {
  const spotlightStart =
    homeSource.indexOf(
      "const spotlightRow = {"
    );

  const spotlightEnd =
    homeSource.indexOf(
      "};",
      spotlightStart
    );

  const projectStart =
    homeSource.indexOf(
      "const activeProjectsCarousel = {"
    );

  const projectEnd =
    homeSource.indexOf(
      "};",
      projectStart
    );

  const spotlight =
    homeSource.slice(
      spotlightStart,
      spotlightEnd
    );

  const projects =
    homeSource.slice(
      projectStart,
      projectEnd
    );

  assert.match(
    spotlight,
    /overscrollBehaviorX: "contain"/
  );

  assert.match(
    projects,
    /overscrollBehaviorX: "contain"/
  );

  assert.doesNotMatch(
    spotlight,
    /touchAction: "pan-x"/
  );

  assert.doesNotMatch(
    projects,
    /touchAction: "pan-x"/
  );
});

test("a Communication Center route keeps shell ownership once desktop or tablet has claimed it", () => {
  const start =
    appSource.indexOf(
      "function ResponsiveConversationThreadRoute"
    );

  const end =
    appSource.indexOf(
      "function App()",
      start
    );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const routeSource =
    appSource.slice(start, end);

  assert.match(
    routeSource,
    /shellOwnershipRef = useRef/
  );

  assert.match(
    routeSource,
    /canUseCommunicationCenterShellNow/
  );

  assert.match(
    routeSource,
    /shellOwnershipRef\.current\.claimed = true/
  );

  assert.match(
    routeSource,
    /const useCommunicationCenterShell =\s*shellOwnershipRef\.current\.claimed/
  );
});

test("a claimed Communication conversation stays mounted when desktop Chrome crosses into narrow width", () => {
  assert.match(
    messagesSource,
    /const isNarrowRoutedThread = Boolean/
  );

  assert.match(
    messagesSource,
    /const shouldKeepEmbeddedThread =\s*isSplitPane \|\| isNarrowRoutedThread/
  );

  assert.match(
    messagesSource,
    /data-communication-route-thread=\{/
  );

  assert.match(
    messagesSource,
    /\{shouldKeepEmbeddedThread && \(/
  );

  assert.match(
    messagesSource,
    /gridTemplateColumns: "minmax\(0, 1fr\)"/
  );

  assert.match(
    messagesSource,
    /\[data-communication-route-thread="narrow"\] > :first-child/
  );
});
