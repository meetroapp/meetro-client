import API_URL from "../api.js";
import { isProfessionalUser } from "./session.js";
import { normalizeEvaluationFindingsPayload } from "./findingsEngineRegistry.js";

const QA_WORKFLOW_SOURCE = "qa_backend_workflow";

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readArray(key) {
  const value = parseJson(localStorage.getItem(key), []);
  return Array.isArray(value) ? value : [];
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return parseJson(localStorage.getItem("user"), {});
}

function hasProfessionalSession() {
  if (typeof localStorage === "undefined") return false;
  if (!localStorage.getItem("token")) return false;
  if (localStorage.getItem("isProfessional") === "true") return true;
  if (localStorage.getItem("accountType") === "professional") return true;
  return isProfessionalUser(getCurrentUser());
}

function normalizeResponse(data) {
  if (!data || !Array.isArray(data.customers)) return null;

  const customers = data.customers
    .map((customer) => ({
      ...customer,
      activeWorkflow: customer?.activeWorkflow || customer?.active || null,
      closedHistory: customer?.closedHistory || customer?.history || null,
    }))
    .filter(
      (customer) =>
        customer &&
        customer.activeWorkflow &&
        (customer.customerName || customer.activeWorkflow.customerName)
    );

  return customers.length > 0 ? { ...data, customers } : null;
}

export async function fetchQaWorkflowRecords() {
  if (!hasProfessionalSession()) return null;

  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`${API_URL}/qa/workflows`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 403 || response.status === 404) return null;
    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    return normalizeResponse(data);
  } catch {
    return null;
  }
}

function slugify(value) {
  return String(value || "customer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "customer";
}

function customerNameFor(customer, workflow) {
  return (
    customer.customerName ||
    workflow.customerName ||
    workflow.customer?.name ||
    "Customer"
  );
}

function customerAddressFor(customer, workflow) {
  return (
    workflow.address ||
    workflow.customerAddress ||
    customer.address ||
    workflow.customer?.address ||
    ""
  );
}

function workflowIds(customer, workflow, suffix = "active") {
  const nameSlug = slugify(customerNameFor(customer, workflow));
  const ids = workflow.ids || {};

  return {
    customerId: ids.customerId || workflow.customerId || customer.customerId || `qa-${nameSlug}-customer`,
    conversationId:
      ids.conversationId ||
      workflow.conversationId ||
      customer.conversationId ||
      `qa-${nameSlug}-${suffix}-conversation`,
    jobId:
      ids.jobId ||
      workflow.jobId ||
      workflow.requestId ||
      `qa-${nameSlug}-${suffix}-job`,
    quoteId:
      ids.quoteId ||
      workflow.quoteId ||
      workflow.proposal?.id ||
      `qa-${nameSlug}-${suffix}-quote`,
    scheduleId:
      ids.scheduleId ||
      workflow.scheduleId ||
      workflow.scheduleVisit?.id ||
      workflow.workAppointment?.id ||
      `qa-${nameSlug}-${suffix}-schedule`,
    receiptId:
      ids.receiptId ||
      workflow.receiptId ||
      workflow.receipt?.id ||
      `qa-${nameSlug}-${suffix}-receipt`,
    historyId:
      ids.historyId ||
      workflow.historyId ||
      `qa-${nameSlug}-${suffix}-history`,
  };
}

function buildTimeline(workflow) {
  const timeline = workflow.timeline || workflow.timelineEvents || workflow.jobTimelineEvents;
  return Array.isArray(timeline) ? timeline : [];
}

function evaluationFindingNotes(evaluation = {}, workflow = {}) {
  if (typeof evaluation.findingsNotes === "string") return evaluation.findingsNotes;
  if (typeof evaluation.findingsText === "string") return evaluation.findingsText;
  if (typeof evaluation.findings === "string") return evaluation.findings;
  if (typeof workflow.evaluationFindings === "string") return workflow.evaluationFindings;
  return "";
}

function buildStoredEvaluation(evaluation = {}, workflow = {}, ids = {}) {
  const findingsPayload = normalizeEvaluationFindingsPayload({
    evaluationId: evaluation.id || ids.scheduleId || "",
    customerId: ids.customerId || "",
    requestId: ids.jobId || "",
    findings: Array.isArray(evaluation.findings) ? evaluation.findings : [],
  });

  return {
    ...evaluation,
    findings: findingsPayload.findings,
    findingsNotes: evaluationFindingNotes(evaluation, workflow),
    serviceRecommendations: findingsPayload.serviceRecommendations,
    findingsNormalizationErrors: findingsPayload.errors,
  };
}

function buildSchedule(customer, workflow, suffix = "active") {
  const ids = workflowIds(customer, workflow, suffix);
  const schedule = workflow.scheduleVisit || workflow.schedule || workflow.workAppointment || {};
  const payment = workflow.payment || workflow.deposit || {};
  const evaluation = workflow.evaluation || {};
  const workAppointment = workflow.workAppointment || schedule;
	  const status = workflow.status || workflow.activeWork?.status || schedule.status || "work_scheduled";
	  const customerName = customerNameFor(customer, workflow);
	  const address = customerAddressFor(customer, workflow);
	  const storedEvaluation = buildStoredEvaluation(evaluation, workflow, ids);

  return {
    id: ids.scheduleId,
    scheduleId: ids.scheduleId,
    visitId: ids.scheduleId,
    requestId: ids.jobId,
    jobId: ids.jobId,
    quoteId: ids.quoteId,
    receiptId: ids.receiptId,
    customerId: ids.customerId,
    conversationId: ids.conversationId,
    projectConversationId: ids.conversationId,
    activeConversationId: ids.conversationId,
    customerName,
    homeownerName: customerName,
    customerAddress: address,
    address,
    location: address,
    title: workflow.service || workflow.title || "Service Visit",
    requestTitle: workflow.service || workflow.title || "Service Visit",
    projectTitle: workflow.service || workflow.title || "Service Visit",
    services: [workflow.service || workflow.title || "Service Visit"].filter(Boolean),
    appointmentType: workAppointment.appointmentType || schedule.appointmentType || "work",
    appointmentLabel: "Work Appointment",
    workflowSource: QA_WORKFLOW_SOURCE,
    source: QA_WORKFLOW_SOURCE,
    status,
    workStatus: workflow.activeWork?.status || status,
    jobStage: workflow.activeWork?.stage || workflow.stage || status,
    workflowStage: workflow.activeWork?.stage || workflow.stage || status,
    workflowStatus: status,
    customerConfirmationStatus: schedule.customerConfirmationStatus || "confirmed",
    confirmationStatus: schedule.confirmationStatus || "confirmed",
    date: workAppointment.date || schedule.date || "",
    time: workAppointment.time || schedule.time || "",
    notes: schedule.notes || workflow.notes || "",
	    evaluation: storedEvaluation,
    serviceType: evaluation.serviceType || workflow.serviceType || "",
    context: evaluation.context || workflow.context || "",
    evaluationTemplate:
      evaluation.evaluationTemplate || workflow.evaluationTemplate || null,
    templateRequirements:
      evaluation.templateRequirements || workflow.templateRequirements || [],
    evaluationServiceType: evaluation.serviceType || workflow.serviceType || "",
	    evaluationContext: evaluation.context || workflow.context || "",
	    evaluationNotes: evaluation.notes || workflow.evaluationNotes || "",
	    evaluationFindings: storedEvaluation.findingsNotes,
	    evaluationStructuredFindings: storedEvaluation.findings,
	    serviceRecommendations: storedEvaluation.serviceRecommendations,
	    evaluationItems: evaluation.workItems || workflow.workItems || [],
    workItems: evaluation.workItems || workflow.workItems || [],
    measurements: evaluation.measurements || workflow.measurements || [],
    photos: evaluation.photos || workflow.photos || [],
    paymentStatus: payment.status || workflow.paymentStatus || "",
    paymentAmount: payment.amount || workflow.paymentAmount || "",
    paymentReceivedAt: payment.receivedAt || workflow.paymentReceivedAt || "",
    receiptStatus: workflow.receipt?.status || workflow.receiptStatus || "",
    invoiceStatus: workflow.receipt?.status || workflow.invoiceStatus || "",
    completionNotes: workflow.completion?.notes || workflow.completionNotes || "",
    closureNotes: workflow.closure?.notes || workflow.closureNotes || "",
    jobTimelineEvents: buildTimeline(workflow),
    timelineEvents: buildTimeline(workflow),
    createdAt: workflow.createdAt || new Date().toISOString(),
    updatedAt: workflow.updatedAt || new Date().toISOString(),
  };
}

function buildQuote(customer, workflow, suffix = "active") {
  const ids = workflowIds(customer, workflow, suffix);
  const proposal = workflow.proposal || workflow.quote || {};
  const payment = workflow.payment || workflow.deposit || {};
	  const evaluation = workflow.evaluation || {};
	  const customerName = customerNameFor(customer, workflow);
	  const address = customerAddressFor(customer, workflow);
	  const total = proposal.total || proposal.quoteTotal || workflow.total || "";
	  const storedEvaluation = buildStoredEvaluation(evaluation, workflow, ids);

  return {
    id: ids.quoteId,
    quoteId: ids.quoteId,
    requestId: ids.jobId,
    jobId: ids.jobId,
    scheduleId: ids.scheduleId,
    customerId: ids.customerId,
    conversationId: ids.conversationId,
    projectConversationId: ids.conversationId,
    homeownerName: customerName,
    customerName,
    customer: customerName,
    projectTitle: workflow.service || workflow.title || "Service Visit",
    title: workflow.service || workflow.title || "Service Visit",
    location: address,
    address,
    source: QA_WORKFLOW_SOURCE,
    workflowSource: QA_WORKFLOW_SOURCE,
    status: proposal.status || "accepted",
    quoteStatus: proposal.status || "accepted",
    sentAt: proposal.sentAt || workflow.sentAt || "",
    acceptedAt: proposal.acceptedAt || workflow.acceptedAt || "",
    paymentStatus: payment.status || workflow.paymentStatus || "",
    paymentType: payment.type || "deposit",
    paymentAmount: payment.amount || workflow.paymentAmount || "",
    depositPaidAt: payment.receivedAt || workflow.paymentReceivedAt || "",
    laborAmount: proposal.laborAmount || "",
    materialsAmount: proposal.materialsAmount || "",
    totalAmount: total,
    quoteTotal: total,
    workItems: evaluation.workItems || workflow.workItems || [],
    serviceType: evaluation.serviceType || workflow.serviceType || "",
    context: evaluation.context || workflow.context || "",
    evaluationTemplate:
      evaluation.evaluationTemplate || workflow.evaluationTemplate || null,
	    templateRequirements:
	      evaluation.templateRequirements || workflow.templateRequirements || [],
	    evaluationNotes: evaluation.notes || workflow.evaluationNotes || "",
	    findings: storedEvaluation.findings,
	    findingsNotes: storedEvaluation.findingsNotes,
	    serviceRecommendations: storedEvaluation.serviceRecommendations,
	    measurements: evaluation.measurements || workflow.measurements || [],
    receiptId: ids.receiptId,
    receipt: workflow.receipt || null,
  };
}

function buildHistory(customer, workflow) {
  const ids = workflowIds(customer, workflow, "closed");
  const schedule = buildSchedule(customer, workflow, "closed");
	  const quote = buildQuote(customer, workflow, "closed");
	  const customerName = customerNameFor(customer, workflow);
	  const address = customerAddressFor(customer, workflow);
	  const storedEvaluation = buildStoredEvaluation(workflow.evaluation || {}, workflow, ids);

  return {
    id: ids.historyId,
    type: "closed_job",
    status: "closed",
    closureStatus: workflow.closure?.status || "closed",
    customerId: ids.customerId,
    customerName,
    customer: customerName,
    address,
    location: address,
    title: workflow.service || workflow.title || "Service Visit",
    jobTitle: workflow.service || workflow.title || "Service Visit",
    requestId: ids.jobId,
    jobId: ids.jobId,
    conversationId: ids.conversationId,
    scheduleId: ids.scheduleId,
    quoteId: ids.quoteId,
    receiptId: ids.receiptId,
    source: QA_WORKFLOW_SOURCE,
    workflowSource: QA_WORKFLOW_SOURCE,
    schedule,
    visitSchedule: schedule,
    quote,
    proposal: quote,
	    evaluation: storedEvaluation,
    serviceType: workflow.evaluation?.serviceType || workflow.serviceType || "",
    context: workflow.evaluation?.context || workflow.context || "",
    evaluationTemplate:
      workflow.evaluation?.evaluationTemplate ||
      workflow.evaluationTemplate ||
      null,
    templateRequirements:
      workflow.evaluation?.templateRequirements ||
      workflow.templateRequirements ||
      [],
	    evaluationNotes: workflow.evaluation?.notes || workflow.evaluationNotes || "",
	    findings: storedEvaluation.findings,
	    findingsNotes: storedEvaluation.findingsNotes,
	    serviceRecommendations: storedEvaluation.serviceRecommendations,
	    measurements: workflow.evaluation?.measurements || workflow.measurements || [],
    photos: workflow.evaluation?.photos || workflow.photos || [],
    payments: [workflow.payment].filter(Boolean),
    workAppointment: workflow.workAppointment || workflow.scheduleVisit || null,
    completionNotes: workflow.completion?.notes || workflow.completionNotes || "",
    receipt: workflow.receipt || null,
    closureNotes: workflow.closure?.notes || workflow.closureNotes || "",
    activeWork: {
      status: "closed",
      stage: "closed",
      customerName,
      conversationId: ids.conversationId,
    },
    readonly: true,
    readOnly: true,
    jobTimelineEvents: buildTimeline(workflow),
    timelineEvents: buildTimeline(workflow),
    closedAt: workflow.closedAt || workflow.closure?.closedAt || new Date().toISOString(),
    closeDate: workflow.closeDate || workflow.closure?.closedAt || new Date().toISOString(),
  };
}

function buildRegistryItem(customer, workflow, suffix = "active") {
  const ids = workflowIds(customer, workflow, suffix);
  const customerName = customerNameFor(customer, workflow);

  return {
    id: ids.conversationId,
    conversationId: ids.conversationId,
    customerId: ids.customerId,
    customerName,
    homeownerName: customerName,
    title: workflow.service || workflow.title || "Service Visit",
    projectTitle: workflow.service || workflow.title || "Service Visit",
    requestId: ids.jobId,
    quoteId: ids.quoteId,
    scheduleId: ids.scheduleId,
    receiptId: ids.receiptId,
    source: QA_WORKFLOW_SOURCE,
    workflowSource: QA_WORKFLOW_SOURCE,
  };
}

function buildMessages(customer, workflow, suffix = "active") {
  const ids = workflowIds(customer, workflow, suffix);
  const customerName = customerNameFor(customer, workflow);
  const timeline = buildTimeline(workflow);
  const createdAt = workflow.createdAt || new Date().toISOString();

  if (Array.isArray(workflow.messages) && workflow.messages.length > 0) {
    return workflow.messages.map((message, index) => ({
      ...message,
      id: message.id || `${ids.conversationId}-message-${index + 1}`,
      conversationId: ids.conversationId,
      customerId: ids.customerId,
      customerName,
      source: message.source || QA_WORKFLOW_SOURCE,
    }));
  }

  return [
    {
      id: `${ids.conversationId}-message-1`,
      conversationId: ids.conversationId,
      customerId: ids.customerId,
      customerName,
      sender: customerName,
      senderRole: "homeowner",
      text: `QA workflow conversation for ${customerName}.`,
      message: `QA workflow conversation for ${customerName}.`,
      createdAt: timeline[0]?.at || createdAt,
      source: QA_WORKFLOW_SOURCE,
    },
  ];
}

function upsertArray(key, incoming, getId) {
  if (!incoming.length) return;

  const incomingIds = new Set(incoming.map(getId).filter(Boolean).map(String));
  const existing = readArray(key).filter((item) => !incomingIds.has(String(getId(item) || "")));
  writeJson(key, [...incoming, ...existing]);
}

function mapQaWorkflows(data) {
  const schedules = [];
  const quotes = [];
  const histories = [];
  const registry = [];
  const conversations = [];
  const jobRecords = [];

	  data.customers.forEach((customer) => {
	    const activeWorkflow = customer.activeWorkflow;
	    const closedWorkflow = customer.closedHistory;
	    const activeIds = workflowIds(customer, activeWorkflow, "active");
	    const activeEvaluation = buildStoredEvaluation(
	      activeWorkflow.evaluation || {},
	      activeWorkflow,
	      activeIds
	    );

	    schedules.push(buildSchedule(customer, activeWorkflow, "active"));
	    quotes.push(buildQuote(customer, activeWorkflow, "active"));
	    registry.push(buildRegistryItem(customer, activeWorkflow, "active"));
	    conversations.push({
	      conversationId: activeIds.conversationId,
	      messages: buildMessages(customer, activeWorkflow, "active"),
	    });
	    jobRecords.push({
	      conversationId: activeIds.conversationId,
	      record: {
	        evaluation: activeEvaluation,
        serviceType:
          activeWorkflow.evaluation?.serviceType || activeWorkflow.serviceType || "",
        context: activeWorkflow.evaluation?.context || activeWorkflow.context || "",
        evaluationTemplate:
          activeWorkflow.evaluation?.evaluationTemplate ||
          activeWorkflow.evaluationTemplate ||
          null,
	        templateRequirements:
	          activeWorkflow.evaluation?.templateRequirements ||
	          activeWorkflow.templateRequirements ||
	          [],
	        findings: activeEvaluation.findings,
	        findingsNotes: activeEvaluation.findingsNotes,
	        serviceRecommendations: activeEvaluation.serviceRecommendations,
	        measurements: activeWorkflow.evaluation?.measurements || activeWorkflow.measurements || [],
        photos: activeWorkflow.evaluation?.photos || activeWorkflow.photos || [],
        completion: activeWorkflow.completion || null,
        receipt: activeWorkflow.receipt || null,
        timeline: buildTimeline(activeWorkflow),
        source: QA_WORKFLOW_SOURCE,
      },
    });

	    if (closedWorkflow) {
	      const closedIds = workflowIds(customer, closedWorkflow, "closed");
	      const closedEvaluation = buildStoredEvaluation(
	        closedWorkflow.evaluation || {},
	        closedWorkflow,
	        closedIds
	      );
	      histories.push(buildHistory(customer, closedWorkflow));
	      registry.push(buildRegistryItem(customer, closedWorkflow, "closed"));
	      conversations.push({
	        conversationId: closedIds.conversationId,
	        messages: buildMessages(customer, closedWorkflow, "closed"),
	      });
	      jobRecords.push({
	        conversationId: closedIds.conversationId,
	        record: {
	          evaluation: closedEvaluation,
          serviceType:
            closedWorkflow.evaluation?.serviceType || closedWorkflow.serviceType || "",
          context: closedWorkflow.evaluation?.context || closedWorkflow.context || "",
          evaluationTemplate:
            closedWorkflow.evaluation?.evaluationTemplate ||
            closedWorkflow.evaluationTemplate ||
            null,
	          templateRequirements:
	            closedWorkflow.evaluation?.templateRequirements ||
	            closedWorkflow.templateRequirements ||
	            [],
	          findings: closedEvaluation.findings,
	          findingsNotes: closedEvaluation.findingsNotes,
	          serviceRecommendations: closedEvaluation.serviceRecommendations,
	          measurements: closedWorkflow.evaluation?.measurements || closedWorkflow.measurements || [],
          photos: closedWorkflow.evaluation?.photos || closedWorkflow.photos || [],
          completion: closedWorkflow.completion || null,
          receipt: closedWorkflow.receipt || null,
          closure: closedWorkflow.closure || null,
          timeline: buildTimeline(closedWorkflow),
          readOnly: true,
          source: QA_WORKFLOW_SOURCE,
        },
      });
    }
  });

  return { schedules, quotes, histories, registry, conversations, jobRecords };
}

export function hydrateQaWorkflowRecords(data) {
  if (typeof localStorage === "undefined") return { hydrated: false, customers: [] };

  const normalized = normalizeResponse(data);
  if (!normalized) return { hydrated: false, customers: [] };

  const mapped = mapQaWorkflows(normalized);

  upsertArray("meetro_business_schedule", mapped.schedules, (item) => item.scheduleId || item.id);
  upsertArray("workCenterQuoteHistory", mapped.quotes, (item) => item.quoteId || item.id);
  upsertArray("meetroQuoteHistory", mapped.quotes, (item) => item.quoteId || item.id);
  upsertArray("quoteHistory", mapped.quotes, (item) => item.quoteId || item.id);
  upsertArray("completedProjects", mapped.histories, (item) => item.id || item.requestId);
  upsertArray("meetro_conversation_registry", mapped.registry, (item) => item.conversationId || item.id);

  mapped.conversations.forEach(({ conversationId, messages }) => {
    writeJson(`meetro_conversation_${conversationId}`, messages);
  });

  mapped.jobRecords.forEach(({ conversationId, record }) => {
    writeJson(`meetro_job_record_${conversationId}`, record);
  });

  const currentConversationId =
    localStorage.getItem("activeWorkConversationId") ||
    localStorage.getItem("activeConversationId") ||
    "";
  const qaConversationIds = new Set(
    mapped.schedules.map((schedule) => schedule.conversationId).filter(Boolean)
  );
  const activeSchedule =
    mapped.schedules.find(
      (schedule) => schedule.conversationId === currentConversationId
    ) || mapped.schedules[0];
  const shouldPrimeActiveWork =
    activeSchedule &&
    (!currentConversationId || qaConversationIds.has(currentConversationId));

  if (shouldPrimeActiveWork) {
    localStorage.setItem("activeWorkRequestId", activeSchedule.requestId || "");
    localStorage.setItem("activeWorkCustomer", activeSchedule.customerName || "");
    localStorage.setItem("activeWorkService", activeSchedule.title || "");
    localStorage.setItem("activeWorkLocation", activeSchedule.location || "");
    localStorage.setItem("activeWorkConversationId", activeSchedule.conversationId || "");
    localStorage.setItem("activeConversationId", activeSchedule.conversationId || "");
    localStorage.setItem("activeWorkStatus", activeSchedule.status || "work_scheduled");
    localStorage.setItem("activeWorkStage", activeSchedule.jobStage || "work_scheduled");
  }

  localStorage.setItem("activeJobsCount", String(mapped.schedules.length));
  localStorage.setItem("meetroQaWorkflowHydratedAt", new Date().toISOString());
  localStorage.setItem("meetroQaWorkflowHydrationSource", QA_WORKFLOW_SOURCE);

  return {
    hydrated: true,
    customers: normalized.customers.map((customer) =>
      customerNameFor(customer, customer.activeWorkflow)
    ),
  };
}
