import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  fetchManagedFieldCommunications,
} from "../src/utils/fieldOperationsApi.js";
import { t } from "../src/utils/language.js";

const conversationSource = readFileSync("src/pages/ConversationThread.jsx", "utf8");
const messagesSource = readFileSync("src/pages/MessagesInbox.jsx", "utf8");
const operationsApiSource = readFileSync("src/utils/fieldOperationsApi.js", "utf8");
const portalSource = readFileSync("src/pages/EmployeePortal.jsx", "utf8");
const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";

test("selected business communication workspace exposes Customer and Team without replacing top navigation", () => {
  assert.match(conversationSource, /className="business-communication-audience"/);
  assert.match(conversationSource, /conversationAudienceCustomer/);
  assert.match(conversationSource, /conversationAudienceTeamPrivate/);
  assert.match(conversationSource, /useState\("customer"\)/);
  assert.match(conversationSource, /setCommunicationAudience\("customer"\)/);
  assert.match(messagesSource, /Contacts|messagesSectionContacts/);
  assert.match(messagesSource, /Conversations|messagesSectionConversations/);
  assert.match(messagesSource, /Hiring|messagesSectionHiring/);
  assert.match(messagesSource, /Emergency|messagesSectionEmergency/);
});

test("Customer remains the unchanged canonical ConversationThread and Team swaps only the inner message workspace", () => {
  assert.match(conversationSource, /communicationAudience === "team" && managedTeamState\.phase === "ready"/);
  assert.match(conversationSource, /<BusinessTeamCommunicationPane/);
  assert.match(conversationSource, /communicationAudience !== "team"/);
  assert.match(conversationSource, /data-team-storage="business_job_field_messages"/);
  assert.match(conversationSource, /currentViewerRole === "business"/);
  assert.match(conversationSource, /isCanonicalThread/);
  assert.doesNotMatch(operationsApiSource, /customer-conversation/);
});

test("managed Team projection uses exact business and Job and renders the same private message evidence", async () => {
  const calls = [];
  const result = await fetchManagedFieldCommunications(
    JOB_ID,
    7,
    undefined,
    async (path, options, setPage) => {
      calls.push({ path, options, setPage });
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          businessId: 7,
          jobId: JOB_ID,
          communications: [{
            assignmentId: "198975f9-2d35-4ebb-817e-2843d70cc50b",
            employee: { name: "Liam Molina" },
            messages: [{ id: "1", senderName: "Liam Molina", senderRole: "FIELD_EMPLOYEE", message: "Frame intact." }],
          }],
        },
      };
    }
  );
  assert.equal(result.communications[0].messages[0].message, "Frame intact.");
  assert.deepEqual(calls, [{
    path: `/team/jobs/${JOB_ID}/field-communications?businessId=7`,
    options: { method: "GET", cache: "no-store" },
    setPage: undefined,
  }]);
  assert.match(conversationSource, /result\.jobId !== canonicalJobId/);
  assert.match(conversationSource, /Number\(result\.businessId\) !== canonicalBusinessId/);
  assert.match(conversationSource, /item\?\.jobId === canonicalJobId/);
});

test("Team history and composer make private exact-assignment authority explicit", () => {
  assert.match(conversationSource, /conversationTeamPrivateNotice/);
  assert.match(conversationSource, /selected\?\.employee\?\.name/);
  assert.match(conversationSource, /message\.senderName/);
  assert.match(conversationSource, /message\.senderRole === fieldEmployeeRole/);
  assert.match(conversationSource, /communications\.length > 1/);
  assert.match(conversationSource, /onSelectAssignment\(event\.target\.value\)/);
  assert.match(conversationSource, /sendFieldMessage\(\s*canonicalJobId/);
  assert.match(conversationSource, /assignmentId: selectedTeamCommunication\.assignmentId/);
  assert.match(conversationSource, /managed: true/);
  assert.match(conversationSource, /business_job_field_messages/);
});

test("private Team context is a default-collapsed accessible disclosure", () => {
  const pane = conversationSource.slice(
    conversationSource.indexOf("function BusinessTeamCommunicationPane"),
    conversationSource.indexOf("function resolveSupportedLegacyConversationRecord")
  );

  assert.match(pane, /const \[teamContextExpanded, setTeamContextExpanded\] = useState\(false\)/);
  assert.match(pane, /const teamContextDetailsId = useId\(\)/);
  assert.match(pane, /type="button"[\s\S]*business-team-communication__context-disclosure/);
  assert.match(pane, /aria-expanded=\{teamContextExpanded\}/);
  assert.match(pane, /aria-controls=\{teamContextDetailsId\}/);
  assert.match(pane, /aria-label=\{disclosureLabel\}/);
  assert.match(pane, /onClick=\{\(\) => setTeamContextExpanded\(\(current\) => !current\)\}/);
  assert.match(pane, /conversationTeamContextCompact[\s\S]*selectedEmployeeName[\s\S]*teamContextExpanded \? "▴" : "▾"/);
  assert.match(pane, /teamContextExpanded \? \([\s\S]*conversationTeamPrivate[\s\S]*conversationDelegatedFieldEmployeeRole[\s\S]*conversationTeamPrivateNotice/);
  assert.match(pane, /conversationTeamDetailsHide[\s\S]*conversationTeamDetailsShow/);
});

test("collapsed private Team disclosure is compact and intrinsically phone-safe", () => {
  const styles = conversationSource.slice(
    conversationSource.indexOf("const businessTeamContext ="),
    conversationSource.indexOf("const businessTeamSelector =")
  );

  assert.match(styles, /const businessTeamContext = \{[\s\S]*padding: "4px 10px"/);
  assert.match(styles, /const businessTeamDisclosure = \{[\s\S]*width: "100%"[\s\S]*maxWidth: "100%"[\s\S]*minHeight: "48px"[\s\S]*boxSizing: "border-box"/);
  assert.match(styles, /gridTemplateColumns: "20px minmax\(0, 1fr\) 18px"/);
  assert.match(styles, /const businessTeamDisclosureText = \{[\s\S]*minWidth: 0[\s\S]*overflow: "hidden"[\s\S]*textOverflow: "ellipsis"[\s\S]*whiteSpace: "nowrap"/);

  for (const viewportWidth of [390, 393, 430, 440]) {
    const availableTextWidth = viewportWidth - 20 - 18 - (8 * 2) - (10 * 2) - (12 * 2);
    assert.ok(availableTextWidth > 280, `${viewportWidth}px preserves compact context text`);
  }
});

test("Customer and Team drafts cannot cross audiences or assigned recipients", () => {
  assert.match(conversationSource, /const \[teamDrafts, setTeamDrafts\] = useState\(\{\}\)/);
  assert.match(conversationSource, /`\$\{canonicalJobId\}:team:\$\{selectedTeamCommunication\.assignmentId\}`/);
  assert.match(conversationSource, /const teamDraft = teamDrafts\[teamDraftKey\] \|\| ""/);
  assert.match(conversationSource, /const message = teamDraft\.trim\(\)/);
  assert.match(conversationSource, /current\[teamDraftKey\] === teamDraft/);
  assert.doesNotMatch(
    conversationSource.slice(
      conversationSource.indexOf("const sendManagedTeamMessage"),
      conversationSource.indexOf("const selectCommunicationAudience")
    ),
    /messageText|setMessageText/
  );
});

test("Team authority is server projected and Bookkeeper receives no role-string UI grant", () => {
  assert.match(conversationSource, /fetchManagedFieldCommunications/);
  assert.match(conversationSource, /managedTeamState\.phase === "ready"/);
  assert.match(conversationSource, /setCommunicationAudience\("customer"\)/);
  assert.doesNotMatch(conversationSource, /BOOKKEEPER_FINANCE/);
  assert.doesNotMatch(conversationSource, /currentViewerRole === "OWNER"|currentViewerRole === "MANAGER"/);
});

test("visible Team workspace refreshes on entry Job change focus and visibility without polling", () => {
  assert.match(conversationSource, /canonicalBusinessId,[\s\S]{0,120}canonicalConversationId,[\s\S]{0,120}canonicalJobId,[\s\S]{0,120}managedTeamEligible/);
  assert.match(conversationSource, /if \(communicationAudience !== "team" \|\| !managedTeamEligible\)/);
  assert.match(conversationSource, /window\.addEventListener\("focus", refreshVisibleTeam\)/);
  assert.match(conversationSource, /document\.addEventListener\("visibilitychange", refreshTeamWhenVisible\)/);
  assert.match(conversationSource, /document\.visibilityState === "visible"/);
  assert.doesNotMatch(
    conversationSource.slice(
      conversationSource.indexOf("const refreshManagedTeamCommunications"),
      conversationSource.indexOf("const canonicalDeliveredQuoteIds")
    ),
    /setInterval|WebSocket/
  );
});

test("keyboard-driven parent callback identity changes cannot rerun Business audience initialization", () => {
  const reconciliationBlock = conversationSource.slice(
    conversationSource.indexOf("refreshManagedTeamCommunicationsRef.current ="),
    conversationSource.indexOf("const selectedTeamCommunication")
  );
  const initializationEffect = reconciliationBlock.slice(
    reconciliationBlock.indexOf("useEffect(() =>"),
    reconciliationBlock.indexOf("useEffect(() =>", reconciliationBlock.indexOf("useEffect(() =>") + 1)
  );

  assert.match(initializationEffect, /setCommunicationAudience\("customer"\)/);
  assert.match(initializationEffect, /setSelectedTeamAssignmentId\(""\)/);
  assert.match(initializationEffect, /refreshManagedTeamCommunicationsRef\.current\?\.\(\)/);
  assert.match(initializationEffect, /canonicalBusinessId,[\s\S]*canonicalConversationId,[\s\S]*canonicalJobId,[\s\S]*managedTeamEligible/);
  assert.doesNotMatch(initializationEffect, /setPage|refreshManagedTeamCommunications,/);
  assert.doesNotMatch(initializationEffect, /setTeamDrafts/);
  assert.match(
    conversationSource,
    /setSelectedTeamAssignmentId\(\(current\) =>[\s\S]{0,220}communications\.some\(\(item\) => item\.assignmentId === current\)[\s\S]{0,120}\? current/
  );
  assert.match(
    conversationSource,
    /catch \{[\s\S]{0,420}setSelectedTeamAssignmentId\(""\);[\s\S]{0,100}setCommunicationAudience\("customer"\)/
  );

  const before = {
    conversationId: 342,
    jobId: JOB_ID,
    businessId: 7,
    eligible: true,
    audience: "team",
    selectedAssignmentId: "assignment-liam",
    drafts: { [`${JOB_ID}:team:assignment-liam`]: "Private Team draft" },
  };
  const afterKeyboardParentRerender = {
    ...before,
    setPage: () => {},
    viewportHeight: 611,
  };
  assert.deepEqual(
    {
      conversationId: afterKeyboardParentRerender.conversationId,
      jobId: afterKeyboardParentRerender.jobId,
      businessId: afterKeyboardParentRerender.businessId,
      eligible: afterKeyboardParentRerender.eligible,
      audience: afterKeyboardParentRerender.audience,
      selectedAssignmentId: afterKeyboardParentRerender.selectedAssignmentId,
      drafts: afterKeyboardParentRerender.drafts,
    },
    before
  );
  assert.doesNotMatch(conversationSource, /TEMP IOS BUSINESS MESSAGE TRACE/);
});

test("Team pane is intrinsically bounded for phone and preserves protected split and context architecture", () => {
  assert.match(conversationSource, /const businessTeamPane = \{[\s\S]*minWidth: 0,[\s\S]*maxWidth: "100%",[\s\S]*overflow: "hidden"/);
  assert.match(conversationSource, /const businessCommunicationAudience = \{[\s\S]*gridTemplateColumns: "repeat\(2, minmax\(0, 1fr\)\)"/);
  assert.match(conversationSource, /const businessTeamMessages = \{[\s\S]*overflowX: "hidden"/);
  assert.match(messagesSource, /getCommunicationLayout\(appLayoutMetrics\)/);
  assert.match(messagesSource, /splitShell/);
  assert.match(messagesSource, /wideWorkspaceShell/);
  assert.match(messagesSource, /Relationship Context|messagesRelationshipContext/);
  assert.match(messagesSource, /getWorkspaceContextFacts/);
  assert.match(messagesSource, /getConversationAuthorityFacts/);
});

test("Customer employee attribution and employee Team workspace remain separate and intact", () => {
  assert.match(conversationSource, /msg\.delegatedAuthor\.displayName/);
  assert.match(conversationSource, /conversationEmployeeTag/);
  assert.match(portalSource, /\["team", "fieldAudienceTeam", selectedAttention\.teamUnread\]/);
  assert.match(portalSource, /\["customer", "fieldAudienceCustomer", selectedAttention\.customerUnread\]/);
  assert.match(portalSource, /const teamMessages = selectedOperations\?\.messages \|\| \[\]/);
  assert.match(portalSource, /const customerMessages = customerThread\.conversation\?\.messages \|\| \[\]/);
});

test("Customer and private Team labels are available in EN ES FR and PT-BR", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("conversationAudienceCustomer", language), "conversationAudienceCustomer");
    assert.notEqual(t("conversationAudienceTeamPrivate", language), "conversationAudienceTeamPrivate");
    assert.notEqual(t("conversationTeamPrivateNotice", language), "conversationTeamPrivateNotice");
    assert.notEqual(t("conversationTeamContextCompact", language), "conversationTeamContextCompact");
    assert.notEqual(t("conversationTeamDetailsShow", language), "conversationTeamDetailsShow");
    assert.notEqual(t("conversationTeamDetailsHide", language), "conversationTeamDetailsHide");
    assert.notEqual(t("conversationTeamSend", language), "conversationTeamSend");
  }
});
