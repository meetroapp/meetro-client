import { canReadLegacyWorkflowStorage } from "./clientWorkflowStoragePolicy.js";

const TIMELINE_STORAGE_KEY = "meetroTimelineMoments";

export const MEETRO_TIMELINE_STORAGE_KEY = TIMELINE_STORAGE_KEY;

export const TIMELINE_MOMENT_STATUSES = Object.freeze({
  DRAFT: "draft",
  PENDING_CUSTOMER_CONFIRMATION: "pending_customer_confirmation",
  PUBLISHED: "published",
  PRIVATE: "private",
  FLAGGED: "flagged",
  HIDDEN: "hidden",
  REJECTED: "rejected",
});

export const TIMELINE_ALLOWED_ORIGINS = Object.freeze([
  "closed_job",
  "project_completion",
  "customer_review",
  "warranty_issued",
  "certification_earned",
  "community_project",
  "business_milestone",
  "employee_milestone",
  "permit_closed",
]);

const CLOSED_STATES = new Set(["closed", "closure_completed", "history"]);
const BLOCKED_PUBLICATION_STATUSES = new Set([
  TIMELINE_MOMENT_STATUSES.PRIVATE,
  TIMELINE_MOMENT_STATUSES.FLAGGED,
  TIMELINE_MOMENT_STATUSES.HIDDEN,
  TIMELINE_MOMENT_STATUSES.REJECTED,
]);

function getDefaultStorage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function compactString(value) {
  return String(value || "").trim();
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function readNested(record = {}, path = []) {
  return path.reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), record);
}

function readFirst(record = {}, paths = []) {
  for (const path of paths) {
    const value = Array.isArray(path) ? readNested(record, path) : record[path];
    if (value !== undefined && value !== null && String(value).trim?.() !== "") {
      return value;
    }
  }
  return "";
}

function normalizePhotos(...values) {
  return values.flatMap((value) => toArray(value)).filter(Boolean);
}

function getTimelineMomentPhotos(moment = {}) {
  return [
    ...normalizePhotos(moment.beforePhotos, moment.before_photos),
    ...normalizePhotos(moment.afterPhotos, moment.after_photos, moment.photos),
  ];
}

function firstMomentField(moment = {}, fields = []) {
  return firstValue(...fields.map((field) => readNested(moment, String(field).split("."))));
}

export function isProjectClosedForTimeline(project = {}) {
  const status = normalize(project.status);
  const workflowStatus = normalize(project.workflowStatus);
  const workStatus = normalize(project.workStatus);
  const lifecycleState = normalize(project.lifecycleState);
  const closureStatus = normalize(project.closureStatus || project.closure_status);

  return Boolean(
    CLOSED_STATES.has(status) ||
      CLOSED_STATES.has(workflowStatus) ||
      CLOSED_STATES.has(workStatus) ||
      lifecycleState === "history" ||
      closureStatus === "closed" ||
      project.closedAt ||
      project.closeDate ||
      project.closureDecisionRef ||
      project.savedToHistory === true
  );
}

function getProjectId(project = {}) {
  return firstValue(
    project.projectId,
    project.project_id,
    project.requestId,
    project.request_id,
    project.jobId,
    project.historyId,
    project.id
  );
}

function getRelationshipId(project = {}) {
  return firstValue(
    project.relationshipId,
    project.relationship_id,
    project.customerRelationshipId,
    project.businessRelationshipId,
    project.conversationRelationshipId,
    project.conversationId,
    project.activeConversationId,
    project.projectConversationId
  );
}

function getReview(project = {}) {
  const review = project.review || project.customerReview || {};
  return {
    rating: firstValue(
      project.reviewRating,
      project.rating,
      review.rating,
      review.stars,
      project.review?.reviewRating
    ),
    text: firstValue(
      project.reviewText,
      project.reviewComment,
      project.customerReviewText,
      review.comment,
      review.text
    ),
  };
}

function getTimelinePhotos(project = {}) {
  return {
    beforePhotos: normalizePhotos(
      project.beforePhotos,
      project.before_photos,
      project.evaluation?.beforePhotos,
      project.evaluationVisit?.photos,
      project.schedule?.evaluationPhotos
    ),
    afterPhotos: normalizePhotos(
      project.afterPhotos,
      project.after_photos,
      project.completionPhotos,
      project.finalPhotos,
      project.photos,
      project.completion?.photos,
      project.completionRecord?.photos,
      project.schedule?.completionPhotos
    ),
  };
}

function getWarranty(project = {}) {
  return readFirst(project, [
    "warranty",
    "warrantySummary",
    "warrantyNotes",
    ["closureRecord", "warranty"],
    ["completion", "warranty"],
  ]);
}

function getReceipt(project = {}) {
  return (
    project.receipt ||
    project.receiptUrl ||
    project.invoiceUrl ||
    project.invoice?.receipt ||
    project.invoice?.receiptUrl ||
    project.paymentReceipt ||
    ""
  );
}

function buildMomentId(projectId, relationshipId) {
  return `meetro-moment-${projectId}-${relationshipId}`;
}

function valuesMatch(left, right) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function fieldMatchesAny(moment = {}, momentFields = [], viewer = {}, viewerFields = []) {
  return momentFields.some((momentField) =>
    viewerFields.some((viewerField) => valuesMatch(moment[momentField], viewer[viewerField]))
  );
}

function isViewerInvolvedInTimelineMoment(moment = {}, viewer = {}) {
  if (!moment || !viewer) return false;

  return Boolean(
    fieldMatchesAny(moment, ["businessId"], viewer, ["businessId", "activeBusinessId", "id"]) ||
      fieldMatchesAny(moment, ["businessName"], viewer, ["businessName", "name"]) ||
      fieldMatchesAny(moment, ["customerId"], viewer, ["customerId", "homeownerId", "userId", "id"]) ||
      fieldMatchesAny(moment, ["customerName"], viewer, ["customerName", "homeownerName", "name"]) ||
      fieldMatchesAny(moment, ["employeeId"], viewer, ["employeeId", "userId", "id"]) ||
      fieldMatchesAny(moment, ["relationshipId"], viewer, ["relationshipId", "activeRelationshipId"]) ||
      fieldMatchesAny(moment, ["projectId"], viewer, ["projectId", "activeProjectId"])
  );
}

export function timelineMomentRequiresCustomerConfirmation(moment = {}) {
  return Boolean(
    moment.customerId ||
      moment.customerName ||
      moment.reviewRating ||
      moment.reviewText ||
      toArray(moment.beforePhotos).length > 0 ||
      toArray(moment.afterPhotos).length > 0
  );
}

export function buildTimelineMomentFromClosedProject(project = {}, options = {}) {
  if (!isProjectClosedForTimeline(project)) {
    return {
      ok: false,
      reason: "job-closure-required",
      moment: null,
    };
  }

  const projectId = getProjectId(project);
  const relationshipId = getRelationshipId(project);

  if (!projectId) {
    return {
      ok: false,
      reason: "project-id-required",
      moment: null,
    };
  }

  if (!relationshipId) {
    return {
      ok: false,
      reason: "relationship-id-required",
      moment: null,
    };
  }

  const review = getReview(project);
  const photos = getTimelinePhotos(project);
  const now = options.now || new Date().toISOString();
  const closureDate = firstValue(project.closureDate, project.closedAt, project.closeDate, now);
  const completionDate = firstValue(
    project.completionDate,
    project.completedAt,
    project.completion?.completedAt,
    project.completionRecord?.completedAt,
    closureDate
  );
  const projectTitle = firstValue(
    options.projectTitle,
    project.projectTitle,
    project.title,
    project.service,
    project.jobTitle,
    project.requestTitle,
    "Completed Project"
  );
  const customerName = firstValue(project.customerName, project.customer, project.homeownerName, project.clientName);
  const businessName = firstValue(
    project.businessName,
    project.professionalName,
    project.contractorName,
    project.selectedProfessional,
    project.acceptedQuote?.businessName
  );
  const projectCategory = firstValue(project.projectCategory, project.category, project.type, project.serviceCategory);
  const thankYouMessage = String(options.thankYouMessage || "").trim();
  const momentReflection = String(options.momentReflection || options.whyItMattered || "").trim();
  const coverPhoto = options.coverPhoto || project.coverPhoto || project.cover_photo || "";

  const baseMoment = {
    id: options.id || buildMomentId(projectId, relationshipId),
    type: "meetro_timeline_moment",
    label: "Verified Meetro Moment",
    origin: "closed_job",
    projectId,
    relationshipId,
    customerId: firstValue(project.customerId, project.homeownerId, project.clientId),
    customerName,
    businessId: firstValue(project.businessId, project.professionalId, project.contractorId),
    businessName,
    projectTitle,
    projectCategory,
    completionDate,
    closureDate,
    beforePhotos: photos.beforePhotos,
    afterPhotos: photos.afterPhotos,
    reviewRating: review.rating || "",
    reviewText: review.text || "",
    warranty: getWarranty(project),
    receipt: getReceipt(project),
    coverPhoto,
    whyItMattered: momentReflection,
    thankYouMessage,
    generatedMessage:
      thankYouMessage ||
      momentReflection ||
      (customerName
        ? `Thank you ${String(customerName).split(" ")[0]} for trusting us with this completed project.`
        : "Thank you for trusting us with this completed project."),
    sourceProject: project,
    verified: true,
    createdAt: now,
    updatedAt: now,
  };

  const confirmationRequired = timelineMomentRequiresCustomerConfirmation(baseMoment);
  const status =
    options.status ||
    (confirmationRequired
      ? TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION
      : TIMELINE_MOMENT_STATUSES.PUBLISHED);

  return {
    ok: true,
    reason: "",
    moment: {
      ...baseMoment,
      confirmationRequired,
      status,
    },
  };
}

export function readTimelineMoments(storage = getDefaultStorage()) {
  if (!canReadLegacyWorkflowStorage()) return [];
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(TIMELINE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTimelineMoment(storage = getDefaultStorage(), moment = {}) {
  if (!canReadLegacyWorkflowStorage()) {
    return { saved: false, reason: "browser-workflow-storage-disabled", moments: [] };
  }
  if (!storage || !moment?.id) {
    return { saved: false, reason: "missing-storage-or-moment", moments: readTimelineMoments(storage) };
  }

  const existing = readTimelineMoments(storage);
  const withoutDuplicate = existing.filter(
    (item) =>
      String(item.id) !== String(moment.id) &&
      !(
        moment.projectId &&
        item.projectId &&
        String(item.projectId) === String(moment.projectId) &&
        moment.relationshipId &&
        item.relationshipId &&
        String(item.relationshipId) === String(moment.relationshipId)
      )
  );
  const nextMoments = [{ ...moment, updatedAt: moment.updatedAt || new Date().toISOString() }, ...withoutDuplicate];
  storage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(nextMoments));
  return { saved: true, reason: "", moments: nextMoments, moment: nextMoments[0] };
}

export function createTimelineMomentFromClosedProject(project = {}, options = {}) {
  const storage = options.storage || getDefaultStorage();
  const result = buildTimelineMomentFromClosedProject(project, options);

  if (!result.ok) {
    return { created: false, reason: result.reason, moment: null };
  }

  const saveResult = saveTimelineMoment(storage, result.moment);
  return {
    created: saveResult.saved,
    reason: saveResult.reason,
    moment: saveResult.moment || result.moment,
  };
}

export function canPublishTimelineMoment(moment = {}) {
  if (!moment || typeof moment !== "object") return false;
  if (BLOCKED_PUBLICATION_STATUSES.has(moment.status)) return false;
  if (
    moment.confirmationRequired &&
    moment.status === TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION
  ) {
    return false;
  }
  return moment.status === TIMELINE_MOMENT_STATUSES.PUBLISHED;
}

export function isVerifiedTimelineMoment(moment = {}) {
  return Boolean(
    moment &&
      typeof moment === "object" &&
      moment.verified === true &&
      TIMELINE_ALLOWED_ORIGINS.includes(compactString(moment.origin))
  );
}

export function getTimelineMomentPrivacyLabel(moment = {}) {
  const status = moment.status || TIMELINE_MOMENT_STATUSES.DRAFT;

  if (status === TIMELINE_MOMENT_STATUSES.PUBLISHED) {
    return {
      key: "published",
      label: "Published",
      message: "This Moment is published.",
      publicVisible: true,
    };
  }

  if (status === TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION) {
    return {
      key: "pending",
      label: "Pending confirmation",
      message: "This Moment is waiting for customer confirmation.",
      publicVisible: false,
    };
  }

  if (status === TIMELINE_MOMENT_STATUSES.PRIVATE || status === TIMELINE_MOMENT_STATUSES.DRAFT) {
    return {
      key: "private",
      label: "Private",
      message: "This Moment is saved privately.",
      publicVisible: false,
    };
  }

  if (status === TIMELINE_MOMENT_STATUSES.HIDDEN) {
    return {
      key: "hidden",
      label: "Hidden",
      message: "This Moment is hidden.",
      publicVisible: false,
    };
  }

  return {
    key: "unavailable",
    label: "Not visible",
    message: "This Moment is not visible right now.",
    publicVisible: false,
  };
}

export function canDisplayTimelineMomentForViewer(moment = {}, viewer = {}, options = {}) {
  if (!moment || typeof moment !== "object") return false;

  if (options.publicSurface === true) {
    return canPublishTimelineMoment(moment);
  }

  if (!isViewerInvolvedInTimelineMoment(moment, viewer)) {
    return false;
  }

  if (canPublishTimelineMoment(moment)) {
    return true;
  }

  return [
    TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION,
    TIMELINE_MOMENT_STATUSES.PRIVATE,
    TIMELINE_MOMENT_STATUSES.DRAFT,
    TIMELINE_MOMENT_STATUSES.HIDDEN,
  ].includes(moment.status);
}

export function confirmTimelineMoment(moment = {}, options = {}) {
  if (!moment || typeof moment !== "object") {
    return { confirmed: false, reason: "missing-moment", moment: null };
  }

  const confirmedAt = options.confirmedAt || new Date().toISOString();
  return {
    confirmed: true,
    reason: "",
    moment: {
      ...moment,
      status: TIMELINE_MOMENT_STATUSES.PUBLISHED,
      customerConfirmed: true,
      customerConfirmedAt: confirmedAt,
      updatedAt: confirmedAt,
    },
  };
}

export function publishTimelineMoment(moment = {}, options = {}) {
  if (
    moment.confirmationRequired &&
    moment.status === TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION
  ) {
    return {
      published: false,
      reason: "customer-confirmation-required",
      moment,
    };
  }

  if (BLOCKED_PUBLICATION_STATUSES.has(moment.status)) {
    return {
      published: false,
      reason: "moment-not-publishable",
      moment,
    };
  }

  const publishedAt = options.publishedAt || new Date().toISOString();
  return {
    published: true,
    reason: "",
    moment: {
      ...moment,
      status: TIMELINE_MOMENT_STATUSES.PUBLISHED,
      publishedAt,
      updatedAt: publishedAt,
    },
  };
}

export function getTimelineMomentsForProject(moments = [], projectId = "") {
  if (!projectId) return [];
  return moments.filter((moment) => String(moment.projectId || "") === String(projectId));
}

export function getTimelineMomentById(moments = [], momentId = "") {
  if (!momentId) return null;
  return moments.find((moment) => String(moment.id || "") === String(momentId)) || null;
}

export function getRelationshipTimelineMoments(moments = [], relationshipId = "", options = {}) {
  if (!relationshipId) return [];
  return moments
    .filter((moment) => String(moment.relationshipId || "") === String(relationshipId))
    .filter((moment) => options.includePending || canPublishTimelineMoment(moment))
    .sort((first, second) =>
      String(second.closureDate || second.createdAt || "").localeCompare(
        String(first.closureDate || first.createdAt || "")
      )
    );
}

export function getBusinessProfileTimelineMoments(moments = [], business = {}, options = {}) {
  const businessId = business.businessId || business.id || "";
  const businessName = normalize(business.businessName || business.name || "");
  return moments
    .filter((moment) => {
      const matchesId = businessId && String(moment.businessId || "") === String(businessId);
      const matchesName = businessName && normalize(moment.businessName) === businessName;
      return matchesId || matchesName;
    })
    .filter((moment) => options.includePending || canPublishTimelineMoment(moment))
    .sort((first, second) =>
      String(second.closureDate || second.createdAt || "").localeCompare(
        String(first.closureDate || first.createdAt || "")
      )
    );
}

export function getTimelineMomentsForViewer(moments = [], viewer = {}, options = {}) {
  return moments
    .filter((moment) => canDisplayTimelineMomentForViewer(moment, viewer, options))
    .sort((first, second) =>
      String(second.closureDate || second.createdAt || "").localeCompare(
        String(first.closureDate || first.createdAt || "")
      )
    );
}

export function getMeetroMomentDetailModel(moment = {}, viewer = {}, moments = [], options = {}) {
  if (!moment || typeof moment !== "object") {
    return {
      visible: false,
      reason: "missing-moment",
      moment: null,
    };
  }

  const verified = isVerifiedTimelineMoment(moment);

  if (!verified) {
    return {
      visible: false,
      reason: "unverified-source",
      moment,
    };
  }

  const visible = canDisplayTimelineMomentForViewer(moment, viewer, options);

  if (!visible) {
    return {
      visible: false,
      reason: "not-visible-to-viewer",
      moment,
    };
  }

  const privacy = getTimelineMomentPrivacyLabel(moment);
  const involvedViewer = isViewerInvolvedInTimelineMoment(moment, viewer);
  const approvedForDetails =
    involvedViewer ||
    (privacy.publicVisible === true && moment.customerConfirmed === true);
  const allowedMoments = getTimelineMomentsForViewer(moments, viewer, options);
  const relatedMoments = allowedMoments
    .filter((candidate) => String(candidate.id || "") !== String(moment.id || ""))
    .filter((candidate) => {
      return Boolean(
        valuesMatch(candidate.relationshipId, moment.relationshipId) ||
          valuesMatch(candidate.propertyId, moment.propertyId) ||
          valuesMatch(candidate.businessId, moment.businessId) ||
          valuesMatch(candidate.businessName, moment.businessName) ||
          valuesMatch(candidate.projectCategory, moment.projectCategory)
      );
    })
    .filter((candidate) => canPublishTimelineMoment(candidate) || isViewerInvolvedInTimelineMoment(candidate, viewer))
    .slice(0, 4);

  return {
    visible: true,
    reason: "",
    moment,
    verified,
    privacy,
    involvedViewer,
    approvedForDetails,
    title: moment.projectTitle || "Completed Project",
    category: moment.projectCategory || "Completed Project",
    completionDate: moment.completionDate || moment.closureDate || moment.createdAt || "",
    relationshipContext: {
      customerName: approvedForDetails ? moment.customerName || "" : "",
      businessName: moment.businessName || "",
      relationshipDuration: approvedForDetails
        ? firstMomentField(moment, ["relationshipDuration", "relationshipDurationLabel", "relationship.duration"])
        : "",
      relationshipId: moment.relationshipId || "",
    },
    story: {
      summary:
        firstMomentField(moment, ["summary", "projectSummary", "generatedMessage"]) ||
        `${moment.projectTitle || "This project"} reached closure and became part of Meetro Moments.`,
      whyItMattered:
        firstMomentField(moment, ["whyItMattered", "momentMeaning", "completionNotes"]) ||
        "This moment matters because completed work became verified history.",
      thankYouMessage: moment.thankYouMessage || "",
    },
    visual: {
      photos: approvedForDetails ? getTimelineMomentPhotos(moment) : [],
      photoCount: approvedForDetails ? getTimelineMomentPhotos(moment).length : 0,
      beforePhotos: approvedForDetails ? normalizePhotos(moment.beforePhotos, moment.before_photos) : [],
      afterPhotos: approvedForDetails ? normalizePhotos(moment.afterPhotos, moment.after_photos) : [],
    },
    details: {
      projectType: moment.projectCategory || "",
      completionDate: moment.completionDate || moment.closureDate || "",
      duration: firstMomentField(moment, ["duration", "projectDuration", "durationLabel"]),
      warranty: moment.warranty || "",
      receipt: moment.receipt || "",
      permit: firstMomentField(moment, ["permitStatus", "permit.status", "permit"]),
      investment: approvedForDetails
        ? firstMomentField(moment, ["investment", "cost", "finalAmount", "amount", "invoice.total"])
        : "",
      address: approvedForDetails
        ? firstMomentField(moment, ["address", "propertyAddress", "projectAddress", "location"])
        : "",
      reviewRating: approvedForDetails ? moment.reviewRating || "" : "",
      reviewText: approvedForDetails ? moment.reviewText || "" : "",
    },
    journey: [
      "Consultation",
      "Estimate / Quote",
      "Approval",
      "Work",
      "Completed",
      "Closed",
    ],
    relatedMoments,
  };
}

export function buildTimelineClosureOffer(project = {}) {
  const result = buildTimelineMomentFromClosedProject(project, { status: TIMELINE_MOMENT_STATUSES.DRAFT });

  if (!result.ok) {
    return {
      eligible: false,
      reason: result.reason,
      offer: null,
    };
  }

  return {
    eligible: true,
    reason: "",
    offer: {
      title: "Project Successfully Closed",
      body: "This completed work can be preserved as a Meetro Moment.",
      primaryActionLabel: "Preserve Meetro Moment",
      secondaryActionLabel: "Keep in History",
      momentPreview: result.moment,
    },
  };
}

export function getCustomerHomeTimelinePlaceholder() {
  return {
    title: "Meetro Moments",
    body: "Completed project history will appear here as verified Meetro Moments.",
  };
}

export function getMeetroMomentsExperience(account = {}) {
  const role = normalize(account.role || account.activeMode || account.accountType);
  const employeeSignals = [
    account.employee === true,
    account.isEmployee === true,
    role === "employee",
    normalize(account.relationshipType) === "employee",
  ];
  const businessSignals = [
    role === "business",
    role === "professional",
    account.business === true,
    account.hasBusinessProfile === true,
    account.isBusinessMode === true,
  ];

  if (employeeSignals.some(Boolean)) {
    return {
      audience: "employee",
      title: "Your Meetro Moments",
      subtitle: "Every accomplishment becomes part of your professional journey.",
      emptyState: "Your professional journey begins with your first completed accomplishment.",
      examples: [
        "Joined Company",
        "Completed First Project",
        "Certification Earned",
        "100 Projects Completed",
        "Promotion",
        "Community Volunteer",
      ],
    };
  }

  if (businessSignals.some(Boolean)) {
    return {
      audience: "business",
      title: "Your Meetro Moments",
      subtitle: "Every completed project becomes part of your business legacy.",
      emptyState: "Every completed project becomes part of your business legacy.",
      examples: [
        "100th Project Completed",
        "Kitchen Remodel",
        "Customer Appreciation",
        "5-Star Review",
        "Community Project",
        "Employee Anniversary",
        "Business Milestone",
      ],
    };
  }

  if (role === "community") {
    return {
      audience: "community",
      title: "Community Meetro Moments",
      subtitle: "Celebrating the projects that strengthen our community.",
      emptyState: "Meaningful community accomplishments will appear here.",
      examples: [
        "Community Project",
        "Neighborhood Improvement",
        "Volunteer Work",
        "Shared Milestone",
      ],
    };
  }

  return {
    audience: "homeowner",
    title: "Your Meetro Moments",
    subtitle: "Every completed project becomes part of your home's story.",
    emptyState: "Your story begins with your first completed project.",
    examples: [
      "Purchased Home",
      "Kitchen Remodel",
      "Roof Replacement",
      "HVAC Service",
      "Landscape Project",
      "Warranty Renewal",
      "Annual Maintenance",
    ],
  };
}
