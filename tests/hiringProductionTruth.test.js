import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionSurfaces = [
  "src/pages/HiringCenter.jsx",
  "src/pages/TeamMembers.jsx",
  "src/pages/JobsHiring.jsx",
  "src/pages/Discover.jsx",
  "src/pages/ContractorProfile.jsx",
  "src/pages/MessagesInbox.jsx",
  "src/pages/ConversationThread.jsx",
];

const sources = Object.fromEntries(
  productionSurfaces.map((file) => [file, readFileSync(file, "utf8")])
);

test("production Hiring surfaces cannot use device-local personnel authority", () => {
  for (const file of [
    "src/pages/HiringCenter.jsx",
    "src/pages/TeamMembers.jsx",
    "src/pages/JobsHiring.jsx",
  ]) {
    assert.doesNotMatch(sources[file], /localStorage|sessionStorage/, file);
    assert.doesNotMatch(
      sources[file],
      /utils\/hiringCenterRegistry|utils\/hiringInterviews|utils\/teamMembers|utils\/hiringConversations/,
      file
    );
  }
});

test("unsupported personnel mutations and false side effects are absent", () => {
  const combined = [
    "src/pages/HiringCenter.jsx",
    "src/pages/TeamMembers.jsx",
    "src/pages/JobsHiring.jsx",
    "src/pages/Discover.jsx",
    "src/pages/ContractorProfile.jsx",
  ].map((file) => sources[file]).join("\n");
  assert.doesNotMatch(combined, /saveHiringPosition|createHiringInterview|createTeamMember/);
  assert.doesNotMatch(combined, /saveHiringConversation|community_hiring_interest/);
  assert.doesNotMatch(combined, /createNotification|upsertNotification/);
});

test("Community does not project local positions or applicants", () => {
  const discover = sources["src/pages/Discover.jsx"];
  assert.doesNotMatch(discover, /getHiringLocalJobOpenings|getLocalizedHiringJobDisplay/);
  assert.match(discover, /hiringOperationsUnavailable/);
  assert.match(discover, /hiringOpportunitiesTruthDescription/);
});

test("Business Profile omits device-derived personnel counts", () => {
  const profile = sources["src/pages/ContractorProfile.jsx"];
  assert.doesNotMatch(profile, /getActiveTeamMemberCount|activeTeamMemberCount/);
});

test("legacy local helpers cannot repopulate production pages", () => {
  for (const source of Object.values(sources)) {
    assert.doesNotMatch(source, /meetroHiringPositions|meetroHiringApplicants|meetroHiringInterviews/);
    assert.doesNotMatch(source, /meetroTeamMembers/);
  }
});

test("Communication Center filters stale hiring records and direct threads fail closed", () => {
  const inbox = sources["src/pages/MessagesInbox.jsx"];
  const thread = sources["src/pages/ConversationThread.jsx"];
  assert.match(inbox, /if \(isHiringConversationType\(item\)\) return false/);
  assert.match(thread, /if \(isHiringThread\)[\s\S]*<HiringUnavailableState/);
});
