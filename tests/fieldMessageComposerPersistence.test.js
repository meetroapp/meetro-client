import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createFieldMessageComposerState,
  getFieldMessageDraftKey,
  getFieldMessageSendAuthority,
  reduceFieldMessageComposerState,
} from "../src/utils/fieldMessageComposerState.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";

function transition(state, action) {
  return reduceFieldMessageComposerState(state, action);
}

test("Team composer survives focus typing rerender and communication refresh events", () => {
  let state = createFieldMessageComposerState({
    selectedJobId: JOB_ID,
    audience: "customer",
  });
  state = transition(state, {
    type: "update_draft",
    jobId: JOB_ID,
    audience: "customer",
    value: "Customer draft stays private to Customer",
  });
  state = transition(state, { type: "select_audience", audience: "team" });
  state = transition(state, { type: "composer_focus" });
  state = transition(state, {
    type: "update_draft",
    jobId: JOB_ID,
    audience: "team",
    value: "Team-only update",
  });

  for (const type of [
    "component_rerender",
    "communication_attention_refresh",
    "thread_refresh",
    "window_focus",
    "visibility_change",
  ]) {
    state = transition(state, { type });
  }
  state = transition(state, { type: "reconcile_jobs", jobIds: [JOB_ID] });

  assert.equal(state.audience, "team");
  assert.equal(state.drafts[getFieldMessageDraftKey(JOB_ID, "team")], "Team-only update");
  assert.equal(
    state.drafts[getFieldMessageDraftKey(JOB_ID, "customer")],
    "Customer draft stays private to Customer"
  );
  assert.equal(getFieldMessageSendAuthority(state.audience), "team");
});

test("Team and Customer send authority cannot cross endpoints", () => {
  let teamSends = 0;
  let customerSends = 0;
  const submit = (audience) => {
    if (getFieldMessageSendAuthority(audience) === "team") teamSends += 1;
    else customerSends += 1;
  };

  submit("team");
  assert.deepEqual({ teamSends, customerSends }, { teamSends: 1, customerSends: 0 });

  let state = createFieldMessageComposerState({ selectedJobId: JOB_ID, audience: "team" });
  state = transition(state, { type: "select_audience", audience: "customer" });
  submit(state.audience);
  assert.deepEqual({ teamSends, customerSends }, { teamSends: 1, customerSends: 1 });

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
  assert.match(customerSendBlock, /sendAuthority !== "customer"/);
  assert.match(customerSendBlock, /sendFieldCustomerMessage/);
  assert.match(portalSource, /onSubmit=\{sendAuthority === "team" \? submitTeamMessage : submitCustomerMessage\}/);
});

test("explicit route audience hydrates through the only supported audience transition", () => {
  assert.match(portalSource, /if \(!routedJob \|\| !\["team", "customer"\]\.includes\(requestedAudience\)\) return/);
  assert.match(portalSource, /dispatchComposer\(\{ type: "select_audience", audience: requestedAudience \}\)/);
  assert.doesNotMatch(portalSource, /setAudience\(/);
});
