import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getEmployeeWorkspaceAuthorityKey,
  shouldBlockForEmployeeWorkspaceLoad,
  shouldReloadEmployeeWorkspace,
} from "../src/utils/employeeWorkspaceLifecycle.js";
import {
  createFieldMessageComposerState,
  getFieldMessageDraftKey,
  reduceFieldMessageComposerState,
  resolveFieldMessageRoute,
} from "../src/utils/fieldMessageComposerState.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const membership = Object.freeze({
  id: "field-membership",
  userId: 44,
  businessId: 7,
  role: "FIELD_EMPLOYEE",
  status: "ACTIVE",
  permissions: ["TIME_SELF_ACTION", "ASSIGNED_WORK"],
});

test("new setPage identities and keyboard-layout rerenders do not reschedule Employee workspace loading", () => {
  const authorityKey = getEmployeeWorkspaceAuthorityKey(membership);
  let previousAuthorityKey = "";
  let legacyCallbackIdentityReloadCount = 0;
  let workspaceReloadCount = 0;
  let blockingReloadCountAfterInitial = 0;
  let messagesViewUnmountCount = 0;
  let composer = createFieldMessageComposerState();
  const route = `#employeeMessages?businessId=7&jobId=${JOB_ID}&audience=team`;

  composer = reduceFieldMessageComposerState(composer, {
    type: "update_draft",
    jobId: JOB_ID,
    audience: "team",
    value: "Private Team draft",
  });

  for (let render = 0; render < 12; render += 1) {
    const setPage = () => render;
    assert.equal(typeof setPage, "function");
    legacyCallbackIdentityReloadCount += 1;
    if (shouldReloadEmployeeWorkspace(previousAuthorityKey, authorityKey)) {
      workspaceReloadCount += 1;
      previousAuthorityKey = authorityKey;
    }
    if (
      render > 0 &&
      shouldBlockForEmployeeWorkspaceLoad(previousAuthorityKey, authorityKey)
    ) {
      blockingReloadCountAfterInitial += 1;
      messagesViewUnmountCount += 1;
    }
    const selection = resolveFieldMessageRoute(route, [JOB_ID]);
    assert.equal(selection.audience, "team");
    assert.equal(selection.selectedJobId, JOB_ID);
  }

  assert.equal(legacyCallbackIdentityReloadCount, 12);
  assert.equal(workspaceReloadCount, 1, "only the initial semantic load runs");
  assert.equal(blockingReloadCountAfterInitial, 0);
  assert.equal(messagesViewUnmountCount, 0);
  assert.equal(
    composer.drafts[getFieldMessageDraftKey(JOB_ID, "team")],
    "Private Team draft"
  );
});

test("initial and genuine membership authority changes reload while same-authority refresh is non-blocking", () => {
  const initialKey = getEmployeeWorkspaceAuthorityKey(membership);
  const sameAuthorityKey = getEmployeeWorkspaceAuthorityKey({
    ...membership,
    permissions: [...membership.permissions].reverse(),
  });
  const otherBusinessKey = getEmployeeWorkspaceAuthorityKey({
    ...membership,
    businessId: 8,
  });
  const inactiveMembershipKey = getEmployeeWorkspaceAuthorityKey({
    ...membership,
    status: "INACTIVE",
  });

  assert.equal(shouldReloadEmployeeWorkspace("", initialKey), true);
  assert.equal(shouldReloadEmployeeWorkspace(initialKey, sameAuthorityKey), false);
  assert.equal(shouldReloadEmployeeWorkspace(initialKey, otherBusinessKey), true);
  assert.equal(shouldReloadEmployeeWorkspace(initialKey, inactiveMembershipKey), true);
  assert.equal(shouldBlockForEmployeeWorkspaceLoad(initialKey, initialKey), false);
  assert.equal(shouldBlockForEmployeeWorkspaceLoad(initialKey, otherBusinessKey), true);
});

test("EmployeePortal uses latest callbacks without treating callback identity as load authority", () => {
  const loadBlock = portalSource.slice(
    portalSource.indexOf("const load = useCallback"),
    portalSource.indexOf("const current = workspace.operations")
  );
  assert.match(loadBlock, /employeeWorkspaceSetPageRef\.current/);
  assert.match(loadBlock, /shouldBlockForEmployeeWorkspaceLoad/);
  assert.match(loadBlock, /if \(blockingLoad\) \{[\s\S]{0,180}setLoading\(true\)/);
  assert.match(loadBlock, /\}, \[businessId, workspaceAuthorityKey\]\);/);
  assert.match(loadBlock, /\}, \[workspaceAuthorityKey\]\);/);
  assert.doesNotMatch(
    loadBlock,
    /\}, \[businessId, language, setPage\]\)|\}, \[load\]\)/
  );
  assert.match(portalSource, /loading \? <section[\s\S]{0,180}<PortalView/);
});

test("trace cleanup preserves semantic lifecycle stabilization", () => {
  assert.doesNotMatch(portalSource, /EMPLOYEE_MESSAGE_IOS_TRACE|employeeMessageIosTrace/);
  assert.doesNotMatch(portalSource, /employeePortalRenderCount|employeePortalPreviousSetPage/);
  assert.match(portalSource, /employeeWorkspaceSetPageRef\.current/);
  assert.match(portalSource, /employeeWorkspaceRequestRef\.current \+= 1/);
});
