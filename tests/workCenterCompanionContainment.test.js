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

test("phone and tablet Work Center use a reachable right-side Companion safe dock", () => {
  assert.match(
    assistantSource,
    /!appLayoutMetrics\.desktopMode && currentPage === "contractorDashboard"/
  );
  assert.match(
    assistantSource,
    /compactWorkCenterSafeDock[\s\S]*right: `max\(\$\{launcherEdgeMargin\}px, env\(safe-area-inset-right, 0px\)\)`[\s\S]*bottom: launcherPosition \? "auto" : launcherFallbackBottom[\s\S]*top: launcherPosition \? `\$\{launcherPosition\.y\}px` : "auto"/
  );
  assert.match(
    assistantSource,
    /data-position-mode="draggable"/
  );
  assert.match(
    assistantSource,
    /compactWorkCenterSafeDock \? "compact-work-center-safe-rail" : "free"/
  );
  assert.match(assistantSource, /onPointerMove=\{handleLauncherPointerMove\}/);
  assert.match(assistantSource, /aria-label=\{t\("companionLauncherLabel", language\)\}/);
  assert.match(assistantSource, /assistantCompanionAskMeetro/);
});

test("Current Job and list cards reserve a compact-workspace rail for Ask Meetro", () => {
  assert.match(dashboardSource, /className="meetro-job-persistent-context"/);
  assert.match(
    dashboardSource,
    /className="meetro-visual-surface meetro-current-job-list-card"/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 1099px\)[\s\S]*\.meetro-job-persistent-context,[\s\S]*padding-right: calc\(164px \+ env\(safe-area-inset-right, 0px\)\) !important;/
  );
  assert.match(
    cssSource,
    /\.meetro-current-job-list-card[\s\S]*padding-right: calc\(164px \+ env\(safe-area-inset-right, 0px\)\) !important;/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 520px\) and \(orientation: portrait\)[\s\S]*\.meetro-job-persistent-context \{[\s\S]*padding-right: 14px !important;/
  );
  assert.match(
    cssSource,
    /\.meetro-job-persistent-context > :last-child \{[\s\S]*max-width: 144px;/
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
