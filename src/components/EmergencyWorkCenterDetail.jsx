import { useEffect, useRef, useState } from 'react';
import { WorkCenterSourceBadge } from './WorkCenterSource.jsx';
import ProfessionalDepositCard from './ProfessionalDepositCard.jsx';
import CompletedJobInvoiceHandoff from './CompletedJobInvoiceHandoff.jsx';
import ProfessionalInvoiceWorkspace from './ProfessionalInvoiceWorkspace.jsx';
import CanonicalInvoiceDetail from './CanonicalInvoiceDetail.jsx';
import QuoteDeliveryActions from './QuoteDeliveryActions.jsx';
import { emergencyPrimaryAction, emergencyIdentityMatches } from '../utils/emergencyWorkCenterContract.js';
import { runEmergencyWorkCenterTransition } from '../utils/emergencyWorkCenterActions.js';
import { canonicalEvaluationContentToForm } from '../utils/canonicalEvaluation.js';
import { loadCanonicalEvaluationForRecord, saveCanonicalEvaluationDraft, completeCanonicalEvaluationDraft } from '../utils/evaluationAuthorityController.js';
import { validateCanonicalQuoteProjection } from '../utils/canonicalQuoteRead.js';
import { fetchProfessionalJobHistoryDetail } from '../utils/jobCompletionApi.js';
import { fetchProfessionalJobInvoice } from '../utils/invoicePaymentApi.js';
import { authFetch } from '../utils/authFetch.js';
import './EmergencyWorkCenterDetail.css';

function EmergencyEvaluation({record,liveJob,setPage,onRefresh}) {
  const [state,setState]=useState({loading:true,evaluation:null,error:''});
  const [form,setForm]=useState({serviceType:record.serviceSpecialty||'',context:'emergency_request',notes:'',findings:''});
  const [pending,setPending]=useState(false);
  useEffect(()=>{
    let active=true;
    loadCanonicalEvaluationForRecord({record,setPage}).then(evaluation=>{
      if(!active)return;
      if(evaluation && (evaluation.aggregate.sourceContext.emergencyRequestId !== record.emergencyRequestId || evaluation.aggregate.sourceContext.relationshipId !== record.relationshipId)) throw Error('Evaluation identity could not be confirmed.');
      setState({loading:false,evaluation,error:''});
      if(evaluation)setForm(current=>canonicalEvaluationContentToForm(evaluation,current)||current);
    }).catch(error=>active&&setState({loading:false,evaluation:null,error:error.message}));
    return()=>{active=false;};
  },[record,setPage]);
  const editable=!state.loading && !state.error && ['START_EVALUATION','EDIT_EVALUATION'].includes(emergencyPrimaryAction(liveJob)?.code) && state.evaluation?.evaluation.status!=='completed';
  async function save(complete) {
    if(!editable || pending)return;
    setPending(true);
    try {
      const evaluation=await (complete?completeCanonicalEvaluationDraft:saveCanonicalEvaluationDraft)({record,form,currentEvaluation:state.evaluation,setPage});
      setState({loading:false,evaluation,error:''});onRefresh();
    }catch(error){setState(current=>({...current,error:error.message}));}finally{setPending(false);}
  }
  return <section aria-label="Emergency Evaluation"><h3>Evaluation</h3>
    {state.loading&&<p role="status">Loading Evaluation…</p>}{state.error&&<p role="alert">{state.error}</p>}
    <label>Observations<textarea value={form.notes} disabled={!editable||pending} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <label>Findings<textarea value={form.findings} disabled={!editable||pending} onChange={e=>setForm({...form,findings:e.target.value,findingRecords:[]})}/></label>
    {editable&&<div className="emergency-work-center__actions"><button disabled={pending} onClick={()=>save(false)}>Save Evaluation</button><button disabled={pending} onClick={()=>save(true)}>Complete Evaluation</button></div>}
    {state.evaluation?.evaluation.status==='completed'&&<p>Evaluation Complete</p>}
  </section>;
}

function EmergencyQuotes({record,liveJob,setPage,onRefresh,language}) {
  const [state,setState]=useState({loading:true,quotes:[],error:''});
  const [form,setForm]=useState({description:'',amount:'',paymentTerms:'Balance due on completion'});
  const [pending,setPending]=useState(false);
  const attempt=useRef({});
  const parse=quote=>validateCanonicalQuoteProjection(quote,{sourceContext:liveJob});
  useEffect(()=>{
    let active=true;
    authFetch(`/jobs/${record.jobId}/quotes`,{cache:'no-store'},setPage).then(({response,data})=>{
      const quotes=response.ok&&data.success&&Array.isArray(data.quotes)?data.quotes.map(q=>validateCanonicalQuoteProjection(q,{sourceContext:liveJob})):null;
      if(!quotes||quotes.some(q=>!q||q.jobId!==record.jobId))throw Error('Quotes could not be confirmed.');
      if(active)setState({loading:false,quotes,error:''});
    }).catch(e=>active&&setState({loading:false,quotes:[],error:e.message}));
    return()=>{active=false;};
  },[record.jobId,liveJob,setPage]);
  async function command(endpoint,body,key) {
    attempt.current[key] ||= crypto.randomUUID();
    const {response,data}=await authFetch(endpoint,{method:'POST',headers:{'Idempotency-Key':attempt.current[key]},body:JSON.stringify(body)},setPage);
    if(!response.ok||!data.success)throw Error(data.message||'The Quote action was rejected.');
    const quote=parse(data.quote);if(!quote||quote.jobId!==record.jobId)throw Error('The Quote response could not be confirmed.');return quote;
  }
  async function create() {
    if(pending||emergencyPrimaryAction(liveJob)?.code!=='CREATE_QUOTE')return;
    setPending(true);
    try {
      const quote=await command(`/jobs/${record.jobId}/quotes`,{currency:'USD',customerTermsSnapshot:{schemaVersion:1,paymentTerms:form.paymentTerms,estimatedDuration:'',customerNotes:'',agreement:{exclusions:[],additionalWorkTerms:'',hiddenConditionsTerms:'',diagnosticTerms:'',customerResponsibilities:'',warrantyTerms:'',cancellationTerms:'',acceptanceTerms:'',preauthorizedAdditionalWorkLimit:''}}},`create:${form.paymentTerms}`);
      setState({loading:false,quotes:[quote,...state.quotes],error:''});onRefresh();
    }catch(e){setState(s=>({...s,error:e.message}));}finally{setPending(false);}
  }
  async function update(quote,issue) {
    if(pending||quote.status!=='DRAFT'||!['CREATE_QUOTE','REVIEW_QUOTE'].includes(emergencyPrimaryAction(liveJob)?.code))return;
    setPending(true);
    try {
      const amount=Math.round(Number(form.amount)*100);
      if(!issue&&(!form.description.trim()||!/^\d+(\.\d{1,2})?$/.test(form.amount)||!Number.isSafeInteger(amount)||amount<=0))throw Error('Enter a description and a positive price with up to two decimal places.');
      const next=await command(`/quotes/${quote.id}/${issue?'issue':'scope-items'}`,issue?{expectedVersion:quote.currentVersion}:{expectedVersion:quote.currentVersion,item:{classification:'LABOR_SERVICE',scopeSemantic:'FUTURE_WORK',materialResponsibility:'NOT_APPLICABLE',description:form.description,quantity:1,unitAmountMinor:amount,source:{type:'MANUAL_PROFESSIONAL'}}},`${quote.id}:${quote.currentVersion}:${issue?'issue':JSON.stringify(form)}`);
      setState(s=>({...s,error:'',quotes:s.quotes.map(q=>q.id===next.id?next:q)}));setForm(s=>({...s,description:'',amount:''}));onRefresh();
    }catch(e){setState(s=>({...s,error:e.message}));}finally{setPending(false);}
  }
  return <section aria-label="Emergency Quote"><h3>Quote</h3>
    {state.loading&&<p role="status">Loading Quotes…</p>}{state.error&&<p role="alert">{state.error}</p>}
    {!state.loading&&!state.error&&emergencyPrimaryAction(liveJob)?.code==='CREATE_QUOTE'&&state.quotes.length===0&&<><label>Payment terms<input value={form.paymentTerms} onChange={e=>setForm({...form,paymentTerms:e.target.value})}/></label><button disabled={pending} onClick={create}>Create Quote</button></>}
    {state.quotes.map(quote=><article key={quote.id}><h4>{quote.status==='DRAFT'?'Draft Quote':quote.decisionState==='APPROVED'?'Approved':quote.decisionState==='DECLINED'?'Declined':'Awaiting Approval'}</h4>
      {quote.scopeItems.map(item=><p key={item.scopeItemId}>{item.description} · {new Intl.NumberFormat(language,{style:'currency',currency:quote.currency}).format(item.lineTotalMinor/100)}</p>)}
      <strong>Total: {new Intl.NumberFormat(language,{style:'currency',currency:quote.currency}).format(quote.totalMinor/100)}</strong>
      {quote.customerTermsSnapshot?.paymentTerms&&<p>{quote.customerTermsSnapshot.paymentTerms}</p>}
      {quote.status==='DRAFT'&&['CREATE_QUOTE','REVIEW_QUOTE'].includes(emergencyPrimaryAction(liveJob)?.code)&&<><label>Scope of work<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Price (USD)<input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><div className="emergency-work-center__actions"><button disabled={pending} onClick={()=>update(quote,false)}>Add scope item</button><button disabled={pending||quote.scopeItemCount===0} onClick={()=>update(quote,true)}>Issue Quote</button></div></>}
      <QuoteDeliveryActions quoteId={quote.id} jobId={record.jobId} quoteStatus={quote.status} quoteContext={record} setPage={setPage} language={language}/>
    </article>)}
  </section>;
}

function EmergencyHistory({record,setPage,language}) {
  const [state,setState]=useState({});
  useEffect(()=>{let active=true;Promise.all([fetchProfessionalJobHistoryDetail({jobId:record.jobId,setPage}),fetchProfessionalJobInvoice({jobId:record.jobId,setPage})]).then(([history,invoice])=>{
    if(history.sourceType!=='emergency_request'||history.relationshipId!==record.relationshipId||history.conversationId!==record.conversationId)throw Error('Emergency History identity could not be confirmed.');
    if(active)setState({history,invoice});
  }).catch(e=>active&&setState({error:e.message}));return()=>{active=false;};},[record.jobId,record.relationshipId,record.conversationId,setPage]);
  return <section aria-label="Emergency History"><h3>History</h3>{state.error?<p role="alert">{state.error}</p>:state.history?<><WorkCenterSourceBadge record={state.history} language={language}/><p>{state.history.serviceTitle} · Completed</p><p>Evaluation, findings, recommendations, and approved Quotes are preserved. Visits and Work Plan are not applicable.</p>{state.invoice&&<CanonicalInvoiceDetail invoice={state.invoice} sourceRecord={state.history} language={language}/>}</>:<p role="status">Loading History…</p>}</section>;
}

export default function EmergencyWorkCenterDetail({record,liveJob,setPage,language='en',onRefresh}) {
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const [opened,setOpened]=useState('');
  const valid=emergencyIdentityMatches(record,liveJob);
  const action=valid?emergencyPrimaryAction(liveJob):null;
  const actionSection={START_EVALUATION:'evaluation',EDIT_EVALUATION:'evaluation',CREATE_QUOTE:'quote',REVIEW_QUOTE:'quote',VIEW_DEPOSIT:'deposit',CREATE_FINAL_INVOICE:'invoice',VIEW_INVOICE:'invoice',VIEW_JOB_HISTORY:'history'}[action?.code]||'';
  const section=opened||actionSection;
  async function primary() {
    if(!action||pending)return;
    if(['MARK_EN_ROUTE','MARK_ARRIVED','START_WORK','COMPLETE_WORK'].includes(action.code)) {
      if(action.code==='COMPLETE_WORK'&&!window.confirm('Confirm this Emergency work is complete?'))return;
      setPending(true);setError('');
      try{await runEmergencyWorkCenterTransition({record,action:action.code,setPage});}catch(e){setError(e.message);}finally{onRefresh();setPending(false);}
    }else setOpened(actionSection);
  }
  return <div className="emergency-work-center" data-emergency-job={record.jobId}>
    <section className="emergency-work-center__current"><WorkCenterSourceBadge record={record} language={language}/><h2>{valid?liveJob.stage.label:'Current status unavailable'}</h2>
      {valid&&liveJob.blocker&&<p>{liveJob.blocker.label}</p>}{error&&<p role="alert">{error}</p>}
      {action&&<button className="emergency-work-center__primary" disabled={pending} onClick={primary}>{pending?'Updating…':action.label}</button>}
      <button disabled={pending} onClick={onRefresh}>Refresh status</button>
    </section>
    {valid&&<nav aria-label="Emergency Job records" className="emergency-work-center__actions">
      {['evaluation','quote',...(liveJob.deposit?['deposit']:[]),...(liveJob.invoice||liveJob.stage.code==='JOB_COMPLETED'?['invoice','history']:[])].map(name=><button key={name} aria-pressed={section===name} onClick={()=>setOpened(name)}>{name[0].toUpperCase()+name.slice(1)}</button>)}
    </nav>}
    {valid&&section==='evaluation'&&<EmergencyEvaluation record={record} liveJob={liveJob} setPage={setPage} onRefresh={onRefresh}/>}
    {valid&&section==='quote'&&<EmergencyQuotes record={record} liveJob={liveJob} setPage={setPage} onRefresh={onRefresh} language={language}/>}
    {valid&&section==='deposit'&&<ProfessionalDepositCard jobId={record.jobId} quoteId={liveJob.quote?.quoteId} sourceType="emergency_request" setPage={setPage} showRequestAction={false} onCanonicalChange={onRefresh}/>}
    {valid&&section==='invoice'&&(liveJob.invoice?<ProfessionalInvoiceWorkspace initialInvoiceId={liveJob.invoice.invoiceId} expectedJobId={record.jobId} language={language} setPage={setPage}/>:<CompletedJobInvoiceHandoff jobId={record.jobId} language={language} setPage={setPage}/>)}
    {valid&&section==='history'&&<EmergencyHistory record={record} setPage={setPage} language={language}/>}
  </div>;
}
