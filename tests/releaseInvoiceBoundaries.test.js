import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as continuity from '../src/utils/quoteToInvoice.js';
const jobId='22222222-2222-4222-8222-222222222222';
const quoteId='33333333-3333-4333-8333-333333333333';
const invoiceId='44444444-4444-4444-8444-444444444444';
const loaded={document:{jobId},authority:{canonicalQuote:{id:quoteId,decisionVersion:2}},paymentEvidence:{jobId,quoteId,quoteVersion:2,receivedMinor:51000}};
const invoice={invoiceId,jobId,lineItems:[{type:'approvedWork',sourceQuoteId:quoteId,sourceQuoteVersion:2}]};
test('Deposit continuation reopens exact canonical Invoice without creation',async()=>{
 const result=await continuity.resolveDepositInvoiceDestination(loaded,{getInvoice:async({jobId:id})=>{assert.equal(id,jobId);return invoice;}});
 assert.equal(result.invoice,invoice);assert.equal(result.paymentEvidence,loaded.paymentEvidence);assert.match(result.route,new RegExp(invoiceId));
});
test('Only canonical missing Invoice permits preparation; errors and conflicting sources block',async()=>{
 assert.equal((await continuity.resolveDepositInvoiceDestination(loaded,{getInvoice:async()=>{throw Object.assign(new Error('missing'),{status:404,code:'INVOICE_UNAVAILABLE'});}})).route,'');
 await assert.rejects(continuity.resolveDepositInvoiceDestination(loaded,{getInvoice:async()=>{throw new Error('offline');}}),/offline/);
 await assert.rejects(continuity.resolveDepositInvoiceDestination(loaded,{getInvoice:async()=>({...invoice,jobId:invoiceId})}),/exact/);
 await assert.rejects(continuity.resolveDepositInvoiceDestination(loaded,{getInvoice:async()=>({...invoice,lineItems:[{type:'approvedWork',sourceQuoteId:invoiceId,sourceQuoteVersion:2}]})}),/exact/);
});
test('Billing uses universal Ask context and no Invoice assistant implementation',()=>{
 const s=readFileSync('src/components/ProfessionalInvoiceWorkspace.jsx','utf8');
 assert.match(s,/useAskMeetroContext\(/);assert.doesNotMatch(s,/ContextualAskMeetro|InvoiceAssistantResult|requestWorkflowIntelligence|recordWorkflowReview/);
 assert.match(s,/invoiceId: selected\?\.invoiceId/);
});
test('Customer review checks exact conversation as well as Job',()=>{
 const s=readFileSync('src/pages/CustomerInvoiceReviewRoute.jsx','utf8');assert.match(s,/invoice\.conversationId === route\.conversationId/);
});
test('Payment history explains applied funds without inventing invoice payments',async()=>{
 const {invoicePaymentProvenance}=await import('../src/utils/invoicePaymentProvenance.js');
 assert.deepEqual(invoicePaymentProvenance({paidMinor:51000,payments:[]}),{invoicePaymentsMinor:0,appliedBeforeInvoiceMinor:51000});
 assert.deepEqual(invoicePaymentProvenance({paidMinor:61000,payments:[{amountMinor:10000}]}),{invoicePaymentsMinor:10000,appliedBeforeInvoiceMinor:51000});
});
test('Billing shows Meetro delivery for issued canonical conversations and retains external reminders',()=>{
 const s=readFileSync('src/components/ProfessionalInvoiceWorkspace.jsx','utf8');assert.match(s,/Send via Meetro/);assert.match(s,/fetchJobCompletionReview/);assert.match(s,/issueCanonicalInvoice/);assert.match(s,/Download PDF \+ Open Email Draft/);assert.match(s,/Copy reminder/);
});
test('All canonical Invoice presentations expose authorized PDF access',()=>{
 const s=readFileSync('src/components/CanonicalInvoiceDetail.jsx','utf8');assert.match(s,/fetchCanonicalInvoicePdf/);assert.match(s,/Preview PDF/);assert.match(s,/Download PDF/);
});
test('Legacy contextual entry delegates to one Universal Ask component',()=>{
 const legacy=readFileSync('src/components/ContextualAskMeetro.jsx','utf8');assert.match(legacy,/UniversalAskMeetroEntry/);assert.doesNotMatch(legacy,/textarea|onRequest|WorkflowMicrophoneInput/);
});
