import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { validateNativeCustomerHistory } from '../src/utils/jobCompletionApi.js';
import { mergeNativeCustomerHistoryPage } from '../src/utils/professionalCustomerHistory.js';
import { getCustomerRelationshipsCopy, CUSTOMER_RELATIONSHIPS_LANGUAGES } from '../src/utils/customerRelationshipsLanguage.js';
const JOB='33333333-3333-4333-8333-333333333333';
const DONE='44444444-4444-4444-8444-444444444444';
const Q='55555555-5555-4555-8555-555555555555';
const I='66666666-6666-4666-8666-666666666666';
const at='2026-09-01T12:00:00.000Z';
const subject={kind:'MEETRO_ACCOUNT',contractorProfileId:10,homeownerUserId:17};
function history() {
 const common={currency:'USD',totalMinor:10000,createdAt:at,updatedAt:at,issuedAt:at,lastActivityAt:null,linkedAt:null};
 return {contractVersion:2,subject,actionBridge:{canStartNewJob:false,conversationId:null},displayName:'Same Name',jobs:[
  {jobId:JOB,sourceType:'ordinary_request_selection',serviceTitle:'Active Job',createdAt:at,completedAt:null,completionState:'ACTIVE',approvedQuote:null,completionSummary:{workstreamCount:0,workItemCount:0,customerUpdateCount:0}},
  {jobId:DONE,sourceType:'emergency_request',serviceTitle:'Completed Job',createdAt:at,completedAt:at,completionState:'COMPLETED',approvedQuote:null,completionSummary:{workstreamCount:1,workItemCount:2,customerUpdateCount:3}},
 ],summary:{activeJobs:1,completedJobs:1,quotes:1,invoices:1,documents:2,photos:1},
 quotes:[{...common,quoteId:Q,jobId:JOB,parentQuoteId:DONE,lineageType:'REVISED_QUOTE',lineageLabel:'Revised',documentNumber:'Q-1',status:'ISSUED',classification:null,customerDecision:'APPROVED',decidedAt:at}],
 invoices:[{...common,invoiceId:I,jobId:DONE,invoiceNumber:'INV-1',status:'PARTIALLY_PAID',paidMinor:3000,balanceMinor:7000,invoiceDate:'2026-09-01'}],
 documents:[{documentId:Q,documentType:'QUOTE',documentNumber:'Q-1',parentType:'JOB',parentId:JOB,jobTitle:'Active Job',status:'ISSUED',provenance:'CANONICAL_QUOTE',createdAt:at,issuedAt:at,lastActivityAt:null}],
 media:[{mediaId:'photo',kind:'PHOTO',mediaType:'IMAGE',format:'jpg',secureUrl:'https://res.cloudinary.com/meetro/image/upload/photo.jpg',parentType:'JOB',parentId:JOB,jobTitle:'Active Job',provenance:'JOB_REQUEST',category:'REQUEST_PHOTO',createdAt:at}],pagination:{limit:20,nextCursor:'next-page'}};
}
const validate=value=>validateNativeCustomerHistory(value,{contractorProfileId:10,homeownerUserId:17});
test('full native allowlists reject drafts, unsent documents, private fields, cross-Job records and duplicate rows',()=>{
 assert.ok(validate(history()));
 for(const change of [h=>h.quotes[0].status='DRAFT',h=>h.invoices[0].issuedAt=null,h=>h.invoices[0].status='DRAFT',
  h=>h.quotes[0].jobId=I,h=>h.media[0].parentId=I,h=>h.media[0].secureUrl='https://private.test/photo',
  h=>h.quotes[0].integrityHash='private',h=>h.subject.homeownerUserId=18,h=>h.jobs.push(h.jobs[0]),
  h=>h.quotes.push(h.quotes[0]),h=>h.documents[0].documentId=I,h=>h.summary.activeJobs=-1,h=>h.actionBridge.canStartNewJob=true]) {
  const h=structuredClone(history());change(h);assert.equal(validate(h),null);
 }
});
test('pagination merges all five sections by exact identities and never combines different customers',()=>{
 const h=history();const merged=mergeNativeCustomerHistoryPage(h,history());
 assert.equal(merged.jobs.length,2);assert.equal(merged.quotes.length,1);assert.equal(merged.media.length,1);
 assert.throws(()=>mergeNativeCustomerHistoryPage(h,{...h,subject:{...subject,homeownerUserId:18}}),/exact subject/);
 for(const language of CUSTOMER_RELATIONSHIPS_LANGUAGES) for(const key of ['originalQuote','revisedQuote','additionalQuote']) assert.ok(getCustomerRelationshipsCopy(language)[key]);
});
test('native five tabs render canonical data, exact Job navigation and bounded pagination',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
 const old={window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const vite=await createServer({root:process.cwd(),configFile:false,cacheDir:'/tmp/task63j4e3-ui-vite',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false}});
 const root=createRoot(document.getElementById('root'));const routes=[];let more=0;
 try {
  const {default:Workspace}=await vite.ssrLoadModule('/src/components/NativeCustomerHistoryWorkspace.jsx');
  await act(async()=>root.render(React.createElement(Workspace,{subject,sourceState:{status:'ready',history:validate(history())},language:'en',copy:getCustomerRelationshipsCopy('en'),setPage:r=>routes.push(r),onLoadMore:()=>more++})));
  const buttons=()=>[...document.querySelectorAll('button')];
  assert.deepEqual([...document.querySelectorAll('nav button')].map(b=>b.textContent),['Overview','Jobs','Quotes','Invoices','Documents / Photos']);
  await act(async()=>buttons().find(b=>b.textContent==='Jobs').click());
  assert.match(document.body.textContent,/Active Jobs/);assert.match(document.body.textContent,/Completed Jobs/);
  await act(async()=>document.querySelector('[aria-label="Open Job: Active Job"]').click());
  assert.match(routes[0],new RegExp(`jobId=${JOB}`));
  await act(async()=>buttons().find(b=>b.textContent==='Quotes').click());assert.match(document.body.textContent,/Q-1 · Revised/);
  await act(async()=>buttons().find(b=>b.textContent==='Invoices').click());assert.match(document.body.textContent,/INV-1/);assert.match(document.body.textContent,/\$70.00/);
  await act(async()=>buttons().find(b=>b.textContent==='Documents \/ Photos').click());assert.equal(document.querySelectorAll('img').length,1);
  await act(async()=>buttons().find(b=>b.textContent==='Load more').click());assert.equal(more,1);
  assert.equal(document.querySelectorAll('form').length,0);
  assert.equal(buttons().find(b=>b.textContent==='Start New Job').disabled,true);
  assert.equal(buttons().find(b=>b.textContent==='Message Customer').disabled,true);
 }finally {await act(async()=>root.unmount());await vite.close();dom.window.close();Object.assign(globalThis,old);delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
