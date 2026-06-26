import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFieldProductivityContext,
  buildBusinessIntelligence,
  buildProjectBrief,
  buildRelationshipMemory,
  evaluateWatchMyBack,
  evaluateFindingsReadiness,
  evaluateFieldWorkflow,
  evaluateProposalCoach,
  evaluateProposalReadiness,
  getFieldAssistantPromptChips,
  getFieldProductivityResponse,
} from "../src/utils/fieldProductivityAssistant.js";
import { FINDING_IDS } from "../src/utils/findingsEngineRegistry.js";

function makeStorage(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test("field productivity response does not invent prices, dates, or job facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "request-1",
      title: "Cabinet repair",
      customerName: "Sarah Dommerich",
      status: "evaluation_complete",
      conversationId: "conversation-1",
      evaluationSaved: true,
    }),
  });

  const response = getFieldProductivityResponse({
    question: "What should I do next?",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.equal(response?.success, true);
  assert.match(response.answer, /Cabinet repair/);
  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
});

test("field productivity guidance detects missing evaluation before quote work", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "request-2",
      title: "Door repair",
      customerName: "William Customer",
      status: "quote_needed",
      conversationId: "conversation-2",
    }),
  });

  const context = buildFieldProductivityContext({
    currentPage: "quoteBuilder",
    storage,
  });

  assert.equal(context.stage, "quote");
  assert.deepEqual(context.missing, ["evaluation"]);

  const response = getFieldProductivityResponse({
    question: "What information is missing?",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.match(response.answer, /evaluation notes/i);
  assert.match(response.answer, /record the evaluation notes/i);
});

test("field productivity guidance is role aware for homeowner and professional pages", () => {
  const homeownerStorage = makeStorage({ activeAccountMode: "personal" });
  const businessStorage = makeStorage({ activeAccountMode: "business" });

  const homeownerResponse = getFieldProductivityResponse({
    question: "What should I do next?",
    currentPage: "home",
    language: "en",
    storage: homeownerStorage,
  });
  const businessResponse = getFieldProductivityResponse({
    question: "What should I do next?",
    currentPage: "businessDashboard",
    language: "en",
    storage: businessStorage,
  });

  assert.match(homeownerResponse.answer, /User workspace/);
  assert.equal(homeownerResponse.actions[0].target, "upload");
  assert.match(businessResponse.answer, /Professional workspace/);
  assert.equal(businessResponse.actions[0].target, "contractorDashboard");
});

test("field productivity guidance tracks active work stage from project status", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-3",
      projectId: "project-3",
      projectTitle: "Kitchen Remodel",
      customerName: "Sarah Dommerich",
      status: "work_scheduled",
      conversationId: "conversation-3",
      serviceAddress: "Fort Myers",
    }),
  });

  const context = buildFieldProductivityContext({
    currentPage: "conversationThread",
    storage,
  });

  assert.equal(context.stage, "activeWork");

  const response = getFieldProductivityResponse({
    question: "Where am I in this project?",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Active work/);
  assert.match(response.answer, /update the work status/i);
});

test("field productivity chips appear for supported pages with selected project context", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-4",
      projectId: "project-4",
      projectTitle: "Kitchen Remodel",
      customerName: "Sarah Dommerich",
      status: "proposal_sent",
      conversationId: "conversation-4",
    }),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.deepEqual(
    chips.map((chip) => chip.id),
    [
      "where_am_i",
      "whats_next",
      "whats_missing",
      "document_this",
      "read_summary_aloud",
      "project_brief",
      "relationship_memory",
      "watch_my_back",
    ]
  );
});

test("field productivity fallback chips appear without selected project context", () => {
  const storage = makeStorage({ activeAccountMode: "business" });

  const chips = getFieldAssistantPromptChips({
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.deepEqual(
    chips.map((chip) => chip.id),
    ["explain_page", "what_can_i_do", "start_project"]
  );

  const response = getFieldProductivityResponse({
    question: chips[2].prompt,
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.match(response.answer, /selected project/i);
});

test("field productivity chip prompts return grounded responses without invented facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "request-5",
      title: "Bifold door replacement",
      customerName: "Sarah Dommerich",
      status: "evaluation_complete",
      conversationId: "conversation-5",
      evaluationSaved: true,
    }),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });
  const response = getFieldProductivityResponse({
    question: chips.find((chip) => chip.id === "whats_next").prompt,
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Bifold door replacement/);
  assert.match(response.answer, /finish the proposal/i);
  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
});

test("field productivity chips keep role-aware behavior", () => {
  const homeownerStorage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-6",
      title: "Hang artwork",
      selectedProfessional: "William Pro",
      status: "quote_ready",
      conversationId: "conversation-6",
    }),
  });
  const businessStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-7",
      projectId: "project-7",
      projectTitle: "Hang chalkboard",
      customerName: "Sarah Dommerich",
      status: "work_scheduled",
      conversationId: "conversation-7",
    }),
  });

  const homeownerChip = getFieldAssistantPromptChips({
    currentPage: "home",
    language: "en",
    storage: homeownerStorage,
  }).find((chip) => chip.id === "where_am_i");
  const businessChip = getFieldAssistantPromptChips({
    currentPage: "businessDashboard",
    language: "en",
    storage: businessStorage,
  }).find((chip) => chip.id === "where_am_i");

  const homeownerResponse = getFieldProductivityResponse({
    question: homeownerChip.prompt,
    currentPage: "home",
    language: "en",
    storage: homeownerStorage,
  });
  const businessResponse = getFieldProductivityResponse({
    question: businessChip.prompt,
    currentPage: "businessDashboard",
    language: "en",
    storage: businessStorage,
  });

  assert.match(homeownerResponse.answer, /User workspace/);
  assert.match(businessResponse.answer, /Professional workspace/);
});

test("AI documentation helper uses professional documentation format", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-8",
      projectId: "project-8",
      projectTitle: "Bifold door replacement",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-8",
      evaluationNotes: "Existing bifold doors are damaged and need replacement.",
      photos: ["door-photo.jpg"],
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Help me document this",
    currentPage: "evaluationNotes",
    language: "en",
    storage,
  });

  assert.match(response.answer, /^Documentation draft/);
  assert.match(response.answer, /Work observed: Existing bifold doors are damaged and need replacement/);
  assert.match(response.answer, /Photos\/documents needed: Photos are already attached/);
  assert.match(response.answer, /Missing details: Not provided yet/);
  assert.match(response.answer, /Suggested next action:/);
});

test("AI documentation helper marks missing fields as not provided", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-9",
      projectId: "project-9",
      projectTitle: "Cabinet repair",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-9",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Help me document this",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Work observed: Not provided yet/);
  assert.match(response.answer, /Photos\/documents needed: Not provided yet/);
  assert.match(response.answer, /Missing details: photos/);
});

test("AI documentation helper does not invent measurements prices dates materials or claims", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-10",
      projectId: "project-10",
      projectTitle: "Completion record",
      customerName: "Sarah Dommerich",
      status: "completed",
      conversationId: "conversation-10",
      completionNotes: "Work area cleaned and final walkthrough requested.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Help me document this",
    currentPage: "completionSheet",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Work area cleaned and final walkthrough requested/);
  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  assert.doesNotMatch(response.answer, /customer approved/i);
});

test("AI documentation helper uses homeowner project summary format", () => {
  const storage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-11",
      title: "Hang artwork",
      selectedProfessional: "William Pro",
      status: "work_scheduled",
      conversationId: "conversation-11",
      details: "Artwork and chalkboard need safe wall mounting.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Help me document this",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /^Project summary draft/);
  assert.match(response.answer, /Project summary: Artwork and chalkboard need safe wall mounting/);
  assert.doesNotMatch(response.answer, /^Documentation draft/);
});

test("read summary aloud uses current context only", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-12",
      projectId: "project-12",
      projectTitle: "Door installation",
      customerName: "Sarah Dommerich",
      status: "work_scheduled",
      conversationId: "conversation-12",
      serviceAddress: "Fort Myers",
      photos: ["door.jpg"],
    }),
  });

  const chip = getFieldAssistantPromptChips({
    currentPage: "conversationThread",
    language: "en",
    storage,
  }).find((item) => item.id === "read_summary_aloud");
  const response = getFieldProductivityResponse({
    question: chip.prompt,
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.equal(chip.inputMode, "voice");
  assert.match(response.answer, /Project and stage: Door installation - Active work/);
  assert.match(response.answer, /Suggested next action: update the work status/);
  assert.doesNotMatch(response.answer, /Sarah approved/i);
});

test("read summary aloud keeps missing info as missing", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-13",
      projectId: "project-13",
      projectTitle: "Cabinet repair",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-13",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Read summary aloud",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Missing details: photos/);
  assert.match(response.answer, /job location/);
});

test("read summary aloud does not invent prices dates or measurements", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-14",
      projectId: "project-14",
      projectTitle: "Completion walkthrough",
      customerName: "Sarah Dommerich",
      status: "completed",
      conversationId: "conversation-14",
      completionNotes: "Final walkthrough requested.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Read summary aloud",
    currentPage: "completionSheet",
    language: "en",
    storage,
  });

  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
});

test("read summary aloud is role aware", () => {
  const homeownerStorage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-15",
      title: "Hang artwork",
      selectedProfessional: "William Pro",
      status: "quote_ready",
      conversationId: "conversation-15",
    }),
  });
  const professionalStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-16",
      projectId: "project-16",
      projectTitle: "Hang chalkboard",
      customerName: "Sarah Dommerich",
      status: "work_scheduled",
      conversationId: "conversation-16",
      serviceAddress: "Fort Myers",
    }),
  });

  const homeownerResponse = getFieldProductivityResponse({
    question: "Read summary aloud",
    currentPage: "home",
    language: "en",
    storage: homeownerStorage,
  });
  const professionalResponse = getFieldProductivityResponse({
    question: "Read summary aloud",
    currentPage: "businessDashboard",
    language: "en",
    storage: professionalStorage,
  });

  assert.match(homeownerResponse.answer, /Project and stage: Hang artwork - Quote/);
  assert.match(homeownerResponse.answer, /review active projects/i);
  assert.match(professionalResponse.answer, /Project and stage: Hang chalkboard - Active work/);
  assert.match(professionalResponse.answer, /update the work status/i);
});

test("workflow coach reports ready workflow", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-17",
      projectId: "project-17",
      projectTitle: "Evaluation complete",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-17",
      evaluationNotes: "Door condition reviewed.",
      measurements: "Provided",
      findings: "Door track damaged",
      photos: ["door.jpg"],
    }),
  });

  const context = buildFieldProductivityContext({
    currentPage: "evaluationNotes",
    storage,
  });
  const evaluation = evaluateFieldWorkflow(context, "en");
  const response = getFieldProductivityResponse({
    question: "Am I ready to continue?",
    currentPage: "evaluationNotes",
    language: "en",
    storage,
  });

  assert.equal(evaluation.readyToContinue, true);
  assert.equal(evaluation.alertLevel, "green");
  assert.equal(response.statusChip.level, "green");
  assert.match(response.answer, /ready to continue/i);
});

test("workflow coach reports blocked workflow", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-18",
      projectId: "project-18",
      projectTitle: "Completion pending",
      customerName: "Sarah Dommerich",
      status: "completed",
      conversationId: "conversation-18",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Is this workflow blocked?",
    currentPage: "completionSheet",
    language: "en",
    storage,
  });

  assert.equal(response.workflowEvaluation.readyToContinue, false);
  assert.equal(response.workflowEvaluation.alertLevel, "red");
  assert.equal(response.statusChip.label, "Blocked");
  assert.match(response.answer, /workflow is blocked/i);
  assert.match(response.answer, /completion notes/i);
  assert.match(response.answer, /customer confirmation/i);
});

test("workflow coach reports missing required and recommended info", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-19",
      projectId: "project-19",
      projectTitle: "Evaluation draft",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-19",
    }),
  });

  const context = buildFieldProductivityContext({
    currentPage: "evaluationNotes",
    storage,
  });
  const evaluation = evaluateFieldWorkflow(context, "en");

  assert.equal(evaluation.alertLevel, "red");
  assert.deepEqual(evaluation.blockingItems, ["findings", "measurements", "photos", "work observations"]);
});

test("workflow coach is role-aware", () => {
  const homeownerStorage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-20",
      title: "Quote review",
      selectedProfessional: "William Pro",
      status: "quote_ready",
      conversationId: "conversation-20",
    }),
  });
  const professionalStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-21",
      projectId: "project-21",
      projectTitle: "Quote review",
      customerName: "Sarah Dommerich",
      status: "quote_ready",
      conversationId: "conversation-21",
    }),
  });

  const homeownerResponse = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "home",
    language: "en",
    storage: homeownerStorage,
  });
  const professionalResponse = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "quoteBuilder",
    language: "en",
    storage: professionalStorage,
  });

  assert.match(homeownerResponse.answer, /open the active project|review active projects/i);
  assert.match(professionalResponse.answer, /evaluation notes/i);
  assert.equal(professionalResponse.statusChip.level, "red");
});

test("workflow coach is page-aware", () => {
  const quoteStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-22",
      projectId: "project-22",
      projectTitle: "Proposal draft",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-22",
      evaluationSaved: true,
    }),
  });
  const activeWorkStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-23",
      projectId: "project-23",
      projectTitle: "Active job",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-23",
      serviceAddress: "Fort Myers",
    }),
  });

  const quoteResponse = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "quoteBuilder",
    language: "en",
    storage: quoteStorage,
  });
  const activeWorkResponse = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "conversationThread",
    language: "en",
    storage: activeWorkStorage,
  });

  assert.equal(quoteResponse.workflowEvaluation.currentStage, "Quote");
  assert.match(quoteResponse.answer, /proposal/i);
  assert.equal(activeWorkResponse.workflowEvaluation.currentStage, "Active work");
  assert.match(activeWorkResponse.answer, /work status|active job/i);
});

test("workflow coach does not invent facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-24",
      projectId: "project-24",
      projectTitle: "Proposal draft",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-24",
      evaluationSaved: true,
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
});

test("workflow coach selects status chip levels", () => {
  const readyStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-25",
      projectId: "project-25",
      projectTitle: "Active job",
      customerName: "Sarah Dommerich",
      status: "arrived",
      conversationId: "conversation-25",
      serviceAddress: "Fort Myers",
      photos: ["progress.jpg"],
    }),
  });
  const attentionStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-26",
      projectId: "project-26",
      projectTitle: "Active job",
      customerName: "Sarah Dommerich",
      status: "arrived",
      conversationId: "conversation-26",
      serviceAddress: "Fort Myers",
    }),
  });
  const blockedStorage = makeStorage({ activeAccountMode: "business" });

  const ready = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "conversationThread",
    language: "en",
    storage: readyStorage,
  });
  const attention = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "conversationThread",
    language: "en",
    storage: attentionStorage,
  });
  const blocked = getFieldProductivityResponse({
    question: "Workflow coach",
    currentPage: "completionSheet",
    language: "en",
    storage: blockedStorage,
  });

  assert.equal(ready.statusChip.level, "green");
  assert.equal(attention.statusChip.level, "yellow");
  assert.equal(blocked.statusChip.level, "red");
});

test("AI findings assistant summarizes existing structured findings", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-27",
      projectId: "project-27",
      projectTitle: "Kitchen evaluation",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-27",
      evaluation: {
        findings: [{ findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET }],
        measurements: "Opening width captured",
        photos: ["cabinet.jpg"],
      },
    }),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "evaluationNotes",
    language: "en",
    storage,
  });
  const response = getFieldProductivityResponse({
    question: "Review findings",
    currentPage: "evaluationNotes",
    language: "en",
    storage,
  });

  assert.ok(chips.some((chip) => chip.id === "review_findings"));
  assert.match(response.answer, /Findings Summary: Water Damaged Sink Cabinet/);
  assert.match(response.answer, /Missing Documentation: Not provided yet/);
  assert.match(response.answer, /Recommended Next Step: Cabinet Replacement/);
  assert.match(response.answer, /Proposal Readiness: Ready to prepare a proposal/);
});

test("AI findings assistant marks missing findings as not provided", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-28",
      projectId: "project-28",
      projectTitle: "Door evaluation",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-28",
      evaluation: {},
    }),
  });

  const response = getFieldProductivityResponse({
    question: "What did I find?",
    currentPage: "evaluationNotes",
    language: "en",
    storage,
  });

  assert.match(response.answer, /No findings have been recorded yet/);
  assert.match(response.answer, /Missing Documentation: findings, measurements, photos/);
  assert.match(response.answer, /Proposal Readiness: Not ready yet/);
});

test("AI findings assistant does not invent measurements materials prices or dates", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-29",
      projectId: "project-29",
      projectTitle: "Bifold door evaluation",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-29",
      findings: "Damaged bifold door track",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Review findings",
    currentPage: "evaluationNotes",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Damaged bifold door track/);
  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  assert.doesNotMatch(response.answer, /pine|oak|paint|hinges|track kit/i);
});

test("AI findings assistant evaluates proposal readiness from documentation", () => {
  const readyStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-30",
      projectId: "project-30",
      projectTitle: "Ready evaluation",
      customerName: "Sarah Dommerich",
      status: "evaluation_complete",
      conversationId: "conversation-30",
      findings: "Door track damaged",
      measurements: "Provided",
      photos: ["door.jpg"],
    }),
  });
  const notReadyStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-31",
      projectId: "project-31",
      projectTitle: "Draft evaluation",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-31",
      findings: "Door track damaged",
    }),
  });

  const ready = evaluateFindingsReadiness(
    buildFieldProductivityContext({ currentPage: "quoteBuilder", storage: readyStorage }),
    "en"
  );
  const notReady = evaluateFindingsReadiness(
    buildFieldProductivityContext({ currentPage: "quoteBuilder", storage: notReadyStorage }),
    "en"
  );

  assert.equal(ready.ready, true);
  assert.deepEqual(ready.missing, []);
  assert.equal(notReady.ready, false);
  assert.deepEqual(notReady.missing, ["measurements", "photos"]);
});

test("AI findings assistant is role aware and falls back safely off supported finding pages", () => {
  const homeownerStorage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-32",
      title: "Quote review",
      status: "quote_ready",
      conversationId: "conversation-32",
    }),
  });
  const professionalHomeStorage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-33",
      projectId: "project-33",
      projectTitle: "Dashboard project",
      status: "evaluation",
      conversationId: "conversation-33",
    }),
  });

  const homeownerResponse = getFieldProductivityResponse({
    question: "Review findings",
    currentPage: "home",
    language: "en",
    storage: homeownerStorage,
  });
  const unsupportedResponse = getFieldProductivityResponse({
    question: "Review findings",
    currentPage: "businessDashboard",
    language: "en",
    storage: professionalHomeStorage,
  });

  assert.match(homeownerResponse.answer, /available for professionals/i);
  assert.match(unsupportedResponse.answer, /Evaluation Notes, Quote Builder, or Work Center/i);
});

test("AI proposal assistant reports ready proposal", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-1",
      title: "Bifold door proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-34",
      findings: "Damaged bifold door track",
      recommendedSolution: "Replace two bifold doors and adjust track hardware.",
      photos: ["door.jpg"],
      lineItems: [
        { type: "labor", title: "Flat-fee labor" },
        { type: "material", title: "Door hardware" },
      ],
      laborPricingType: "flat_fee",
      laborFee: "provided",
      customerNotes: "Access through front entry.",
      warrantyNotes: "Workmanship note included.",
    }),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });
  const response = getFieldProductivityResponse({
    question: "Review proposal",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });
  const readiness = evaluateProposalReadiness(
    buildFieldProductivityContext({ currentPage: "quoteBuilder", storage }),
    "en"
  );

  assert.ok(chips.some((chip) => chip.id === "review_proposal"));
  assert.equal(readiness.status, "ready");
  assert.match(response.answer, /Proposal Status\nReady to Send/);
  assert.match(response.answer, /Review the proposal one final time/);
});

test("AI proposal assistant blocks missing findings and line items", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-2",
      title: "Cabinet proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-35",
      recommendedSolution: "Repair cabinet base.",
      laborFee: "provided",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Is this proposal ready?",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Blocked/);
  assert.match(response.answer, /Findings are not linked yet/);
  assert.match(response.answer, /Line items are not provided yet/);
});

test("AI proposal assistant flags missing photos and deposit when required", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-3",
      title: "Door proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-36",
      findings: "Door track damaged",
      recommendedSolution: "Replace track and align doors.",
      lineItems: [{ type: "labor", title: "Labor" }],
      laborHours: "2",
      laborRate: "provided",
      depositRequired: true,
      customerNotes: "Customer asked for durable hardware.",
      warrantyNotes: "Warranty note included.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "What should I review before sending?",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });
  const readiness = evaluateProposalReadiness(
    buildFieldProductivityContext({ currentPage: "quoteBuilder", storage }),
    "en"
  );

  assert.equal(readiness.status, "needs_review");
  assert.match(response.answer, /Needs Review/);
  assert.match(response.answer, /Photos are not attached yet/);
  assert.match(response.answer, /Deposit is not specified yet/);
});

test("AI proposal assistant flags missing labor without inventing facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-4",
      title: "Chalkboard proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-37",
      findings: "Wall mounting location reviewed",
      recommendedSolution: "Mount chalkboard safely.",
      photos: ["wall.jpg"],
      lineItems: [{ type: "material", title: "Mounting supplies" }],
      customerNotes: "Use safe mounting method.",
      warrantyNotes: "Additional note included.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Review proposal",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Labor is not included yet/);
  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  assert.doesNotMatch(response.answer, /customer approved/i);
});

test("AI proposal assistant is role-aware for homeowners", () => {
  const storage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-38",
      title: "Quote review",
      selectedProfessional: "William Pro",
      status: "quote_ready",
      conversationId: "conversation-38",
      quoteId: "quote-38",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Review proposal",
    currentPage: "projectJourney",
    language: "en",
    storage,
  });

  assert.match(response.answer, /internal business review stays with the professional/i);
  assert.match(response.answer, /message the professional/i);
  assert.doesNotMatch(response.answer, /Labor is not included yet/);
});

test("AI proposal assistant falls back safely on unsupported pages", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-39",
      projectId: "project-39",
      projectTitle: "Dashboard project",
      status: "work_scheduled",
      conversationId: "conversation-39",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Review proposal",
    currentPage: "businessDashboard",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Proposal review is available from Quote Builder/);
});

test("AI proposal coach summarizes complete proposal with excellent confidence", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-40",
      title: "Bifold door proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-40",
      findings: "Damaged bifold door track",
      recommendedSolution: "Replace two bifold doors and adjust track hardware.",
      photos: ["door.jpg"],
      lineItems: [
        { type: "labor", title: "Flat-fee labor" },
        { type: "material", title: "Door hardware" },
      ],
      laborFee: "provided",
      depositRequired: true,
      depositAmount: "provided",
      customerNotes: "Access through front entry.",
      warrantyNotes: "Workmanship note included.",
    }),
  });

  const chip = getFieldAssistantPromptChips({
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  }).find((item) => item.id === "proposal_coach");
  const response = getFieldProductivityResponse({
    question: chip.prompt,
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });
  const coach = evaluateProposalCoach(
    buildFieldProductivityContext({ currentPage: "quoteBuilder", storage }),
    "en"
  );

  assert.equal(chip.label, "Proposal Coach");
  assert.equal(coach.confidence, "Excellent");
  assert.match(response.answer, /Proposal Summary/);
  assert.match(response.answer, /Customer problem: Damaged bifold door track/);
  assert.match(response.answer, /Proposed solution: Replace two bifold doors/);
  assert.match(response.answer, /Photos included/);
  assert.match(response.answer, /Clear findings/);
  assert.match(response.answer, /Confidence\nExcellent/);
});

test("AI proposal coach flags missing findings without inventing them", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-41",
      title: "Cabinet proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-41",
      recommendedSolution: "Repair cabinet base.",
      photos: ["cabinet.jpg"],
      lineItems: [{ type: "labor", title: "Labor" }],
      laborFee: "provided",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Proposal Coach",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });
  const coach = evaluateProposalCoach(
    buildFieldProductivityContext({ currentPage: "quoteBuilder", storage }),
    "en"
  );

  assert.equal(coach.confidence, "Not Ready");
  assert.match(response.answer, /Customer problem: Not provided yet/);
  assert.match(response.answer, /Link the proposal to the evaluation findings/);
  assert.doesNotMatch(response.answer, /water damage|mold|track damaged/i);
});

test("AI proposal coach flags missing photos labor and warranty as opportunities", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-42",
      title: "Artwork proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-42",
      findings: "Wall mounting area reviewed",
      recommendedSolution: "Mount artwork and chalkboard safely.",
      lineItems: [{ type: "material", title: "Mounting supplies" }],
      customerNotes: "Customer wants safe mounting.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Proposal Coach",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Add proposal photos if they support the recommendation/);
  assert.match(response.answer, /Clarify the labor estimate before sending/);
  assert.match(response.answer, /Consider adding warranty or additional notes/);
  assert.match(response.answer, /Confidence\nNot Ready/);
});

test("AI proposal coach keeps homeowner view customer-safe", () => {
  const storage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-43",
      title: "Quote review",
      selectedProfessional: "William Pro",
      status: "quote_ready",
      conversationId: "conversation-43",
      quoteId: "quote-43",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Proposal Coach",
    currentPage: "projectJourney",
    language: "en",
    storage,
  });
  const coach = evaluateProposalCoach(
    buildFieldProductivityContext({ currentPage: "projectJourney", storage }),
    "en"
  );

  assert.equal(coach.homeownerView, true);
  assert.match(response.answer, /Proposal Status\nReady for Review/);
  assert.match(response.answer, /message the professional/i);
  assert.doesNotMatch(response.answer, /Strengths|Opportunities|internal business/i);
});

test("AI proposal coach falls back safely on unsupported pages", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-44",
      projectId: "project-44",
      projectTitle: "Active job",
      status: "work_scheduled",
      conversationId: "conversation-44",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Proposal Coach",
    currentPage: "businessDashboard",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Proposal review is available from Quote Builder/);
  assert.match(response.answer, /Confidence\nNot Ready/);
});

test("AI proposal coach does not invent prices materials measurements dates or customer decisions", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedQuoteRequest: JSON.stringify({
      id: "quote-request-45",
      title: "Door proposal",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-45",
      findings: "Door track damaged",
      recommendedSolution: "Adjust door track.",
      lineItems: [{ type: "labor", title: "Labor" }],
      laborFee: "provided",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Proposal Coach",
    currentPage: "quoteBuilder",
    language: "en",
    storage,
  });

  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  assert.doesNotMatch(response.answer, /customer approved|paint|oak|pine|hinges/i);
});

test("AI project brief summarizes evaluation stage for professionals", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-46",
      projectId: "project-46",
      projectTitle: "Bifold door evaluation",
      customerName: "Sarah Dommerich",
      category: "Handyman",
      serviceAddress: "Fort Myers",
      status: "evaluation",
      conversationId: "conversation-46",
      details: "Replace two bifold doors and hang artwork.",
      photos: ["door.jpg"],
      customerNotes: "Customer prefers a morning visit.",
    }),
  });

  const chip = getFieldAssistantPromptChips({
    currentPage: "conversationThread",
    language: "en",
    storage,
  }).find((item) => item.id === "project_brief");
  const response = getFieldProductivityResponse({
    question: chip.prompt,
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.equal(chip.label, "Project Brief");
  assert.match(response.answer, /Customer\nCustomer: Sarah Dommerich/);
  assert.match(response.answer, /Current Stage\nEvaluation/);
  assert.match(response.answer, /Customer Request\nReplace two bifold doors/);
  assert.match(response.answer, /No saved findings yet/);
  assert.match(response.answer, /Prepare for evaluation/);
});

test("AI project brief summarizes proposal stage and available quote documents", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-47",
      projectId: "project-47",
      projectTitle: "Proposal review",
      customerName: "Sarah Dommerich",
      status: "proposal_sent",
      conversationId: "conversation-47",
      findings: "Door track damaged",
      recommendedSolution: "Replace the damaged track.",
      quoteId: "quote-47",
      invoiceId: "invoice-47",
      photos: ["door.jpg"],
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Project Brief",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Current Stage\nQuote/);
  assert.match(response.answer, /Work Planned\nReplace the damaged track/);
  assert.match(response.answer, /Documents Available\n(?:.*\n)*• Quote/);
  assert.match(response.answer, /• Invoice/);
  assert.match(response.answer, /• Photos/);
});

test("AI project brief summarizes active work stage and grounded missing deposit", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-48",
      projectId: "project-48",
      projectTitle: "Active work",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-48",
      findings: "Wall mounting area reviewed",
      recommendedSolution: "Mount artwork safely.",
      depositRequired: true,
      photos: ["wall.jpg"],
    }),
  });

  const brief = buildProjectBrief(
    buildFieldProductivityContext({ currentPage: "conversationThread", storage }),
    "en"
  );
  const response = getFieldProductivityResponse({
    question: "What do I need to know about this project right now?",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.equal(brief.sections.currentStage, "Active work");
  assert.match(response.answer, /Complete the work/);
  assert.match(response.answer, /Deposit not recorded/);
  assert.match(response.answer, /Collect Deposit/);
});

test("AI project brief summarizes completion stage", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-49",
      projectId: "project-49",
      projectTitle: "Completion review",
      customerName: "Sarah Dommerich",
      status: "completed",
      conversationId: "conversation-49",
      completionNotes: "Doors installed and area cleaned.",
      receiptId: "receipt-49",
      completionRecord: { id: "completion-49" },
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Project Brief",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Current Stage\nCompletion/);
  assert.match(response.answer, /Review closure requirements/);
  assert.match(response.answer, /• Receipt/);
  assert.match(response.answer, /• Completion/);
});

test("AI project brief summarizes closure stage without inventing history", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-50",
      projectId: "project-50",
      projectTitle: "Closure review",
      customerName: "Sarah Dommerich",
      status: "closure_review",
      conversationId: "conversation-50",
      completionRecord: { id: "completion-50" },
      changeOrderId: "change-50",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Project Brief",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Current Stage\nCompletion/);
  assert.match(response.answer, /Review Closure/);
  assert.match(response.answer, /• Change Order/);
  assert.doesNotMatch(response.answer, /moved to history|customer approved/i);
});

test("AI project brief keeps homeowner behavior customer-safe", () => {
  const storage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-51",
      title: "Quote review",
      selectedProfessional: "William Pro",
      status: "quote_ready",
      conversationId: "conversation-51",
      quoteId: "quote-51",
      details: "Hang artwork and chalkboard.",
      internalNotes: "Professional-only setup note.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Project Brief",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Project Status\nQuote/);
  assert.match(response.answer, /Documents Available\n• Quote/);
  assert.doesNotMatch(response.answer, /Missing Items|Important Notes|Professional-only/);
});

test("AI project brief falls back safely on unsupported pages", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-52",
      projectId: "project-52",
      projectTitle: "Dashboard project",
      status: "work_scheduled",
      conversationId: "conversation-52",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Project Brief",
    currentPage: "businessDashboard",
    language: "en",
    storage,
  });

  assert.match(response.answer, /available from an open project conversation/i);
});

test("AI project brief does not invent facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-53",
      projectId: "project-53",
      projectTitle: "Sparse project",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-53",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Project Brief",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /No saved findings yet/);
  assert.match(response.answer, /No photos uploaded/);
  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  assert.doesNotMatch(response.answer, /customer approved|paint|oak|pine|hinges/i);
});

test("AI Watch My Back flags evaluation missing photos", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-54",
      projectId: "project-54",
      projectTitle: "Evaluation draft",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-54",
      findings: "Door track damaged",
    }),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "conversationThread",
    language: "en",
    storage,
  });
  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.ok(chips.some((chip) => chip.id === "watch_my_back"));
  assert.match(response.answer, /Findings are saved/);
  assert.match(response.answer, /No before photos uploaded/);
  assert.match(response.answer, /Add photos before moving forward/);
});

test("AI Watch My Back recognizes evaluation photos and findings", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-55",
      projectId: "project-55",
      projectTitle: "Evaluation ready",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-55",
      findings: "Cabinet base damaged",
      photos: ["cabinet.jpg"],
    }),
  });

  const watch = evaluateWatchMyBack(
    buildFieldProductivityContext({ currentPage: "conversationThread", storage }),
    "en"
  );

  assert.deepEqual(watch.goodItems.slice(0, 2), ["Photos are attached.", "Findings are saved."]);
  assert.deepEqual(watch.checks, ["No grounded checks are missing in the current context."]);
});

test("AI Watch My Back flags proposal missing line items and photos", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-56",
      projectId: "project-56",
      projectTitle: "Proposal draft",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-56",
      findings: "Door track damaged",
      recommendedSolution: "Replace damaged track.",
      laborFee: "provided",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "What should I double-check before I move forward?",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Proposal has no line items/);
  assert.match(response.answer, /Proposal has no supporting photos/);
  assert.match(response.answer, /Add proposal line items before sending/);
});

test("AI Watch My Back flags approval missing before active work", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-57",
      projectId: "project-57",
      projectTitle: "Active job",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-57",
      photos: ["progress.jpg"],
      findings: "Wall mounting area reviewed",
      approvalRecorded: false,
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Customer approval is not recorded/);
  assert.match(response.answer, /Starting work without recorded approval may create confusion/);
  assert.match(response.answer, /Record approval before starting work/);
});

test("AI Watch My Back flags payment missing before closure-sensitive work", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-58",
      projectId: "project-58",
      projectTitle: "Paid job pending",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-58",
      approvalRecorded: true,
      paymentRecorded: false,
      depositRequired: true,
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Deposit or payment has not been recorded/);
  assert.match(response.answer, /Confirm payment before closure/);
});

test("AI Watch My Back reports active work ready when grounded checks are clear", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-59",
      projectId: "project-59",
      projectTitle: "Active job ready",
      customerName: "Sarah Dommerich",
      status: "in_progress",
      conversationId: "conversation-59",
      approvalRecorded: true,
      paymentRecorded: true,
      photos: ["progress.jpg"],
    }),
  });

  const watch = evaluateWatchMyBack(
    buildFieldProductivityContext({ currentPage: "conversationThread", storage }),
    "en"
  );

  assert.match(watch.goodItems.join(" "), /Photos are attached/);
  assert.match(watch.goodItems.join(" "), /Approval is recorded/);
  assert.deepEqual(watch.checks, ["No grounded checks are missing in the current context."]);
  assert.equal(watch.nextAction, "Continue the active work and document progress.");
});

test("AI Watch My Back flags completion missing notes and photos", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-60",
      projectId: "project-60",
      projectTitle: "Completion draft",
      customerName: "Sarah Dommerich",
      status: "completed",
      conversationId: "conversation-60",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Completion notes are missing/);
  assert.match(response.answer, /Completion photos are missing/);
  assert.match(response.answer, /Document completion before closure/);
});

test("AI Watch My Back flags closure pending", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-61",
      projectId: "project-61",
      projectTitle: "Closure pending",
      customerName: "Sarah Dommerich",
      status: "closure_review",
      conversationId: "conversation-61",
      completionRecord: { id: "completion-61" },
      photos: ["final.jpg"],
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Closure review is still pending/);
  assert.match(response.answer, /Complete closure review before moving to History/);
});

test("AI Watch My Back keeps homeowner behavior safe", () => {
  const storage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-62",
      title: "Quote review",
      status: "quote_ready",
      conversationId: "conversation-62",
      quoteId: "quote-62",
      internalNotes: "Professional-only risk note.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Project Status\nQuote/);
  assert.match(response.answer, /What’s Next/);
  assert.match(response.answer, /Items Waiting on Professional/);
  assert.doesNotMatch(response.answer, /Possible Risk|Professional-only|Customer approval is not recorded/);
});

test("AI Watch My Back falls back safely without project context", () => {
  const storage = makeStorage({ activeAccountMode: "business" });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Watch My Back is available after opening a project conversation/);
});

test("AI Watch My Back does not invent facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-63",
      projectId: "project-63",
      projectTitle: "Sparse job",
      customerName: "Sarah Dommerich",
      status: "proposal_draft",
      conversationId: "conversation-63",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Watch My Back",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /\b\d+(?:\.\d+)?\s?(?:in|ft|feet|hours|hrs|sq ft)\b/i);
  assert.doesNotMatch(response.answer, /\b(?:tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  assert.doesNotMatch(response.answer, /customer approved|warranty included|photos are attached|deposit is recorded/i);
});

test("AI Relationship Memory summarizes customer preferences when present", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-64",
      projectId: "project-64",
      projectTitle: "Door follow-up",
      customerName: "Sarah Dommerich",
      status: "work_scheduled",
      conversationId: "conversation-64",
      customerPreferences: "Prefers afternoon appointments.",
    }),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "conversationThread",
    language: "en",
    storage,
  });
  const memory = buildRelationshipMemory(
    buildFieldProductivityContext({ currentPage: "conversationThread", storage }),
    "en"
  );
  const response = getFieldProductivityResponse({
    question: "Relationship Memory",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.ok(chips.some((chip) => chip.id === "relationship_memory"));
  assert.deepEqual(memory.sections.customerPreferences, ["Prefers afternoon appointments."]);
  assert.match(response.answer, /Customer Preferences\n• Prefers afternoon appointments/);
});

test("AI Relationship Memory reports no saved preferences without inventing them", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-65",
      projectId: "project-65",
      projectTitle: "Sparse relationship",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-65",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "What should I remember about this customer?",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /No saved customer preferences yet/);
  assert.doesNotMatch(response.answer, /afternoon|text communication|notice before arrival|gate code|dog|parking/i);
});

test("AI Relationship Memory includes property notes when present", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-66",
      projectId: "project-66",
      projectTitle: "Kitchen visit",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-66",
      propertyNotes: "Gate code provided.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Relationship Memory",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Property Notes\n• Gate code provided/);
});

test("AI Relationship Memory includes grounded project history and follow-up", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-67",
      projectId: "project-67",
      projectTitle: "Warranty check",
      customerName: "Sarah Dommerich",
      status: "completed",
      conversationId: "conversation-67",
      projectHistory: "Previous work completed.",
      quoteId: "quote-67",
      completionRecord: { id: "completion-67" },
      warrantyNotes: "One-year workmanship warranty.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Relationship Memory",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Previous work completed/);
  assert.match(response.answer, /Prior quote sent/);
  assert.match(response.answer, /Completion recorded/);
  assert.match(response.answer, /Warranty information is saved/);
  assert.match(response.answer, /Customer may need warranty follow-up/);
});

test("AI Relationship Memory keeps homeowner behavior safe", () => {
  const storage = makeStorage({
    activeAccountMode: "personal",
    selectedHomeownerRequest: JSON.stringify({
      id: "request-68",
      title: "Quote review",
      status: "quote_ready",
      conversationId: "conversation-68",
      quoteId: "quote-68",
      details: "Hang artwork.",
      internalNotes: "Professional-only follow-up strategy.",
      followUpOpportunity: "Upsell future project.",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Relationship Memory",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Project Memory\nHang artwork/);
  assert.match(response.answer, /Available Records\n• Quote/);
  assert.doesNotMatch(response.answer, /Customer Preferences|Follow-Up Opportunities|Professional-only|Upsell/i);
});

test("AI Relationship Memory does not invent facts", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    selectedConversation: JSON.stringify({
      id: "conversation-69",
      projectId: "project-69",
      projectTitle: "Sparse relationship",
      customerName: "Sarah Dommerich",
      status: "evaluation",
      conversationId: "conversation-69",
    }),
  });

  const response = getFieldProductivityResponse({
    question: "Relationship Memory",
    currentPage: "conversationThread",
    language: "en",
    storage,
  });

  assert.doesNotMatch(response.answer, /\$\d/);
  assert.doesNotMatch(response.answer, /\b\d{1,2}:\d{2}\b/);
  assert.doesNotMatch(response.answer, /warranty follow-up|repeat customer|paint color|parking instructions/i);
});

test("AI Business Intelligence summarizes grounded activity snapshot", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    businessIntelligenceRecords: JSON.stringify([
      { id: "job-1", status: "in_progress", category: "Handyman", customerName: "Sarah Dommerich" },
      { id: "job-2", status: "proposal_sent", category: "Handyman", customerName: "Alex Customer" },
      { id: "job-3", status: "completed", category: "Painting", customerName: "Sarah Dommerich" },
      { id: "job-4", status: "unpaid_invoice", invoiceId: "invoice-4", category: "Cleaning", customerName: "Morgan Customer" },
      { id: "job-5", status: "emergency_active", type: "emergency", category: "Plumbing", customerName: "Riley Customer" },
    ]),
  });

  const chips = getFieldAssistantPromptChips({
    currentPage: "businessDashboard",
    language: "en",
    storage,
  });
  const intelligence = buildBusinessIntelligence(
    buildFieldProductivityContext({ currentPage: "businessDashboard", storage }),
    "en",
    storage
  );
  const response = getFieldProductivityResponse({
    question: "Business Intelligence",
    currentPage: "businessDashboard",
    language: "en",
    storage,
  });

  assert.ok(chips.some((chip) => chip.id === "business_intelligence"));
  assert.equal(intelligence.insufficientData, false);
  assert.match(response.answer, /Activity Snapshot\n• 2 active projects/);
  assert.match(response.answer, /• 1 pending proposals/);
  assert.match(response.answer, /• 1 open invoices/);
  assert.match(response.answer, /• 1 emergency jobs/);
});

test("AI Business Intelligence flags pending proposals and unpaid invoices", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    businessIntelligenceRecords: JSON.stringify([
      { id: "job-1", status: "waiting_approval", category: "Handyman" },
      { id: "job-2", status: "open_invoice", invoiceId: "invoice-2", paymentStatus: "unpaid" },
    ]),
  });

  const response = getFieldProductivityResponse({
    question: "What is my business teaching me?",
    currentPage: "workCenter",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Follow up with customers waiting on proposal approval/);
  assert.match(response.answer, /Review unpaid invoices/);
  assert.match(response.answer, /Review unpaid invoices first/);
});

test("AI Business Intelligence flags closure pending as grounded business risk", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    businessIntelligenceRecords: JSON.stringify([
      { id: "job-1", status: "closure_review", category: "Handyman" },
    ]),
  });

  const response = getFieldProductivityResponse({
    question: "Business Intelligence",
    currentPage: "contractorDashboard",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Some jobs are waiting on closure/);
  assert.match(response.answer, /Close completed jobs that are waiting on review/);
});

test("AI Business Intelligence reports insufficient data without inventing metrics", () => {
  const storage = makeStorage({ activeAccountMode: "business" });

  const response = getFieldProductivityResponse({
    question: "Business Intelligence",
    currentPage: "businessDashboard",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Not enough business activity is available yet/);
  assert.doesNotMatch(response.answer, /revenue|profit|approval rate|\$\d|most profitable/i);
});

test("AI Business Intelligence surfaces grounded patterns and recommended focus", () => {
  const storage = makeStorage({
    activeAccountMode: "business",
    businessIntelligenceRecords: JSON.stringify([
      { id: "job-1", status: "proposal_sent", category: "Handyman", customerName: "Sarah Dommerich", missingProposalItems: ["photos"] },
      { id: "job-2", status: "proposal_draft", category: "Handyman", customerName: "Sarah Dommerich", missingProposalItems: ["photos"] },
      { id: "job-3", status: "completed", category: "Cleaning", customerName: "Morgan Customer" },
    ]),
  });

  const response = getFieldProductivityResponse({
    question: "Business patterns",
    currentPage: "workCenter",
    language: "en",
    storage,
  });

  assert.match(response.answer, /Most common service: Handyman/);
  assert.match(response.answer, /Repeat customers: Sarah Dommerich/);
  assert.match(response.answer, /Most frequent missing proposal item: photos/);
  assert.match(response.answer, /Follow up on pending proposals/);
  assert.doesNotMatch(response.answer, /revenue|profit|approval rate/i);
});
