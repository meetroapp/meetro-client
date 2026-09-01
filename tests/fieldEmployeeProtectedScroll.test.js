import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shellSource = readFileSync("src/components/EmployeeShell.jsx", "utf8");
const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const jobsSource = readFileSync("src/pages/EmployeeJobs.jsx", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const fieldCss = readFileSync("src/styles/employeeShell.css", "utf8");
const messagesInboxSource = readFileSync("src/pages/MessagesInbox.jsx", "utf8");

const FIELD_ROUTES = [
  "employeeHome",
  "employeeJobs",
  "employeeSchedule",
  "employeeTime",
  "employeeMessages",
  "employeeAlerts",
  "employeeProfile",
];

function cssRule(selector) {
  const start = fieldCss.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} rule must exist`);
  return fieldCss.slice(start, fieldCss.indexOf("}", start) + 1);
}

test("desktop and iPad isolate the stationary employee rail from workspace scrolling", () => {
  assert.match(shellSource, /data-scroll-region="employee-navigation"/);
  assert.match(shellSource, /data-scroll-region="employee-workspace"/);
  assert.match(cssRule(".employee-shell"), /height: 100dvh/);
  assert.match(cssRule(".employee-shell"), /overflow: hidden/);
  assert.match(cssRule(".employee-shell__rail"), /height: 100dvh/);
  assert.match(cssRule(".employee-shell__rail"), /overflow-y: auto/);
  assert.match(cssRule(".employee-shell__main"), /height: 100dvh/);
  assert.match(cssRule(".employee-shell__main"), /min-height: 0/);
  assert.match(cssRule(".employee-shell__main"), /overflow-x: hidden/);
  assert.match(cssRule(".employee-shell__main"), /overflow-y: auto/);
});

test("all seven Field Employee routes use the one protected EmployeeShell", () => {
  for (const route of FIELD_ROUTES) {
    assert.match(shellSource, new RegExp(`route: "${route}"`));
  }
  assert.equal(
    (shellSource.match(/className=\{`employee-shell\$\{/g) || []).length,
    1
  );

  const portalRoute = appSource.slice(
    appSource.indexOf('if (["employeeHome"'),
    appSource.indexOf('if (page === "employeeAlerts")')
  );
  for (const route of [
    "employeeHome",
    "employeeSchedule",
    "employeeTime",
    "employeeMessages",
    "employeeProfile",
  ]) {
    assert.match(portalRoute, new RegExp(route));
  }
  assert.match(portalRoute, /<EmployeePortal membership=\{fieldMembership\}/);
  assert.match(portalSource, /<EmployeeShell[\s\S]*currentPage=\{meta\.page\}/);

  const jobsRoute = appSource.slice(
    appSource.indexOf('if (page === "employeeJobs")'),
    appSource.indexOf('if (["employeeHome"')
  );
  assert.match(jobsRoute, /<EmployeeJobs/);
  assert.match(
    jobsSource,
    /selectedMembership\?\.role === "FIELD_EMPLOYEE"[\s\S]*<EmployeeShell[\s\S]*currentPage="employeeJobs"/
  );

  const alertsRoute = appSource.slice(
    appSource.indexOf('if (page === "employeeAlerts")'),
    appSource.indexOf('if (page === "teamOperations")')
  );
  assert.match(alertsRoute, /<EmployeeShell/);
  assert.match(alertsRoute, /currentPage="employeeAlerts"/);
  assert.match(alertsRoute, /<Notifications setPage=\{setPage\} employeeMode/);
});

test("every Field page child is owned by the independently scrolling right workspace", () => {
  const rail = shellSource.indexOf('className="employee-shell__rail"');
  const workspace = shellSource.indexOf('className="employee-shell__main"');
  const content = shellSource.indexOf('className="employee-shell__content"');
  const children = shellSource.indexOf("{children}", content);
  const mobileNavigation = shellSource.indexOf('className="employee-shell__mobile-nav"');
  assert.ok(rail > -1);
  assert.ok(workspace > rail);
  assert.ok(content > workspace);
  assert.ok(children > content);
  assert.ok(mobileNavigation > children);
  assert.equal((shellSource.match(/\{children\}/g) || []).length, 1);
  assert.doesNotMatch(cssRule(".employee-shell__rail"), /position: sticky|position: fixed/);
});

test("long My Jobs, Schedule, and Messages content cannot transfer scrolling to the rail", () => {
  assert.match(jobsSource, /<EmployeeShell[\s\S]*\{workspaceContent\}[\s\S]*<\/EmployeeShell>/);
  assert.match(portalSource, /view === "schedule"[\s\S]*<ScheduleView/);
  assert.match(portalSource, /view === "messages"[\s\S]*<MessagesView/);
  assert.match(cssRule(".employee-shell"), /height: 100dvh/);
  assert.match(cssRule(".employee-shell"), /overflow: hidden/);
  assert.match(cssRule(".employee-shell__main"), /overflow-y: auto/);
  assert.match(cssRule(".employee-shell__main"), /overscroll-behavior: contain/);
  assert.match(cssRule(".employee-shell__content"), /min-width: 0/);
});

test("Field shortcuts and exact deep links return to the same shell-governed routes", () => {
  assert.match(portalSource, /employeeJobs\?businessId=/);
  assert.match(portalSource, /employeeSchedule\?businessId=/);
  assert.match(portalSource, /employeeTime\?businessId=/);
  assert.match(portalSource, /employeeMessages\?businessId=/);
  assert.match(jobsSource, /employeeMessages\?businessId=/);
  assert.match(appSource, /page === "employeeJobs"/);
  assert.match(appSource, /page === "employeeAlerts"/);
  assert.match(appSource, /employeeSchedule/);
  assert.match(appSource, /employeeMessages/);
});

test("Team and Customer histories share one bounded internal scroll architecture", () => {
  assert.equal(
    (portalSource.match(/data-scroll-region="message-history"/g) || []).length,
    2
  );
  assert.match(portalSource, /fieldInternalMessagesAria[\s\S]*onScroll=\{trackMessageHistoryPosition\}/);
  assert.match(portalSource, /fieldCustomerMessages[\s\S]*onScroll=\{trackMessageHistoryPosition\}/);

  const cardRule = cssRule(".field-messages-thread-card");
  assert.match(cardRule, /display: grid/);
  assert.match(cardRule, /min-height: 0/);
  assert.match(cardRule, /minmax\(260px, min\(48dvh, 520px\)\)/);

  const historyRule = cssRule(".field-messages-thread");
  assert.match(historyRule, /min-height: 0/);
  assert.match(historyRule, /align-self: stretch/);
  assert.match(historyRule, /overflow-y: auto/);
  assert.match(historyRule, /overscroll-behavior: contain/);
});

test("Undo, Quick Customer Updates, and composer remain outside message-history overflow", () => {
  const teamHistory = portalSource.indexOf('aria-label={t("fieldInternalMessagesAria"');
  const customerHistory = portalSource.indexOf('aria-label={t("fieldCustomerMessages"', teamHistory);
  const pending = portalSource.indexOf('{audience === "customer" && pendingCustomerSend', customerHistory);
  const quickUpdates = portalSource.indexOf('<section className="field-messages-quick-updates"', pending);
  const composer = portalSource.indexOf('className="field-messages-composer"', quickUpdates);

  assert.ok(teamHistory > -1);
  assert.ok(customerHistory > teamHistory);
  assert.ok(pending > customerHistory);
  assert.ok(quickUpdates > pending);
  assert.ok(composer > quickUpdates);
});

test("message loading follows the latest item only while the reader remains near bottom", () => {
  assert.match(portalSource, /const keepLatestMessageVisible = useRef\(true\)/);
  assert.match(portalSource, /distanceFromBottom <= 72/);
  assert.match(portalSource, /if \(!history \|\| !keepLatestMessageVisible\.current\) return/);
  assert.match(portalSource, /history\.scrollTop = history\.scrollHeight/);
});

test("iPhone keeps the one-column shell and a viewport-bounded readable history", () => {
  assert.match(fieldCss, /@media \(max-width: 760px\)[\s\S]*\.employee-shell \{[\s\S]*display: block;[\s\S]*height: auto;[\s\S]*overflow: visible/);
  assert.match(fieldCss, /@media \(max-width: 900px\)[\s\S]*\.field-messages-layout \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(fieldCss, /\.field-messages-chat-workspace \{[\s\S]*height: calc\([\s\S]*100dvh/);
  assert.match(fieldCss, /\.field-messages-thread \{[\s\S]*flex: 1 1 0;[\s\S]*overflow-y: auto/);
  assert.doesNotMatch(fieldCss, /\.field-messages-thread \{[\s\S]{0,180}max-height: none/);
});

test("Field scroll containment does not couple to MessagesInbox responsive architecture", () => {
  assert.doesNotMatch(portalSource, /MessagesInbox|communication-layout|splitShell|wideWorkspaceShell/);
  assert.match(messagesInboxSource, /data-communication-layout/);
  assert.doesNotMatch(fieldCss, /data-communication-layout|messages-inbox|communication-center/);
});
