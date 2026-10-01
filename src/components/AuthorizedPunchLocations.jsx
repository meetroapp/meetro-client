import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPunchLocationManagement, saveAssignmentPunchSite, changePunchSiteAuthorization, createPunchLocationPolicy } from '../utils/punchLocationApi.js';
import { captureBusinessSitePosition } from '../utils/businessSiteCapture.js';
import '../styles/authorizedPunchLocations.css';
const sourceLabel = source => ({ordinary_request_selection:'Job Request',existing_customer_request:'Job Request',business_customer:'Business Customer Job',emergency_request:'Emergency Job'}[source]||'Job');
const addressText = address => address?.text||[address?.line1,address?.city,address?.region,address?.postalCode,address?.countryCode].filter(Boolean).join(', ');
const key = () => globalThis.crypto?.randomUUID?.()||`site-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emptyForm = () => ({kind:'MANUAL_BUSINESS',label:'',address:{line1:'',city:'',region:'',postalCode:'',countryCode:''},policyId:'',capture:null,confirmed:false,editing:null});
const policySummary = policy => policy?`${policy.radiusMeters} m radius · ${policy.maxAccuracyMeters} m maximum accuracy · ${policy.maxSampleAgeSeconds} s sample age · ${policy.maxFutureSkewSeconds} s future tolerance`:'Policy unavailable';
export default function AuthorizedPunchLocations({businessId,assignmentId,employeeMembershipId,setPage,onClose}) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[capturing,setCapturing]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[form,setForm]=useState(emptyForm),[retry,setRetry]=useState(null);
  const [policyDraft,setPolicyDraft]=useState({radiusMeters:'',maxAccuracyMeters:'',maxSampleAgeSeconds:'',maxFutureSkewSeconds:''});
  const alive=useRef(true),generation=useRef(0),readGeneration=useRef(0);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  const resetForm=()=>{generation.current++;setCapturing(false);setForm(emptyForm());};
  const load=useCallback(async()=>{
    const request=++readGeneration.current;setLoading(true);
    try{const result=await fetchPunchLocationManagement({businessId,assignmentId,employeeMembershipId},setPage);if(alive.current&&request===readGeneration.current)setData(result);}
    catch(e){if(alive.current&&request===readGeneration.current){setData(null);setError(e.message);}}
    finally{if(alive.current&&request===readGeneration.current)setLoading(false);}
  },[businessId,assignmentId,employeeMembershipId,setPage]);
  useEffect(()=>{const timer=window.setTimeout(load,0);return ()=>window.clearTimeout(timer);},[load]);
  const policies=(data?.policies||[]).filter(item=>item.state==='ACTIVE');
  const chosenPolicy=policies.find(item=>item.id===form.policyId);
  const canManage=Boolean(data?.canManage&&data.assignment?.currentAuthority);
  function binding(expectedVersion){return {businessId,employeeMembershipId,expectedAssignmentVersion:data.assignment.version,assignmentActivationVersion:data.assignment.activationVersion,expectedVersion,idempotencyKey:key()};}
  async function execute(method,payload) {
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      if(method==='site')await saveAssignmentPunchSite(assignmentId,payload,setPage);
      else if(method==='authorization')await changePunchSiteAuthorization(assignmentId,payload,setPage);
      else await createPunchLocationPolicy(payload,setPage);
      if(!alive.current)return;
      setRetry(null);resetForm();setNotice('The location authority was recorded.');await load();
    }catch(e){
      if(!alive.current)return;
      if(e.status===409){setRetry(null);resetForm();await load();setError(`${e.message} Review the refreshed locations before trying again.`);}
      else{setError(e.message);if(!e.status||e.status>=500)setRetry({method,payload});else setRetry(null);if(e.status===403)setData(null);}
    }finally{if(alive.current)setBusy(false);}
  }
  async function capture() {
    const request=++generation.current;setCapturing(true);setError('');setForm(current=>({...current,capture:null,confirmed:false}));
    try{const position=await captureBusinessSitePosition();if(alive.current&&request===generation.current)setForm(current=>({...current,capture:position,confirmed:false}));}
    catch(e){if(alive.current&&request===generation.current)setError(e.message);}
    finally{if(alive.current&&request===generation.current)setCapturing(false);}
  }
  function save(event) {
    event.preventDefault();if(!canManage||!chosenPolicy||!form.capture||!form.confirmed)return;
    const editing=form.editing;
    execute('site',{...binding(editing?.association?.version||0),site:{...(editing?{id:editing.id}:{}),expectedVersion:editing?.version||0,kind:form.kind,label:form.label,
      ...(form.kind==='MANUAL_BUSINESS'?{address:form.address}:{customerSourceRevision:data.customerLocation?.source?.revision}),policyId:chosenPolicy.id,policyVersion:chosenPolicy.version,capture:form.capture}});
  }
  function edit(site) {
    generation.current++;setCapturing(false);setError('');setNotice('');setForm({kind:site.kind,label:site.label,address:site.kind==='MANUAL_BUSINESS'?site.address:emptyForm().address,policyId:policies.some(p=>p.id===site.policyId)?site.policyId:'',capture:null,confirmed:false,editing:site});
  }
  function createPolicy(event) {
    event.preventDefault();const entries=Object.entries(policyDraft);
    if(entries.some(([,v])=>!v.trim())){setError('Enter every policy value explicitly.');return;}
    const policy=Object.fromEntries(entries.map(([k,v])=>[k,Number(v)]));
    execute('policy',{businessId,expectedVersion:0,state:'ACTIVE',policy,idempotencyKey:key()});
  }
  const disabled=busy||loading||Boolean(retry);
  const associated=(data?.sites||[]).filter(site=>site.association);
  const available=(data?.sites||[]).filter(site=>site.currentAuthority&&!site.currentAuthorization);
  return <section className="authorized-punch-locations" aria-label="Authorized Punch Locations">
    <header className="punch-locations-heading"><div><h3>Authorized Punch Locations</h3>{data&&<p>{data.assignment.memberName} · {data.assignment.jobTitle} · {sourceLabel(data.assignment.sourceType)}</p>}</div>{onClose&&<button type="button" onClick={onClose}>Close locations</button>}</header>
    <p className="punch-locations-note">Configure the locations authorized for this employee assignment. Proximity verification is not enabled.</p>
    {error&&<p role="alert" className="punch-locations-error">{error}</p>}{notice&&<p role="status" className="punch-locations-notice">{notice}</p>}
    {loading&&<p role="status">Loading assignment locations…</p>}
    {retry&&<div className="punch-locations-actions"><p>The result could not be confirmed. Retry the same request, or refresh before making new changes.</p><button disabled={busy} onClick={()=>execute(retry.method,retry.payload)}>Retry saved request</button><button disabled={busy} onClick={()=>{setRetry(null);resetForm();load();}}>Refresh before new changes</button></div>}
    {data&&<>
      {!canManage&&<p>This assignment is inactive or no longer available for location changes.</p>}
      <div className="punch-location-list">{associated.length?associated.map(site=>{
        const policy=data.policies.find(p=>p.id===site.policyId&&p.version===site.policyVersion);
        const state=site.currentAuthorization?'Active':site.association.state==='REVOKED'?'Revoked':'Needs review';
        return <article className="punch-location-card" key={site.id} data-punch-site={site.id}>
          <div className="punch-locations-heading"><h4>{site.label}</h4><span className={`punch-site-state ${state==='Active'?'active':''}`}>{state}</span></div>
          <p>{site.kind==='CUSTOMER_JOB'?`Customer Job location · ${sourceLabel(site.source?.type)}`:'Manual business location'}</p>
          <p>{addressText(site.address)||'Customer location reference changed; review before activating.'}</p>
          <p>{policySummary(policy)} · Site v{site.version} · Authorization v{site.association.version}</p>
          {site.geometryCapture&&<p>Business foreground capture · Accuracy {site.geometryCapture.accuracyMeters} m · {new Date(site.geometryCapture.sampledAt).toLocaleString()}</p>}
          <div className="punch-locations-actions">
            {site.association.state==='ACTIVE'&&<button disabled={disabled||!canManage} onClick={()=>execute('authorization',{...binding(site.association.version),siteId:site.id,siteVersion:site.association.siteVersion,state:'REVOKED'})}>Revoke authorization</button>}
            {!site.currentAuthorization&&site.currentAuthority&&<button disabled={disabled||!canManage} onClick={()=>execute('authorization',{...binding(site.association.version),siteId:site.id,siteVersion:site.version,state:'ACTIVE'})}>Activate authorization</button>}
            <button disabled={disabled||!canManage} onClick={()=>edit(site)}>Create new site version</button>
          </div>
          <details><summary>Authorization history</summary><ol>{site.history.map(item=><li key={item.version}>{item.state==='ACTIVE'?'Authorized':'Revoked'} · {item.label} · Site v{item.siteVersion} · Authorization v{item.version} · {new Date(item.createdAt).toLocaleString()}</li>)}</ol></details>
        </article>;
      }):<p>No locations have been authorized for this employee assignment.</p>}</div>
      {canManage&&<>
        {!data.customerLocation&&<p>No authorized customer Job location is available. Configure a structured business location instead.</p>}
        {available.length>0&&<details className="punch-location-card"><summary>Authorize an existing business location</summary>{available.map(site=><div key={site.id} className="punch-locations-heading"><p><strong>{site.label}</strong> · {site.kind==='CUSTOMER_JOB'?'Customer Job location':'Manual business location'} · v{site.version}</p><button disabled={disabled} onClick={()=>execute('authorization',{...binding(site.association?.version||0),siteId:site.id,siteVersion:site.version,state:'ACTIVE'})}>Authorize {site.label}</button></div>)}</details>}
        {!policies.length&&<p>An Owner must create an explicit location policy before a site can be authorized.</p>}
        {data.canManagePolicy&&<details className="punch-location-card"><summary>Create location policy</summary><form onSubmit={createPolicy}><fieldset disabled={disabled}><legend>Explicit business policy</legend><div className="punch-location-fields">{[['radiusMeters','Radius (meters)',1],['maxAccuracyMeters','Maximum accuracy (meters)',1],['maxSampleAgeSeconds','Maximum sample age (seconds)',1],['maxFutureSkewSeconds','Future sample tolerance (seconds)',0]].map(([field,label,min])=><label key={field}>{label}<input type="number" min={min} step={field.includes('Seconds')?'1':'any'} required value={policyDraft[field]} onChange={event=>setPolicyDraft(current=>({...current,[field]:event.target.value}))}/></label>)}</div><button className="punch-primary" type="submit">Create policy</button></fieldset></form></details>}
        {policies.length>0&&<form onSubmit={save} className="punch-location-card"><fieldset disabled={disabled}><legend>{form.editing?'Create new site version':'Add authorized location'}</legend>
          {form.editing&&<p>Changing this site creates a new version. Other assignments using an older version will need review.</p>}
          <div className="punch-location-fields">
            <label>Location source<select aria-label="Location source" value={form.kind} disabled={Boolean(form.editing)} onChange={event=>{generation.current++;setCapturing(false);setForm(current=>({...current,kind:event.target.value,capture:null,confirmed:false}));}}><option value="MANUAL_BUSINESS">Manual business location</option><option value="CUSTOMER_JOB" disabled={!data.customerLocation}>Customer Job location</option></select></label>
            <label>Site name<input required maxLength={200} value={form.label} onChange={event=>setForm(current=>({...current,label:event.target.value}))}/></label>
            <label>Location policy<select aria-label="Location policy" required value={form.policyId} onChange={event=>setForm(current=>({...current,policyId:event.target.value}))}><option value="">Choose policy</option>{policies.map((policy,index)=><option key={policy.id} value={policy.id}>Policy {index+1} · {policy.radiusMeters} m radius · v{policy.version}</option>)}</select></label>
          </div>
          {chosenPolicy&&<p>{policySummary(chosenPolicy)}</p>}
          {form.kind==='CUSTOMER_JOB'?<p>Canonical {sourceLabel(data.assignment.sourceType)} location: {addressText(data.customerLocation?.address)||'Unavailable'}</p>:<div className="punch-location-fields">{[['line1','Street address'],['city','City'],['region','State / region'],['postalCode','Postal code'],['countryCode','Country code (two letters)']].map(([field,label])=><label key={field}>{label}<input required maxLength={field==='countryCode'?2:field==='line1'?500:field==='postalCode'?32:120} value={form.address[field]||''} pattern={field==='countryCode'?'[A-Z]{2}':undefined} onChange={event=>{generation.current++;setCapturing(false);setForm(current=>({...current,address:{...current.address,[field]:field==='countryCode'?event.target.value.toUpperCase():event.target.value},capture:null,confirmed:false}));}}/></label>)}</div>}
          <p>Go to this location before capturing. Your browser will request a single foreground position.</p>
          <button type="button" disabled={capturing} onClick={capture}>{capturing?'Capturing location…':'Use Current Location'}</button>
          {form.capture&&<div className="punch-site-capture"><p role="status">Position captured · Accuracy {form.capture.accuracyMeters} m · {new Date(form.capture.sampledAt).toLocaleString()}</p><label className="punch-confirm"><input type="checkbox" checked={form.confirmed} onChange={event=>setForm(current=>({...current,confirmed:event.target.checked}))}/>I am at this location and confirm this position for the named site.</label></div>}
          <div className="punch-locations-actions"><button className="punch-primary" type="submit" disabled={!form.capture||!form.confirmed||!chosenPolicy||capturing}>{busy?'Recording…':'Save and authorize location'}</button>{form.editing&&<button type="button" onClick={resetForm}>Cancel new version</button>}</div>
        </fieldset></form>}
      </>}
      <button disabled={busy} type="button" onClick={()=>{setError('');setRetry(null);resetForm();load();}}>Refresh locations</button>
    </>}
  </section>;
}
