// paidMinor is canonical; payment events are only the Invoice ledger.
// Do not turn a prior applied amount into an Invoice payment event.
export function invoicePaymentProvenance(invoice) {
  const invoicePaymentsMinor = (invoice?.payments || []).reduce((sum, event) => sum + event.amountMinor, 0);
  return Object.freeze({ invoicePaymentsMinor, appliedBeforeInvoiceMinor: Math.max(0, (invoice?.paidMinor || 0) - invoicePaymentsMinor) });
}
