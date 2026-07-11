function lifecycleKey(record) {
  for (const field of ["jobId", "projectId", "emergencyRequestId", "requestId"]) if (record[field]) return `${field}:${record[field]}`;
  return "";
}
function typedKey(record) {
  const fields = record.kind === "proposal" ? ["proposalId"] : record.kind === "invoice" ? ["invoiceId"] : record.kind === "receipt" ? ["receiptId"] : record.kind === "payment" ? ["paymentId"] : record.kind === "schedule" ? ["scheduleId"] : [];
  for (const field of fields) if (record[field]) return `${record.kind}:${record[field]}`;
  return lifecycleKey(record) || `${record.kind}:${record.source}:${record.createdAt}:${record.status}`;
}

export function deduplicateBusinessRecords(records = []) {
  const lifecycle = new Map(); const typed = new Map(); const warnings = [];
  for (const record of records) {
    const target = ["proposal", "invoice", "receipt", "payment", "schedule", "evaluation"].includes(record.kind) ? typed : lifecycle;
    const key = typedKey(record); const existing = target.get(key);
    if (!existing) { target.set(key, record); continue; }
    if (existing.businessId !== record.businessId) { warnings.push("cross_business_identity_conflict"); continue; }
    const activeStatuses = new Set(["active", "in_progress", "working", "started", "scheduled"]);
    const existingActive = activeStatuses.has(existing.status);
    const recordActive = activeStatuses.has(record.status);
    const existingClosed = existing.closureRecorded || existing.historyRecorded || ["closed", "history", "archived"].includes(existing.status);
    const recordClosed = record.closureRecorded || record.historyRecorded || ["closed", "history", "archived"].includes(record.status);
    if ((existingActive && recordClosed) || (recordActive && existingClosed)) warnings.push("lifecycle_status_conflict");
    target.set(key, {
      ...existing, ...record,
      blockers: [...new Set([...(existing.blockers || []), ...(record.blockers || [])])],
      isEmergency: existing.isEmergency || record.isEmergency,
      completionRecorded: existing.completionRecorded || record.completionRecorded,
      closureRecorded: existing.closureRecorded || record.closureRecorded,
      historyRecorded: existing.historyRecorded || record.historyRecorded,
      completedAt: record.completedAt || existing.completedAt,
      closedAt: record.closedAt || existing.closedAt,
    });
  }
  return { workflows: [...lifecycle.values()], typedRecords: [...typed.values()], warnings };
}
