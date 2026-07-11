export function knowledgeLog(logger, level, event, fields = {}) {
  const safe = {
    requestId: fields.requestId,
    domain: fields.domain,
    consideredSourceCount: fields.consideredSourceCount,
    authorizedSourceCount: fields.authorizedSourceCount,
    matchedSourceCount: fields.matchedSourceCount,
    returnedSourceCount: fields.returnedSourceCount,
    conflictCount: fields.conflictCount,
    knowledgeStatus: fields.knowledgeStatus,
    confidence: fields.confidence,
    truncated: fields.truncated,
    elapsedMs: fields.elapsedMs,
  };
  logger?.[level]?.(event, Object.fromEntries(Object.entries(safe).filter(([, value]) => value !== undefined)));
}

