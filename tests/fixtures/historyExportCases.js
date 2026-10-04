import { buildCustomerJobHistoryReportModel } from '../../src/utils/customerJobHistoryReport.js';
import { buildProfessionalCustomerHistoryReportModel } from '../../src/utils/professionalCustomerHistoryReport.js';
export const kitchen = '4790b6f0-a802-4eb0-b238-802d39a4e69b';
export const bathroom = '8da789de-6195-47da-93a8-58918e934bad';
export const active = '4fb789c7-6bd4-4560-a71c-c8523536582f';
export const homeownerJob = '11111111-1111-4111-8111-111111111111';
export const authority = { kind: 'MEETRO_ACCOUNT', contractorProfileId: 10, homeownerUserId: 17 };
const at = '2026-09-28T12:00:00Z';
export function professionalModel(language = 'en') {
  const jobs = [kitchen, bathroom, active].map((jobId, i) => ({ jobId,
    serviceTitle: ['Emergency Plumbing: Emergency plumbing leak under my kitchen sink.', 'Emergency Plumbing: Emergency plumbing leak under my bathroom sink.', 'Existing active repair'][i],
    sourceType: 'emergency_request', createdAt: at, completedAt: i < 2 ? at : null, completionState: i < 2 ? 'COMPLETED' : 'ACTIVE' }));
  const quotes = [kitchen, bathroom].map((jobId, i) => ({ jobId, quoteId: `${i + 1}1111111-1111-4111-8111-111111111111`, documentNumber: `Q-${i + 1}`,
    status: 'ISSUED', customerDecision: 'APPROVED', issuedAt: at, lineageType: 'ORIGINAL_QUOTE', currency: 'USD', totalMinor: i ? 25000 : 24000 }));
  const invoices = [kitchen, bathroom].map((jobId, i) => ({ jobId, invoiceId: `${i + 3}1111111-1111-4111-8111-111111111111`, invoiceNumber: i ? 'INV-45F7A357A55D' : 'INV-942ECBCB6944',
    status: 'PAID', issuedAt: at, currency: 'USD', totalMinor: i ? 25000 : 24000, paidMinor: i ? 25000 : 24000, balanceMinor: 0 }));
  return buildProfessionalCustomerHistoryReportModel({ authority, language, history: { contractVersion: 2, subject: authority,
    displayName: 'Liam Molina', jobs, quotes, invoices, documents: [], media: [], pagination: { nextCursor: null },
    summary: { activeJobs: 1, completedJobs: 2, quotes: 2, invoices: 2, documents: 4, photos: 0 } } });
}
export function homeownerModel(language = 'en') {
  return buildCustomerJobHistoryReportModel({ language, history: { jobId: homeownerJob, sourceType: 'emergency_request',
    serviceTitle: 'Emergency Plumbing: Outside main waterline is leaking water', customerName: 'Liam Molina', professionalName: 'Handyman LLC',
    completedAt: at, status: 'COMPLETED', approvedQuote: { totalMinor: 35000, currency: 'USD' },
    completionSummary: { workstreamCount: 0, workItemCount: 0, customerUpdateCount: 0 }, historyRecords: { media: [], visits: [], deposits: [] } } });
}
