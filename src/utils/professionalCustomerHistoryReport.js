import { buildCustomerJobHistoryReportModel } from './customerJobHistoryReport.js';
import { fetchNativeCustomerHistory } from './jobCompletionApi.js';
import { getBusinessCustomerRelationshipActivity } from './businessCustomerRelationshipsApi.js';
import { mergeNativeCustomerHistoryPage } from './professionalCustomerHistory.js';
import { getCustomerRelationshipsCopy } from './customerRelationshipsLanguage.js';

const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
const issuedQuote = row => row.status === 'ISSUED' && row.issuedAt;
const issuedInvoice = row => ['SENT','PARTIALLY_PAID','PAID'].includes(row.status) && row.issuedAt;

export function buildProfessionalCustomerHistoryReportModel({ authority, history, displayName, language = 'en' }) {
  const native = authority?.kind === 'MEETRO_ACCOUNT';
  if (native ? history?.contractVersion !== 2 || history.subject?.kind !== authority.kind ||
    history.subject.contractorProfileId !== authority.contractorProfileId || history.subject.homeownerUserId !== authority.homeownerUserId :
    authority?.kind !== 'PRIVATE_CONTACT' || history?.relationship?.id !== authority.relationshipId ||
    history.relationship.contractorProfileId !== authority.contractorProfileId || history.relationship.businessContactId !== authority.businessContactId) {
    throw new TypeError('Verified exact customer History is required.');
  }
  if (native && history.pagination.nextCursor) throw new TypeError('Complete customer History is required for export.');
  const jobs = native ? history.jobs : history.work;
  const jobIds = new Set(jobs.map(job => job.jobId));
  if (jobIds.size !== jobs.length || jobs.some(job => !uuid(job.jobId))) throw new TypeError('Exact unique Jobs are required.');
  const rows = [...history.quotes, ...history.invoices, ...(history.payments || []), ...(history.deposits || []), ...(history.visits || []), ...(history.workPerformed || [])];
  if (rows.some(row => !jobIds.has(row.jobId)) || [...history.documents,...history.media].some(row => !jobIds.has(row.parentId))) {
    throw new TypeError('History records must belong to the selected customer Jobs.');
  }
  const name = String(native ? history.displayName : displayName || '').trim().slice(0,500);
  if (!name) throw new TypeError('A canonical customer display label is required.');
  const copy = getCustomerRelationshipsCopy(language);
  const quotes = history.quotes.filter(issuedQuote);
  const invoices = history.invoices.filter(issuedInvoice);
  const media = history.media.filter(row => row.parentType === 'JOB' && row.category === 'REQUEST_PHOTO' && row.provenance === 'JOB_REQUEST');
  if (native && (history.summary.activeJobs + history.summary.completedJobs !== jobs.length ||
    history.summary.quotes !== quotes.length || history.summary.invoices !== invoices.length || history.summary.photos !== media.length)) {
    throw new TypeError("Customer History changed while the report was loading. Retry from the first page.");
  }
  const jobReports = jobs.map(job => {
    const completed = job.completionState === 'COMPLETED';
    if (!['ACTIVE','COMPLETED'].includes(job.completionState)) throw new TypeError('Canonical completion state is required.');
    const jobQuotes = quotes.filter(row => row.jobId === job.jobId).map(row => ({
      quoteId: row.quoteId, jobId: row.jobId, quoteNumber: row.documentNumber,
      lineageLabel: row.lineageType === 'REVISED_QUOTE' ? copy.revisedQuote : row.lineageType === 'SUPPLEMENTAL_QUOTE' ? copy.additionalQuote : copy.originalQuote,
      businessStatus: row.customerDecision || row.status, customerDecision: row.customerDecision,
      totalMinor: row.totalMinor, currency: row.currency, issuedAt: row.issuedAt,
    }));
    const jobInvoices = invoices.filter(row => row.jobId === job.jobId);
    if (jobInvoices.length > 1) throw new TypeError('Ambiguous canonical Job Invoice.');
    const invoice = jobInvoices[0] ? {
      jobId: job.jobId, invoiceNumber: jobInvoices[0].invoiceNumber, status: jobInvoices[0].status,
      currency: jobInvoices[0].currency, totalMinor: jobInvoices[0].totalMinor,
      paidMinor: jobInvoices[0].paidMinor, balanceMinor: jobInvoices[0].balanceMinor,
      issuedAt: jobInvoices[0].issuedAt, invoiceDate: jobInvoices[0].invoiceDate,
      payments: (history.payments || []).filter(row => row.jobId === job.jobId && row.kind === 'INVOICE_PAYMENT').map(row =>
        ({ amountMinor: row.amountMinor, currency: row.currency, receivedDate: row.receivedDate, method: '' })),
    } : null;
    const model = buildCustomerJobHistoryReportModel({ language, includeActive: true,
      history: { jobId:job.jobId,serviceTitle:job.serviceTitle || job.title || copy.job,customerName:name,
        status:completed ? 'COMPLETED' : 'ACTIVE',createdAt:job.createdAt,completedAt:job.completedAt,
        sourceLabel:job.sourceType === 'emergency_request' ? copy.emergencySource : copy.ordinarySource,
        approvedQuote:job.approvedQuote || null,completionSummary:job.completionSummary,
        historyRecords: {
          media:media.filter(row => row.parentId === job.jobId).map(row => ({category:'REQUEST_PHOTO',secureUrl:row.secureUrl,format:row.format,uploadedAt:row.createdAt})),
          visits:(history.visits || []).filter(row => row.jobId === job.jobId).map(row => ({purpose:row.purpose,state:row.state,scheduledStartAt:row.scheduledStartAt,scheduledEndAt:row.scheduledEndAt,completedAt:row.completedAt})),
          deposits:(history.deposits || []).filter(row => row.jobId === job.jobId).map(row => ({state:row.state,currency:row.currency,requiredMinor:row.requiredMinor,appliedMinor:row.appliedMinor})),
        },
      }, quotes:jobQuotes, invoice,
      workPlan:{jobId:job.jobId,workstreams:(history.workPerformed || []).filter(row => row.jobId === job.jobId).map(row => ({title:row.workstreamTitle,status:row.status,activities:[{statement:row.statement,status:row.status,performedAt:row.performedAt}]}))},
    });
    const payments = (history.payments || []).filter(row => row.jobId === job.jobId && row.kind === 'DEPOSIT_RECEIPT').map(row =>
      Object.freeze({kind:row.kind,amountMinor:row.amountMinor,currency:row.currency,receivedAt:row.receivedAt,receivedDate:row.receivedDate}));
    return Object.freeze({jobId:job.jobId,model,payments:Object.freeze(payments)});
  });
  return Object.freeze({schemaVersion:2,reportType:'PROFESSIONAL_CUSTOMER_HISTORY',language,
    customer:Object.freeze({displayName:name}),
    summary:Object.freeze({activeJobs:jobs.filter(job=>job.completionState==='ACTIVE').length,
      completedJobs:jobs.filter(job=>job.completionState==='COMPLETED').length,quotes:quotes.length,invoices:invoices.length,
      documents:quotes.length+invoices.length,photos:media.length}),jobReports:Object.freeze(jobReports)});
}

export async function loadProfessionalCustomerHistoryReport({ authority, displayName, language, setPage,
  readNative = fetchNativeCustomerHistory, readRelationship = getBusinessCustomerRelationshipActivity }) {
  let history;
  if (authority.kind === 'MEETRO_ACCOUNT') {
    history = await readNative({...authority,setPage,limit:50});
    const cursors = new Set();
    while (history.pagination.nextCursor) {
      const cursor = history.pagination.nextCursor;
      if (cursors.has(cursor)) throw new TypeError('Customer History pagination repeated.');
      cursors.add(cursor);
      const page = await readNative({...authority,setPage,limit:50,cursor});
      history = mergeNativeCustomerHistoryPage(history,page);
    }
  } else {
    history = await readRelationship({relationshipId:authority.relationshipId,setPage});
  }
  return buildProfessionalCustomerHistoryReportModel({authority,history,displayName,language});
}
