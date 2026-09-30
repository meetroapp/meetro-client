import React from "react";
import {createRoot} from "react-dom/client";
import ContractorDashboard from "../../src/pages/ContractorDashboard.jsx";
import NativeCustomerHistoryWorkspace from "../../src/components/NativeCustomerHistoryWorkspace.jsx";
import BottomNav from "../../src/components/BottomNav.jsx";
import {getCustomerRelationshipsCopy} from "../../src/utils/customerRelationshipsLanguage.js";
import {applyAppLayoutDiagnostics,getDesktopContentMetrics,startAppLayoutCoordinator} from "../../src/utils/appLayout.js";
import {DONE,ACTIVE_B,ACTIVE_C,UNKNOWN,activeEntries,history,invoice,at} from "./professionalCompletedJobRouteData.js";
import "../../src/index.css";
localStorage.setItem("token","local-fixture-only");localStorage.setItem("activeAccountMode","business");localStorage.setItem("hasBusinessProfile","true");
localStorage.setItem("businessName","All Handyman Services");localStorage.setItem("businessCategory","Handyman");
// Intentional cached active selection must not override the requested completed ID.
localStorage.setItem("meetroWorkCenterTab","currentJobs");localStorage.setItem("activeWorkRequestId","12");
const reads=[];
window.__routeFixture={activeEntries};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
window.fetch=async(input,options={})=>{
  const url=new URL(String(input),location.href);const method=options.method||"GET";reads.push({path:url.pathname,method});
  document.documentElement.setAttribute("data-fixture-requests",JSON.stringify(reads));
  if(method!=="GET")throw Error("Fixture forbids mutations: "+method+" "+url.pathname);
  if(url.pathname===`/professional/jobs/${DONE}/history`)return json({success:true,jobHistory:history()});
  if(url.pathname===`/professional/jobs/${DONE}/invoice`)return json({success:true,invoice:invoice()});
  return json({success:false,code:"JOB_HISTORY_UNAVAILABLE"},404);
};
const nativeHistory={contractVersion:2,displayName:"Liam Molina",summary:{activeJobs:2,completedJobs:1,quotes:1,invoices:1,documents:2,photos:0},
 jobs:[...activeEntries.map(e=>({jobId:e.jobId,serviceTitle:e.title,completionState:"ACTIVE",createdAt:at})),{jobId:DONE,serviceTitle:"Kitchen sink repair",completionState:"COMPLETED",completedAt:at}],
 quotes:[{quoteId:"55555555-5555-4555-8555-555555555555",jobId:DONE,documentNumber:"Q-KITCHEN",lineageType:"ORIGINAL_QUOTE",status:"ISSUED",customerDecision:"APPROVED",issuedAt:at,currency:"USD",totalMinor:24000}],
 invoices:[{invoiceId:invoice().invoiceId,jobId:DONE,invoiceNumber:"INV-KITCHEN",status:"PAID",issuedAt:at,currency:"USD",totalMinor:24000,paidMinor:24000,balanceMinor:0}],
 documents:[{documentId:"55555555-5555-4555-8555-555555555555",documentType:"QUOTE",documentNumber:"Q-KITCHEN",parentId:DONE,jobTitle:"Kitchen sink repair",provenance:"CANONICAL_QUOTE"}],
 media:[],actionBridge:{canStartNewJob:false,conversationId:null},pagination:{nextCursor:null}};
function Harness(){
 const [hash,setHash]=React.useState(location.hash);
 const [,setViewportRevision]=React.useState(0);
 React.useEffect(()=>{const update=()=>setHash(location.hash);window.addEventListener("hashchange",update);const resize=()=>setViewportRevision(n=>n+1);window.addEventListener("resize",resize);
   return()=>{window.removeEventListener("hashchange",update);window.removeEventListener("resize",resize);};},[]);
 const navigate=route=>{location.hash=route;document.documentElement.setAttribute("data-fixture-route",route);};
 if(hash.startsWith("#workCenter"))return <ContractorDashboard setPage={navigate}/>;
 return <div className="app-page meetro-responsive-page" style={{padding:16,minWidth:0}}>
  <h1>Customer History — Liam Molina</h1>
  <NativeCustomerHistoryWorkspace subject={{kind:"MEETRO_ACCOUNT",contractorProfileId:10,homeownerUserId:17}} sourceState={{status:"ready",history:nativeHistory}}
    copy={getCustomerRelationshipsCopy("en")} setPage={navigate}/>
  <button onClick={()=>navigate(`workCenter?jobId=${UNKNOWN}&returnPage=customerRelationshipsCenter`)}>Unknown exact Job fixture</button>
  <button onClick={()=>navigate("workCenter?jobId=malformed")}>Malformed exact Job fixture</button>
  <BottomNav setPage={navigate} currentPage="customerRelationshipsCenter"/>
 </div>;
}
const element=document.getElementById("root");applyAppLayoutDiagnostics(element,getDesktopContentMetrics());window.addEventListener("pagehide",startAppLayoutCoordinator({root:element}),{once:true});createRoot(element).render(<Harness/>);
