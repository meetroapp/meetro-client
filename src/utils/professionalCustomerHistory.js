export function mergeNativeCustomerHistoryPage(current, page) {
  if (current.subject.kind !== page.subject.kind || current.subject.contractorProfileId !== page.subject.contractorProfileId ||
      current.subject.homeownerUserId !== page.subject.homeownerUserId || current.contractVersion !== page.contractVersion) {
    throw new TypeError("Customer History pages must belong to the exact subject.");
  }
  const merge = (previous, next, key) => {
    const rows = new Map((previous || []).map(row => [key(row), row]));
    for (const row of next || []) rows.set(key(row), row);
    return [...rows.values()];
  };
  return { ...page, jobs: merge(current.jobs,page.jobs,row => row.jobId),
    ...(page.contractVersion === 2 ? {
      quotes: merge(current.quotes,page.quotes,row => row.quoteId),
      invoices: merge(current.invoices,page.invoices,row => row.invoiceId),
      documents: merge(current.documents,page.documents,row => `${row.documentType}:${row.documentId}`),
      media: merge(current.media,page.media,row => `${row.parentId}:${row.mediaId}`),
    } : {}),
  };
}

export function customerHistoryStatusLabel(value, copy) {
  return ({ACTIVE:copy.active,COMPLETED:copy.completed,ISSUED:copy.issuedStatus,
    APPROVED:copy.approvedStatus,DECLINED:copy.declinedStatus,SENT:copy.sentStatus,
    PARTIALLY_PAID:copy.partiallyPaidStatus,PAID:copy.paidStatus})[value] || value || '';
}
