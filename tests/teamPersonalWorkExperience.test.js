import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getRoleAwareRoute,
  resolvePrimaryTeamExperience,
  TEAM_EXPERIENCE_MODES,
} from "../src/utils/teamRoleExperience.js";

const appSource = readFileSync("src/App.jsx", "utf8");
const modeSource = readFileSync(
  "src/utils/teamExperienceMode.js",
  "utf8"
);
const employeePortalSource = readFileSync(
  "src/pages/EmployeePortal.jsx",
  "utf8"
);
const profileSource = readFileSync(
  "src/pages/Profile.jsx",
  "utf8"
);

const membership = {
  id: "field-membership",
  businessId: 7,
  businessName: "All Handyman Services",
  role: "FIELD_EMPLOYEE",
  status: "ACTIVE",
};

test("Field Employee work mode remains role-restricted", () => {
  const experience = resolvePrimaryTeamExperience({
    memberships: [membership],
  });

  assert.equal(
    getRoleAwareRoute(
      "home",
      experience,
      TEAM_EXPERIENCE_MODES.WORK
    ),
    "employeeHome?businessId=7"
  );

  assert.equal(
    getRoleAwareRoute(
      "employeeJobs?businessId=7",
      experience,
      TEAM_EXPERIENCE_MODES.WORK
    ),
    "employeeJobs?businessId=7"
  );
});

test("Field Employee personal mode allows homeowner routes but exits employee routes", () => {
  const experience = resolvePrimaryTeamExperience({
    memberships: [membership],
  });

  assert.equal(
    getRoleAwareRoute(
      "home",
      experience,
      TEAM_EXPERIENCE_MODES.PERSONAL
    ),
    "home"
  );

  assert.equal(
    getRoleAwareRoute(
      "profile",
      experience,
      TEAM_EXPERIENCE_MODES.PERSONAL
    ),
    "profile"
  );

  assert.equal(
    getRoleAwareRoute(
      "employeeHome?businessId=7",
      experience,
      TEAM_EXPERIENCE_MODES.PERSONAL
    ),
    "home"
  );
});

test("Personal Work preference is identity-scoped UI state, not Team authority", () => {
  assert.match(
    modeSource,
    /meetroTeamExperienceMode:\$\{id\}/
  );
  assert.match(
    modeSource,
    /supportsPersonalWorkSwitch/
  );
  assert.match(
    appSource,
    /TEAM_EXPERIENCE_MODE_CHANGED_EVENT/
  );

  assert.doesNotMatch(
    modeSource,
    /TEAM_MANAGE_ROLES|TEAM_INVITE|TEAM_DEACTIVATE/
  );
});

test("Field Employee Profile exposes explicit Personal and Work choices", () => {
  assert.match(employeePortalSource, /Using Meetro as/);
  assert.match(employeePortalSource, /Work — \{businessName\}/);
  assert.match(employeePortalSource, />\s*Personal\s*</);
  assert.match(
    employeePortalSource,
    /Switching views does not\s+change your Team permissions/
  );
  assert.match(
    employeePortalSource,
    /requestTeamExperienceMode/
  );
});

test("Personal Profile exposes active Work access for the same identity", () => {
  assert.match(profileSource, /Work Access/);
  assert.match(profileSource, /teamWorkMembership/);
  assert.match(profileSource, /requestTeamExperienceMode/);
  assert.match(profileSource, /Field Employee/);
});
