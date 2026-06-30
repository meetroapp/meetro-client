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
  assert.doesNotMatch(publicSite, /BottomNav|Login|TestFlight|roadmap|pricing|AI details/i);

  assert.doesNotMatch(app, /PublicLanding/);
  assert.doesNotMatch(app, /publicLanding/);

  assert.match(main, /PublicSite/);
  assert.match(main, /isPublicWebsitePath/);
  assert.match(main, /isNativeRuntime/);
  assert.match(main, /window\.location\.pathname === "\/login"/);
});
