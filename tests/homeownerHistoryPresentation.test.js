import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import {renderToString} from "react-dom/server";
import {JSDOM} from "jsdom";
import {createServer} from "vite";
import {getJobCompletionCopy} from "../src/utils/jobCompletionLanguage.js";
import {jobs} from "./browser/homeownerHistoryFixtureData.js";

test("homeowner completed cards retain separate exact IDs, Job identity and canonical currency across all locales",async()=>{
 const vite=await createServer({root:process.cwd(),configFile:false,cacheDir:"/tmp/task63j4e4-card-vite",optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},plugins:[{name:"card-export-fixture",enforce:"pre",transform(source,id){if(id.endsWith("/Home.jsx"))return source.replace("export default Home;","export {HistoryRequestCard}; export default Home;");}}]});
 try{
  const {HistoryRequestCard}=await vite.ssrLoadModule("/src/pages/Home.jsx");
  for(const language of ["en","es","fr","pt-BR"]){
   const html=renderToString(React.createElement('div',null,...jobs.map(job=>React.createElement(HistoryRequestCard,{key:job.jobId,request:{...job,title:job.serviceTitle,canonicalHistory:true},language,onDetails(){}}))));const dom=new JSDOM(html);
   const cards=[...dom.window.document.querySelectorAll('[data-homeowner-history-card]')];assert.equal(cards.length,4);assert.deepEqual(cards.map(card=>card.dataset.homeownerHistoryCard),jobs.map(job=>job.jobId));assert.equal(new Set(cards.map(card=>card.dataset.homeownerHistoryCard)).size,4);
   assert.equal(cards[0].querySelector('h3').textContent,cards[1].querySelector('h3').textContent,'same title remains independent Jobs');
   for(let i=0;i<cards.length;i++){const card=cards[i];assert.doesNotMatch(card.textContent,/Homeowner Private Name/);assert.equal(card.querySelector('button').dataset.historyOpenJob,jobs[i].jobId);assert.ok(card.querySelector('button').textContent.includes(getJobCompletionCopy(language).viewHistory));if(jobs[i].approvedQuote){const locale={en:'en-US',es:'es',fr:'fr','pt-BR':'pt-BR'}[language];assert.equal(card.querySelector('.homeowner-history-money').textContent,new Intl.NumberFormat(locale,{style:'currency',currency:'USD'}).format(jobs[i].approvedQuote.totalMinor/100));}else assert.equal(card.querySelector('.homeowner-history-money'),null);}
   dom.window.close();
  }
  const request={...jobs[0],title:jobs[0].serviceTitle,canonicalHistory:true,approvedQuote:{currency:'GBP',totalMinor:0}};const html=renderToString(React.createElement(HistoryRequestCard,{request,language:'en',onDetails(){}}));assert.match(html,/£0\.00/);assert.doesNotMatch(html,/\$0/);
 }finally{await vite.close();}
});
