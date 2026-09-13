import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const dashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("Work Center uses a reserved dock while other surfaces retain saved drag positions", () => {
  assert.match(
    assistantSource,
    /currentPage === "contractorDashboard"/
  );
  assert.match(assistantSource, /bottom: "calc\(var\(--work-center-dock-bottom, 74px\) \+ var\(--work-center-dock-gap, 6px\)\)"/);
  assert.match(assistantSource, /data-position-mode=\{compactWorkCenterSafeDock \? "docked" : "draggable"\}/);
  assert.match(
    assistantSource,
    /compactWorkCenterSafeDock \? "compact-work-center-safe-rail" : "free"/
  );
  assert.match(assistantSource, /onPointerMove=\{handleLauncherPointerMove\}/);
  assert.match(assistantSource, /aria-label=\{t\("companionLauncherLabel", language\)\}/);
  assert.match(assistantSource, /assistantCompanionAskMeetro/);
});

test("Current Job and list cards scroll above the reserved Ask Meetro lane", () => {
  assert.match(
    dashboardSource,
    /<CompactCurrentJobHeader/
  );

  assert.doesNotMatch(
    dashboardSource,
    /meetro-job-persistent-context/
  );

  assert.match(
    dashboardSource,
    /className="meetro-visual-surface meetro-current-job-list-card"/
  );

  assert.match(cssSource, /height: calc\(100dvh - var\(--work-center-dock-bottom\) - var\(--work-center-launcher-height\) - 2 \* var\(--work-center-dock-gap\)\)/);
  assert.match(cssSource, /--meetro-visual-viewport-bottom-gap/);
  assert.match(cssSource, /padding-right: 16px !important/);

  assert.doesNotMatch(
    cssSource,
    /\.meetro-job-persistent-context/
  );
});

test("desktop Companion behavior and mobile bottom-nav clearance remain intact", () => {
  assert.match(
    assistantSource,
    /: launcherPosition[\s\S]*left: `\$\{launcherPosition\.x\}px`[\s\S]*top: `\$\{launcherPosition\.y\}px`/
  );
  assert.match(assistantSource, /const launcherBottomClearance = isBusinessMode \|\| isChat \? 104 : 94/);
  assert.match(
    assistantSource,
    /bottom: launcherFallbackBottom/
  );
});
