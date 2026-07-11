export function buildBusinessFinancialSignals(typedRecords = []) {
  const proposals = typedRecords.filter((item) => item.kind === "proposal");
  const invoices = typedRecords.filter((item) => item.kind === "invoice");
  const receipts = typedRecords.filter((item) => item.kind === "receipt");
  const payments = typedRecords.filter((item) => item.kind === "payment");
  const currencies = [...new Set([...proposals, ...invoices, ...payments].map((item) => item.currency).filter(Boolean))];
  const sum = (records, field) => records.length && records.every((item) => item[field] !== null && item[field] !== undefined)
    ? records.reduce((total, item) => total + item[field], 0) : null;
  const proposed = proposals.filter((item) => !item.approved);
  const approved = proposals.filter((item) => item.approved);
  const recorded = [...invoices, ...receipts, ...payments].filter((item) => item.recordedRevenue !== null && item.recordedRevenue !== undefined && (item.paid || item.receiptResolved));
  return {
    signals: {
      openProposalCount: proposed.length,
      approvedProposalCount: approved.length,
      unresolvedInvoiceCount: invoices.filter((item) => !item.paid).length,
      unresolvedReceiptCount: receipts.filter((item) => !item.receiptResolved).length,
      proposedValue: sum(proposed, "amount"), approvedValue: sum(approved, "amount"),
      invoicedValue: sum(invoices, "amount"), recordedRevenue: sum(recorded, "recordedRevenue"),
      ...(currencies.length === 1 ? { currency: currencies[0] } : {}),
    },
    warnings: currencies.length > 1 ? ["mixed_currency"] : [],
  };
}
