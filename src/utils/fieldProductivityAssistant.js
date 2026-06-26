import { t } from "./language.js";
import { getFindingDefinition, getServiceRecommendationDefinition } from "./findingsEngineRegistry.js";

const SUPPORTED_FIELD_PAGES = new Set([
  "home",
  "messagesInbox",
  "conversationThread",
  "businessDashboard",
  "contractorDashboard",
  "workCenter",
  "evaluationNotes",
  "quoteBuilder",
  "proposalSummary",
  "projectJourney",
  "completionSheet",
]);

const QUESTION_TYPES = {
  next: /(next|what should|do now|best action|can i do|do here|siguiente|hacer|prochaine|próximo)/i,
  missing: /(missing|need|incomplete|what information|falta|besoin|faltando|informaci)/i,
  prepare: /(prepare|document|record|capture|photo|note|prepar|documentar|registrar|foto|nota)/i,
  watchMyBack: /(watch my back|double.?check|check before|before i move forward|risk|risky|catch.*missing|revisar antes|vérifier avant|conferir antes)/i,
  relationshipMemory: /(relationship memory|what should i remember|remember about this customer|remember about this property|customer memory|property memory|memoria de relaci|mémoire de relation|memória do relacionamento)/i,
  businessIntelligence: /(business intelligence|what is my business teaching me|business patterns|activity snapshot|business risk|recommended focus|inteligencia de negocio|intelligence d'affaires|inteligência de negócios)/i,
  projectBrief: /(project brief|brief me|what do i need to know|walking into|project summary|resumen del proyecto|résumé du projet|resumo do projeto)/i,
  proposalCoach: /(proposal coach|coach proposal|improve proposal|proposal quality|quality.?control|coach this proposal)/i,
  proposal: /(review proposal|proposal status|ready to send|before sending|matches? the evaluation|customer.*understand|proposal ready|propuesta|proposition|proposta)/i,
  findings: /(review findings|findings|what did i find|ready to create a proposal|hallazgos|constats|achados)/i,
  summary: /(read summary aloud|summary aloud|read aloud|field summary|resumen|leer resumen|lire le résumé|resumo em voz|ler resumo)/i,
  coach: /(coach|workflow|ready|blocked|blocking|continue|evaluate|listo|bloqueado|prêt|bloqué|pronto|bloqueado)/i,
  where: /(where am i|where is this|explain this page|start with a project|stage|status|estado|etapa|statut|onde estou)/i,
};

function safeJsonFromStorage(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readFirst(storage, keys = []) {
  return keys
    .map((key) => storage.getItem(key))
    .find((value) => String(value || "").trim()) || "";
}

function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function joinList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return firstValue(item?.name, item?.title, item?.label, item?.description);
      })
      .filter(Boolean)
      .join(", ");
  }

  return String(value || "").trim();
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function listValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        return firstValue(item?.label, item?.title, item?.name, item?.description, item?.note, item?.value);
      })
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, entryValue]) => isProvided(entryValue))
      .map(([key, entryValue]) => {
        if (typeof entryValue === "boolean") return key;
        return typeof entryValue === "string" ? entryValue : firstValue(entryValue?.label, entryValue?.title, entryValue?.note, entryValue?.value, key);
      })
      .filter(Boolean);
  }
  return String(value || "")
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isProvided(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return String(value || "").trim() !== "";
}

function explicitBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function normalizeRole(page, storage) {
  const mode = storage.getItem("activeAccountMode") || "personal";
  const professionalPages = new Set([
    "businessDashboard",
    "contractorDashboard",
    "workCenter",
    "quoteBuilder",
    "completionSheet",
  ]);

  if (professionalPages.has(page)) return "business";
  return mode === "business" ? "business" : "personal";
}

function getSelectedProject(storage) {
  const selectedRequest = safeJsonFromStorage(storage, "selectedHomeownerRequest", null);
  const selectedQuoteRequest = safeJsonFromStorage(storage, "selectedQuoteRequest", null);
  const selectedConversation = safeJsonFromStorage(storage, "selectedConversation", null);
  const activeWorkSnapshot = {
    id: readFirst(storage, ["activeWorkRequestId", "activeJobId"]),
    title: readFirst(storage, ["activeWorkService", "activeJobService"]),
    customerName: storage.getItem("activeJobCustomer") || "",
    location: readFirst(storage, ["activeWorkLocation", "activeJobLocation"]),
    status: readFirst(storage, ["activeWorkStatus", "activeJobStatus", "activeWorkStage"]),
    conversationId: readFirst(storage, ["activeWorkConversationId", "activeConversationId"]),
    quoteId: storage.getItem("activeWorkQuoteId") || "",
  };

  const project =
    selectedRequest ||
    selectedQuoteRequest ||
    selectedConversation ||
    (activeWorkSnapshot.id || activeWorkSnapshot.title ? activeWorkSnapshot : null);

  if (!project) return null;

  const evaluation = project.evaluation || project.savedEvaluation || project.evaluationRecord || {};
  const proposal = project.proposal || project.quote || project.estimate || project.proposalRecord || {};
  const evaluationFindings = firstValue(
    project.findings,
    project.evaluationStructuredFindings,
    project.evaluationFindings,
    project.findingNotes,
    project.problemFound,
    evaluation.findings,
    evaluation.findingsNotes,
    evaluation.findingsText
  );
  const evaluationMeasurements = firstValue(
    project.measurements,
    project.dimensions,
    project.measurementNotes,
    evaluation.measurements,
    evaluation.measurementNotes
  );
  const evaluationPhotos = firstValue(project.photos, project.imageUrls, evaluation.photos, evaluation.imageUrls);
  const proposalLineItems = firstValue(
    project.lineItems,
    project.quoteLineItems,
    project.proposalLineItems,
    project.items,
    proposal.lineItems,
    proposal.items
  );

  return {
    id: firstValue(project.requestId, project.projectId, project.id, activeWorkSnapshot.id),
    title: firstValue(
      project.title,
      project.projectTitle,
      project.service,
      project.category,
      activeWorkSnapshot.title
    ),
    customerName: firstValue(
      project.customerName,
      project.homeownerName,
      project.clientName,
      activeWorkSnapshot.customerName
    ),
    professionalName: firstValue(
      project.selectedProfessional,
      project.businessName,
      project.professionalName,
      project.providerName
    ),
    serviceCategory: firstValue(project.serviceCategory, project.category, project.serviceType, project.specialty),
    location: firstValue(project.location, project.address, project.serviceAddress, activeWorkSnapshot.location),
    status: firstValue(project.status, project.workflowStatus, project.stage, activeWorkSnapshot.status),
    conversationId: firstValue(project.conversationId, project.activeConversationId, activeWorkSnapshot.conversationId),
    quoteId: firstValue(project.quoteId, activeWorkSnapshot.quoteId),
    details: firstValue(project.details, project.description, project.requestDetails, project.scope),
    workObserved: firstValue(
      project.workObserved,
      project.evaluationNotes,
      evaluation.notes,
      evaluation.observations,
      project.observations,
      project.findings,
      project.workNotes,
      project.completionNotes
    ),
    materials: joinList(firstValue(project.materials, project.materialsNeeded, project.materialList)),
    documents: joinList(firstValue(project.documents, project.attachments, project.files)),
    measurements: evaluationMeasurements,
    findings: joinList(evaluationFindings),
    rawFindings: evaluationFindings,
    serviceRecommendations: firstValue(
      project.serviceRecommendations,
      project.recommendations,
      evaluation.serviceRecommendations,
      evaluation.recommendations
    ),
    recommendedSolution: firstValue(
      project.recommendedSolution,
      project.solution,
      project.recommendation,
      proposal.recommendedSolution,
      proposal.solution,
      proposal.recommendation,
      proposal.scope
    ),
    lineItems: proposalLineItems,
    laborPricingType: firstValue(project.laborPricingType, proposal.laborPricingType),
    laborFee: firstValue(project.laborFee, project.laborAmount, proposal.laborFee, proposal.laborAmount),
    laborHours: firstValue(project.laborHours, proposal.laborHours),
    laborRate: firstValue(project.laborRate, proposal.laborRate),
    laborTotal: firstValue(project.laborTotal, proposal.laborTotal),
    materialCost: firstValue(project.materialCost, project.materialsTotal, proposal.materialCost, proposal.materialsTotal),
    customerNotes: firstValue(project.customerNotes, proposal.customerNotes, proposal.notes),
    scheduleNotes: firstValue(project.scheduleNotes, project.appointmentNotes, project.visitNotes),
    accessNotes: firstValue(project.accessNotes, project.entryNotes),
    emergencyNotes: firstValue(project.emergencyNotes, project.emergencyDetails),
    internalNotes: firstValue(project.internalNotes, project.proNotes, project.privateNotes),
    warrantyNotes: firstValue(project.warrantyNotes, project.warranty, proposal.warrantyNotes, proposal.warranty),
    additionalNotes: firstValue(project.additionalNotes, proposal.additionalNotes),
    customerPreferences: firstValue(
      project.customerPreferences,
      project.preferences,
      project.communicationPreference,
      project.contactPreference,
      project.requestedNotice,
      project.appointmentPreference
    ),
    propertyNotes: firstValue(
      project.propertyNotes,
      project.propertyDetails,
      project.parkingNotes,
      project.gateCode,
      project.petNotes,
      project.accessNotes,
      project.entryNotes
    ),
    projectHistory: firstValue(
      project.projectHistory,
      project.historyNotes,
      project.previousWork,
      project.pastWork,
      project.completedWork
    ),
    followUpNotes: firstValue(
      project.followUpNotes,
      project.followUpOpportunity,
      project.maintenanceFollowUp,
      project.warrantyFollowUp,
      project.repeatWorkOpportunity
    ),
    repeatCustomer: Boolean(project.repeatCustomer || project.isRepeatCustomer || project.previousCustomer),
    depositRequired: Boolean(project.depositRequired || proposal.depositRequired || project.requiresDeposit || proposal.requiresDeposit),
    depositAmount: firstValue(project.depositAmount, project.deposit, project.requiredDeposit),
    approvalRecorded:
      explicitBoolean(project.approvalRecorded) ??
      Boolean(
        project.customerApproved ||
          project.approvedAt ||
          project.approved ||
          /approved|accepted|paid|work_scheduled|on_the_way|arrived|in_progress|completed|closure|closed/i.test(String(project.status || ""))
      ),
    paymentRecorded:
      explicitBoolean(project.paymentRecorded) ??
      Boolean(
        project.depositRecorded ||
          project.depositPaid ||
          project.paidAt ||
          project.paymentStatus === "paid" ||
          /paid|deposit|work_scheduled|on_the_way|arrived|in_progress|completed|closure|closed/i.test(String(project.status || ""))
      ),
    arrivalConfirmed: Boolean(project.arrivalConfirmed || project.arrivedAt || /arrived|in_progress|started/.test(String(project.status || ""))),
    customerConfirmed: Boolean(project.customerConfirmed || project.homeownerConfirmed || project.customerConfirmation),
    hasPhotos:
      Number(project.photoCount || 0) > 0 ||
      (Array.isArray(project.photos) && project.photos.length > 0) ||
      (Array.isArray(project.imageUrls) && project.imageUrls.length > 0) ||
      (Array.isArray(evaluationPhotos) && evaluationPhotos.length > 0),
    hasEvaluation:
      Boolean(project.evaluationSaved || project.evaluation || project.evaluationNotes) ||
      Boolean(storage.getItem("savedEvaluationNotes")),
    hasQuote:
      Boolean(project.quoteId || project.acceptedQuote || project.quote || activeWorkSnapshot.quoteId),
    hasInvoice: Boolean(project.invoiceId || project.invoice || project.hasInvoice),
    hasReceipt: Boolean(project.receiptId || project.receipt || project.hasReceipt),
    hasChangeOrder: Boolean(project.changeOrderId || project.changeOrder || project.hasChangeOrder),
    hasCompletion:
      Boolean(project.completionNotes || project.completion || project.completionRecord) ||
      /closure|closed/i.test(String(firstValue(project.status, project.workflowStatus, activeWorkSnapshot.status))),
  };
}

export function buildFieldProductivityContext({
  currentPage = "",
  storage = globalThis?.localStorage,
} = {}) {
  const safeStorage = storage || {
    getItem: () => "",
  };
  const page = String(currentPage || "");
  const role = normalizeRole(page, safeStorage);
  const project = getSelectedProject(safeStorage);
  const workCenterSection =
    safeStorage.getItem("meetroWorkCenterTab") ||
    safeStorage.getItem("activeWorkCenterTab") ||
    "";

  return {
    supported: SUPPORTED_FIELD_PAGES.has(page),
    role,
    page,
    workCenterSection,
    project,
    stage: getWorkflowStage({ page, workCenterSection, project }),
    missing: getMissingInfo({ page, role, workCenterSection, project }),
  };
}

export function evaluateFieldWorkflow(context = {}, language = "en") {
  const { project, role, stage, missing = [] } = context;
  const blockingItems = [];
  const recommendedItems = [];
  const pushUnique = (items, value) => {
    if (value && !items.includes(value)) items.push(value);
  };

  if (!project) {
    blockingItems.push(t("assistantFieldMissing_project", language));
    return {
      currentStage: t(`assistantFieldStage_${stage || "orientation"}`, language),
      nextRecommendedAction: t("assistantFieldNextSelectProject", language),
      blockingItems,
      readyToContinue: false,
      alertLevel: "red",
      statusLabel: t("assistantWorkflowStatusBlocked", language),
    };
  }

  if (stage === "evaluation") {
    if (!project.measurements) recommendedItems.push(t("assistantWorkflowMissingMeasurements", language));
    if (!project.hasPhotos) recommendedItems.push(t("assistantFieldMissing_photos", language));
    if (!project.findings && !project.workObserved) blockingItems.push(t("assistantWorkflowMissingFindings", language));
  }

  if (stage === "quote") {
    if (role === "business" && !project.hasEvaluation) blockingItems.push(t("assistantFieldMissing_evaluation", language));
    if (!project.depositAmount) recommendedItems.push(t("assistantWorkflowMissingDeposit", language));
    if (!project.hasPhotos) recommendedItems.push(t("assistantFieldMissing_photos", language));
  }

  if (stage === "activeWork") {
    if (!project.arrivalConfirmed) recommendedItems.push(t("assistantWorkflowMissingArrival", language));
    if (!project.hasPhotos) recommendedItems.push(t("assistantWorkflowMissingProgressPhotos", language));
  }

  if (stage === "completion") {
    if (!project.hasCompletion) blockingItems.push(t("assistantFieldMissing_completionNotes", language));
    if (!project.customerConfirmed) blockingItems.push(t("assistantWorkflowMissingCustomerConfirmation", language));
  }

  missing.forEach((item) => {
    const label = t(`assistantFieldMissing_${item}`, language);
    if (["project", "evaluation", "completionNotes"].includes(item)) {
      pushUnique(blockingItems, label);
    } else {
      pushUnique(recommendedItems, label);
    }
  });

  const allItems = [...blockingItems, ...recommendedItems];
  const alertLevel = blockingItems.length > 0 ? "red" : recommendedItems.length > 0 ? "yellow" : "green";

  return {
    currentStage: t(`assistantFieldStage_${stage}`, language),
    nextRecommendedAction: getNextActionText(context, language),
    blockingItems: allItems,
    readyToContinue: alertLevel === "green",
    alertLevel,
    statusLabel:
      alertLevel === "green"
        ? t("assistantWorkflowStatusReady", language)
        : alertLevel === "yellow"
        ? t("assistantWorkflowStatusAttention", language)
        : t("assistantWorkflowStatusBlocked", language),
  };
}

export function getWorkflowStage({ page, workCenterSection, project } = {}) {
  const explicitStatus = String(project?.status || "").toLowerCase();
  const section = String(workCenterSection || "").toLowerCase();

  if (page === "evaluationNotes") return "evaluation";
  if (page === "quoteBuilder") return "quote";
  if (page === "completionSheet") return "completion";
  if (section.includes("evaluation")) return "evaluation";
  if (section.includes("schedule")) return "schedule";
  if (section.includes("active")) return "activeWork";
  if (section.includes("quote")) return "quote";
  if (section.includes("history")) return "history";
  if (/evaluation|evaluated|observed|finding/.test(explicitStatus)) return "evaluation";
  if (/quote|proposal|approval/.test(explicitStatus)) return "quote";
  if (/work_scheduled|on_the_way|arrived|in_progress|progress|started|way|active/.test(explicitStatus)) {
    return "activeWork";
  }
  if (/schedule|appointment|visit/.test(explicitStatus)) return "schedule";
  if (/complete|closure|closed/.test(explicitStatus)) return "completion";
  if (project?.id || project?.title) return "review";
  return page === "businessDashboard" ? "dashboard" : "orientation";
}

export function getMissingInfo({ page, role, project, workCenterSection } = {}) {
  const missing = [];
  const stage = getWorkflowStage({ page, workCenterSection, project });

  if (!project && ["quoteBuilder", "completionSheet", "conversationThread"].includes(page)) {
    missing.push("project");
  }

  if (project && !project.conversationId) missing.push("conversation");
  if (project && !project.hasPhotos && ["review", "evaluation", "schedule", "activeWork", "completion"].includes(stage)) {
    missing.push("photos");
  }
  if (role === "business" && stage === "evaluation" && project && !project.workObserved) {
    missing.push("observations");
  }
  if (role === "business" && stage === "quote" && project && !project.hasEvaluation) {
    missing.push("evaluation");
  }
  if (role === "business" && stage === "activeWork" && project && !project.location) {
    missing.push("location");
  }
  if (page === "quoteBuilder" && project && !project.hasEvaluation) {
    missing.push("evaluation");
  }
  if (page === "completionSheet" && project && !project.hasCompletion) {
    missing.push("completionNotes");
  }

  return Array.from(new Set(missing));
}

export function getFieldAssistantSuggestions(context = {}, language = "en") {
  const { role, page, stage, project, missing = [] } = context;
  const actions = [];

  if (page === "home") {
    actions.push({ label: t("assistantFieldActionCreateRequest", language), target: "upload" });
    actions.push({ label: t("assistantFieldActionOpenMessages", language), target: "messagesInbox" });
  }

  if (page === "businessDashboard") {
    actions.push({ label: t("assistantFieldActionOpenWorkCenter", language), target: "contractorDashboard" });
    actions.push({ label: t("assistantFieldActionOpenSchedule", language), target: "contractorDashboard", workCenterSection: "schedule" });
  }

  if (stage === "evaluation") {
    actions.push({ label: t("assistantFieldActionOpenEvaluation", language), target: "contractorDashboard", workCenterSection: "schedule" });
  }

  if (stage === "quote") {
    actions.push({ label: t("assistantFieldActionContinueProposal", language), target: "quoteBuilder" });
  }

  if (stage === "activeWork") {
    actions.push({ label: t("assistantFieldActionResumeActiveWork", language), target: "contractorDashboard", workCenterSection: "active" });
  }

  if (stage === "completion") {
    actions.push({ label: t("assistantFieldActionReviewCompletion", language), target: role === "business" ? "completionSheet" : "completedJobDetails" });
  }

  if (missing.includes("conversation") || page === "messagesInbox" || page === "conversationThread") {
    actions.push({ label: t("assistantFieldActionOpenMessages", language), target: "messagesInbox" });
  }

  if (project?.conversationId) {
    actions.push({
      label: t("assistantFieldActionOpenConversation", language),
      target: "conversationThread",
      conversationId: project.conversationId,
    });
  }

  return dedupeActions(actions).slice(0, 3);
}

export function getFieldAssistantPromptChips({
  currentPage = "",
  language = "en",
  storage = globalThis?.localStorage,
} = {}) {
  const context = buildFieldProductivityContext({ currentPage, storage });

  if (!context.supported) return [];

  if (!context.project) {
    const fallbackChips = [
      {
        id: "explain_page",
        label: t("assistantFieldChipExplainPage", language),
        prompt: "Explain this page",
      },
      {
        id: "what_can_i_do",
        label: t("assistantFieldChipWhatCanIDoHere", language),
        prompt: "What can I do here?",
      },
      {
        id: "start_project",
        label: t("assistantFieldChipStartWithProject", language),
        prompt: "Start with a project",
      },
    ];
    if (isBusinessIntelligenceContext(context)) {
      fallbackChips.push({
        id: "business_intelligence",
        label: t("assistantFieldChipBusinessIntelligence", language),
        prompt: "Business Intelligence",
      });
    }
    return fallbackChips;
  }

  const chips = [
    {
      id: "where_am_i",
      label: t("assistantFieldChipWhereAmI", language),
      prompt: "Where am I in this project?",
    },
    {
      id: "whats_next",
      label: t("assistantFieldChipWhatsNext", language),
      prompt: "What should I do next?",
    },
    {
      id: "whats_missing",
      label: t("assistantFieldChipWhatsMissing", language),
      prompt: "What information is missing?",
    },
    {
      id: "document_this",
      label: t("assistantFieldChipHelpDocument", language),
      prompt: "Help me document this",
    },
    {
      id: "read_summary_aloud",
      label: t("assistantFieldChipReadSummaryAloud", language),
      prompt: "Read summary aloud",
      inputMode: "voice",
    },
  ];

  if (context.page === "conversationThread") {
    chips.push({
      id: "project_brief",
      label: t("assistantFieldChipProjectBrief", language),
      prompt: "Project Brief",
    });
    chips.push({
      id: "relationship_memory",
      label: t("assistantFieldChipRelationshipMemory", language),
      prompt: "Relationship Memory",
    });
  }

  if (context.role === "business") {
    chips.push({
      id: "watch_my_back",
      label: t("assistantFieldChipWatchMyBack", language),
      prompt: "Watch My Back",
    });
  }

  if (isBusinessIntelligenceContext(context)) {
    chips.push({
      id: "business_intelligence",
      label: t("assistantFieldChipBusinessIntelligence", language),
      prompt: "Business Intelligence",
    });
  }

  if (isFindingsAssistantContext(context)) {
    chips.push({
      id: "review_findings",
      label: t("assistantFieldChipReviewFindings", language),
      prompt: "Review findings",
    });
  }

  if (isProposalAssistantContext(context)) {
    chips.push({
      id: "review_proposal",
      label: t("assistantFieldChipReviewProposal", language),
      prompt: "Review proposal",
    });
    chips.push({
      id: "proposal_coach",
      label: t("assistantFieldChipProposalCoach", language),
      prompt: "Proposal Coach",
    });
  }

  return chips;
}

export function getFieldProductivityResponse({
  question = "",
  currentPage = "",
  language = "en",
  storage = globalThis?.localStorage,
} = {}) {
  const context = buildFieldProductivityContext({ currentPage, storage });

  if (!context.supported) return null;

  const text = String(question || "");
  const asksFieldQuestion =
    QUESTION_TYPES.next.test(text) ||
    QUESTION_TYPES.missing.test(text) ||
    QUESTION_TYPES.prepare.test(text) ||
    QUESTION_TYPES.watchMyBack.test(text) ||
    QUESTION_TYPES.relationshipMemory.test(text) ||
    QUESTION_TYPES.businessIntelligence.test(text) ||
    QUESTION_TYPES.projectBrief.test(text) ||
    QUESTION_TYPES.proposalCoach.test(text) ||
    QUESTION_TYPES.proposal.test(text) ||
    QUESTION_TYPES.findings.test(text) ||
    QUESTION_TYPES.summary.test(text) ||
    QUESTION_TYPES.coach.test(text) ||
    QUESTION_TYPES.where.test(text) ||
    text.trim().length === 0;

  if (!asksFieldQuestion) return null;

  const answer = QUESTION_TYPES.summary.test(text)
    ? buildReadAloudSummary(context, language)
    : QUESTION_TYPES.businessIntelligence.test(text)
    ? buildBusinessIntelligenceAnswer(context, language, storage)
    : QUESTION_TYPES.relationshipMemory.test(text)
    ? buildRelationshipMemoryAnswer(context, language)
    : QUESTION_TYPES.watchMyBack.test(text)
    ? buildWatchMyBackAnswer(context, language)
    : QUESTION_TYPES.projectBrief.test(text)
    ? buildProjectBriefAnswer(context, language)
    : QUESTION_TYPES.proposalCoach.test(text)
    ? buildProposalCoachAnswer(context, language)
    : QUESTION_TYPES.proposal.test(text)
    ? buildProposalAssistantAnswer(context, language)
    : QUESTION_TYPES.findings.test(text)
    ? buildFindingsAssistantAnswer(context, language)
    : QUESTION_TYPES.coach.test(text)
    ? buildWorkflowCoachAnswer(context, language)
    : QUESTION_TYPES.prepare.test(text) && context.project && isDocumentationContext(context)
    ? buildDocumentationDraft(context, language)
    : buildFieldAnswer(context, language);
  const actions = getFieldAssistantSuggestions(context, language);
  const workflowEvaluation = evaluateFieldWorkflow(context, language);

  return {
    intent: "field_productivity_guidance",
    success: true,
    answer,
    actions,
    context,
    workflowEvaluation,
    statusChip: {
      level: workflowEvaluation.alertLevel,
      label: workflowEvaluation.statusLabel,
    },
  };
}

function isProposalAssistantContext(context = {}) {
  const { page, project, stage } = context;
  if (!project) return false;
  if (["quoteBuilder", "proposalSummary", "projectJourney"].includes(page)) return true;
  return stage === "quote" && Boolean(project.hasQuote || project.lineItems || project.recommendedSolution);
}

function hasLineItems(project = {}) {
  return isProvided(project.lineItems);
}

function lineItemsInclude(project = {}, pattern) {
  return asArray(project.lineItems).some((item) => {
    const text = typeof item === "string"
      ? item
      : firstValue(item?.type, item?.category, item?.name, item?.title, item?.description);
    return pattern.test(String(text || ""));
  });
}

function hasLabor(project = {}) {
  return Boolean(
    isProvided(project.laborTotal) ||
      isProvided(project.laborFee) ||
      isProvided(project.laborPricingType) ||
      (isProvided(project.laborHours) && isProvided(project.laborRate)) ||
      lineItemsInclude(project, /labor|labour|mano de obra|main-d'oeuvre|mão de obra/i)
  );
}

function hasMaterials(project = {}) {
  return Boolean(
    isProvided(project.materials) ||
      isProvided(project.materialCost) ||
      lineItemsInclude(project, /material|supply|supplies|materiales|matériaux|materiais/i)
  );
}

function materialsAppearApplicable(project = {}) {
  return Boolean(
    project.materialsRequired ||
      project.materialsApplicable ||
      project.requiresMaterials ||
      lineItemsInclude(project, /material|supply|supplies|materiales|matériaux|materiais/i)
  );
}

function hasDeposit(project = {}) {
  return isProvided(project.depositAmount);
}

export function evaluateProposalReadiness(context = {}, language = "en") {
  const { role, page, project } = context;

  if (!isProposalAssistantContext(context)) {
    return {
      supported: false,
      status: "unsupported",
      statusLabel: t("assistantProposalStatusNeedsReview", language),
      reviewItems: [t("assistantProposalUnsupportedContext", language)],
      recommendation: t("assistantProposalOpenProposalContext", language),
    };
  }

  if (role !== "business") {
    return {
      supported: true,
      status: "needs_review",
      statusLabel: t("assistantProposalStatusNeedsReview", language),
      reviewItems: [t("assistantProposalHomeownerStatus", language)],
      recommendation: t("assistantProposalHomeownerRecommendation", language),
    };
  }

  const blockingItems = [];
  const reviewItems = [];
  const findingsReady = isProvided(project?.findings) || isProvided(project?.rawFindings) || isProvided(project?.workObserved);

  if (!findingsReady) blockingItems.push(t("assistantProposalMissingFindings", language));
  if (!isProvided(project?.recommendedSolution)) {
    blockingItems.push(t("assistantProposalMissingSolution", language));
  }
  if (!hasLineItems(project)) blockingItems.push(t("assistantProposalMissingLineItems", language));
  if (!hasLabor(project)) blockingItems.push(t("assistantProposalMissingLabor", language));
  if (!project?.hasPhotos) reviewItems.push(t("assistantProposalMissingPhotos", language));
  if (materialsAppearApplicable(project) && !hasMaterials(project)) {
    reviewItems.push(t("assistantProposalMissingMaterials", language));
  }
  if (project?.depositRequired && !hasDeposit(project)) {
    reviewItems.push(t("assistantProposalMissingDeposit", language));
  }
  if (!isProvided(project?.customerNotes)) reviewItems.push(t("assistantProposalMissingCustomerNotes", language));
  if (!isProvided(project?.warrantyNotes) && !isProvided(project?.additionalNotes)) {
    reviewItems.push(t("assistantProposalMissingWarranty", language));
  }

  const status = blockingItems.length > 0
    ? "blocked"
    : reviewItems.length > 0
    ? "needs_review"
    : "ready";

  return {
    supported: true,
    status,
    statusLabel:
      status === "ready"
        ? t("assistantProposalStatusReady", language)
        : status === "blocked"
        ? t("assistantProposalStatusBlocked", language)
        : t("assistantProposalStatusNeedsReview", language),
    reviewItems: [...blockingItems, ...reviewItems],
    recommendation:
      status === "ready"
        ? t("assistantProposalRecommendationReady", language)
        : status === "blocked"
        ? t("assistantProposalRecommendationBlocked", language)
        : t("assistantProposalRecommendationNeedsReview", language),
    page,
  };
}

function buildProposalAssistantAnswer(context, language) {
  const review = evaluateProposalReadiness(context, language);
  const reviewItems = review.reviewItems.length > 0
    ? review.reviewItems.map((item) => `• ${item}`).join("\n")
    : `• ${t("assistantFieldNotProvidedYet", language)}`;

  return [
    t("assistantProposalStatusSection", language),
    review.statusLabel,
    "",
    t("assistantProposalReviewItemsSection", language),
    reviewItems,
    "",
    t("assistantProposalRecommendationSection", language),
    review.recommendation,
  ].join("\n");
}

function getProposalProblem(project = {}, language = "en") {
  return provided(firstValue(project.findings, project.workObserved, project.details), language);
}

function getProposalSolution(project = {}, language = "en") {
  return provided(project.recommendedSolution, language);
}

function getProposalStrengths(project = {}, language = "en") {
  const strengths = [];
  const findingsReady = isProvided(project.findings) || isProvided(project.rawFindings) || isProvided(project.workObserved);

  if (project.hasPhotos) strengths.push(t("assistantProposalStrengthPhotos", language));
  if (findingsReady) strengths.push(t("assistantProposalStrengthFindings", language));
  if (isProvided(project.recommendedSolution)) strengths.push(t("assistantProposalStrengthScope", language));
  if (hasLineItems(project)) strengths.push(t("assistantProposalStrengthLineItems", language));
  if (hasDeposit(project)) strengths.push(t("assistantProposalStrengthDeposit", language));
  if (isProvided(project.warrantyNotes) || isProvided(project.additionalNotes)) {
    strengths.push(t("assistantProposalStrengthWarranty", language));
  }

  return strengths;
}

function getProposalOpportunities(project = {}, review = {}, language = "en") {
  if (!review.supported) return [review.recommendation];
  if (review.status === "ready") return [t("assistantProposalOpportunityFinalReview", language)];

  const opportunities = [];
  review.reviewItems.forEach((item) => {
    if (item === t("assistantProposalMissingPhotos", language)) {
      opportunities.push(t("assistantProposalOpportunityPhotos", language));
    } else if (item === t("assistantProposalMissingFindings", language)) {
      opportunities.push(t("assistantProposalOpportunityFindings", language));
    } else if (item === t("assistantProposalMissingSolution", language)) {
      opportunities.push(t("assistantProposalOpportunitySolution", language));
    } else if (item === t("assistantProposalMissingLabor", language)) {
      opportunities.push(t("assistantProposalOpportunityLabor", language));
    } else if (item === t("assistantProposalMissingWarranty", language)) {
      opportunities.push(t("assistantProposalOpportunityWarranty", language));
    } else if (item === t("assistantProposalMissingCustomerNotes", language)) {
      opportunities.push(t("assistantProposalOpportunityCustomerNotes", language));
    } else {
      opportunities.push(item);
    }
  });

  if (materialsAppearApplicable(project) && !hasMaterials(project)) {
    opportunities.push(t("assistantProposalOpportunityMaterials", language));
  }

  return Array.from(new Set(opportunities));
}

function getProposalConfidence(review = {}, strengths = [], language = "en") {
  if (review.status === "blocked") return t("assistantProposalConfidenceNotReady", language);
  if (review.status === "needs_review") return t("assistantProposalConfidenceNeedsImprovement", language);
  return strengths.length >= 5
    ? t("assistantProposalConfidenceExcellent", language)
    : t("assistantProposalConfidenceGood", language);
}

function getProposalCustomerPerspective(project = {}, review = {}, language = "en") {
  if (review.status === "blocked") return t("assistantProposalCustomerPerspectiveBlocked", language);
  if (!isProvided(project.recommendedSolution)) return t("assistantProposalCustomerPerspectiveScope", language);
  if (!hasLabor(project) || !hasLineItems(project)) return t("assistantProposalCustomerPerspectivePricing", language);
  if (!project.hasPhotos && !isProvided(project.findings)) return t("assistantProposalCustomerPerspectiveSupport", language);
  return t("assistantProposalCustomerPerspectiveClear", language);
}

export function evaluateProposalCoach(context = {}, language = "en") {
  const { project, role } = context;
  const review = evaluateProposalReadiness(context, language);

  if (!review.supported) {
    return {
      supported: false,
      homeownerView: false,
      summary: t("assistantProposalUnsupportedContext", language),
      strengths: [],
      opportunities: [review.recommendation],
      customerPerspective: t("assistantProposalOpenProposalContext", language),
      confidence: t("assistantProposalConfidenceNotReady", language),
      readiness: review,
    };
  }

  if (role !== "business") {
    const visibleStatus = project?.hasQuote || project?.quoteId || /quote|proposal/i.test(String(project?.status || ""))
      ? t("assistantProposalHomeownerReadyForReview", language)
      : t("assistantProposalHomeownerWaitingUpdates", language);
    return {
      supported: true,
      homeownerView: true,
      summary: visibleStatus,
      strengths: [],
      opportunities: [],
      customerPerspective: t("assistantProposalHomeownerRecommendation", language),
      confidence: visibleStatus,
      readiness: review,
    };
  }

  const strengths = getProposalStrengths(project, language);
  const opportunities = getProposalOpportunities(project, review, language);

  return {
    supported: true,
    homeownerView: false,
    summary: `${t("assistantProposalCoachProblemPrefix", language)} ${getProposalProblem(project, language)} ${t("assistantProposalCoachSolutionPrefix", language)} ${getProposalSolution(project, language)}`,
    strengths,
    opportunities,
    customerPerspective: getProposalCustomerPerspective(project, review, language),
    confidence: getProposalConfidence(review, strengths, language),
    readiness: review,
  };
}

function buildProposalCoachAnswer(context, language) {
  const coach = evaluateProposalCoach(context, language);

  if (coach.homeownerView) {
    return [
      t("assistantProposalStatusSection", language),
      coach.summary,
      "",
      t("assistantProposalCustomerPerspectiveSection", language),
      coach.customerPerspective,
    ].join("\n");
  }

  const strengths = coach.strengths.length > 0
    ? coach.strengths.map((item) => `• ${item}`).join("\n")
    : `• ${t("assistantFieldNotProvidedYet", language)}`;
  const opportunities = coach.opportunities.length > 0
    ? coach.opportunities.map((item) => `• ${item}`).join("\n")
    : `• ${t("assistantProposalOpportunityFinalReview", language)}`;

  return [
    t("assistantProposalCoachSummarySection", language),
    coach.summary,
    "",
    t("assistantProposalCoachStrengthsSection", language),
    strengths,
    "",
    t("assistantProposalCoachOpportunitiesSection", language),
    opportunities,
    "",
    t("assistantProposalCustomerPerspectiveSection", language),
    coach.customerPerspective,
    "",
    t("assistantProposalCoachConfidenceSection", language),
    coach.confidence,
  ].join("\n");
}

function getAvailableDocuments(project = {}, language = "en") {
  const documents = [];
  if (project.hasEvaluation) documents.push(t("assistantProjectBriefDocumentEvaluation", language));
  if (project.hasQuote || project.quoteId) documents.push(t("assistantProjectBriefDocumentQuote", language));
  if (project.hasInvoice) documents.push(t("assistantProjectBriefDocumentInvoice", language));
  if (project.hasReceipt) documents.push(t("assistantProjectBriefDocumentReceipt", language));
  if (project.hasCompletion) documents.push(t("assistantProjectBriefDocumentCompletion", language));
  if (project.hasChangeOrder) documents.push(t("assistantProjectBriefDocumentChangeOrder", language));
  if (project.hasPhotos) documents.push(t("assistantProjectBriefDocumentPhotos", language));
  if (isProvided(project.documents)) documents.push(project.documents);
  return Array.from(new Set(documents));
}

function getImportantNotes(project = {}, role, language = "en") {
  const notes = [
    project.customerNotes,
    project.scheduleNotes,
    project.accessNotes,
    project.emergencyNotes,
    project.warrantyNotes,
  ].filter(isProvided);

  if (role === "business" && isProvided(project.internalNotes)) notes.push(project.internalNotes);
  return notes.length > 0 ? notes : [t("assistantFieldNotProvidedYet", language)];
}

function getProjectBriefMissingItems(context = {}, language = "en") {
  const { project, stage } = context;
  const missing = [];

  if (!project) return [t("assistantFieldMissing_project", language)];
  if (["evaluation", "review"].includes(stage) && !project.hasPhotos) {
    missing.push(t("assistantProjectBriefMissingPhotos", language));
  }
  if (["evaluation", "quote"].includes(stage) && !isProvided(project.findings) && !isProvided(project.workObserved)) {
    missing.push(t("assistantProjectBriefMissingFindings", language));
  }
  if (stage === "quote" && !project.hasQuote) missing.push(t("assistantProjectBriefMissingProposal", language));
  if (stage === "activeWork" && project.depositRequired && !hasDeposit(project)) {
    missing.push(t("assistantProjectBriefMissingDeposit", language));
  }
  if (stage === "completion" && !project.hasCompletion) {
    missing.push(t("assistantProjectBriefMissingCompletion", language));
  }

  return missing.length > 0 ? missing : [t("assistantFieldNotProvidedYet", language)];
}

function getProjectBriefFocus(context = {}, language = "en") {
  const { stage } = context;
  if (stage === "evaluation" || stage === "schedule") return t("assistantProjectBriefFocusEvaluation", language);
  if (stage === "quote") return t("assistantProjectBriefFocusProposal", language);
  if (stage === "activeWork") return t("assistantProjectBriefFocusWork", language);
  if (stage === "completion") return t("assistantProjectBriefFocusClosure", language);
  return t("assistantProjectBriefFocusReview", language);
}

function getProjectBriefNextAction(context = {}, language = "en") {
  const { stage, project } = context;
  if (!project) return t("assistantFieldNextSelectProject", language);
  if (stage === "evaluation") return t("assistantProjectBriefNextStartEvaluation", language);
  if (stage === "quote" && !project.hasQuote) return t("assistantProjectBriefNextCreateProposal", language);
  if (stage === "quote") return t("assistantProjectBriefNextSendProposal", language);
  if (stage === "schedule") return t("assistantProjectBriefNextConfirmSchedule", language);
  if (stage === "activeWork" && project.depositRequired && !hasDeposit(project)) {
    return t("assistantProjectBriefNextCollectDeposit", language);
  }
  if (stage === "activeWork") return t("assistantProjectBriefNextStartWork", language);
  if (stage === "completion") return t("assistantProjectBriefNextReviewClosure", language);
  return getNextActionText(context, language);
}

export function buildProjectBrief(context = {}, language = "en") {
  const { project, role, stage } = context;

  if (context.page !== "conversationThread" || !project) {
    return {
      supported: false,
      homeownerView: false,
      sections: {
        status: t("assistantProjectBriefUnsupportedContext", language),
      },
    };
  }

  const documents = getAvailableDocuments(project, language);
  const stageLabel = t(`assistantFieldStage_${stage}`, language);

  if (role !== "business") {
    return {
      supported: true,
      homeownerView: true,
      sections: {
        status: stageLabel,
        latestUpdate: provided(firstValue(project.status, project.details), language),
        nextStep: getProjectBriefNextAction(context, language),
        documents: documents.length > 0 ? documents : [t("assistantFieldNotProvidedYet", language)],
      },
    };
  }

  return {
    supported: true,
    homeownerView: false,
    sections: {
      customer: [
        `${t("assistantProjectBriefCustomerName", language)}: ${provided(project.customerName, language)}`,
        `${t("assistantProjectBriefProjectTitle", language)}: ${provided(project.title, language)}`,
        `${t("assistantProjectBriefServiceCategory", language)}: ${provided(project.serviceCategory, language)}`,
        `${t("assistantProjectBriefLocation", language)}: ${provided(project.location, language)}`,
      ],
      currentStage: stageLabel,
      customerRequest: provided(project.details, language),
      findings: provided(firstValue(project.findings, project.workObserved), language),
      workPlanned: provided(firstValue(project.recommendedSolution, project.materials, project.lineItems), language),
      todaysFocus: getProjectBriefFocus(context, language),
      importantNotes: getImportantNotes(project, role, language),
      documents: documents.length > 0 ? documents : [t("assistantFieldNotProvidedYet", language)],
      missingItems: getProjectBriefMissingItems(context, language),
      nextAction: getProjectBriefNextAction(context, language),
    },
  };
}

function buildProjectBriefAnswer(context, language) {
  const brief = buildProjectBrief(context, language);

  if (!brief.supported) {
    return brief.sections.status;
  }

  if (brief.homeownerView) {
    return [
      t("assistantProjectBriefProjectStatusSection", language),
      brief.sections.status,
      "",
      t("assistantProjectBriefLatestUpdateSection", language),
      brief.sections.latestUpdate,
      "",
      t("assistantProjectBriefNextStepSection", language),
      brief.sections.nextStep,
      "",
      t("assistantProjectBriefAvailableDocumentsSection", language),
      brief.sections.documents.map((item) => `• ${item}`).join("\n"),
    ].join("\n");
  }

  return [
    t("assistantProjectBriefCustomerSection", language),
    brief.sections.customer.join("\n"),
    "",
    t("assistantProjectBriefCurrentStageSection", language),
    brief.sections.currentStage,
    "",
    t("assistantProjectBriefCustomerRequestSection", language),
    brief.sections.customerRequest,
    "",
    t("assistantProjectBriefFindingsSection", language),
    brief.sections.findings === t("assistantFieldNotProvidedYet", language)
      ? t("assistantProjectBriefNoFindings", language)
      : brief.sections.findings,
    "",
    t("assistantProjectBriefWorkPlannedSection", language),
    brief.sections.workPlanned,
    "",
    t("assistantProjectBriefTodaysFocusSection", language),
    brief.sections.todaysFocus,
    "",
    t("assistantProjectBriefImportantNotesSection", language),
    brief.sections.importantNotes.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantProjectBriefAvailableDocumentsSection", language),
    brief.sections.documents.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantProjectBriefMissingItemsSection", language),
    brief.sections.missingItems.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantProjectBriefNextRecommendedActionSection", language),
    brief.sections.nextAction,
  ].join("\n");
}

function getWatchGoodItems(project = {}, language = "en") {
  const items = [];
  if (project.hasPhotos) items.push(t("assistantWatchGoodPhotos", language));
  if (isProvided(project.findings) || isProvided(project.workObserved)) items.push(t("assistantWatchGoodFindings", language));
  if (hasLineItems(project)) items.push(t("assistantWatchGoodLineItems", language));
  if (hasDeposit(project) || project.paymentRecorded) items.push(t("assistantWatchGoodDeposit", language));
  if (project.hasCompletion) items.push(t("assistantWatchGoodCompletion", language));
  if (project.approvalRecorded) items.push(t("assistantWatchGoodApproval", language));
  return items.length > 0 ? items : [t("assistantFieldNotProvidedYet", language)];
}

function getWatchChecks(context = {}, language = "en") {
  const { project, stage } = context;
  const checks = [];

  if (!project) return [t("assistantFieldMissing_project", language)];

  if (["evaluation", "review"].includes(stage)) {
    if (!project.hasPhotos) checks.push(t("assistantWatchCheckNoPhotos", language));
    if (!isProvided(project.findings) && !isProvided(project.workObserved)) {
      checks.push(t("assistantWatchCheckMissingFindings", language));
    }
  }

  if (stage === "quote") {
    if (!hasLineItems(project)) checks.push(t("assistantWatchCheckProposalLineItems", language));
    if (!project.hasPhotos) checks.push(t("assistantWatchCheckProposalPhotos", language));
    if (!project.approvalRecorded && /approved|accepted/i.test(String(project.status || ""))) {
      checks.push(t("assistantWatchCheckApprovalMissing", language));
    }
  }

  if (stage === "activeWork") {
    if (!project.approvalRecorded) checks.push(t("assistantWatchCheckApprovalMissing", language));
    if (project.depositRequired && !project.paymentRecorded && !hasDeposit(project)) {
      checks.push(t("assistantWatchCheckPaymentMissing", language));
    }
  }

  if (stage === "completion") {
    if (!project.hasCompletion) checks.push(t("assistantWatchCheckCompletionNotes", language));
    if (!project.hasPhotos) checks.push(t("assistantWatchCheckCompletionPhotos", language));
    if (!project.customerConfirmed) checks.push(t("assistantWatchCheckClosurePending", language));
  }

  return checks.length > 0 ? checks : [t("assistantWatchCheckNothingGrounded", language)];
}

function getWatchRisks(context = {}, checks = [], language = "en") {
  const { project, stage } = context;
  const risks = [];

  if (!project) return [t("assistantWatchRiskOpenProject", language)];
  if (checks.includes(t("assistantWatchCheckProposalPhotos", language))) {
    risks.push(t("assistantWatchRiskProposalPhotos", language));
  }
  if (checks.includes(t("assistantWatchCheckApprovalMissing", language))) {
    risks.push(t("assistantWatchRiskApproval", language));
  }
  if (checks.includes(t("assistantWatchCheckPaymentMissing", language))) {
    risks.push(t("assistantWatchRiskPayment", language));
  }
  if (stage === "completion" && checks.includes(t("assistantWatchCheckClosurePending", language))) {
    risks.push(t("assistantWatchRiskClosure", language));
  }

  return risks.length > 0 ? risks : [t("assistantWatchRiskNoneGrounded", language)];
}

function getWatchRecommendedNext(context = {}, checks = [], language = "en") {
  const { stage, project } = context;
  if (!project) return t("assistantFieldNextSelectProject", language);
  if (checks.includes(t("assistantWatchCheckNoPhotos", language))) return t("assistantWatchNextAddPhotos", language);
  if (checks.includes(t("assistantWatchCheckMissingFindings", language))) return t("assistantWatchNextSaveFindings", language);
  if (checks.includes(t("assistantWatchCheckProposalLineItems", language))) return t("assistantWatchNextAddLineItems", language);
  if (checks.includes(t("assistantWatchCheckApprovalMissing", language))) return t("assistantWatchNextRecordApproval", language);
  if (checks.includes(t("assistantWatchCheckPaymentMissing", language))) return t("assistantWatchNextConfirmPayment", language);
  if (checks.includes(t("assistantWatchCheckCompletionNotes", language))) return t("assistantWatchNextDocumentCompletion", language);
  if (checks.includes(t("assistantWatchCheckClosurePending", language))) return t("assistantWatchNextReviewClosure", language);
  if (stage === "activeWork") return t("assistantWatchNextContinueWork", language);
  return getNextActionText(context, language);
}

export function evaluateWatchMyBack(context = {}, language = "en") {
  const { project, role } = context;

  if (!project) {
    return {
      supported: false,
      homeownerView: false,
      goodItems: [],
      checks: [t("assistantWatchUnsupportedContext", language)],
      risks: [t("assistantWatchRiskOpenProject", language)],
      nextAction: t("assistantFieldNextSelectProject", language),
    };
  }

  if (role !== "business") {
    return {
      supported: true,
      homeownerView: true,
      status: t(`assistantFieldStage_${context.stage}`, language),
      nextStep: getProjectBriefNextAction(context, language),
      waitingOnProfessional: getProjectBriefMissingItems(context, language),
    };
  }

  const checks = getWatchChecks(context, language);
  return {
    supported: true,
    homeownerView: false,
    goodItems: getWatchGoodItems(project, language),
    checks,
    risks: getWatchRisks(context, checks, language),
    nextAction: getWatchRecommendedNext(context, checks, language),
  };
}

function buildWatchMyBackAnswer(context, language) {
  const watch = evaluateWatchMyBack(context, language);

  if (watch.homeownerView) {
    return [
      t("assistantProjectBriefProjectStatusSection", language),
      watch.status,
      "",
      t("assistantWatchHomeownerWhatsNextSection", language),
      watch.nextStep,
      "",
      t("assistantWatchHomeownerWaitingSection", language),
      watch.waitingOnProfessional.map((item) => `• ${item}`).join("\n"),
    ].join("\n");
  }

  return [
    t("assistantWatchGoodSection", language),
    watch.goodItems.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantWatchCheckSection", language),
    watch.checks.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantWatchRiskSection", language),
    watch.risks.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantWatchNextSection", language),
    watch.nextAction,
  ].join("\n");
}

function isBusinessIntelligenceContext(context = {}) {
  return context.role === "business" && ["businessDashboard", "contractorDashboard", "workCenter"].includes(context.page);
}

function relationshipList(value, emptyKey, language) {
  const items = listValues(value);
  return items.length > 0 ? items : [t(emptyKey, language)];
}

function getRelationshipHistory(project = {}, language = "en") {
  const history = listValues(project.projectHistory);
  if (project.hasQuote || project.quoteId) history.push(t("assistantRelationshipMemoryQuoteSent", language));
  if (project.hasCompletion) history.push(t("assistantRelationshipMemoryCompletionRecorded", language));
  if (isProvided(project.warrantyNotes)) history.push(t("assistantRelationshipMemoryWarrantyIssued", language));
  if (project.repeatCustomer) history.push(t("assistantRelationshipMemoryRepeatCustomer", language));
  return history.length > 0 ? Array.from(new Set(history)) : [t("assistantRelationshipMemoryNoHistory", language)];
}

function getRelationshipFollowUps(project = {}, language = "en") {
  const followUps = listValues(project.followUpNotes);
  if (isProvided(project.warrantyNotes) || /warranty/i.test(String(project.status || ""))) {
    followUps.push(t("assistantRelationshipMemoryWarrantyFollowUp", language));
  }
  if (project.repeatCustomer || isProvided(project.projectHistory)) {
    followUps.push(t("assistantRelationshipMemoryRepeatOpportunity", language));
  }
  return followUps.length > 0 ? Array.from(new Set(followUps)) : [t("assistantRelationshipMemoryNoFollowUp", language)];
}

export function buildRelationshipMemory(context = {}, language = "en") {
  const { project, role } = context;

  if (context.page !== "conversationThread" || !project) {
    return {
      supported: false,
      homeownerView: false,
      sections: {
        status: t("assistantRelationshipMemoryUnsupportedContext", language),
      },
    };
  }

  const documents = getAvailableDocuments(project, language);

  if (role !== "business") {
    return {
      supported: true,
      homeownerView: true,
      sections: {
        projectMemory: provided(firstValue(project.details, project.customerNotes, project.accessNotes), language),
        previousWork: relationshipList(project.projectHistory, "assistantRelationshipMemoryNoHistory", language),
        availableRecords: documents.length > 0 ? documents : [t("assistantFieldNotProvidedYet", language)],
      },
    };
  }

  return {
    supported: true,
    homeownerView: false,
    sections: {
      customerPreferences: relationshipList(
        project.customerPreferences,
        "assistantRelationshipMemoryNoPreferences",
        language
      ),
      propertyNotes: relationshipList(project.propertyNotes, "assistantRelationshipMemoryNoPropertyNotes", language),
      projectHistory: getRelationshipHistory(project, language),
      followUpOpportunities: getRelationshipFollowUps(project, language),
    },
  };
}

function buildRelationshipMemoryAnswer(context, language) {
  const memory = buildRelationshipMemory(context, language);

  if (!memory.supported) return memory.sections.status;

  if (memory.homeownerView) {
    return [
      t("assistantRelationshipMemoryProjectMemorySection", language),
      memory.sections.projectMemory,
      "",
      t("assistantRelationshipMemoryPreviousWorkSection", language),
      memory.sections.previousWork.map((item) => `• ${item}`).join("\n"),
      "",
      t("assistantRelationshipMemoryAvailableRecordsSection", language),
      memory.sections.availableRecords.map((item) => `• ${item}`).join("\n"),
    ].join("\n");
  }

  return [
    t("assistantRelationshipMemoryCustomerPreferencesSection", language),
    memory.sections.customerPreferences.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantRelationshipMemoryPropertyNotesSection", language),
    memory.sections.propertyNotes.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantRelationshipMemoryProjectHistorySection", language),
    memory.sections.projectHistory.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantRelationshipMemoryFollowUpSection", language),
    memory.sections.followUpOpportunities.map((item) => `• ${item}`).join("\n"),
  ].join("\n");
}

function readStorageArray(storage, keys = []) {
  for (const key of keys) {
    const value = safeJsonFromStorage(storage, key, null);
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
  }
  return [];
}

function normalizeBusinessRecord(record = {}) {
  const status = String(firstValue(record.status, record.workflowStatus, record.stage, record.invoiceStatus, record.proposalStatus)).toLowerCase();
  const serviceType = firstValue(record.serviceCategory, record.category, record.serviceType, record.specialty);
  return {
    ...record,
    status,
    serviceType,
    customerName: firstValue(record.customerName, record.homeownerName, record.clientName),
    hasPhotos:
      Number(record.photoCount || 0) > 0 ||
      (Array.isArray(record.photos) && record.photos.length > 0) ||
      (Array.isArray(record.imageUrls) && record.imageUrls.length > 0),
    hasInvoice: Boolean(record.invoiceId || record.invoice || record.hasInvoice),
    paid: Boolean(record.paid || record.paidAt || record.paymentRecorded || record.paymentStatus === "paid"),
    needsUpdate: Boolean(record.needsUpdate || record.stale || record.awaitingUpdate),
  };
}

function collectBusinessIntelligenceRecords(storage) {
  const records = readStorageArray(storage, [
    "meetroBusinessIntelligenceRecords",
    "businessIntelligenceRecords",
    "workCenterJobs",
    "contractorProjects",
    "activeWorkItems",
    "businessJobs",
    "completedProjects",
    "meetroCompletedProjects",
  ]);
  return records.map(normalizeBusinessRecord);
}

function countRecords(records, predicate) {
  return records.filter(predicate).length;
}

function getMostCommonValue(records, selector) {
  const counts = new Map();
  records.forEach((record) => {
    const value = selector(record);
    if (!isProvided(value)) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

export function buildBusinessIntelligence(context = {}, language = "en", storage = globalThis?.localStorage) {
  const safeStorage = storage || { getItem: () => "" };

  if (!isBusinessIntelligenceContext(context)) {
    return {
      supported: false,
      sections: {
        status: t("assistantBusinessIntelligenceUnsupportedContext", language),
      },
    };
  }

  const records = collectBusinessIntelligenceRecords(safeStorage);
  const insufficient = t("assistantBusinessIntelligenceInsufficientData", language);

  if (records.length === 0) {
    return {
      supported: true,
      insufficientData: true,
      sections: {
        activitySnapshot: [insufficient],
        patterns: [insufficient],
        opportunities: [insufficient],
        businessRisk: [insufficient],
        recommendedFocus: insufficient,
      },
    };
  }

  const activeProjects = countRecords(records, (record) => /active|in_progress|work_scheduled|on_the_way|arrived|started/.test(record.status));
  const pendingProposals = countRecords(records, (record) => /proposal|quote|waiting_approval|pending_approval|awaiting/i.test(record.status) && !/approved|accepted/.test(record.status));
  const completedJobs = countRecords(records, (record) => /completed|closed|history/.test(record.status));
  const openInvoices = countRecords(records, (record) => (record.hasInvoice || /invoice|unpaid|open/.test(record.status)) && !record.paid);
  const emergencyJobs = countRecords(records, (record) => record.emergency || record.type === "emergency" || /emergency/.test(record.status));
  const closurePending = countRecords(records, (record) => /closure|closeout/.test(record.status) && !/closed|history/.test(record.status));
  const missingPhotos = countRecords(records, (record) => !record.hasPhotos && /proposal|quote|evaluation/.test(record.status));
  const staleProjects = countRecords(records, (record) => record.needsUpdate);
  const serviceMode = getMostCommonValue(records, (record) => record.serviceType);
  const repeatCustomers = [...new Set(
    records
      .map((record) => record.customerName)
      .filter((name) => isProvided(name) && countRecords(records, (record) => record.customerName === name) > 1)
  )];
  const missingProposalItem = getMostCommonValue(
    records.flatMap((record) => listValues(record.missingProposalItems || record.missingItem)),
    (value) => value
  );

  const activitySnapshot = [
    activeProjects > 0 ? `${activeProjects} ${t("assistantBusinessIntelligenceActiveProjects", language)}` : "",
    pendingProposals > 0 ? `${pendingProposals} ${t("assistantBusinessIntelligencePendingProposals", language)}` : "",
    completedJobs > 0 ? `${completedJobs} ${t("assistantBusinessIntelligenceCompletedJobs", language)}` : "",
    openInvoices > 0 ? `${openInvoices} ${t("assistantBusinessIntelligenceOpenInvoices", language)}` : "",
    emergencyJobs > 0 ? `${emergencyJobs} ${t("assistantBusinessIntelligenceEmergencyJobs", language)}` : "",
  ].filter(Boolean);

  const patterns = [
    serviceMode ? `${t("assistantBusinessIntelligenceMostCommonService", language)}: ${serviceMode[0]}` : "",
    repeatCustomers.length > 0
      ? `${t("assistantBusinessIntelligenceRepeatCustomers", language)}: ${repeatCustomers.join(", ")}`
      : "",
    missingProposalItem
      ? `${t("assistantBusinessIntelligenceMissingProposalItem", language)}: ${missingProposalItem[0]}`
      : "",
  ].filter(Boolean);

  const opportunities = [
    pendingProposals > 0 ? t("assistantBusinessIntelligenceFollowUpPendingProposals", language) : "",
    repeatCustomers.length > 0 ? t("assistantBusinessIntelligenceContactRepeatCustomers", language) : "",
    missingPhotos > 0 ? t("assistantBusinessIntelligenceAddPhotos", language) : "",
    openInvoices > 0 ? t("assistantBusinessIntelligenceReviewUnpaidInvoices", language) : "",
  ].filter(Boolean);

  const businessRisk = [
    closurePending > 0 ? t("assistantBusinessIntelligenceRiskClosurePending", language) : "",
    openInvoices > 0 ? t("assistantBusinessIntelligenceRiskUnpaidInvoices", language) : "",
    pendingProposals > 0 ? t("assistantBusinessIntelligenceRiskProposalApproval", language) : "",
    staleProjects > 0 ? t("assistantBusinessIntelligenceRiskStaleProjects", language) : "",
  ].filter(Boolean);

  const recommendedFocus = openInvoices > 0
    ? t("assistantBusinessIntelligenceFocusUnpaidInvoices", language)
    : closurePending > 0
    ? t("assistantBusinessIntelligenceFocusCloseJobs", language)
    : pendingProposals > 0
    ? t("assistantBusinessIntelligenceFocusPendingProposals", language)
    : missingPhotos > 0
    ? t("assistantBusinessIntelligenceFocusDocumentation", language)
    : t("assistantBusinessIntelligenceFocusReviewActive", language);

  return {
    supported: true,
    insufficientData: false,
    sections: {
      activitySnapshot: activitySnapshot.length > 0 ? activitySnapshot : [insufficient],
      patterns: patterns.length > 0 ? patterns : [insufficient],
      opportunities: opportunities.length > 0 ? opportunities : [insufficient],
      businessRisk: businessRisk.length > 0 ? businessRisk : [insufficient],
      recommendedFocus,
    },
  };
}

function buildBusinessIntelligenceAnswer(context, language, storage) {
  const intelligence = buildBusinessIntelligence(context, language, storage);

  if (!intelligence.supported) return intelligence.sections.status;

  return [
    t("assistantBusinessIntelligenceActivitySnapshotSection", language),
    intelligence.sections.activitySnapshot.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantBusinessIntelligencePatternsSection", language),
    intelligence.sections.patterns.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantBusinessIntelligenceOpportunitiesSection", language),
    intelligence.sections.opportunities.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantBusinessIntelligenceRiskSection", language),
    intelligence.sections.businessRisk.map((item) => `• ${item}`).join("\n"),
    "",
    t("assistantBusinessIntelligenceRecommendedFocusSection", language),
    intelligence.sections.recommendedFocus,
  ].join("\n");
}

function isFindingsAssistantContext(context = {}) {
  const { role, page, stage, project } = context;
  if (role !== "business") return false;
  if (!project) return false;
  if (["evaluationNotes", "quoteBuilder"].includes(page)) return true;
  if (["workCenter", "contractorDashboard"].includes(page) && ["evaluation", "quote", "review"].includes(stage)) {
    return true;
  }
  return Boolean(project.findings || project.rawFindings || project.hasEvaluation);
}

function resolveFindingLabel(finding) {
  if (typeof finding === "string") return finding.trim();
  if (!finding || typeof finding !== "object") return "";

  const definition = getFindingDefinition(
    finding.findingId || finding.findingType || finding.registryId || finding.id
  );
  return firstValue(
    finding.title,
    finding.name,
    finding.label,
    finding.finding,
    finding.description,
    finding.summary,
    definition?.title,
    definition?.description
  );
}

function resolveRecommendationLabel(recommendation) {
  if (typeof recommendation === "string") return recommendation.trim();
  if (!recommendation || typeof recommendation !== "object") return "";

  const definition = getServiceRecommendationDefinition(
    recommendation.serviceId ||
      recommendation.recommendationId ||
      recommendation.id ||
      recommendation.serviceType
  );
  return firstValue(
    recommendation.title,
    recommendation.name,
    recommendation.label,
    recommendation.description,
    definition?.title
  );
}

function collectFindingLabels(project = {}) {
  return asArray(project.rawFindings)
    .map(resolveFindingLabel)
    .filter(Boolean);
}

function collectRecommendationLabels(project = {}) {
  const explicitRecommendations = asArray(project.serviceRecommendations)
    .map(resolveRecommendationLabel)
    .filter(Boolean);
  const findingRecommendations = asArray(project.rawFindings)
    .flatMap((finding) => {
      if (typeof finding === "string") return [];
      const definition = getFindingDefinition(
        finding?.findingId || finding?.findingType || finding?.registryId || finding?.id
      );
      return definition?.recommendedServices || finding?.recommendedServices || [];
    })
    .map((serviceId) => resolveRecommendationLabel({ id: serviceId }))
    .filter(Boolean);

  return Array.from(new Set([...explicitRecommendations, ...findingRecommendations]));
}

export function evaluateFindingsReadiness(context = {}, language = "en") {
  const { role, page, project } = context;
  const supported = isFindingsAssistantContext(context);

  if (role !== "business") {
    return {
      supported: false,
      ready: false,
      findings: [],
      recommendations: [],
      missing: [t("assistantFindingsProfessionalOnly", language)],
    };
  }

  if (!supported || !["evaluationNotes", "quoteBuilder", "workCenter", "contractorDashboard"].includes(page)) {
    return {
      supported: false,
      ready: false,
      findings: [],
      recommendations: [],
      missing: [t("assistantFindingsUnsupportedContext", language)],
    };
  }

  const findings = collectFindingLabels(project);
  const recommendations = collectRecommendationLabels(project);
  const missing = [];

  if (findings.length === 0 && !isProvided(project?.findings) && !isProvided(project?.workObserved)) {
    missing.push(t("assistantWorkflowMissingFindings", language));
  }
  if (!isProvided(project?.measurements)) missing.push(t("assistantWorkflowMissingMeasurements", language));
  if (!project?.hasPhotos) missing.push(t("assistantFieldMissing_photos", language));

  return {
    supported: true,
    ready: missing.length === 0,
    findings,
    recommendations,
    missing,
  };
}

function buildFindingsAssistantAnswer(context, language) {
  const readiness = evaluateFindingsReadiness(context, language);
  const project = context.project || {};
  const notProvided = t("assistantFieldNotProvidedYet", language);

  if (!readiness.supported) {
    return readiness.missing[0] || t("assistantFindingsUnsupportedContext", language);
  }

  const findingsValue = readiness.findings.length > 0
    ? readiness.findings.join(", ")
    : provided(firstValue(project.findings, project.workObserved), language);
  const missingValue = readiness.missing.length > 0
    ? readiness.missing.join(", ")
    : notProvided;
  const recommendationValue = readiness.recommendations.length > 0
    ? readiness.recommendations.join(", ")
    : readiness.ready
    ? t("assistantFindingsNextPrepareProposal", language)
    : t("assistantFindingsNextCompleteDocumentation", language);
  const readinessValue = readiness.ready
    ? t("assistantFindingsProposalReady", language)
    : t("assistantFindingsProposalNotReady", language);

  if (findingsValue === notProvided) {
    return [
      `${t("assistantFindingsSummarySection", language)}: ${t("assistantFindingsNoneRecorded", language)}`,
      `${t("assistantFindingsMissingDocumentationSection", language)}: ${missingValue}.`,
      `${t("assistantFindingsRecommendedNextStepSection", language)}: ${t("assistantFindingsNextCompleteDocumentation", language)}.`,
      `${t("assistantFindingsProposalReadinessSection", language)}: ${readinessValue}.`,
    ].join("\n");
  }

  return [
    `${t("assistantFindingsSummarySection", language)}: ${findingsValue}.`,
    `${t("assistantFindingsMissingDocumentationSection", language)}: ${missingValue}.`,
    `${t("assistantFindingsRecommendedNextStepSection", language)}: ${recommendationValue}.`,
    `${t("assistantFindingsProposalReadinessSection", language)}: ${readinessValue}.`,
  ].join("\n");
}

function buildWorkflowCoachAnswer(context, language) {
  const evaluation = evaluateFieldWorkflow(context, language);
  const missingText = evaluation.blockingItems.length > 0
    ? evaluation.blockingItems.join(", ")
    : t("assistantFieldNotProvidedYet", language);

  if (evaluation.alertLevel === "green") {
    return `${t("assistantWorkflowReadySentence", language)} ${t("assistantFieldStagePrefix", language)} ${evaluation.currentStage}. ${t("assistantFieldNextPrefix", language)} ${evaluation.nextRecommendedAction}.`;
  }

  if (evaluation.alertLevel === "red") {
    return `${t("assistantWorkflowBlockedSentence", language)} ${t("assistantFieldMissingPrefix", language)} ${missingText}. ${t("assistantFieldNextPrefix", language)} ${evaluation.nextRecommendedAction}.`;
  }

  return `${t("assistantWorkflowAttentionSentence", language)} ${t("assistantFieldMissingPrefix", language)} ${missingText}. ${t("assistantFieldNextPrefix", language)} ${evaluation.nextRecommendedAction}.`;
}

function buildReadAloudSummary(context, language) {
  const { project, stage, missing = [] } = context;
  const projectName = provided(
    firstValue(project?.title, project?.customerName, project?.professionalName),
    language
  );
  const stageLabel = t(`assistantFieldStage_${stage}`, language);
  const missingValue = missing.length > 0
    ? missing.map((item) => t(`assistantFieldMissing_${item}`, language)).join(", ")
    : t("assistantFieldNotProvidedYet", language);
  const nextAction = getNextActionText(context, language);

  return [
    `${t("assistantFieldSummaryProjectStage", language)}: ${projectName} - ${stageLabel}.`,
    `${t("assistantFieldMissingDetailsSection", language)}: ${missingValue}.`,
    `${t("assistantFieldSuggestedNextActionSection", language)}: ${nextAction}.`,
  ].join(" ");
}

function isDocumentationContext(context) {
  return ["evaluation", "activeWork", "completion"].includes(context.stage);
}

function provided(value, language) {
  const text = String(value || "").trim();
  return text || t("assistantFieldNotProvidedYet", language);
}

function buildDocumentationDraft(context, language) {
  const { role, project, missing = [] } = context;
  const homeowner = role !== "business";
  const title = homeowner
    ? t("assistantFieldProjectSummaryDraft", language)
    : t("assistantFieldDocumentationDraft", language);
  const observedLabel = homeowner
    ? t("assistantFieldProjectSummarySection", language)
    : t("assistantFieldWorkObservedSection", language);
  const observedValue = homeowner
    ? provided(firstValue(project?.details, project?.workObserved), language)
    : provided(firstValue(project?.workObserved, project?.details), language);
  const photoValue = project?.hasPhotos || project?.documents
    ? firstValue(
        project?.documents,
        project?.hasPhotos ? t("assistantFieldPhotosAttached", language) : ""
      )
    : t("assistantFieldNotProvidedYet", language);
  const missingValue = missing.length > 0
    ? missing.map((item) => t(`assistantFieldMissing_${item}`, language)).join(", ")
    : t("assistantFieldNotProvidedYet", language);

  return [
    title,
    `${observedLabel}: ${observedValue}`,
    `${t("assistantFieldPhotosNeededSection", language)}: ${photoValue}`,
    `${t("assistantFieldMissingDetailsSection", language)}: ${missingValue}`,
    `${t("assistantFieldSuggestedNextActionSection", language)}: ${getNextActionText(context, language)}`,
  ].join("\n");
}

function buildFieldAnswer(context, language) {
  const { role, page, project, stage, missing = [] } = context;
  const projectName = project?.title || project?.customerName || project?.professionalName || "";
  const stageLabel = t(`assistantFieldStage_${stage}`, language);
  const roleLabel = role === "business"
    ? t("assistantFieldRoleProfessional", language)
    : t("assistantFieldRoleHomeowner", language);

  if (!project && ["quoteBuilder", "completionSheet", "conversationThread"].includes(page)) {
    return t("assistantFieldNoProjectSelected", language);
  }

  const parts = [
    `${t("assistantFieldWherePrefix", language)} ${roleLabel}${projectName ? ` - ${projectName}` : ""}.`,
    `${t("assistantFieldStagePrefix", language)} ${stageLabel}.`,
    `${t("assistantFieldNextPrefix", language)} ${getNextActionText(context, language)}.`,
  ];

  if (missing.length > 0) {
    parts.push(
      `${t("assistantFieldMissingPrefix", language)} ${missing
        .map((item) => t(`assistantFieldMissing_${item}`, language))
        .join(", ")}.`
    );
  } else {
    parts.push(t("assistantFieldNothingMissing", language));
  }

  parts.push(`${t("assistantFieldPreparePrefix", language)} ${getPreparationText(context, language)}.`);

  return parts.join(" ");
}

function getNextActionText(context, language) {
  const { role, page, stage, missing = [] } = context;

  if (missing.includes("project")) return t("assistantFieldNextSelectProject", language);
  if (role === "business" && missing.includes("evaluation")) {
    return t("assistantFieldNextRecordEvaluation", language);
  }
  if (page === "home") return t("assistantFieldNextReviewHome", language);
  if (stage === "quote") return t("assistantFieldNextPrepareQuote", language);
  if (stage === "activeWork") return t("assistantFieldNextUpdateWorkStatus", language);
  if (stage === "completion") return t("assistantFieldNextReviewCompletion", language);
  if (stage === "schedule") return t("assistantFieldNextConfirmSchedule", language);
  if (page === "messagesInbox" || page === "conversationThread") {
    return t("assistantFieldNextContinueConversation", language);
  }

  return role === "business"
    ? t("assistantFieldNextOpenWorkCenter", language)
    : t("assistantFieldNextCheckProjects", language);
}

function getPreparationText(context, language) {
  const { role, stage } = context;

  if (stage === "quote") return t("assistantFieldPrepareQuote", language);
  if (stage === "activeWork") return t("assistantFieldPrepareActiveWork", language);
  if (stage === "completion") return t("assistantFieldPrepareCompletion", language);
  if (stage === "schedule") return t("assistantFieldPrepareSchedule", language);

  return role === "business"
    ? t("assistantFieldPrepareProfessionalDefault", language)
    : t("assistantFieldPrepareHomeownerDefault", language);
}

function dedupeActions(actions) {
  const seen = new Set();
  return actions.filter((action) => {
    const key = `${action.target || ""}:${action.label || ""}:${action.workCenterSection || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
