// Canonical-shaped local fixtures; no live requests or mutations.
const records = [
  {
    "invoiceId": "942ecbcb-6944-4c59-a008-2db92cdfb611",
    "invoiceNumber": "INV-942ECBCB6944",
    "jobId": "4790b6f0-a802-4eb0-b238-802d39a4e69b",
    "sourceType": "emergency_request",
    "sourceLabel": "Emergency",
    "requestId": null,
    "relationshipId": 359,
    "customerName": "Fixture Customer 1",
    "serviceTitle": "Emergency kitchen repair",
    "currentVersion": 3,
    "status": "PAID",
    "currency": "USD",
    "totalMinor": 24000,
    "paidMinor": 24000,
    "balanceMinor": 0,
    "invoiceDate": "2026-09-29",
    "due": {
      "mode": "DUE_ON_RECEIPT",
      "date": null
    },
    "issuedAt": "2026-09-29T02:35:20.297Z"
  },
  {
    "invoiceId": "45f7a357-a55d-4e95-b5ac-a9edc6c12a81",
    "invoiceNumber": "INV-45F7A357A55D",
    "jobId": "8da789de-6195-47da-93a8-58918e934bad",
    "sourceType": "emergency_request",
    "sourceLabel": "Emergency",
    "requestId": null,
    "relationshipId": 360,
    "customerName": "Fixture Customer 2",
    "serviceTitle": "Emergency bathroom repair",
    "currentVersion": 3,
    "status": "PAID",
    "currency": "USD",
    "totalMinor": 25000,
    "paidMinor": 25000,
    "balanceMinor": 0,
    "invoiceDate": "2026-09-28",
    "due": {
      "mode": "DUE_ON_RECEIPT",
      "date": null
    },
    "issuedAt": "2026-09-28T15:27:05.366Z"
  },
  {
    "invoiceId": "93792224-2cfd-44d0-ada7-8efd5e48a5da",
    "invoiceNumber": "INV-937922242CFD",
    "jobId": "072c8736-5d97-4253-ba3e-dd1bce281a20",
    "sourceType": "ordinary_request_selection",
    "requestId": 23,
    "relationshipId": 345,
    "customerName": "Fixture Customer 3",
    "serviceTitle": "Standard cabinet repair",
    "currentVersion": 3,
    "status": "PAID",
    "currency": "USD",
    "totalMinor": 68000,
    "paidMinor": 68000,
    "balanceMinor": 0,
    "invoiceDate": "2026-08-29",
    "due": {
      "mode": "DUE_ON_RECEIPT",
      "date": null
    },
    "issuedAt": "2026-09-01T15:35:43.048Z"
  }
];
export const periods = ['THIS_MONTH','LAST_30_DAYS','LAST_90_DAYS','THIS_YEAR'];
export const canonicalInvoiceIds = records.map(row => row.invoiceId);
export function workspaceFixture(period, { workflow = false } = {}) {
  const year = period === 'THIS_YEAR';
  const invoices = structuredClone(records);
  if (workflow) {
    invoices.push({ ...records[2], invoiceId:'11111111-1111-4111-8111-111111111111', jobId:'22222222-2222-4222-8222-222222222222', invoiceNumber:'INV-FIXTURE-DRAFT',status:'DRAFT',totalMinor:10000,paidMinor:0,balanceMinor:10000,issuedAt:null });
    if(year) invoices.push({ ...records[2], invoiceId:'33333333-3333-4333-8333-333333333333',jobId:'44444444-4444-4444-8444-444444444444',invoiceNumber:'INV-FIXTURE-OLDER',totalMinor:10000,paidMinor:10000,balanceMinor:0,issuedAt:'2026-03-15T16:00:00Z',invoiceDate:'2026-03-15' });
  }
  const extra=workflow && year ? 10000:0;
  return {contractVersion:1,limit:50,readyJobs:[],invoices,
    summary:{readyToInvoice:0,drafts:workflow?1:0,waitingForPayment:0,paid:year&&workflow?4:3,totalOutstandingMinor:null,currency:null},
    revenue:{state:'READY',period,timeZone:'America/New_York',localStartDate:period==='THIS_YEAR'?'2026-01-01':period==='LAST_90_DAYS'?'2026-07-03':'2026-09-01',localEndDateExclusive:year?'2027-01-01':'2026-10-01',currency:'USD',cashReceivedMinor:(['THIS_MONTH','LAST_30_DAYS'].includes(period)?66000:117000)+extra,invoicedMinor:117000+extra,outstandingMinor:0,paidInvoices:3+(extra?1:0)}};
}
