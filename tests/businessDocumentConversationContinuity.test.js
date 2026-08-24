import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeBusinessDocumentDraft,
  reconcileBusinessDocumentInstructions,
  resolveBusinessDocumentConversationMessage,
} from "../src/utils/businessDocumentWorkspace.js";
import {
  buildBusinessDocumentConversationTurn,
  buildBusinessDocumentSavePayload,
  restoreBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";

function createConversationState(overrides = {}) {
  return {
    conversationId: "conversation-1",
    quoteId: "quote-1",
    analysisSessionId: null,
    evidenceIds: ["photo-1", "photo-2"],
    documentType: "quote",
    acceptedMessages: [],
    assistantReplies: 0,
    documentMutations: 0,
    draft: {},
    ...overrides,
  };
}

function routeConversationMessage(state, instruction, { failCapability = false } = {}) {
  const resolution = resolveBusinessDocumentConversationMessage({
    documentType: state.documentType,
    instruction,
    current: state.draft,
    hasActiveAnalysisSession: Boolean(state.analysisSessionId),
  });
  const acceptedMessages = [...state.acceptedMessages, instruction];

  if (resolution.capability === "ASK_MEETRO") {
    return {
      ...state,
      acceptedMessages,
      analysisSessionId: state.analysisSessionId || "analysis-1",
      assistantReplies: state.assistantReplies + (failCapability ? 0 : 1),
      lastCapability: resolution.capability,
      lastFailed: failCapability,
    };
  }

  if (resolution.capability === "DOCUMENT_MUTATION") {
    return {
      ...state,
      acceptedMessages,
      draft: mergeBusinessDocumentDraft(state.draft, resolution.patch),
      documentMutations: state.documentMutations + 1,
      lastCapability: resolution.capability,
      lastFailed: false,
    };
  }

  return { ...state, acceptedMessages, lastCapability: resolution.capability };
}

test("required alternating Meetro and Quote sequence stays in one conversation", () => {
  const messages = [
    "Analyze these photos.",
    "Set the customer to Jack Smith.",
    "Change the project price to $2,650.",
    "Do you think the whole knee wall should be rebuilt?",
    "Add full reconstruction to the scope.",
    "What else should I inspect before sending the quote?",
    "Change the price again.",
    "Ask another normal help question.",
  ];
  const expectedCapabilities = [
    "ASK_MEETRO",
    "DOCUMENT_MUTATION",
    "DOCUMENT_MUTATION",
    "ASK_MEETRO",
    "DOCUMENT_MUTATION",
    "ASK_MEETRO",
    "ASK_MEETRO",
    "ASK_MEETRO",
  ];

  let state = createConversationState();
  const identities = [];
  const capabilities = [];
  for (const message of messages) {
    state = routeConversationMessage(state, message);
    capabilities.push(state.lastCapability);
    identities.push({
      conversationId: state.conversationId,
      quoteId: state.quoteId,
      analysisSessionId: state.analysisSessionId,
      evidenceIds: state.evidenceIds,
    });
  }

  assert.deepEqual(capabilities, expectedCapabilities);
  assert.equal(state.acceptedMessages.length, messages.length);
  assert.equal(state.assistantReplies, 5);
  assert.equal(state.documentMutations, 3);
  assert.equal(state.draft.customerName, "Jack Smith");
  assert.equal(state.draft.totalOverride, "2650");
  assert.match(state.draft.projectDescription, /Full reconstruction/);
  for (const identity of identities) {
    assert.equal(identity.conversationId, "conversation-1");
    assert.equal(identity.quoteId, "quote-1");
    assert.equal(identity.analysisSessionId, "analysis-1");
    assert.deepEqual(identity.evidenceIds, ["photo-1", "photo-2"]);
  }
});

test("active conversation keeps implicit Quote construction attached after Job Analysis", () => {
  const state = createConversationState({ analysisSessionId: "analysis-1" });
  const next = routeConversationMessage(
    state,
    "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00"
  );

  assert.equal(next.conversationId, state.conversationId);
  assert.equal(next.quoteId, state.quoteId);
  assert.equal(next.analysisSessionId, state.analysisSessionId);
  assert.deepEqual(next.evidenceIds, state.evidenceIds);
  assert.equal(next.acceptedMessages.length, 1);
  assert.equal(next.documentMutations, 1);
  assert.equal(next.draft.customerName, "Jack Smith");
  assert.equal(next.draft.projectTitle, "Fan replacement");
  assert.deepEqual(next.draft.materialItems, [{ name: "Fan", total: "89.99" }]);
  assert.deepEqual(next.draft.laborItems, [{ description: "installation", total: "180" }]);
});

test("contractor-style scope and total statements remain Quote mutations after Job Analysis", () => {
  const examples = [
    "Replace the damaged knee wall with block and stucco for $2,650.",
    "Front knee wall reconstruction, remove damaged material, rebuild, stucco and finish. Total $2,650.",
    "Add labor and materials for rebuilding the knee wall, $2,650.",
  ];

  for (const instruction of examples) {
    const resolution = resolveBusinessDocumentConversationMessage({
      documentType: "quote",
      instruction,
      current: {
        customerName: "Jack Smith",
        projectDescription: "Damaged knee wall.",
        recommendedSolution: "Repair the damaged knee wall.",
      },
      hasActiveAnalysisSession: true,
    });

    assert.equal(resolution.capability, "DOCUMENT_MUTATION", instruction);
    assert.equal(resolution.patch.totalOverride, "2650", instruction);
    assert.match(resolution.patch.projectDescription, /knee wall/i, instruction);
    assert.match(resolution.patch.recommendedSolution, /knee wall/i, instruction);
  }
});

test("exact alternating review sequence preserves one Quote while chat and edits take turns", () => {
  const turns = [
    ["Analyze these photos.", "ASK_MEETRO"],
    ["Set the customer to Jack Smith.", "DOCUMENT_MUTATION"],
    ["Replace the damaged knee wall with block and stucco for $2,650.", "DOCUMENT_MUTATION"],
    ["Do you think the whole knee wall should be rebuilt?", "ASK_MEETRO"],
    ["Add full reconstruction to the scope.", "DOCUMENT_MUTATION"],
    ["What else should I inspect before sending the quote?", "ASK_MEETRO"],
    ["Change the price to $2,850.", "DOCUMENT_MUTATION"],
    ["Can you help me explain this repair to the customer?", "ASK_MEETRO"],
    ["Add demolition and debris removal.", "DOCUMENT_MUTATION"],
    ["Is there anything else I should include?", "ASK_MEETRO"],
  ];

  let state = createConversationState();
  for (const [instruction, capability] of turns) {
    state = routeConversationMessage(state, instruction);
    assert.equal(state.lastCapability, capability, instruction);
    assert.equal(state.conversationId, "conversation-1");
    assert.equal(state.quoteId, "quote-1");
    assert.equal(state.analysisSessionId, "analysis-1");
    assert.deepEqual(state.evidenceIds, ["photo-1", "photo-2"]);
  }

  assert.equal(state.draft.customerName, "Jack Smith");
  assert.equal(state.draft.totalOverride, "2850");
  assert.match(state.draft.projectDescription, /full reconstruction/i);
  assert.match(state.draft.projectDescription, /demolition and debris removal/i);
  assert.equal(state.assistantReplies, 5);
  assert.equal(state.documentMutations, 5);
});

test("prevalidated first edit and durable replay use the same existing-draft revision semantics", () => {
  const baseline = {
    projectDescription: "Repair the knee wall in 3–4 days.",
    problemFound: "Damage requiring 3–4 days of work.",
    recommendedSolution: "Repair and finish in 3–4 days.",
    totalOverride: "2650",
  };
  const instruction = "Make the duration 4–5 days.";
  const resolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction,
    current: baseline,
    hasActiveAnalysisSession: true,
  });
  const built = buildBusinessDocumentConversationTurn({
    id: "duration-turn",
    documentType: "quote",
    instruction,
    current: baseline,
    resolvedPatch: resolution.patch,
    now: "2026-08-23T12:00:00.000Z",
  });
  const replayed = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline,
    instructions: [built.turn],
  });

  assert.equal(resolution.capability, "DOCUMENT_MUTATION");
  assert.match(resolution.patch.projectDescription, /4–5 days/);
  assert.equal(replayed.draft.projectDescription, resolution.patch.projectDescription);
  assert.equal(replayed.draft.problemFound, resolution.patch.problemFound);
  assert.equal(replayed.draft.recommendedSolution, resolution.patch.recommendedSolution);
});

test("editing the same customer instruction replaces its effect and survives save and reopen", () => {
  const originalResolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "Set customer to Jack Smith",
    current: {},
  });
  const original = buildBusinessDocumentConversationTurn({
    id: "customer-turn",
    documentType: "quote",
    instruction: "Set customer to Jack Smith",
    current: {},
    resolvedPatch: originalResolution.patch,
    now: "2026-08-23T12:00:00.000Z",
  }).turn;
  const originalDraft = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline: {},
    instructions: [original],
  }).draft;

  const editedResolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "Set the customer name to Jack A Smith",
    current: originalDraft,
  });
  const edited = buildBusinessDocumentConversationTurn({
    id: original.id,
    documentType: "quote",
    instruction: "Set the customer name to Jack A Smith",
    current: originalDraft,
    previousTurn: original,
    resolvedPatch: editedResolution.patch,
    now: "2026-08-23T12:01:00.000Z",
  }).turn;
  const turns = [edited];
  const replayed = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline: {},
    instructions: turns,
  });

  assert.equal(editedResolution.capability, "DOCUMENT_MUTATION");
  assert.equal(edited.id, original.id);
  assert.equal(turns.length, 1);
  assert.equal(replayed.draft.customerName, "Jack A Smith");
  assert.equal(edited.revisions, 1);
  assert.deepEqual(edited.revisionHistory, ["Set customer to Jack Smith"]);

  const payload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: replayed.draft,
    turns,
    jobId: "job-1",
    jobAnalysisSessionId: "analysis-1",
  });
  const restored = restoreBusinessDocumentDraft({
    id: "quote-1",
    documentType: "QUOTE",
    jobId: "job-1",
    content: payload.content,
    workspace: payload.workspace,
    photos: [],
  });
  const reopened = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    baseline: {},
    instructions: restored.turns,
  });

  assert.equal(restored.turns.length, 1);
  assert.equal(restored.turns[0].id, "customer-turn");
  assert.equal(restored.turns[0].text, "Set the customer name to Jack A Smith");
  assert.equal(restored.content.customerName, "Jack A Smith");
  assert.equal(reopened.draft.customerName, "Jack A Smith");
  assert.equal(restored.jobId, "job-1");
  assert.equal(restored.jobAnalysisSessionId, "analysis-1");
});

test("incomplete Quote mutation remains an accepted conversational clarification", () => {
  const state = createConversationState({
    analysisSessionId: "analysis-1",
    draft: { customerName: "Jack Smith", totalOverride: "2650" },
  });
  const next = routeConversationMessage(state, "Change the amount.");
  const resolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction: "Change the amount.",
    current: state.draft,
    hasActiveAnalysisSession: true,
  });

  assert.equal(next.lastCapability, "ASK_MEETRO");
  assert.equal(resolution.intent, "CLARIFICATION_REQUIRED");
  assert.equal(resolution.analysisSessionActive, true);
  assert.equal(next.acceptedMessages.length, 1);
  assert.equal(next.assistantReplies, 1);
  assert.deepEqual(next.draft, state.draft);
  assert.equal(next.documentMutations, 0);
});

test("failed conversational capability can retry without duplicating a Quote mutation", () => {
  let state = createConversationState({
    analysisSessionId: "analysis-1",
    draft: { customerName: "Jack Smith", totalOverride: "2650" },
  });
  state = routeConversationMessage(state, "What should I inspect next?", {
    failCapability: true,
  });
  assert.equal(state.lastFailed, true);
  assert.equal(state.documentMutations, 0);
  assert.equal(state.draft.totalOverride, "2650");

  state = routeConversationMessage(state, "What should I inspect next?");
  assert.equal(state.lastFailed, false);
  assert.equal(state.assistantReplies, 1);
  assert.equal(state.documentMutations, 0);
  assert.equal(state.draft.totalOverride, "2650");
});

test("twelve alternating chat and Quote turns keep both capabilities and evidence available", () => {
  const turns = [
    ["Analyze these photos.", "ASK_MEETRO"],
    ["Customer is Maria Lopez.", "DOCUMENT_MUTATION"],
    ["What should I inspect first?", "ASK_MEETRO"],
    ["Change labor to $225.", "DOCUMENT_MUTATION"],
    ["Thanks, that helps.", "ASK_MEETRO"],
    ["Add stucco repair to the scope.", "DOCUMENT_MUTATION"],
    ["Does the base need more evaluation?", "ASK_MEETRO"],
    ["Price: $300", "DOCUMENT_MUTATION"],
    ["What else would you recommend?", "ASK_MEETRO"],
    ["Payment terms: 50% deposit", "DOCUMENT_MUTATION"],
    ["Explain what I should tell the customer.", "ASK_MEETRO"],
    ["Note: Protect the existing landscaping.", "DOCUMENT_MUTATION"],
  ];

  let state = createConversationState();
  for (const [message, expectedCapability] of turns) {
    state = routeConversationMessage(state, message);
    assert.equal(state.lastCapability, expectedCapability, message);
    assert.equal(state.conversationId, "conversation-1");
    assert.equal(state.quoteId, "quote-1");
    assert.equal(state.analysisSessionId, "analysis-1");
    assert.deepEqual(state.evidenceIds, ["photo-1", "photo-2"]);
  }

  assert.equal(state.acceptedMessages.length, 12);
  assert.equal(state.assistantReplies, 6);
  assert.equal(state.documentMutations, 6);
  assert.equal(state.draft.customerName, "Maria Lopez");
  assert.equal(state.draft.totalOverride, "300");
  assert.deepEqual(state.draft.laborItems, [{ description: "labor", total: "225" }]);
  assert.match(state.draft.projectDescription, /Stucco repair/);
  assert.equal(state.draft.depositTerms, "50% deposit");
  assert.equal(state.draft.notes, "Protect the existing landscaping");
});

test("saved refresh restores Quote association, analysis session, and evidence before either capability continues", () => {
  const instruction = "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00";
  const resolution = resolveBusinessDocumentConversationMessage({
    documentType: "quote",
    instruction,
    current: {},
    hasActiveAnalysisSession: true,
  });
  const conversationTurn = buildBusinessDocumentConversationTurn({
    id: "turn-1",
    documentType: "quote",
    instruction,
    current: {},
    resolvedPatch: resolution.patch,
    now: "2026-08-23T12:00:00.000Z",
  }).turn;
  const photo = {
    id: "photo-1",
    name: "fan.jpg",
    media: {
      public_id: "meetro/businesses/1/jobs/1/fan",
      version: 1,
      resource_type: "image",
      format: "jpg",
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/fan.jpg",
    },
  };
  const payload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: resolution.patch,
    turns: [conversationTurn],
    photos: [photo],
    photoAssignments: {
      "photo-1": { role: "UNCLASSIFIED", visibility: "PRIVATE_INTERNAL" },
    },
    jobId: "job-1",
    jobAnalysisSessionId: "analysis-1",
  });
  const savedDocument = {
    id: "quote-1",
    documentType: "QUOTE",
    jobId: "job-1",
    content: payload.content,
    workspace: payload.workspace,
    photos: payload.photos,
  };
  const restored = restoreBusinessDocumentDraft(savedDocument);

  assert.equal(savedDocument.id, "quote-1");
  assert.equal(restored.jobAnalysisSessionId, "analysis-1");
  assert.equal(restored.jobId, "job-1");
  assert.equal(restored.photos[0].media.public_id, photo.media.public_id);
  assert.equal(restored.content.customerName, "Jack Smith");

  let state = createConversationState({
    quoteId: savedDocument.id,
    analysisSessionId: restored.jobAnalysisSessionId,
    evidenceIds: restored.photos.map((item) => item.id),
    draft: restored.content,
  });
  state = routeConversationMessage(state, "What else should I inspect?");
  assert.equal(state.lastCapability, "ASK_MEETRO");
  state = routeConversationMessage(state, "Change installation to $200.");
  assert.equal(state.lastCapability, "DOCUMENT_MUTATION");
  assert.equal(state.quoteId, "quote-1");
  assert.equal(state.analysisSessionId, "analysis-1");
  assert.deepEqual(state.evidenceIds, ["photo-1"]);
  assert.deepEqual(state.draft.laborItems, [{ description: "installation", total: "200" }]);
});

test("Quote to Invoice to Quote navigation preserves each draft and the Quote conversation association", () => {
  const quoteState = routeConversationMessage(
    createConversationState({ analysisSessionId: "analysis-quote-1" }),
    "Customer is Jack Smith. Price: $2,650"
  );
  let invoiceState = createConversationState({
    conversationId: quoteState.conversationId,
    quoteId: quoteState.quoteId,
    documentType: "invoice",
    analysisSessionId: null,
    evidenceIds: quoteState.evidenceIds,
    draft: {},
  });
  invoiceState = routeConversationMessage(invoiceState, "Change total to $300.");
  invoiceState = routeConversationMessage(invoiceState, "What should I verify before sending the invoice?");

  assert.equal(invoiceState.documentType, "invoice");
  assert.equal(invoiceState.draft.totalOverride, "300");
  assert.equal(invoiceState.lastCapability, "ASK_MEETRO");
  assert.equal(quoteState.documentType, "quote");
  assert.equal(quoteState.draft.customerName, "Jack Smith");
  assert.equal(quoteState.draft.totalOverride, "2650");
  assert.equal(quoteState.conversationId, invoiceState.conversationId);
  assert.equal(quoteState.quoteId, invoiceState.quoteId);

  const returnedQuote = routeConversationMessage(
    quoteState,
    "What else should I inspect before sending the quote?"
  );
  assert.equal(returnedQuote.lastCapability, "ASK_MEETRO");
  assert.equal(returnedQuote.analysisSessionId, "analysis-quote-1");
  assert.equal(returnedQuote.draft.totalOverride, "2650");
  assert.deepEqual(returnedQuote.evidenceIds, ["photo-1", "photo-2"]);
});

test("replaying successful price and scope commands does not duplicate working content", () => {
  let state = createConversationState({
    analysisSessionId: "analysis-1",
    draft: {
      projectDescription: "Repair the knee wall.",
      recommendedSolution: "Repair the knee wall.",
    },
  });
  state = routeConversationMessage(state, "Change labor to $225.");
  state = routeConversationMessage(state, "Change labor to $225.");
  state = routeConversationMessage(state, "Add demolition and debris removal.");
  state = routeConversationMessage(state, "Add demolition and debris removal.");

  assert.deepEqual(state.draft.laborItems, [{ description: "labor", total: "225" }]);
  assert.equal(
    (state.draft.projectDescription.match(/demolition and debris removal/gi) || []).length,
    1
  );
  assert.equal(state.quoteId, "quote-1");
  assert.equal(state.analysisSessionId, "analysis-1");
});
