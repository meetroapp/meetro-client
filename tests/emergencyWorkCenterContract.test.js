import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCanonicalLiveJobProjection} from '../src/utils/canonicalLiveJobProjection.js';
import {normalizeAuthorizedProfessionalJobs} from '../src/utils/professionalJobPicker.js';
import {hydrateCurrentJobListEntry,getCanonicalCurrentJobIdentityKey} from '../src/utils/workCenterCurrentJobListHydration.js';
import {CANONICAL_WORK_CENTER_AUTHORITY,mergeCanonicalWorkCenterEntries} from '../src/utils/workCenterCanonicalHydration.js';
import {filterWorkCenterSources,getWorkCenterSource} from '../src/utils/workCenterSourcePresentation.js';
import {emergencyPrimaryAction} from '../src/utils/emergencyWorkCenterContract.js';
import {getWorkCenterLifecycleProjectionTarget} from '../src/utils/workCenterLifecycleProjection.js';
import {runEmergencyWorkCenterTransition} from '../src/utils/emergencyWorkCenterActions.js';
import {resolveWorkCenterLifecyclePresentation} from '../src/utils/workCenterLifecyclePresentation.js';
import {validateInvoice,validateInvoiceWorkspace} from '../src/utils/invoicePaymentApi.js';
import {validateJobCompletionReview,validateJobHistoryDetail,validateProfessionalJobHistory} from '../src/utils/jobCompletionApi.js';
import {validateCanonicalQuoteProjection} from '../src/utils/canonicalQuoteRead.js';
import {normalizePreWorkDeposit} from '../src/utils/preWorkDepositApi.js';
import {validateCanonicalEvaluationProjection} from '../src/utils/canonicalEvaluation.js';
const f=JSON.parse(readFileSync(new URL('./fixtures/emergencyCertifiedResponses.json',import.meta.url)));
const entry={...f.picker.jobs[0],id:'emergency',source:CANONICAL_WORK_CENTER_AUTHORITY,readOnly:true,requestId:null,lifecycleContractVersion:2};
const normal={id:'normal',requestId:12,relationshipId:4,sourceType:'ordinary_request_selection'};
const transport=data=>({response:{ok:true,status:200},data});
test('Emergency detail targets the exact Job without an ordinary Request ID',()=>{
 assert.deepEqual(getWorkCenterLifecycleProjectionTarget(entry),{available:true,reason:'',postId:null,jobId:entry.jobId});
 assert.equal(getWorkCenterLifecycleProjectionTarget({...entry,relationshipId:null}).available,false);
});
for(const [name,payload] of Object.entries(f.stages))test(`certified PostgreSQL live response: ${name}`,async()=>{
 const live=normalizeCanonicalLiveJobProjection(payload);assert.ok(live,name);
 assert.equal(live.stage.code,payload.liveJob.stage.code);assert.equal(live.stage.label,payload.liveJob.stage.label);
 assert.deepEqual(emergencyPrimaryAction(live),payload.liveJob.nextAction.available?payload.liveJob.nextAction:null);
 const paths=[];const hydrated=await hydrateCurrentJobListEntry({entry,authFetchImpl:async path=>{paths.push(path);return transport(payload);}});
 assert.equal(hydrated.liveJobStatus,'ready');assert.equal(hydrated.requestId,null);assert.equal(hydrated.liveJob.conversationId,f.identity.conversationId);
 assert.deepEqual(paths,[`/jobs/${f.identity.jobId}/live-state`]);
 assert.doesNotMatch(JSON.stringify(resolveWorkCenterLifecyclePresentation({liveJob:live})),/schedule|visit|workstream|work.?plan/i);
});
test('picker, mixed-source filtering and source-scoped identities',()=>{
 const jobs=normalizeAuthorizedProfessionalJobs(f.picker);assert.equal(jobs[0].sourceType,'emergency_request');assert.equal(getWorkCenterSource(normal),'request');
 assert.equal(filterWorkCenterSources([normal,entry],'all').length,2);assert.deepEqual(filterWorkCenterSources([normal,entry],'request'),[normal]);assert.deepEqual(filterWorkCenterSources([normal,entry],'emergency'),[entry]);
 assert.match(getCanonicalCurrentJobIdentityKey(entry),/^emergency:/);assert.equal(mergeCanonicalWorkCenterEntries([], [entry,{...entry,jobId:'22222222-2222-4222-8222-222222222222'}]).length,2);
 assert.equal(getWorkCenterSource({requestId:null,title:'Emergency leak'}),'unknown');
});
test('failed or mismatched live reads keep Emergency identity and expose no primary action',async()=>{
 for(const result of [{response:{ok:false,status:503},data:{}},transport({...f.stages.assigned,liveJob:{...f.stages.assigned.liveJob,relationshipId:999}})]){
  const hydrated=await hydrateCurrentJobListEntry({entry,authFetchImpl:async()=>result});assert.equal(hydrated.sourceType,'emergency_request');assert.equal(hydrated.liveJob,null);assert.equal(emergencyPrimaryAction(hydrated.liveJob),null);assert.deepEqual(resolveWorkCenterLifecyclePresentation({liveJob:null,sourceType:hydrated.sourceType}).stages,[]);
 }
 const blocked={...f.stages.readyToStart.liveJob,nextAction:{...f.stages.readyToStart.liveJob.nextAction,available:false},availableActions:[]};assert.equal(emergencyPrimaryAction(normalizeCanonicalLiveJobProjection({liveJob:blocked})),null);
});
for(const [state,action,result,path] of [['assigned','MARK_EN_ROUTE','enRoute','en-route'],['onTheWay','MARK_ARRIVED','arrived','arrived'],['readyToStart','START_WORK','started','start'],['working','COMPLETE_WORK','completed','complete']])test(`dispatch ${action} refreshes authority and uses only the Emergency endpoint`,async()=>{
 const calls=[];await runEmergencyWorkCenterTransition({record:entry,action,authFetchImpl:async(url,options)=>{calls.push([url,options]);return transport(url.endsWith('live-state')?f.stages[state]:f[result]);}});
 assert.equal(calls[1][0],`/emergency-requests/${entry.emergencyRequestId}/${path}`);assert.equal(calls[1][1].method,'POST');
});
test('stale Start/Complete authority sends no mutation',async()=>{
 let count=0;await assert.rejects(runEmergencyWorkCenterTransition({record:entry,action:'START_WORK',authFetchImpl:async()=>{count++;return transport(f.stages.depositDue);}}));assert.equal(count,1);
});
test('canonical Evaluation and Quote responses validate with exact Emergency context',()=>{
 for(const k of ['evaluationDraft','evaluationComplete'])assert.ok(validateCanonicalEvaluationProjection(f[k]),k);
 for(const k of ['quoteDraft','quoteScoped','quoteIssued','quoteApproved']){
  assert.ok(validateCanonicalQuoteProjection(f[k].quote,{sourceContext:f.stages.quoteRequired.liveJob}),k);
  assert.equal(validateCanonicalQuoteProjection(f[k].quote),null,'null Request alone is insufficient');
  assert.equal(validateCanonicalQuoteProjection(f[k].quote,{sourceContext:{...f.stages.quoteRequired.liveJob,relationshipId:999}}),null);
 }
 assert.ok(normalizePreWorkDeposit(f.depositRead.deposit,{jobId:entry.jobId}));
});
test('canonical Invoice credit and Paid amounts pass strict source-aware schemas',()=>{
 for(const k of ['readyWorkspace','partialWorkspace','paidWorkspace'])assert.ok(validateInvoiceWorkspace(f[k].workspace),k);
 for(const [k,paid,balance] of [['invoiceDraft',5000,5000],['invoicePartial',5000,5000],['invoicePaid',10000,0]]){
  const invoice=validateInvoice(f[k].invoice,{audience:'professional',jobId:entry.jobId});assert.ok(invoice,k);assert.equal(invoice.sourceType,'emergency_request');assert.deepEqual([invoice.totalMinor,invoice.paidMinor,invoice.balanceMinor],[10000,paid,balance]);
 }
});
test('completion and both History contracts preserve Emergency source and not-applicable records',()=>{
 assert.ok(validateJobCompletionReview(f.completionReview.completionReview,{jobId:entry.jobId}));
 assert.ok(validateProfessionalJobHistory(f.historyList.jobHistory));
 for(const audience of ['professional','customer']){
  const history=validateJobHistoryDetail(f[`${audience}History`].jobHistory,{jobId:entry.jobId,audience});assert.ok(history);assert.equal(history.sourceType,'emergency_request');assert.equal(history.requestId,null);assert.equal(history.relationshipId,entry.relationshipId);assert.equal(history.conversationId,f.identity.conversationId);assert.equal(history.preservedRecords.visits,false);assert.equal(history.preservedRecords.workPlan,false);
 }
});

test('Emergency discovery reports failures and preserves the independently successful source',async()=>{
 const {fetchProfessionalWorkCenterEntries}=await import('../src/utils/professionalWorkCenterDiscovery.js');
 const {STAGING_API_URL}=await import('../src/api.js');
 const options={apiUrl:STAGING_API_URL,authFetchImpl:async path=>path==='/professional/jobs'?transport(f.picker):{response:{ok:false,status:503},data:{}}};
 const partial=await fetchProfessionalWorkCenterEntries(options);
 assert.equal(partial.status,'error');assert.equal(partial.entries[0].jobId,entry.jobId);assert.equal(partial.entries[0].requestId,null);
 const failed=await fetchProfessionalWorkCenterEntries({apiUrl:STAGING_API_URL,authFetchImpl:async()=>{throw Error('Network unavailable');}});
 assert.equal(failed.status,'error');assert.equal(failed.reason,'PROFESSIONAL_JOBS_FETCH_FAILED');
 let called=false;const disabled=await fetchProfessionalWorkCenterEntries({apiUrl:'https://unsupported.invalid',authFetchImpl:async()=>{called=true;}});
 assert.equal(disabled.status,'disabled');assert.equal(called,false);
});
