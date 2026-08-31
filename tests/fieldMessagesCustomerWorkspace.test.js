import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  fetchFieldCustomerConversation,
  sendFieldCustomerMessage,
} from "../src/utils/fieldCustomerCommunicationApi.js";
import { t } from "../src/utils/language.js";

const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const jobsSource = readFileSync("src/pages/EmployeeJobs.jsx", "utf8");
const customerApiSource = readFileSync(
  "src/utils/fieldCustomerCommunicationApi.js",
  "utf8"
);
const fieldApiSource = readFileSync("src/utils/fieldOperationsApi.js", "utf8");
const fieldCss = readFileSync("src/styles/employeeShell.css", "utf8");
const messagesInboxSource = readFileSync("src/pages/MessagesInbox.jsx", "utf8");
const conversationThreadSource = readFileSync("src/pages/ConversationThread.jsx", "utf8");
const fieldOperationsSource = jobsSource.slice(
  jobsSource.indexOf("function FieldOperationsPanel"),
  jobsSource.indexOf("const TIME_CATEGORY_LABEL_KEYS")
);

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const ASSIGNMENT_ID = "a7c9a660-c087-4af1-b139-8d77f8d69b33";

test("customer API uses only exact employee Job-scoped delegated routes", async () => {
  const calls = [];
  const authFetchImpl = async (path, options, setPage) => {
    calls.push({ path, options, setPage });
    return {
      response: { ok: true, status: options.method === "POST" ? 201 : 200 },
      data: { success: true, conversation: { messages: [] } },
    };
  };
  const setPage = () => {};
  await fetchFieldCustomerConversation(
    JOB_ID,
    { businessId: 80, assignmentId: ASSIGNMENT_ID },
    setPage,
    authFetchImpl
  );
  await sendFieldCustomerMessage(
    JOB_ID,
    {
      businessId: 80,
      assignmentId: ASSIGNMENT_ID,
      message: "  I am on site.  ",
      idempotencyKey: "field-customer-message-1",
    },
    setPage,
    authFetchImpl
  );
  assert.equal(
    calls[0].path,
    `/employee/jobs/${JOB_ID}/customer-conversation?businessId=80&assignmentId=${ASSIGNMENT_ID}`
  );
  assert.deepEqual(calls[0].options, { method: "GET", cache: "no-store" });
  assert.equal(
    calls[1].path,
    `/employee/jobs/${JOB_ID}/customer-conversation/messages`
  );
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    businessId: 80,
    assignmentId: ASSIGNMENT_ID,
    message: "I am on site.",
    idempotencyKey: "field-customer-message-1",
  });
  assert.doesNotMatch(customerApiSource, /\/conversations\//);
});

test("customer API rejects caller-controlled canonical and commercial authority", async () => {
  const forbidden = [
    "conversationId",
    "senderId",
    "receiverId",
    "homeownerId",
    "professionalUserId",
    "quoteId",
    "invoiceId",
    "paymentId",
    "workflowPayload",
  ];
  let calls = 0;
  const authFetchImpl = async () => {
    calls += 1;
    return { response: { ok: true }, data: { success: true } };
  };
  for (const field of forbidden) {
    await assert.rejects(
      sendFieldCustomerMessage(
        JOB_ID,
        {
          businessId: 80,
          assignmentId: ASSIGNMENT_ID,
          message: "Hello",
          idempotencyKey: "fixed-key",
          [field]: "caller-value",
        },
        undefined,
        authFetchImpl
      ),
      (error) =>
        error.code === "FIELD_CUSTOMER_COMMUNICATION_FIELDS_UNSUPPORTED" &&
        error.status === 400
    );
  }
  assert.equal(calls, 0);
});

test("customer API normalizes server failures into useful Error identity", async () => {
  await assert.rejects(
    fetchFieldCustomerConversation(
      JOB_ID,
      { businessId: 80, assignmentId: ASSIGNMENT_ID },
      undefined,
      async () => ({
        response: { ok: false, status: 409 },
        data: {
          success: false,
          code: "FIELD_CUSTOMER_ASSIGNMENT_REQUIRED",
          message: "Assignment unavailable.",
        },
      })
    ),
    (error) =>
      error instanceof Error &&
      error.message === "Assignment unavailable." &&
      error.code === "FIELD_CUSTOMER_ASSIGNMENT_REQUIRED" &&
      error.status === 409
  );
});

test("Field Messages keeps Team and Customer as separate assignment-scoped authorities", () => {
  assert.match(portalSource, /\["team", "fieldAudienceTeam"\]/);
  assert.match(portalSource, /\["customer", "fieldAudienceCustomer"\]/);
  assert.match(portalSource, /operations\.filter\(hasActiveMessageAssignment\)/);
  assert.match(portalSource, /routedJob \? routedAudience : "team"/);
  assert.match(portalSource, /eligibleJobs\.find\(\(item\) => item\.job\.id === requestedJobId\)/);
  assert.match(portalSource, /selected\.assignment\.id/);
  assert.match(portalSource, /sendFieldMessage\(selected\.job\.id/);
  assert.match(portalSource, /sendFieldCustomerMessage\(/);
  assert.match(portalSource, /fetchFieldCustomerConversation\(/);
  assert.match(portalSource, /const teamMessages = selectedOperations\?\.messages \|\| \[\]/);
  assert.match(portalSource, /const customerMessages = customerThread\.conversation\?\.messages \|\| \[\]/);
  assert.match(portalSource, /`\$\{selectedJobId\}:\$\{audience\}`/);
  assert.doesNotMatch(portalSource, /\/conversations\//);
  assert.match(fieldApiSource, /\/field-messages/);
  assert.doesNotMatch(fieldApiSource, /customer-conversation/);
});

test("Customer projection renders server author types and employee attribution without sender identity inference", () => {
  assert.match(portalSource, /type === "FIELD_EMPLOYEE"/);
  assert.match(portalSource, /type === "CUSTOMER"/);
  assert.match(portalSource, /message\.author\.displayName/);
  assert.match(portalSource, /message\.author\?\.type/);
  assert.match(portalSource, /message\.author\?\.type === "FIELD_EMPLOYEE"/);
  assert.match(portalSource, /fieldEmployeeTag/);
  assert.match(portalSource, /field-messages-employee-pill/);
  assert.doesNotMatch(portalSource, /message\.senderId|message\.receiverId|sender_id|receiver_id/);
  assert.doesNotMatch(portalSource, /quote|invoice|deposit|payment|workflow_payload/i);
});

test("composers state the audience and preserve Customer text on failure", () => {
  assert.match(portalSource, /fieldPrivateToTeam/);
  assert.match(portalSource, /fieldVisibleToCustomer/);
  assert.match(portalSource, /fieldWriteCustomerMessage/);
  assert.match(portalSource, /fieldSendToCustomer/);
  const customerDelivery = portalSource.slice(
    portalSource.indexOf("async function deliverPendingCustomerMessage"),
    portalSource.indexOf("function submitCustomerMessage")
  );
  assert.match(customerDelivery, /result\.conversation/);
  assert.match(customerDelivery, /fieldCustomerMessageFailed/);
  assert.match(customerDelivery, /captured\.message/);
  assert.match(customerDelivery, /captured\.idempotencyKey/);
  assert.match(customerDelivery, /fieldMessageRestored/);
});

test("Quick Customer Updates are localized prefill-only controls in Customer mode", () => {
  assert.match(portalSource, /audience === "customer" \? \([\s\S]*fieldQuickCustomerUpdates/);
  for (const key of [
    "fieldQuickOnMyWayText",
    "fieldQuick15MinAwayText",
    "fieldQuick30MinAwayText",
    "fieldQuickRunningLateText",
    "fieldQuickArrivedText",
    "fieldQuickNeedAccessText",
  ]) {
    assert.match(portalSource, new RegExp(key));
  }
  const quickUpdateUi = portalSource.slice(
    portalSource.indexOf('<section className="field-messages-quick-updates"'),
    portalSource.indexOf("</section>", portalSource.indexOf('<section className="field-messages-quick-updates"'))
  );
  assert.match(quickUpdateUi, /updateDraft\(t\(quickUpdate\.textKey, language\)\)/);
  assert.doesNotMatch(quickUpdateUi, /sendFieldCustomerMessage|sendFieldMessage|updateFieldStatus/);
});

test("Customer send schedules one captured command while Team send remains immediate", () => {
  const scheduleBlock = portalSource.slice(
    portalSource.indexOf("function submitCustomerMessage"),
    portalSource.indexOf("function undoPendingCustomerMessage")
  );
  assert.match(scheduleBlock, /if \(pendingCustomerSend/);
  assert.match(scheduleBlock, /captureFieldCustomerSend/);
  assert.match(scheduleBlock, /startFieldCustomerSendCountdown/);
  assert.doesNotMatch(scheduleBlock, /sendFieldCustomerMessage/);
  assert.match(portalSource, /pendingCustomerController\.current\?\.cancel\(\)/);
  assert.match(portalSource, /\[selectedJobId\]: ""/);
  assert.match(portalSource, /\[captured\.jobId\]: captured\.idempotencyKey/);
  assert.match(portalSource, /\[captured\.jobId\]: ""/);
  assert.match(portalSource, /setPendingCustomerSend\(null\)/);
  assert.match(portalSource, /disabled=\{!selected \|\| Boolean\(pendingCustomerSend\)\}/);
  assert.match(portalSource, /disabled=\{Boolean\(pendingCustomerSend\)\}/);
  assert.match(portalSource, /disabled=\{Boolean\(pendingCustomerSend\) \|\| !customerThread\.conversation\}/);

  const teamSendBlock = portalSource.slice(
    portalSource.indexOf("async function submitTeamMessage"),
    portalSource.indexOf("async function deliverPendingCustomerMessage")
  );
  assert.match(teamSendBlock, /await sendFieldMessage/);
  assert.doesNotMatch(teamSendBlock, /startFieldCustomerSendCountdown|pendingCustomerSend/);
  assert.doesNotMatch(portalSource, /updateFieldStatus/);
});

test("My Jobs deep-links exact active assignments to Team or Customer Field Messages", () => {
  assert.match(
    fieldOperationsSource,
    /assignment\.state === "ACTIVE" &&[\s\S]*assignment\.memberStatus === "ACTIVE"[\s\S]*assignment\.memberRole === "FIELD_EMPLOYEE"[\s\S]*employee-field-message-hub-actions/
  );
  assert.match(jobsSource, /employeeMessages\?businessId=\$\{businessId\}&jobId=\$\{encodeURIComponent\(job\.id\)\}&audience=team/);
  assert.match(jobsSource, /employeeMessages\?businessId=\$\{businessId\}&jobId=\$\{encodeURIComponent\(job\.id\)\}&audience=customer/);
  assert.match(jobsSource, /fieldOpenTeamMessages/);
  assert.match(jobsSource, /fieldOpenCustomerMessages/);
  assert.equal((fieldOperationsSource.match(/employee-field-message-hub-actions/g) || []).length, 1);
});

test("My Jobs has no inline Team history, empty state, composer, or send action", () => {
  assert.doesNotMatch(fieldOperationsSource, /sendFieldMessage/);
  assert.doesNotMatch(fieldOperationsSource, /operations\?*\.messages/);
  assert.doesNotMatch(fieldOperationsSource, /fieldNoTeamMessages|fieldInternalMessagesAria/);
  assert.doesNotMatch(fieldOperationsSource, /employee-field-message-list|employee-field-message-form/);
  assert.doesNotMatch(fieldOperationsSource, /<textarea|submitMessage|working === "message"/);
  assert.match(fieldOperationsSource, /fieldCommunicationAssignedJob/);
});

test("My Jobs preserves status evidence notes and transition behavior", () => {
  assert.match(fieldOperationsSource, /fieldOptionalNote/);
  assert.match(fieldOperationsSource, /value=\{note\}/);
  assert.match(fieldOperationsSource, /note: note\.trim\(\) \|\| null/);
  assert.match(fieldOperationsSource, /toStatus: operations\.nextStatus/);
  assert.match(fieldOperationsSource, /await updateFieldStatus/);
  assert.equal(t("fieldOptionalNote", "en"), "Add a note (optional)");
});

test("all new Field Messages copy has EN, ES, FR, and PT-BR parity", () => {
  const keys = [
    "fieldAudienceTeam",
    "fieldAudienceCustomer",
    "fieldPrivateToTeam",
    "fieldVisibleToCustomer",
    "fieldMessageCustomer",
    "fieldCustomerMessages",
    "fieldNoCustomerMessages",
    "fieldCustomerConversationUnavailable",
    "fieldWriteCustomerMessage",
    "fieldSendToCustomer",
    "fieldCustomerMessageFailed",
    "fieldSelectJob",
    "fieldAssignedJob",
    "fieldEmployeeTag",
    "fieldQuickCustomerUpdates",
    "fieldQuickOnMyWayText",
    "fieldQuick15MinAwayText",
    "fieldQuick30MinAwayText",
    "fieldQuickRunningLateText",
    "fieldQuickArrivedText",
    "fieldQuickNeedAccessText",
    "fieldSendingInSeconds",
    "fieldUndo",
    "fieldMessageRestored",
    "fieldMessageSending",
    "fieldPendingNavigationLocked",
    "fieldCommunication",
    "fieldCommunicationAssignedJob",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key, `${language}:${key}`);
      assert.ok(t(key, language).trim(), `${language}:${key}`);
    }
  }
  assert.equal(t("fieldPrivateToTeam", "en"), "Private to your team");
  assert.equal(t("fieldVisibleToCustomer", "en"), "Visible to customer");
  assert.equal(t("fieldQuickOnMyWayText", "en"), "I’m on my way to your location.");
  assert.equal(t("fieldQuick15MinAwayText", "en"), "I’m on my way and expect to arrive in about 15 minutes.");
  assert.equal(t("fieldQuick30MinAwayText", "en"), "I’m on my way and expect to arrive in about 30 minutes.");
  assert.equal(t("fieldQuickRunningLateText", "en"), "I’m running a little behind schedule. I’ll keep you updated on my arrival time.");
  assert.equal(t("fieldQuickArrivedText", "en"), "I’ve arrived at the property.");
  assert.equal(t("fieldQuickNeedAccessText", "en"), "I’m at the property and need assistance accessing the service area.");
});

test("Field Messages is responsive without coupling to Business Communication Center layout", () => {
  assert.match(fieldCss, /\.field-messages-layout[\s\S]*grid-template-columns: minmax\(230px, 0\.32fr\) minmax\(0, 0\.68fr\)/);
  assert.match(fieldCss, /@media \(max-width: 760px\)[\s\S]*\.field-messages-composer[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(fieldCss, /\.field-messages-composer textarea[\s\S]*max-width: 100%[\s\S]*min-width: 0/);
  assert.doesNotMatch(portalSource, /MessagesInbox|ConversationThread|splitShell|wideWorkspaceShell/);
  assert.match(messagesInboxSource, /data-communication-layout/);
  assert.match(conversationThreadSource, /conversation/);
});
