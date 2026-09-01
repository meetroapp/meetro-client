import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createFieldMessageComposerState,
  getFieldMessageDraftKey,
  getFieldMessageSendAuthority,
  isExplicitFieldMessageAudienceActivation,
  reduceFieldMessageComposerState,
  resolveFieldMessageRoute,
} from "../src/utils/fieldMessageComposerState.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const appSource = readFileSync("src/App.jsx", "utf8");
const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";

function routeFor(audience) {
  return `#employeeMessages?businessId=7&jobId=${JOB_ID}&audience=${audience}`;
}

test("route and reducer preserve Team drafts across non-routing lifecycle events", () => {
  let hash = routeFor("team");
  let state = createFieldMessageComposerState();
  state = reduceFieldMessageComposerState(state, {
    type: "update_draft",
    jobId: JOB_ID,
    audience: "customer",
    value: "Customer draft remains separate",
  });

  let route = resolveFieldMessageRoute(hash, [JOB_ID]);
  assert.equal(route.audience, "team");

  // This verifies the existing activation guard only; physical tracing remains
  // required to identify which lifecycle path changes the employee route.
  const customerRetargetAccepted = isExplicitFieldMessageAudienceActivation({
    targetAudience: "customer",
    pointerAudience: "",
    clickDetail: 1,
  });
  assert.equal(customerRetargetAccepted, false);

  for (const event of [
    "textarea_focus",
    "visual_viewport_resize",
    "window_resize",
    "visibility_change",
    "window_focus",
    "component_rerender",
    "communication_refresh",
  ]) {
    state = reduceFieldMessageComposerState(state, { type: event });
    route = resolveFieldMessageRoute(hash, [JOB_ID]);
  }

  state = reduceFieldMessageComposerState(state, {
    type: "update_draft",
    jobId: JOB_ID,
    audience: route.audience,
    value: "Private Team update",
  });

  assert.equal(hash, routeFor("team"));
  assert.equal(route.audience, "team");
  assert.equal(
    state.drafts[getFieldMessageDraftKey(JOB_ID, "team")],
    "Private Team update"
  );
  assert.equal(
    state.drafts[getFieldMessageDraftKey(JOB_ID, "customer")],
    "Customer draft remains separate"
  );
  assert.equal(getFieldMessageSendAuthority(route.audience), "team");
});

test("only activation beginning on an audience control changes the canonical route", () => {
  let hash = routeFor("team");
  assert.equal(resolveFieldMessageRoute(hash, [JOB_ID]).audience, "team");

  assert.equal(isExplicitFieldMessageAudienceActivation({
    targetAudience: "customer",
    pointerAudience: "customer",
    clickDetail: 1,
  }), true);
  hash = routeFor("customer");
  assert.equal(resolveFieldMessageRoute(hash, [JOB_ID]).audience, "customer");

  assert.equal(isExplicitFieldMessageAudienceActivation({
    targetAudience: "team",
    clickDetail: 0,
  }), true, "keyboard and assistive activation remain supported");
  hash = routeFor("team");
  assert.equal(resolveFieldMessageRoute(hash, [JOB_ID]).audience, "team");
});

test("explicit Team and Customer deep links are the sole audience source", () => {
  assert.deepEqual(resolveFieldMessageRoute(routeFor("team"), [JOB_ID]), {
    requestedJobId: JOB_ID,
    requestedAudience: "team",
    selectedJobId: JOB_ID,
    audience: "team",
    hasExplicitDestination: true,
  });
  assert.equal(resolveFieldMessageRoute(routeFor("customer"), [JOB_ID]).audience, "customer");
  assert.equal(
    resolveFieldMessageRoute("#employeeMessages?businessId=7", [JOB_ID]).audience,
    "team"
  );
  assert.equal(
    resolveFieldMessageRoute(routeFor("customer"), ["another-job"]).audience,
    "team",
    "an ineligible routed Job cannot grant Customer audience"
  );
});

test("Team and Customer send authority cannot cross endpoints", () => {
  assert.equal(getFieldMessageSendAuthority("team"), "team");
  assert.equal(getFieldMessageSendAuthority("customer"), "customer");

  const teamSendBlock = portalSource.slice(
    portalSource.indexOf("async function submitTeamMessage"),
    portalSource.indexOf("async function deliverPendingCustomerMessage")
  );
  const customerSendBlock = portalSource.slice(
    portalSource.indexOf("async function deliverPendingCustomerMessage"),
    portalSource.indexOf("function undoPendingCustomerMessage")
  );
  assert.match(teamSendBlock, /sendAuthority !== "team"/);
  assert.match(teamSendBlock, /sendFieldMessage/);
  assert.doesNotMatch(teamSendBlock, /sendFieldCustomerMessage/);
  assert.match(customerSendBlock, /sendAuthority !== "customer"/);
  assert.match(customerSendBlock, /sendFieldCustomerMessage/);
});

test("Messages wires route authority and rejects a keyboard-retargeted audience click", () => {
  assert.match(portalSource, /useSyncExternalStore\(/);
  assert.match(portalSource, /resolveFieldMessageRoute\(routeSnapshot, eligibleJobIds\)/);
  assert.match(portalSource, /onPointerDown=\{\(\) => \{[\s\S]*audiencePointerIntent\.current = value/);
  assert.match(portalSource, /onTouchStart=\{\(\) => \{[\s\S]*audiencePointerIntent\.current = value/);
  assert.match(portalSource, /onClick=\{\(event\) => selectAudienceFromControl\(event, value\)\}/);
  assert.match(portalSource, /isExplicitFieldMessageAudienceActivation/);
  assert.match(portalSource, /<textarea[\s\S]*onPointerDown=\{\(\) => \{[\s\S]*audiencePointerIntent\.current = ""/);
  assert.match(portalSource, /<textarea[\s\S]*onTouchStart=\{\(\) => \{[\s\S]*audiencePointerIntent\.current = ""/);
  assert.doesNotMatch(portalSource, /dispatchComposer\(\{ type: "select_audience"/);
  assert.doesNotMatch(portalSource, /routeValue\("audience"\)/);
  const audienceSelectionBlock = portalSource.slice(
    portalSource.indexOf("function selectAudience(nextAudience)"),
    portalSource.indexOf("function updateDraft(value)")
  );
  assert.doesNotMatch(audienceSelectionBlock, /setTimeout/);
  assert.doesNotMatch(appSource, /visibilitychange[\s\S]{0,500}audience=customer/);
});

test("temporary Employee iOS trace is removed without changing audience activation authority", () => {
  for (const traceMarker of [
    "TEMP IOS EMPLOYEE MESSAGE TRACE",
    "Copy Trace",
    "Clear Trace",
    "EMPLOYEE_MESSAGE_IOS_TRACE",
    "appendEmployeeMessageTrace",
    "traceEmployeeMessageEvent",
    "visualViewport_resize",
    "employee_textarea_focus",
    "messages_view_mount",
  ]) {
    assert.doesNotMatch(portalSource, new RegExp(traceMarker));
  }
  assert.doesNotMatch(portalSource, /@capacitor\/core/);
  assert.match(portalSource, /isExplicitFieldMessageAudienceActivation/);
  assert.match(portalSource, /audiencePointerIntent\.current = value/);
  assert.doesNotMatch(portalSource, /TEMP IOS BUSINESS MESSAGE TRACE/);
});
