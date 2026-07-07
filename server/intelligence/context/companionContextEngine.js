function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function compactRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (isRecord(value)) return Object.keys(value).length > 0;
      return value !== undefined && value !== null && value !== "";
    })
  );
}

function cleanTextArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => firstText(item))
    .filter(Boolean)
    .slice(0, 12);
}

function getUserId(user = {}) {
  return firstText(user.id, user.userId, user.sub, user.email);
}

function getDisplayName(user = {}) {
  const fullName = firstText(
    user.displayName,
    user.name,
    [user.firstName, user.lastName].filter(Boolean).join(" ")
  );

  if (fullName) return fullName;

  const email = firstText(user.email);
  return email && email.includes("@") ? email.split("@")[0] : "";
}

function getAccountType(user = {}) {
  const raw = firstText(user.accountType, user.account_type, user.role, user.userRole);
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (["professional", "business", "contractor"].includes(normalized)) {
    return "professional";
  }
  if (["standard", "homeowner", "personal", "member"].includes(normalized)) {
    return "standard";
  }

  return raw;
}

function isProfessionalAccount(user = {}) {
  return (
    getAccountType(user) === "professional" ||
    user.isProfessional === true ||
    user.is_professional === true
  );
}

function pickSource(body = {}) {
  const source = isRecord(body.source) ? body.source : {};

  return compactRecord({
    page: firstText(body.page, body.pageContext, source.page, source.pageContext),
    surface: firstText(body.surface, source.surface, source.source),
  });
}

function pickWorkflow(workflow = {}) {
  if (!isRecord(workflow)) return {};

  return compactRecord({
    activeRequestId: firstText(workflow.activeRequestId, workflow.requestId),
    activeJobId: firstText(workflow.activeJobId, workflow.jobId),
    activeProjectId: firstText(workflow.activeProjectId, workflow.projectId),
    conversationId: firstText(workflow.conversationId),
    status: firstText(workflow.status, workflow.workflowStatus),
    nextAction: firstText(workflow.nextAction, workflow.nextStep),
    serviceType: firstText(workflow.serviceType, workflow.service, workflow.category),
    quoteStatus: firstText(workflow.quoteStatus),
    scheduleStatus: firstText(workflow.scheduleStatus, workflow.appointmentStatus),
    evaluationStatus: firstText(workflow.evaluationStatus, workflow.findingsStatus),
    findingsStatus: firstText(workflow.findingsStatus),
    approvalStatus: firstText(workflow.approvalStatus),
    workStatus: firstText(workflow.workStatus),
    completionStatus: firstText(workflow.completionStatus),
    closureStatus: firstText(workflow.closureStatus),
    paymentStatus: firstText(workflow.paymentStatus),
    receiptStatus: firstText(workflow.receiptStatus),
    warrantyStatus: firstText(workflow.warrantyStatus),
    permitStatus: firstText(workflow.permitStatus),
    inspectionStatus: firstText(workflow.inspectionStatus),
    documentationStatus: firstText(workflow.documentationStatus),
    unresolvedIssueStatus: firstText(workflow.unresolvedIssueStatus),
  });
}

function pickProfessional(profile = {}) {
  if (!isRecord(profile)) return {};

  return compactRecord({
    businessName: firstText(profile.businessName, profile.companyName, profile.name),
    serviceCategories: cleanTextArray(
      profile.serviceCategories || profile.services || profile.servicesOffered
    ),
    specialties: cleanTextArray(profile.specialties || profile.capabilities),
    serviceArea: firstText(profile.serviceArea, profile.primaryServiceArea, profile.location),
  });
}

function pickRelationship(relationship = {}) {
  if (!isRecord(relationship)) return {};

  return compactRecord({
    knownRelationshipType: firstText(
      relationship.knownRelationshipType,
      relationship.relationshipType,
      relationship.type
    ),
    recentRelevantStatus: firstText(
      relationship.recentRelevantStatus,
      relationship.status,
      relationship.lastStatus
    ),
  });
}

async function resolveMaybe(fn, fallback = null) {
  if (typeof fn !== "function") return fallback;
  const value = await fn();
  return value || fallback;
}

export async function buildCompanionContextEngine({
  user = {},
  body = {},
  backendContext = {},
  repositories = {},
} = {}) {
  const accountType = getAccountType(user);
  const professionalAccount = isProfessionalAccount(user);

  const activeWorkflow =
    backendContext.activeWorkflow ||
    backendContext.activeRequest ||
    backendContext.activeJob ||
    (await resolveMaybe(() => repositories.getActiveWorkflow?.({ user })));
  const relationship =
    backendContext.relationship ||
    (await resolveMaybe(() => repositories.getRelationshipContext?.({ user })));
  const businessProfile = professionalAccount
    ? backendContext.businessProfile ||
      (await resolveMaybe(() => repositories.getBusinessProfile?.({ user })))
    : null;

  return compactRecord({
    user: compactRecord({
      id: getUserId(user),
      displayName: getDisplayName(user),
      accountType,
      role: firstText(user.role, user.userRole),
    }),
    source: pickSource(body),
    workflow: pickWorkflow(activeWorkflow),
    professional: professionalAccount ? pickProfessional(businessProfile) : {},
    relationship: pickRelationship(relationship),
    language: firstText(user.language, backendContext.language, "en"),
  });
}

export default buildCompanionContextEngine;
