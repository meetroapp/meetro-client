import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCommunicationAttention,
  getConversationCustomerAttention,
  getJobCommunicationAttention,
} from "../src/utils/communicationAttention.js";
import { acknowledgeFieldMessageAttention } from "../src/utils/fieldOperationsApi.js";
import { acknowledgeFieldCustomerAttention } from "../src/utils/fieldCustomerCommunicationApi.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const ASSIGNMENT_ID = "a7c9a660-c087-4af1-b139-8d77f8d69b33";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("authoritative communication summary keeps Team and Customer attention isolated", () => {
  const snapshot = {
    identity: "14",
    response: {
      counts: {
        communication: {
          unread: 3,
          teamUnread: 1,
          customerUnread: 2,
          byJob: [{ businessId: 7, jobId: JOB_ID, teamUnread: 1, customerUnread: 2 }],
          byConversation: [{ conversationId: 342, customerUnread: 2 }],
        },
      },
    },
  };
  const attention = getCommunicationAttention(snapshot, "14");
  assert.deepEqual(getJobCommunicationAttention(attention, 7, JOB_ID), {
    businessId: 7,
    jobId: JOB_ID,
    teamUnread: 1,
    customerUnread: 2,
  });
  assert.equal(getConversationCustomerAttention(attention, 342), 2);
  assert.equal(getCommunicationAttention(snapshot, "another-user").unread, 0);
});

test("exact loaded Team and Customer scopes use separate acknowledgement routes", async () => {
  const calls = [];
  const transport = async (path, options) => {
    calls.push({ path, options });
    return {
      response: { ok: true },
      data: { success: true, code: "ATTENTION_ACKNOWLEDGED" },
    };
  };
  await acknowledgeFieldMessageAttention(JOB_ID, {
    businessId: 7,
    assignmentId: ASSIGNMENT_ID,
    managed: true,
  }, transport);
  await acknowledgeFieldCustomerAttention(JOB_ID, {
    businessId: 7,
    assignmentId: ASSIGNMENT_ID,
  }, undefined, transport);

  assert.equal(calls[0].path, `/team/jobs/${JOB_ID}/field-communications/read`);
  assert.equal(calls[1].path, `/employee/jobs/${JOB_ID}/customer-conversation/read`);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    businessId: 7,
    assignmentId: ASSIGNMENT_ID,
  });
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    businessId: 7,
    assignmentId: ASSIGNMENT_ID,
  });
});

test("Field navigation, Alerts discovery, and audience badges consume one shared coordinator", () => {
  const shell = source("../src/components/EmployeeShell.jsx");
  const portal = source("../src/pages/EmployeePortal.jsx");
  const alerts = source("../src/pages/Notifications.jsx");
  const coordinator = source("../src/utils/alertCountCoordinator.js");

  assert.match(shell, /employeeMessages:\s*attention\.unread/);
  assert.match(shell, /employeeAlerts:\s*alertUnread/);
  assert.match(portal, /selectedAttention\.teamUnread/);
  assert.match(portal, /selectedAttention\.customerUnread/);
  assert.match(alerts, /subscribeAlertCounts/);
  assert.match(alerts, /controller\.refresh\(\)/);
  assert.match(coordinator, /ALERT_COUNT_POLL_INTERVAL_MS = 15_000/);
  assert.doesNotMatch([shell, portal, alerts, coordinator].join("\n"), /WebSocket\s*\(/);
});

test("business Team polish preserves protected Communication Center architecture", () => {
  const thread = source("../src/pages/ConversationThread.jsx");
  const inbox = source("../src/pages/MessagesInbox.jsx");

  assert.match(thread, /business-team-communication__composer-send/);
  assert.match(thread, /background:\s*#174c2f/);
  assert.match(thread, /height:\s*46px/);
  assert.match(thread, /gridTemplateColumns:\s*"minmax\(0, 1fr\) auto"/);
  assert.match(thread, /maxWidth:\s*"100%"/);
  assert.match(thread, /COMPACT_MESSAGE_COMPOSER/);
  assert.match(thread, /sendMinWidthPx/);
  assert.match(thread, /sendMaxWidthPx/);
  assert.match(thread, /conversationAudienceTeamPrivate/);
  assert.match(inbox, /data-communication-columns/);
  assert.match(inbox, /onCanonicalWorkContextChange/);
  assert.match(inbox, /getConversationCustomerAttention/);
});
