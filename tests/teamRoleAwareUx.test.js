import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isRecognizedApplicationHash } from "../src/utils/appEntryRouting.js";
import {
  getRoleAwareRoute,
  isEmployeeAppRoute,
  resolvePrimaryTeamExperience,
} from "../src/utils/teamRoleExperience.js";
import { t } from "../src/utils/language.js";

const appSource = readFileSync("src/App.jsx", "utf8");
const shellSource = readFileSync("src/components/EmployeeShell.jsx", "utf8");
const shellCss = readFileSync("src/styles/employeeShell.css", "utf8");
const employeeJobsSource = readFileSync("src/pages/EmployeeJobs.jsx", "utf8");
const employeePortalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const teamSource = readFileSync("src/pages/TeamMembers.jsx", "utf8");
const notificationsSource = readFileSync("src/pages/Notifications.jsx", "utf8");

const fieldMembership = {
  id: "field-membership",
  businessId: 7,
  businessName: "Example Electric",
  role: "FIELD_EMPLOYEE",
  status: "ACTIVE",
  permissions: ["ASSIGNED_WORK", "EMPLOYEE_SCHEDULE", "TIME_SELF_VIEW", "TIME_SELF_ACTION"],
};

test("active Field Employee resolves to a dedicated employee landing route", () => {
  const experience = resolvePrimaryTeamExperience({ memberships: [fieldMembership] });
  assert.equal(experience.kind, "FIELD_EMPLOYEE");
  assert.equal(experience.landingRoute, "employeeHome?businessId=7");
  assert.equal(getRoleAwareRoute("businessDashboard", experience), experience.landingRoute);
  assert.equal(getRoleAwareRoute("professionalSubscription", experience), experience.landingRoute);
  assert.equal(getRoleAwareRoute("employeeJobs?businessId=7&jobId=job-1", experience), "employeeJobs?businessId=7&jobId=job-1");
});

test("Owner authority wins over an additional Field membership and retains Business routing", () => {
  const experience = resolvePrimaryTeamExperience({ memberships: [
    fieldMembership,
    { ...fieldMembership, id: "owner-membership", businessId: 8, role: "OWNER" },
  ] });
  assert.equal(experience.kind, "OWNER");
  assert.equal(getRoleAwareRoute("businessDashboard", experience), "businessDashboard");
});

test("Bookkeeper receives only the implemented read-oriented time/profile routes", () => {
  const experience = resolvePrimaryTeamExperience({ memberships: [{
    ...fieldMembership,
    role: "BOOKKEEPER_FINANCE",
  }] });
  assert.equal(experience.kind, "BOOKKEEPER_FINANCE");
  assert.equal(getRoleAwareRoute("businessDashboard", experience), "teamOperations?businessId=7&view=timesheets");
  assert.equal(getRoleAwareRoute("bookkeeperProfile?businessId=7", experience), "bookkeeperProfile?businessId=7");
});

test("employee application routes and seven-item navigation are explicit", () => {
  assert.equal(isRecognizedApplicationHash("#teamOperations"), true);
  for (const route of ["employeeHome", "employeeJobs", "employeeSchedule", "employeeTime", "employeeMessages", "employeeAlerts", "employeeProfile"]) {
    assert.equal(isRecognizedApplicationHash(`#${route}`), true);
    assert.equal(isEmployeeAppRoute(route), true);
  }
  for (const [key, label] of [
    ["fieldNavHome", "Home"],
    ["fieldNavMyJobs", "My Jobs"],
    ["fieldNavSchedule", "Schedule"],
    ["fieldNavTime", "Time"],
    ["fieldNavMessages", "Messages"],
    ["fieldNavAlerts", "Alerts"],
    ["fieldNavProfile", "Profile"],
  ]) {
    assert.match(shellSource, new RegExp(`labelKey: "${key}"`));
    assert.equal(t(key, "en"), label);
  }
  assert.match(shellSource, /useLanguage/);
  assert.match(appSource, /Preparing your Team workspace/);
  assert.match(appSource, /Opening your role-aware workspace/);
  assert.match(appSource, /Team access could not be verified/);
});

test("Field Home and Profile present role-aware operational facts without Business billing", () => {
  for (const key of ["fieldCurrentAssignment", "fieldTodaysWork", "fieldNextAction", "fieldCurrentTimer", "fieldRecentUpdate"]) {
    assert.match(employeePortalSource, new RegExp(key));
    assert.ok(t(key, "en"));
  }
  assert.match(employeePortalSource, /fieldProfileTeamAccess/);
  assert.match(employeePortalSource, /fieldEmployeeRole/);
  assert.match(employeePortalSource, /fieldProfileAccessManaged/);
  assert.equal(t("fieldEmployeeRole", "en"), "Field Employee");
  assert.doesNotMatch(employeePortalSource, /Starter|Growth|Professional Plan|Manage Subscription/);
});

test("Owner and Manager assignment management no longer renders worker Clock controls", () => {
  const managementStart = employeeJobsSource.indexOf(") : managementMode ? (");
  const fieldStart = employeeJobsSource.indexOf(") : (", managementStart + 1);
  assert.ok(managementStart > 0 && fieldStart > managementStart);
  const managementBranch = employeeJobsSource.slice(managementStart, fieldStart);
  assert.doesNotMatch(managementBranch, /<TimeEvidencePanel/);
  assert.match(employeeJobsSource.slice(fieldStart), /<TimeEvidencePanel/);
  assert.match(employeeJobsSource, /data-team-role|EmployeeShell/);
});

test("employee Alerts reuse canonical alert authority without professional Quote attention or Business nav", () => {
  assert.match(notificationsSource, /employeeMode/);
  assert.match(notificationsSource, /!employeeMode && selectedView/);
  assert.match(notificationsSource, /!employeeMode && <BottomNav/);
  assert.match(appSource, /<Notifications setPage=\{setPage\} employeeMode/);
});

test("invitation acceptance identifies the Business and refreshes role routing", () => {
  assert.match(teamSource, /You are joining \{authority\?\.pendingInvitations/);
  assert.match(teamSource, /do\s+not create another Business/);
  assert.match(teamSource, /meetroTeamAuthorityChanged/);
});

test("employee shell has explicit narrow-phone protections covering 375, 390, and 430 pixels", () => {
  assert.match(shellCss, /@media \(max-width: 760px\)/);
  assert.match(shellCss, /@media \(max-width: 390px\)/);
  assert.match(shellCss, /@media \(min-width: 391px\) and \(max-width: 430px\)/);
  assert.match(shellCss, /minmax\(0, 1fr\)/);
  assert.match(shellCss, /safe-area-inset-bottom/);
});

test("standard Employee header keeps compact Team access inside physical iPhone widths", () => {
  const mobileCss = shellCss.slice(
    shellCss.indexOf("@media (max-width: 760px)"),
    shellCss.indexOf("@media (max-width: 390px)")
  );

  assert.match(shellSource, /const resolvedAccessLabel = accessLabel \|\| t\("fieldTeamAccess", language\)/);
  assert.match(shellSource, /className="employee-shell__access"[\s\S]*aria-label=\{resolvedAccessLabel\}/);
  assert.match(shellSource, /employee-shell__access-label--compact[\s\S]*fieldAudienceTeam/);
  assert.match(mobileCss, /\.employee-shell__header \{[\s\S]*safe-area-inset-right[\s\S]*safe-area-inset-left[\s\S]*gap: 10px/);
  assert.match(mobileCss, /\.employee-shell__header-copy \{[\s\S]*flex: 1 1 0/);
  assert.match(mobileCss, /\.employee-shell__header-actions \{[\s\S]*flex: 0 1 120px[\s\S]*max-width: 36%/);
  assert.match(mobileCss, /\.employee-shell__access \{[\s\S]*min-width: 44px[\s\S]*min-height: 44px/);
  assert.match(mobileCss, /\.employee-shell__access-label--full \{[\s\S]*display: none/);
  assert.match(mobileCss, /\.employee-shell__access-label--compact \{[\s\S]*display: inline/);

  for (const viewportWidth of [390, 393, 430, 440]) {
    const contentWidth = viewportWidth - (12 * 2);
    const actionWidth = Math.min(120, contentWidth * 0.36);
    const titleWidth = contentWidth - 10 - actionWidth;
    assert.ok(titleWidth >= 230, `${viewportWidth}px preserves header title room`);
    assert.ok(actionWidth >= 44, `${viewportWidth}px preserves Team touch width`);
    assert.ok(titleWidth + 10 + actionWidth <= contentWidth, `${viewportWidth}px fits header`);
  }
});
