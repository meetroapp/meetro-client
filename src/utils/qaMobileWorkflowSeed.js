import {
  CONTEXT_IDS,
  SERVICE_TYPE_IDS,
  resolveEvaluationTemplate,
} from "./evaluationTemplateRegistry.js";

const QA_TIMESTAMP = "2026-06-19T14:00:00.000Z";
export const QA_MOBILE_REFERENCE_STORY = Object.freeze({
  homeownerName: "Sarah Dommerich",
  professionalName: "William Molina",
  businessName: "William Handyman Services",
  address: "1225 Wales Dr, Fort Myers",
  service: "Replace 2 bifold doors, hang artwork, and hang chalkboard",
  serviceSummary:
    "Replace 2 bifold doors, hang artwork, and hang chalkboard safely.",
  materialsEstimate: 310,
  laborEstimate: 250,
  totalEstimate: 560,
});

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function createWorkItem(customerName, itemName, materialName, options = {}) {
  const prefix = customerName.toLowerCase();

  return {
    id: options.id || `qa-${prefix}-work-item`,
    title: itemName,
    notes: options.notes || `${customerName} evaluation notes only.`,
    safetyNotes: options.safetyNotes || `${customerName} access notes only.`,
    photos: [
      {
        id: options.photoId || `qa-${prefix}-photo`,
        name: options.photoName || `${prefix}-photo.jpg`,
        uploadedAt: QA_TIMESTAMP,
      },
    ],
    measurements:
      options.measurements || [
        {
          id: `qa-${prefix}-measurement`,
          label: `${customerName} measurement`,
          value: "24",
          unit: "inches",
        },
      ],
    materials:
      options.materials || [
        {
          id: `qa-${prefix}-material`,
          name: materialName,
          quantity: "1",
          unitPrice: "75",
        },
      ],
  };
}

export function createCustomerWorkflow({
  customerName,
  address,
  service,
  materialName,
  date,
  time,
  total,
  serviceType,
  context,
  professionalName = "William Molina",
  businessName = "William Handyman Services",
  workItemsConfig = null,
  materialsEstimate = null,
  laborEstimate = null,
  customerRequest = "",
}) {
  const prefix = customerName.toLowerCase();
  const conversationId = `qa-${prefix}-conversation`;
  const customerId = `qa-${prefix}-customer`;
  const requestId = `qa-${prefix}-job`;
  const scheduleId = `qa-${prefix}-work-schedule`;
  const quoteId = `qa-${prefix}-quote`;
  const historyConversationId = `qa-${prefix}-history-conversation`;
  const historyRequestId = `qa-${prefix}-history-job`;
  const historyScheduleId = `qa-${prefix}-history-schedule`;
  const historyQuoteId = `qa-${prefix}-history-quote`;
  const workItems = Array.isArray(workItemsConfig) && workItemsConfig.length
    ? workItemsConfig.map((item, index) =>
        createWorkItem(
          customerName,
          item.title,
          item.materialName || materialName,
          {
            id: item.id || `qa-${prefix}-work-item-${index + 1}`,
            notes: item.notes,
            safetyNotes: item.safetyNotes,
            photoId: item.photoId || `qa-${prefix}-photo-${index + 1}`,
            photoName: item.photoName || `${prefix}-photo-${index + 1}.jpg`,
            measurements: item.measurements,
            materials: item.materials,
          }
        )
      )
    : [createWorkItem(customerName, service, materialName)];
  const normalizedMaterialsEstimate =
    materialsEstimate ?? workItems.reduce(
      (sum, item) =>
        sum +
        (Array.isArray(item.materials)
          ? item.materials.reduce(
              (materialSum, material) =>
                materialSum +
                Number(material.quantity || 1) * Number(material.unitPrice || 0),
              0
            )
          : 0),
      0
    );
  const normalizedLaborEstimate = laborEstimate ?? total - normalizedMaterialsEstimate;
  const templateResolution = resolveEvaluationTemplate({ serviceType, context });
  const evaluationTemplate = templateResolution.found
    ? templateResolution.evaluationTemplate
    : null;
  const templateRequirements = templateResolution.found
    ? [...(templateResolution.template?.requirements || [])]
    : [];
  const evaluation = {
    id: `qa-${prefix}-evaluation`,
    evaluationId: `qa-${prefix}-evaluation`,
    type: "evaluation",
    source: "qa_mobile_seed",
    customerId,
    visitId: scheduleId,
    appointmentId: scheduleId,
    scheduleId,
    requestId,
    conversationId,
    serviceType,
    context,
    evaluationTemplate,
    evaluationTemplateMatched: templateResolution.found,
    templateRequirements,
    observations: [
      customerRequest || `${customerName} evaluation notes only.`,
      ...workItems.map((item) => item.notes).filter(Boolean),
    ],
    notes: customerRequest || `${customerName} evaluation notes only.`,
    visitNotes:
      customerRequest ||
      "Measured bifold door openings and reviewed artwork/chalkboard mounting locations.",
    measurements: workItems.flatMap((item) => item.measurements || []),
    findings: [],
    findingsNotes:
      "Bifold door openings need replacement doors and hardware. Artwork and chalkboard need safe wall anchors.",
    recommendations: [],
    serviceRecommendations: [],
    workItems,
    photos: workItems.flatMap((item) => item.photos || []),
    savedAt: QA_TIMESTAMP,
  };
  const timelineEvents = [
    "visit_scheduled",
    "evaluation_completed",
    "proposal_sent",
    "approved",
    "payment_received",
    "work_scheduled",
  ].map((stage) => ({
    id: `qa-${prefix}-${stage}`,
    stage,
    label: stage.replace(/_/g, " "),
    savedAt: QA_TIMESTAMP,
    source: "qa_mobile_seed",
  }));

  const schedule = {
    id: scheduleId,
    scheduleId,
    visitId: scheduleId,
    requestId,
    quoteId,
    conversationId,
    customerId,
    projectConversationId: conversationId,
    activeConversationId: conversationId,
    customerName,
    homeownerName: customerName,
    professionalName,
    businessName,
    customerAddress: address,
    address,
    location: address,
    title: service,
    requestTitle: service,
    projectTitle: service,
    description: customerRequest || service,
    project_description: customerRequest || service,
    customerRequest: customerRequest || service,
    services: [service],
    appointmentType: "work",
    appointmentLabel: "Work Appointment",
    workflowSource: "qa_mobile_seed",
    status: "work_scheduled",
    workStatus: "work_scheduled",
    jobStage: "work_scheduled",
    workflowStage: "work_scheduled",
    workflowStatus: "work_scheduled",
    customerConfirmationStatus: "confirmed",
    confirmationStatus: "confirmed",
    date,
    time,
    evaluation,
    serviceType,
    context,
    evaluationTemplate,
    evaluationTemplateMatched: templateResolution.found,
    templateRequirements,
    evaluationServiceType: serviceType,
    evaluationContext: context,
    evaluationNotes: evaluation.notes,
    evaluationFindings: evaluation.findingsNotes,
    evaluationStructuredFindings: evaluation.findings,
    serviceRecommendations: evaluation.serviceRecommendations,
    evaluationItems: workItems,
    workItems,
    evaluationPhotos: workItems.flatMap((item) => item.photos || []),
    paymentStatus: "deposit_received",
    paymentAmount: total / 2,
    paymentReceivedAt: QA_TIMESTAMP,
    receiptStatus: "",
    invoiceStatus: "",
    jobTimelineEvents: timelineEvents,
    timelineEvents,
    createdAt: QA_TIMESTAMP,
    updatedAt: QA_TIMESTAMP,
  };

  const quote = {
    id: quoteId,
    quoteId,
    requestId,
    scheduleId,
    conversationId,
    projectConversationId: conversationId,
    homeownerName: customerName,
    customerName,
    customer: customerName,
    professionalName,
    businessName,
    projectTitle: service,
    title: service,
    location: address,
    address,
    customerRequest: customerRequest || service,
    problemFound:
      "Bifold doors need replacement and wall-mounted items need secure anchoring.",
    recommendedSolution:
      "Replace 2 bifold doors, install needed hardware, hang artwork, and mount chalkboard safely.",
    source: "qa_mobile_seed",
    status: "accepted",
    quoteStatus: "accepted",
    sentAt: QA_TIMESTAMP,
    acceptedAt: QA_TIMESTAMP,
    paymentStatus: "deposit_received",
    paymentType: "deposit",
    paymentAmount: total / 2,
    paymentReceivedAt: QA_TIMESTAMP,
    depositPaidAt: QA_TIMESTAMP,
    laborAmount: normalizedLaborEstimate,
    materialsAmount: normalizedMaterialsEstimate,
    totalAmount: total,
    quoteTotal: total,
    lineItems: workItems.map((item) => ({
      id: `${item.id}-line`,
      description: item.title,
      quantity: 1,
      unitPrice:
        item.id.includes("bifold")
          ? 310
          : item.id.includes("artwork")
            ? 125
            : 125,
      amount:
        item.id.includes("bifold")
          ? 310
          : item.id.includes("artwork")
            ? 125
            : 125,
    })),
    workItems,
    serviceType,
    context,
    evaluationTemplate,
    templateRequirements,
    findings: evaluation.findings,
    findingsNotes: evaluation.findingsNotes,
    serviceRecommendations: evaluation.serviceRecommendations,
    evaluationNotes: evaluation.notes,
    createdAt: QA_TIMESTAMP,
    updatedAt: QA_TIMESTAMP,
  };

  const historySchedule = {
    ...schedule,
    id: historyScheduleId,
    scheduleId: historyScheduleId,
    visitId: historyScheduleId,
    requestId: historyRequestId,
    quoteId: historyQuoteId,
    conversationId: historyConversationId,
    projectConversationId: historyConversationId,
    activeConversationId: historyConversationId,
    title: `${service} history`,
    requestTitle: `${service} history`,
    projectTitle: `${service} history`,
    status: "closed",
    workStatus: "closed",
    jobStage: "closed",
    workflowStage: "closed",
    workflowStatus: "closed",
    closedAt: QA_TIMESTAMP,
    closeDate: QA_TIMESTAMP,
  };
  const historyQuote = {
    ...quote,
    id: historyQuoteId,
    quoteId: historyQuoteId,
    requestId: historyRequestId,
    scheduleId: historyScheduleId,
    conversationId: historyConversationId,
    projectConversationId: historyConversationId,
    projectTitle: `${service} history`,
    title: `${service} history`,
  };

  const history = {
    id: `qa-${prefix}-closed-history`,
    type: "closed_job",
    source: "qa_mobile_seed",
    status: "closed",
    finalStatus: "Closed",
    closureStatus: "closed",
    customerName,
    customer: customerName,
    professionalName,
    businessName,
    address,
    title: `${service} history`,
    jobTitle: `${service} history`,
    requestId: historyRequestId,
    conversationId: historyConversationId,
    scheduleId: historyScheduleId,
    quoteId: historyQuoteId,
    schedule: historySchedule,
    visitSchedule: historySchedule,
    quote: historyQuote,
    proposal: historyQuote,
    evaluation,
    serviceType,
    context,
    evaluationTemplate,
    templateRequirements,
    evaluationNotes: evaluation.notes,
    payments: {
      paymentStatus: "paid",
      paymentAmount: total,
      paymentReceivedAt: QA_TIMESTAMP,
    },
    workAppointment: schedule,
    completionNotes:
      "Bifold doors replaced. Artwork and chalkboard mounted safely.",
    receipt: {
      status: "sent",
      total,
      sentAt: QA_TIMESTAMP,
    },
    closureNotes:
      "Sarah Dommerich job closed with final documentation saved to history.",
    jobTimelineEvents: [
      ...timelineEvents,
      {
        id: `qa-${prefix}-closed`,
        stage: "closed",
        label: "closed",
        savedAt: QA_TIMESTAMP,
        source: "qa_mobile_seed",
      },
    ],
    timelineEvents,
    closedAt: QA_TIMESTAMP,
    closeDate: QA_TIMESTAMP,
  };

  const conversationRegistryItem = {
    id: conversationId,
    conversationId,
    customerName,
    homeownerName: customerName,
    participantName: customerName,
    businessName,
    project_title: service,
    projectTitle: service,
    location: address,
    customerLocation: address,
    conversation_type: "standard",
    saved_to_history: false,
    unread: false,
    updatedAt: Date.parse(QA_TIMESTAMP),
  };

  const messages = [
    {
      id: `qa-${prefix}-message-intro`,
      sender: "business",
      role: "business",
      senderRole: "business",
      type: "text",
      text:
        customerName === QA_MOBILE_REFERENCE_STORY.homeownerName
          ? "Hi Sarah, this is William. I can review the bifold doors, artwork, and chalkboard during the visit."
          : `${customerName} conversation only.`,
      customerName,
      conversationId,
      createdAt: QA_TIMESTAMP,
    },
    {
      id: `qa-${prefix}-message-schedule`,
      sender: "business",
      role: "business",
      senderRole: "business",
      type: "schedule",
      workflowType: "work_scheduled",
      conversationId,
      customerName,
      schedule,
      createdAt: QA_TIMESTAMP,
    },
  ];

  return {
    schedule,
    quote,
    history,
    conversationRegistryItem,
    conversationId,
    messages,
  };
}

export function seedQAMobileWorkflowState() {
  if (!import.meta.env?.DEV) {
    return { ok: false, reason: "dev-only" };
  }

  const storage = globalThis.localStorage;
  if (!storage) {
    return { ok: false, reason: "storage-unavailable" };
  }

  const sarah = createCustomerWorkflow({
    customerName: QA_MOBILE_REFERENCE_STORY.homeownerName,
    address: QA_MOBILE_REFERENCE_STORY.address,
    service: QA_MOBILE_REFERENCE_STORY.service,
    materialName: "Bifold door hardware and wall anchors",
    date: "2026-06-22",
    time: "09:00",
    total: QA_MOBILE_REFERENCE_STORY.totalEstimate,
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.HOMEOWNER,
    professionalName: QA_MOBILE_REFERENCE_STORY.professionalName,
    businessName: QA_MOBILE_REFERENCE_STORY.businessName,
    materialsEstimate: QA_MOBILE_REFERENCE_STORY.materialsEstimate,
    laborEstimate: QA_MOBILE_REFERENCE_STORY.laborEstimate,
    customerRequest: QA_MOBILE_REFERENCE_STORY.serviceSummary,
    workItemsConfig: [
      {
        id: "qa-sarah-bifold-doors",
        title: "Replace 2 bifold doors",
        notes:
          "Replace two bifold doors and verify track, pivots, alignment, and clear operation.",
        safetyNotes: "Confirm door swing clearance and keep hallway path clear.",
        photoName: "sarah-bifold-doors-before.jpg",
        measurements: [
          {
            id: "qa-sarah-door-width",
            label: "Door opening width",
            value: "48",
            unit: "inches",
          },
          {
            id: "qa-sarah-door-height",
            label: "Door opening height",
            value: "80",
            unit: "inches",
          },
        ],
        materials: [
          {
            id: "qa-sarah-bifold-door-set",
            name: "2 bifold door sets",
            quantity: "1",
            unitPrice: "220",
          },
          {
            id: "qa-sarah-door-hardware",
            name: "Track, pivots, and hardware",
            quantity: "1",
            unitPrice: "65",
          },
        ],
      },
      {
        id: "qa-sarah-artwork",
        title: "Hang artwork",
        notes: "Hang homeowner artwork level and aligned in selected location.",
        safetyNotes: "Use wall anchors appropriate for wall type and artwork weight.",
        photoName: "sarah-artwork-wall.jpg",
        measurements: [
          {
            id: "qa-sarah-artwork-height",
            label: "Artwork center height",
            value: "57",
            unit: "inches",
          },
        ],
        materials: [
          {
            id: "qa-sarah-artwork-anchors",
            name: "Picture hanging hardware",
            quantity: "1",
            unitPrice: "10",
          },
        ],
      },
      {
        id: "qa-sarah-chalkboard",
        title: "Hang chalkboard safely",
        notes:
          "Mount chalkboard securely with anchors or studs so it is safe for daily use.",
        safetyNotes: "Verify wall support and chalkboard weight before mounting.",
        photoName: "sarah-chalkboard-wall.jpg",
        measurements: [
          {
            id: "qa-sarah-chalkboard-width",
            label: "Chalkboard width",
            value: "36",
            unit: "inches",
          },
        ],
        materials: [
          {
            id: "qa-sarah-heavy-duty-anchors",
            name: "Heavy-duty anchors and screws",
            quantity: "1",
            unitPrice: "15",
          },
        ],
      },
    ],
  });
  const william = createCustomerWorkflow({
    customerName: "William QA Scope Check",
    address: "202 William Ave",
    service: "William scoped comparison job",
    materialName: "William entry door",
    date: "2026-06-23",
    time: "10:00",
    total: 325,
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.PROPERTY_MANAGEMENT,
  });
  const user = {
    id: "qa-mobile-pro",
    username: QA_MOBILE_REFERENCE_STORY.professionalName,
    name: QA_MOBILE_REFERENCE_STORY.professionalName,
    email: "william@meetro.local",
    role: "contractor",
    account_type: "professional",
    business_name: QA_MOBILE_REFERENCE_STORY.businessName,
    business_category: "handyman",
  };

  storage.setItem("token", "qa-mobile-dev-token");
  storage.setItem("user", JSON.stringify(user));
  storage.setItem("userId", user.id);
  storage.setItem("userName", user.name);
  storage.setItem("userEmail", user.email);
  storage.setItem("userRole", user.role);
  storage.setItem("accountType", "professional");
  storage.setItem("activeAccountMode", "business");
  storage.setItem("isProfessional", "true");
  storage.setItem("hasBusinessProfile", "true");
  storage.setItem("businessName", user.business_name);
  storage.setItem("companyName", user.business_name);
  storage.setItem("businessCategory", user.business_category);
  storage.setItem("contractorProfileComplete", "true");
  storage.setItem("onboardingComplete", "true");
  storage.removeItem("meetroWorkCenterTab");
  storage.removeItem("activeWorkCenterTab");
  storage.setItem("activeJobsCount", "2");
  storage.setItem("activeWorkRequestId", sarah.schedule.requestId);
  storage.setItem("activeWorkQuoteId", sarah.quote.quoteId);
  storage.setItem("activeWorkConversationId", sarah.conversationId);
  storage.setItem("activeWorkScheduleId", sarah.schedule.scheduleId);
  storage.setItem("activeWorkStatus", "work_scheduled");
  storage.setItem("activeWorkStage", "work_scheduled");
  storage.setItem("activeWorkService", sarah.schedule.title);
  storage.setItem("activeWorkLocation", sarah.schedule.location);
  storage.setItem("activeWorkType", "work_scheduled");
  storage.setItem("activeWorkSource", "qa_mobile_seed");
  storage.setItem("activeJobId", sarah.schedule.requestId);
  storage.setItem("activeConversationId", sarah.conversationId);
  storage.setItem("activeJobStatus", "work_scheduled");
  storage.setItem("activeJobService", sarah.schedule.title);
  storage.setItem("activeJobCustomer", QA_MOBILE_REFERENCE_STORY.homeownerName);
  storage.setItem("activeJobLocation", sarah.schedule.location);
  storage.setItem("meetroQAMobileSeededAt", QA_TIMESTAMP);

  writeJson(storage, "meetro_business_schedule", [
    sarah.schedule,
    william.schedule,
  ]);
  writeJson(storage, "workCenterQuoteHistory", [sarah.quote, william.quote]);
  writeJson(storage, "meetroQuoteHistory", [sarah.quote, william.quote]);
  writeJson(storage, "quoteHistory", [sarah.quote, william.quote]);
  writeJson(storage, "completedProjects", [sarah.history, william.history]);
  writeJson(storage, "meetro_conversation_registry", [
    sarah.conversationRegistryItem,
    william.conversationRegistryItem,
  ]);
  writeJson(
    storage,
    `meetro_conversation_${sarah.conversationId}`,
    sarah.messages
  );
  writeJson(
    storage,
    `meetro_conversation_${william.conversationId}`,
    william.messages
  );
  writeJson(storage, `meetro_job_record_${sarah.conversationId}`, [
    sarah.schedule.evaluation,
  ]);
  writeJson(storage, `meetro_job_record_${william.conversationId}`, [
    william.schedule.evaluation,
  ]);

  return {
    ok: true,
    customers: [QA_MOBILE_REFERENCE_STORY.homeownerName, "William QA Scope Check"],
    page: "contractorDashboard",
  };
}
