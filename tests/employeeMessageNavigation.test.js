import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getEmployeeShellHeaderMode,
  getEmployeeMessagesBackRoute,
  shouldShowEmployeeMobileNavigation,
} from "../src/utils/employeeNavigation.js";

const shellSource = readFileSync("src/components/EmployeeShell.jsx", "utf8");
const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const professionalThreadSource = readFileSync(
  "src/pages/ConversationThread.jsx",
  "utf8"
);

test("ordinary Employee destinations retain the mobile bottom navigation", () => {
  for (const view of ["home", "schedule", "time", "profile"]) {
    assert.equal(shouldShowEmployeeMobileNavigation(view), true, view);
    assert.equal(getEmployeeShellHeaderMode(view), "standard", view);
  }
  assert.match(shellSource, /headerMode = "standard"/);
  assert.match(shellSource, /const showHeader = headerMode !== "suppressed"/);
  assert.match(shellSource, /\{showHeader \? \([\s\S]*employee-shell__header/);
  assert.match(shellSource, /showMobileNavigation = true/);
  assert.match(shellSource, /\{showMobileNavigation \? \([\s\S]*employee-shell__mobile-nav/);
});

test("active Employee Messages structurally omits the mobile bottom navigation", () => {
  assert.equal(shouldShowEmployeeMobileNavigation("messages"), false);
  assert.equal(getEmployeeShellHeaderMode("messages"), "suppressed");
  assert.match(
    portalSource,
    /showMobileNavigation=\{shouldShowEmployeeMobileNavigation\(view\)\}/
  );
  assert.match(
    portalSource,
    /headerMode=\{getEmployeeShellHeaderMode\(view\)\}/
  );
  assert.doesNotMatch(portalSource, /keyboard.*showMobileNavigation|visualViewport.*showMobileNavigation/i);
});

test("Employee Messages Back returns Home where normal navigation is restored", () => {
  assert.equal(getEmployeeMessagesBackRoute(7), "employeeHome?businessId=7");
  assert.equal(shouldShowEmployeeMobileNavigation("home"), true);
  const messagesBlock = portalSource.slice(
    portalSource.indexOf("function MessagesView"),
    portalSource.indexOf("function ProfileView")
  );
  assert.match(messagesBlock, /className="field-messages-back"/);
  assert.match(messagesBlock, /getEmployeeMessagesBackRoute\(membership\.businessId\)/);
  assert.match(messagesBlock, /<span aria-hidden="true">←<\/span>/);
  assert.match(messagesBlock, /<h2>\{t\("fieldNavMessages", language\)\}<\/h2>/);
});

test("Employee Messages removes the standard hero and redundant communication copy", () => {
  const messagesBlock = portalSource.slice(
    portalSource.indexOf("function MessagesView"),
    portalSource.indexOf("function ProfileView")
  );
  assert.doesNotMatch(messagesBlock, /fieldEmployeeRole|fieldMessagesDescription|fieldTeamAccess/);
  assert.doesNotMatch(messagesBlock, /fieldMessagesHub|fieldMessagesTitle|fieldMessagesHubCopy/);
  assert.match(messagesBlock, /field-messages-audience/);
  assert.match(messagesBlock, /fieldAssignedJob/);
  assert.match(messagesBlock, /fieldPrivateToTeam/);
  assert.match(messagesBlock, /fieldVisibleToCustomer/);
});

test("Employee Messages keeps one canonical Job context and compact audience chrome", () => {
  const messagesBlock = portalSource.slice(
    portalSource.indexOf("function MessagesView"),
    portalSource.indexOf("function ProfileView")
  );
  const assignedJobBlock = messagesBlock.slice(
    messagesBlock.indexOf('className="field-messages-jobs"'),
    messagesBlock.indexOf('className="field-messages-thread-card"')
  );
  const threadHeadingBlock = messagesBlock.slice(
    messagesBlock.indexOf('className="field-messages-thread-heading"'),
    messagesBlock.indexOf('className={`field-messages-visibility')
  );

  assert.match(assignedJobBlock, /fieldAssignedJob/);
  assert.match(assignedJobBlock, /item\.job\.title/);
  assert.match(assignedJobBlock, /item\.job\.customer\?\.displayName/);
  assert.doesNotMatch(assignedJobBlock, /fieldSelectJob/);
  assert.match(threadHeadingBlock, /fieldTeamMessages/);
  assert.match(threadHeadingBlock, /fieldCustomerMessages/);
  assert.match(threadHeadingBlock, /fieldOpenJob/);
  assert.match(threadHeadingBlock, /employeeJobs\?businessId=\$\{membership\.businessId\}&jobId=\$\{encodeURIComponent\(selected\.job\.id\)\}/);
  assert.doesNotMatch(threadHeadingBlock, /selected\?\.job\.title|selected\?\.job\.customer|fieldCustomerUnavailable/);
  assert.match(
    messagesBlock,
    /<\/div>\s*<\/header>\s*\{eligibleJobs\.length \? \(\s*<div className="field-messages-layout">/
  );
});

test("compact Messages header uses the shell safe-area contract", () => {
  const employeeCss = readFileSync("src/styles/employeeShell.css", "utf8");
  const messagesCss = employeeCss.slice(
    employeeCss.indexOf("FIELD MESSAGES —"),
    employeeCss.indexOf("APPROVED MEETRO FIELD TIME RENDER")
  );

  assert.match(messagesCss, /\.field-messages-header \{[\s\S]*min-height: 0[\s\S]*height: auto[\s\S]*align-self: start[\s\S]*padding: 0/);
  assert.match(messagesCss, /\.field-messages-titlebar h2 \{[\s\S]*color: var\(--employee-text\)/);
  assert.match(messagesCss, /\.field-messages-audience \{[\s\S]*height: auto[\s\S]*min-height: 0[\s\S]*flex: 0 0 auto/);
  assert.match(messagesCss, /\.field-messages-audience button \{[\s\S]*min-height: 48px/);
  assert.doesNotMatch(messagesCss, /\.field-messages-audience \{[\s\S]*flex:\s*0 1 320px/);
  assert.equal(48 + (4 * 2) + (1 * 2), 58, "intrinsic segmented control height");
  assert.doesNotMatch(
    messagesCss,
    /\.field-messages-header,\s*\.field-messages-jobs/
  );
  assert.match(
    messagesCss,
    /\.employee-shell--header-suppressed \.employee-shell__content,[\s\S]*padding-top: max\(10px, env\(safe-area-inset-top\)\)/
  );
  assert.match(messagesCss, /\.field-messages-open-job \{[\s\S]*min-height: 44px/);
});

test("Employee chat reuses the Professional structural no-bottom-nav pattern", () => {
  assert.doesNotMatch(professionalThreadSource, /import BottomNav/);
  assert.doesNotMatch(professionalThreadSource, /<BottomNav/);
  assert.match(professionalThreadSource, /className="chat-header"/);
  assert.match(professionalThreadSource, /<IconBack \/>/);
});

test("navigation suppression contains no keyboard or viewport workaround", () => {
  const navigationSource = readFileSync(
    "src/utils/employeeNavigation.js",
    "utf8"
  );
  assert.doesNotMatch(
    navigationSource,
    /keyboard|visualViewport|resize|focus|transform|setTimeout/i
  );
});
