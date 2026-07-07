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
      return value !== undefined && value !== null && value !== "";
    })
  );
}

function pickSafeRequestContext(context = {}) {
  if (!isRecord(context)) return null;

  return compactRecord({
    pageContext: firstText(context.pageContext),
    requestId: firstText(context.requestId),
    projectId: firstText(context.projectId),
    conversationId: firstText(context.conversationId),
    status: firstText(context.status, context.workflowStatus),
    nextStep: firstText(context.nextStep, context.nextAction),
    serviceType: firstText(context.serviceType, context.service, context.category),
    rolePerspective: firstText(context.rolePerspective),
    quoteStatus: firstText(context.quoteStatus),
    scheduleStatus: firstText(context.scheduleStatus, context.appointmentStatus),
  });
}

export function buildCompanionContext({ body = {}, user = {} } = {}) {
  const sourceContext = isRecord(body.context)
    ? body.context
    : isRecord(body.companionContext)
    ? body.companionContext
    : {};
  const requestContextSource = isRecord(body.requestContext)
    ? body.requestContext
    : {
        ...sourceContext,
        pageContext: firstText(sourceContext.pageContext, body.pageContext),
      };
  const requestContext = pickSafeRequestContext(requestContextSource);

  return compactRecord({
    pageContext: firstText(body.pageContext, sourceContext.pageContext),
    accountType: firstText(body.accountType, body.role, sourceContext.accountType, user.accountType),
    language: firstText(body.language, sourceContext.language, user.language, "en"),
    relationshipPerspective: firstText(
      body.relationshipPerspective,
      sourceContext.relationshipPerspective,
      requestContext?.rolePerspective
    ),
    request: requestContext,
    visibleWorkflowStatus: firstText(
      body.visibleWorkflowStatus,
      sourceContext.visibleWorkflowStatus,
      requestContext?.status
    ),
  });
}
