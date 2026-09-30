import React from "react";
import {createRoot} from "react-dom/client";
import Home from "../../src/pages/Home.jsx";
import {setLanguage} from "../../src/utils/language.js";
import {jobs,historyFor,quotesFor} from "./homeownerHistoryFixtureData.js";
import {validateJobHistoryDetail,validateProfessionalJobHistory} from "../../src/utils/jobCompletionApi.js";
import {buildCustomerJobHistoryReportModel,getCustomerJobHistoryReportCopy} from "../../src/utils/customerJobHistoryReport.js";
import {applyAppLayoutDiagnostics,getDesktopContentMetrics,startAppLayoutCoordinator} from "../../src/utils/appLayout.js";
import "../../src/index.css";
window.__homeownerHistoryReads=[];window.__homeownerHistoryExports=[];
const query=new URLSearchParams(location.search);setLanguage(query.get("language")||"en");localStorage.setItem("activeAccountMode","personal");localStorage.setItem("token","fixture-token");
window.fetch=async()=>new Response(JSON.stringify({success:false,code:"FIXTURE_ROUTE_UNAVAILABLE"}),{status:404,headers:{"Content-Type":"application/json"}});
window.__homeownerHistoryPorts={
 fetchCustomerJobHistoryList:async()=>validateProfessionalJobHistory({contractVersion:1,totalCount:jobs.length,jobs,pagination:{limit:50,nextCursor:null}}),
 fetchCustomerJobHistory:async({jobId})=>{window.__homeownerHistoryReads.push({kind:"history",jobId});return validateJobHistoryDetail(historyFor(jobId),{jobId,audience:"customer"});},
 fetchCustomerJobQuotes:async({jobId})=>{window.__homeownerHistoryReads.push({kind:"quotes",jobId});return {quotes:quotesFor(jobId),pagination:{hasMore:false,nextCursor:null}};},
 fetchCustomerJobInvoice:async({jobId})=>{window.__homeownerHistoryReads.push({kind:"invoice",jobId});throw Error("No finalized invoice fixture");},
 fetchCustomerJobWorkPlan:async({jobId})=>{window.__homeownerHistoryReads.push({kind:"work",jobId});throw Error("No ordinary work plan fixture");},
 fetchCustomerEfr:async({jobId})=>{window.__homeownerHistoryReads.push({kind:"assessment",jobId});throw Error("No assessment fixture");},
 buildCustomerJobHistoryReportModel,getCustomerJobHistoryReportCopy,
};
for(const[name,action]of [["printCustomerJobHistoryReport","print"],["shareCustomerJobHistoryReport","share"],["emailCustomerJobHistoryReport","email"]])window.__homeownerHistoryPorts[name]=async model=>{window.__homeownerHistoryExports.push({action,jobId:window.__homeownerHistoryReads.filter(row=>row.kind==="history").at(-1).jobId,amountMinor:model.job.approvedQuote?.totalMinor});return {ok:true,method:"fixture"};};
function Harness(){const[,rerender]=React.useState(0);React.useEffect(()=>{const update=()=>rerender(n=>n+1);window.addEventListener("resize",update);return()=>window.removeEventListener("resize",update);},[]);return <Home setPage={route=>document.documentElement.dataset.route=route}/>;}
const element=document.getElementById("root");applyAppLayoutDiagnostics(element,getDesktopContentMetrics());window.addEventListener("pagehide",startAppLayoutCoordinator({root:element}),{once:true});createRoot(element).render(<Harness/>);
