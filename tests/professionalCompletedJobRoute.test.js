import assert from "node:assert/strict";
import test from "node:test";
import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {JSDOM} from "jsdom";
import {createServer} from "vite";
import {buildProfessionalWorkCenterRoute,parseProfessionalWorkCenterRoute} from "../src/utils/professionalWorkCenterRoute.js";
import {resolveProfessionalWorkCenterRoute} from "../src/utils/professionalWorkCenterRouteResolution.js";
import {fetchProfessionalJobHistoryDetail} from "../src/utils/jobCompletionApi.js";
import {DONE,ACTIVE_B,ACTIVE_C,UNKNOWN,activeEntries,history,invoice} from "./browser/professionalCompletedJobRouteData.js";
const route = jobId => buildProfessionalWorkCenterRoute({jobId,returnPage:"customerRelationshipsCenter"});
const resolve = (jobId,entries=activeEntries) => resolveProfessionalWorkCenterRoute({route:route(jobId),sourceState:{status:"ready",entries}});

test("exact completed route survives parsing and resolves through History, never active B/C with identical names/titles",()=>{
  assert.equal(parseProfessionalWorkCenterRoute("#"+route(DONE)).jobId,DONE);
  for(const entries of [activeEntries,[...activeEntries].reverse()]) {
    const result=resolve(DONE,entries);assert.equal(result.kind,"history");assert.equal(result.target.jobId,DONE);assert.equal(result.entry,undefined);
    assert.deepEqual(entries.map(e=>e.jobId).sort(),[ACTIVE_B,ACTIVE_C]);
  }
});
test("active exact route keeps its existing canonical entry and does not enter History",()=>{
  for(const id of [ACTIVE_B,ACTIVE_C]) {const result=resolve(id);assert.equal(result.kind,"active");assert.equal(result.entry.jobId,id);}
});
test("completion recognized in an ordinary discovery entry also opens read-only History",()=>{
  const entry={...activeEntries[0],jobId:DONE,liveJob:{...activeEntries[0].liveJob,jobId:DONE,stage:{code:"JOB_COMPLETED",label:"Completed"}}};
  assert.equal(resolve(DONE,[entry]).kind,"history");
});
test("cold refresh/loading masks unrelated active selections, and fresh resolution preserves exact identity",()=>{
  for(let reload=0;reload<2;reload++) {
    const pending=resolveProfessionalWorkCenterRoute({route:"#"+route(DONE),sourceState:{status:"loading",entries:activeEntries}});
    assert.equal(pending.kind,"loading");assert.equal(pending.target.jobId,DONE);assert.equal(pending.entry,undefined);
    assert.equal(resolve(DONE).kind,"history");
  }
});
test("malformed routes fail closed; unknown exact IDs request their own read; unscoped Work Center retains list behavior",()=>{
  for(const bad of ["workCenter?jobId=wrong","workCenter?jobId=","workCenter?jobId="+DONE+"&unexpected=true"]) {
    assert.deepEqual(resolveProfessionalWorkCenterRoute({route:bad,sourceState:{status:"ready",entries:activeEntries}}),{kind:"unavailable",target:null});
  }
  assert.equal(resolve(UNKNOWN).kind,"history");assert.equal(resolve(UNKNOWN).target.jobId,UNKNOWN);
  assert.equal(resolveProfessionalWorkCenterRoute({route:"workCenter",sourceState:{status:"ready",entries:activeEntries}}).kind,"list");
});
test("professional exact History authority accepts only matching completed DTOs, rejects denied/unknown/wrong identities and makes GETs only",async()=>{
  const calls=[];
  const read=async(jobId,payload,status=200)=>fetchProfessionalJobHistoryDetail({jobId,authFetchImpl:async(endpoint,options)=>{calls.push({endpoint,options});return {response:{ok:status===200,status},data:status===200?{success:true,jobHistory:payload}:{success:false,code:"JOB_HISTORY_UNAVAILABLE"}};}});
  assert.equal((await read(DONE,history())).jobId,DONE);
  await assert.rejects(read(UNKNOWN,null,404));await assert.rejects(read(UNKNOWN,null,403));
  await assert.rejects(read(DONE,history(ACTIVE_B)));await assert.rejects(read(DONE,{...history(),status:"ACTIVE"}));
  assert.ok(calls.every(c=>c.options.method==="GET"&&c.options.cache==="no-store"));
  assert.ok(calls.every(c=>c.endpoint===`/professional/jobs/${c.endpoint.includes(UNKNOWN)?UNKNOWN:DONE}/history`));
});
test("controlled completed workspace loads exact History and Invoice read-only; Back and denied identity do not substitute records",async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:"http://localhost/"});
  const keys=["window","document","HTMLElement","localStorage","fetch","IS_REACT_ACT_ENVIRONMENT"];
  const old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
  localStorage.setItem("token","local-fixture-only");
  const calls=[];let deny=false;let wrong=false;
  globalThis.fetch=async(url,options={})=>{const path=new URL(String(url)).pathname;calls.push({path,method:options.method||"GET"});
    if(path.endsWith("/history"))return new Response(JSON.stringify(deny?{success:false,code:"JOB_HISTORY_UNAVAILABLE"}:{success:true,jobHistory:history(wrong?ACTIVE_B:DONE)}),{status:deny?403:200});
    if(path.endsWith("/invoice"))return new Response(JSON.stringify({success:true,invoice:invoice()}),{status:200});
    throw Error("Unexpected request "+path);
  };
  const vite=await createServer({root:process.cwd(),configFile:false,cacheDir:"/private/tmp/meetro-63J4E5/ui-vite",optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false}});
  const root=createRoot(document.getElementById("root"));let backs=0;
  try {
    const {default:Workspace}=await vite.ssrLoadModule("/src/components/ProfessionalJobHistoryWorkspace.jsx");
    const render=async(key)=>act(async()=>{root.render(React.createElement(Workspace,{key,requestedJobId:DONE,onBack:()=>backs++}));});
    await render("first");assert.equal(document.querySelector("[data-professional-job-history-detail]").getAttribute("data-professional-job-history-detail"),DONE);
    assert.match(document.body.textContent,/Work Completed/);assert.match(document.body.textContent,/Kitchen sink repair/);assert.match(document.body.textContent,/INV-KITCHEN/);
    assert.equal(document.querySelector("[data-canonical-invoice-id]").getAttribute("data-canonical-job-id"),DONE);
    assert.equal(document.querySelectorAll("form").length,0);
    assert.ok(![...document.querySelectorAll("button")].some(b=>/start work|complete job|record payment|create invoice|schedule|issue quote/i.test(b.textContent)));
    await act(async()=>document.querySelector("button").click());assert.equal(backs,1);
    await render("refresh");assert.match(document.body.textContent,/Work Completed/);
    deny=true;await render("denied");assert.ok(document.querySelector('[role="alert"]'));assert.doesNotMatch(document.body.textContent,/Kitchen sink repair|INV-KITCHEN/);
    deny=false;wrong=true;await render("wrong-identity");assert.ok(document.querySelector('[role="alert"]'));assert.doesNotMatch(document.body.textContent,/Kitchen sink repair|INV-KITCHEN/);
    assert.ok(calls.every(c=>c.method==="GET"));assert.ok(calls.every(c=>c.path.includes(DONE)));
  } finally {await act(async()=>root.unmount());await vite.close();dom.window.close();for(const k of keys){if(old[k]===undefined)delete globalThis[k];else globalThis[k]=old[k];}}
});
