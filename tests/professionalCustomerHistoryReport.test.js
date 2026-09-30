import assert from 'node:assert/strict';
import test from 'node:test';
import { writeFileSync } from 'node:fs';
import { buildProfessionalCustomerHistoryReportModel, loadProfessionalCustomerHistoryReport } from '../src/utils/professionalCustomerHistoryReport.js';
import { createCustomerJobHistoryPdfArtifact, printCustomerJobHistoryReport, shareCustomerJobHistoryReport, emailCustomerJobHistoryReport } from '../src/utils/customerJobHistoryReport.js';
const A='33333333-3333-4333-8333-333333333333';const B='44444444-4444-4444-8444-444444444444';
const Q='55555555-5555-4555-8555-555555555555';const I='66666666-6666-4666-8666-666666666666';
const REL='77777777-7777-4777-8777-777777777777';const CONTACT='88888888-8888-4888-8888-888888888888';
const at='2026-09-01T12:00:00.000Z';const authority={kind:'MEETRO_ACCOUNT',contractorProfileId:10,homeownerUserId:17};
function fixture() {
 return {contractVersion:2,subject:authority,displayName:'Customer Example',jobs:[
  {jobId:A,serviceTitle:'Active repair',createdAt:at,completedAt:null,completionState:'ACTIVE',sourceType:'ordinary_request_selection'},
  {jobId:B,serviceTitle:'Completed repair',createdAt:at,completedAt:at,completionState:'COMPLETED',sourceType:'emergency_request'}],
  summary:{activeJobs:1,completedJobs:1,quotes:1,invoices:1,documents:2,photos:1},
  quotes:[{quoteId:Q,jobId:A,documentNumber:'Q-1',status:'ISSUED',issuedAt:at,lineageType:'SUPPLEMENTAL_QUOTE',lineageLabel:'Additional',currency:'USD',totalMinor:10000,customerDecision:'APPROVED',privateNotes:'SECRET'}],
  invoices:[{invoiceId:I,jobId:B,invoiceNumber:'INV-1',status:'PAID',issuedAt:at,invoiceDate:'2026-09-01',currency:'USD',totalMinor:10000,paidMinor:10000,balanceMinor:0,processorReference:'SECRET'}],
  documents:[{documentId:Q,parentId:A}],media:[{mediaId:'photo',parentType:'JOB',parentId:A,category:'REQUEST_PHOTO',provenance:'JOB_REQUEST',secureUrl:'https://res.cloudinary.com/demo/image/upload/request.jpg',format:'jpg',createdAt:at,hiddenMedia:'SECRET'}],
  pagination:{limit:50,nextCursor:null},actionBridge:{canStartNewJob:false,conversationId:1},internalCosts:'SECRET',integrityHash:'SECRET'};
}

test('customer report composes exact canonical active and completed Job allowlists',()=>{
 const model=buildProfessionalCustomerHistoryReportModel({authority,history:fixture(),language:'en'});
 assert.equal(model.jobReports.length,2);assert.equal(model.jobReports[0].model.job.status,'ACTIVE');assert.equal(model.jobReports[0].model.job.completedAt,null);
 assert.equal(model.jobReports[0].model.quotes[0].lineageLabel,'Additional');assert.equal(model.jobReports[1].model.invoice.balanceMinor,0);
 assert.equal(model.summary.documents,2);
 assert.doesNotMatch(JSON.stringify(model),/SECRET|integrityHash|privateNotes|processor|actionBridge|conversationId|internalCosts|hiddenMedia/);
 for(const change of [h=>h.subject={...authority,homeownerUserId:18},h=>h.quotes[0].jobId=I,h=>h.media[0].parentId=I,h=>h.pagination.nextCursor='next',h=>h.summary.quotes=2]) {
  const h=structuredClone(fixture());change(h);assert.throws(()=>buildProfessionalCustomerHistoryReportModel({authority,history:h}));
 }
});
test('private Contact report keeps relationship identity and safe Job payment provenance',()=>{
 const h=fixture();const privateAuthority={kind:'PRIVATE_CONTACT',relationshipId:REL,contractorProfileId:10,businessContactId:CONTACT};
 const relationship={id:REL,contractorProfileId:10,businessContactId:CONTACT};
 const activity={...h,relationship,work:h.jobs.map(job=>({...job,title:job.serviceTitle})),deposits:[{jobId:B,state:'SATISFIED',currency:'USD',requiredMinor:1000,appliedMinor:1000}],
   payments:[{jobId:B,kind:'DEPOSIT_RECEIPT',amountMinor:1000,currency:'USD',receivedAt:at,processor:'SECRET'}]};
 const m=buildProfessionalCustomerHistoryReportModel({authority:privateAuthority,history:activity,displayName:'Private customer'});
 assert.equal(m.jobReports[1].model.job.completionSummaryAvailable,false);
 assert.equal(m.jobReports[1].payments[0].amountMinor,1000);assert.equal(m.jobReports[1].model.deposits[0].payments.length,0);
 assert.doesNotMatch(JSON.stringify(m),/SECRET/);
 assert.throws(()=>buildProfessionalCustomerHistoryReportModel({authority:{...privateAuthority,businessContactId:Q},history:activity,displayName:'Same Name'}));
});
test('export reads every native page regardless of the open tab, deduplicates and rejects repeated cursors',async()=>{
 const h=fixture();const calls=[];
 const report=await loadProfessionalCustomerHistoryReport({authority,language:'en',readNative:async options=>{
  calls.push(options);
  return options.cursor ? {...h,jobs:[h.jobs[1]],quotes:[],media:[],documents:[]} : {...h,jobs:[h.jobs[0]],invoices:[],pagination:{limit:50,nextCursor:'page-two'}};
 }});
 assert.equal(calls.length,2);assert.equal(calls[1].cursor,'page-two');assert.equal(report.jobReports.length,2);assert.equal(report.summary.invoices,1);
 await assert.rejects(loadProfessionalCustomerHistoryReport({authority,readNative:async()=>({...h,pagination:{limit:50,nextCursor:'loop'}})}),/repeated/);
});
test('customer Print, Share and Email reuse one PDF artifact path without business mutations',async()=>{
 const model=buildProfessionalCustomerHistoryReportModel({authority,history:fixture()});
 const artifact={fileName:'customer.pdf',blob:new Blob(['pdf'])};const createArtifact=async received=>{assert.equal(received,model);return artifact;};
 const print=await printCustomerJobHistoryReport(model,{createArtifact,previewArtifact:async a=>a===artifact,isNative:false});assert.equal(print.ok,true);
 const share=await shareCustomerJobHistoryReport(model,{createArtifact,shareArtifact:async()=>({ok:true,method:'native-share'})});assert.equal(share.ok,true);
 const email=await emailCustomerJobHistoryReport(model,{isNative:false,openEmailDraft:()=>true,createArtifact:()=>{throw Error('Web Email must only open a draft');}});assert.equal(email.ok,true);
});
test('existing PDF renderer produces one customer report with summary and all Job sections',async()=>{
 const model=buildProfessionalCustomerHistoryReportModel({authority,history:fixture()});
 const artifact=await createCustomerJobHistoryPdfArtifact(model,{fetchImpl:async()=>({ok:false})});
 assert.ok(artifact.doc.getNumberOfPages()>=3);assert.match(artifact.fileName,/Meetro-Customer-History/);
 writeFileSync('/private/tmp/meetro-63J4E3-customer-history.pdf',Buffer.from(await artifact.blob.arrayBuffer()));
 assert.equal(artifact.title,'Professional Customer History Report — Customer Example');
});
