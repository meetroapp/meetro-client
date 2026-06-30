import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const publicSitePath = "src/public/PublicSite.jsx";
const appPath = "src/App.jsx";
const mainPath = "src/main.jsx";

test("public website routes are separated from the authenticated app shell", () => {
  assert.equal(existsSync(publicSitePath), true);
  assert.equal(existsSync("public/_redirects"), true);
  assert.equal(existsSync("vercel.json"), true);

  const publicSite = readFileSync(publicSitePath, "utf8");
  const app = readFileSync(appPath, "utf8");
  const main = readFileSync(mainPath, "utf8");

  assert.match(publicSite, /Meetro/);
  assert.match(publicSite, /Community/);
  assert.match(publicSite, /Connect\. Communicate\. Complete\./);
  assert.match(publicSite, /Preparing for launch/);
  assert.match(publicSite, /WM FLEX LABS, LLC/);
  assert.match(publicSite, /william@flexlabs\.com/);
  assert.match(publicSite, /"\/privacy"/);
  assert.match(publicSite, /"\/terms"/);
  assert.match(publicSite, /"\/contact"/);
  assert.match(publicSite, /Back to Meetro/);
  assert.match(publicSite, /href="\/"/);
  assert.doesNotMatch(
    publicSite,
    /BottomNav|MeetroAssistant|BusinessDashboard|MessagesInbox|Work Center|WorkCenter|AuthProvider|SessionProvider|Login|TestFlight|roadmap|pricing|AI details/i
  );
  assert.doesNotMatch(publicSite, /#login|setPage|localStorage|sessionStorage/);

  assert.doesNotMatch(app, /PublicLanding/);
  assert.doesNotMatch(app, /publicLanding/);

  assert.match(main, /PublicSite/);
  assert.match(main, /isPublicWebsitePath/);
  assert.match(main, /isNativeRuntime/);
  assert.match(main, /window\.location\.pathname === "\/login"/);
  assert.match(main, /const App = lazy\(\(\) => import\('\.\/App\.jsx'\)\)/);
  assert.doesNotMatch(main, /import App from ['"]\.\/App\.jsx['"]/);
  assert.match(main, /if \(isNativeRuntime\(\)\) return false/);
  assert.match(main, /shouldUsePublicSite \? \(/);
  assert.match(main, /Do not merge these experiences without explicit architectural approval/);
});

test("public presence standard documents the public and app boundary", () => {
  assert.equal(existsSync("docs/KnowledgeBase/PUBLIC_PRESENCE_STANDARD.md"), true);

  const standard = readFileSync(
    "docs/KnowledgeBase/PUBLIC_PRESENCE_STANDARD.md",
    "utf8"
  );

  assert.match(standard, /Public Presence Standard/);
  assert.match(standard, /Public vs App Separation/);
  assert.match(standard, /Allowed Public Content/);
  assert.match(standard, /Not Allowed Public Content/);
  assert.match(standard, /Authenticated product experiences belong inside the app/);
  assert.match(standard, /Phase 1 — Public Presence/);
  assert.match(standard, /Phase 2 — TestFlight/);
  assert.match(standard, /Phase 3 — Public Launch/);
});
