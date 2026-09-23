import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'vite';
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/emergencyCertifiedResponses.json',import.meta.url)));
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.env.EMERGENCY_QA_OUTPUT||'/private/tmp/meetro-client-emergency-validation/browser';mkdirSync(output,{recursive:true});
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import Dashboard from '/src/pages/ContractorDashboard.jsx';import '/src/index.css';import{startAppLayoutCoordinator}from'/src/utils/appLayout.js';startAppLayoutCoordinator({root:document.getElementById('root')});window.routes=[];createRoot(document.getElementById('root')).render(React.createElement(Dashboard,{setPage:page=>{window.routes.push(page);location.hash=page;}}));`;
const server=await createServer({appType:'custom',logLevel:'silent',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'emergency-qa',enforce:'pre',resolveId(id){if(id==='/emergency-qa.jsx')return '\0emergency-qa.jsx';},load(id){if(id==='\0emergency-qa.jsx')return entry;},configureServer(s){s.middlewares.use('/qa',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/emergency-qa.jsx"></script>');});}}]});
await server.listen();const browser=await webkit.launch({headless:true});const results=[];const errors=[];
try{
 for(const [name,width,height] of [['iphone',390,844],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['desktop',1440,1000]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:name!=='desktop',hasTouch:name!=='desktop'});
  let stage='assigned',liveFailure=false,interactive=false,evaluation=null,quote=null;const calls=[];
  page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',error=>{errors.push({name,error:error.message});console.error('PAGE ERROR',error.message);});
  page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text());});
  await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('token','local-contract-test');localStorage.setItem('user',JSON.stringify({id:8,role:'handyman',account_type:'professional',username:'Contract QA'}));localStorage.setItem('activeAccountMode','business');localStorage.setItem('accountType','professional');localStorage.setItem('meetroLanguage','en');});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='127.0.0.1')return route.continue();
   const method=route.request().method();calls.push({path:u.pathname,method});
   let data={success:false,code:'LOCAL_QA_UNAVAILABLE'},status=404;
   if(u.pathname==='/professional/jobs'){data=fixtures.picker;status=200;}
   else if(u.pathname==='/conversations'){data={success:true,conversations:[]};status=200;}
   else if(u.pathname.endsWith('/live-state')){data=liveFailure?{}:fixtures.stages[stage];status=liveFailure?503:200;}
   else if(interactive&&method==='POST'&&u.pathname.startsWith('/emergency-requests/')){const transitions={'en-route':['onTheWay','enRoute'],arrived:['arrived','arrived'],start:['working','started'],complete:['readyToInvoice','completed']};const next=transitions[u.pathname.split('/').pop()];if(next){stage=next[0];data=fixtures[next[1]];status=200;}}
   else if(interactive&&u.pathname==='/evaluations'&&method==='POST'){evaluation=fixtures.evaluationDraft;data=evaluation;status=200;stage='evaluationInProgress';}
   else if(interactive&&u.pathname.startsWith('/evaluations/')&&method==='PATCH'){data=fixtures.evaluationDraft;status=200;}
   else if(interactive&&u.pathname.startsWith('/evaluations/')&&u.pathname.endsWith('/complete')){evaluation=fixtures.evaluationComplete;data=evaluation;status=200;stage='quoteRequired';}
   else if(interactive&&u.pathname===`/jobs/${fixtures.identity.jobId}/quotes`&&method==='POST'){quote=fixtures.quoteDraft;data=quote;stage='quoteDraft';status=200;}
   else if(interactive&&u.pathname.endsWith('/scope-items')){quote=fixtures.quoteScoped;data=quote;status=200;}
   else if(interactive&&u.pathname.endsWith('/issue')){quote=fixtures.quoteIssued;data=quote;stage='awaitingApproval';status=200;}
   else if(u.pathname===`/professional/jobs/${fixtures.identity.jobId}/history`){data=fixtures.professionalHistory;status=200;}
   else if(u.pathname==='/professional/jobs/history'){data=fixtures.historyList;status=200;}
   else if(u.pathname.endsWith('/invoices/workspace')){data=stage==='readyToInvoice'?fixtures.readyWorkspace:stage==='paid'?fixtures.paidWorkspace:fixtures.partialWorkspace;status=200;}
   else if(u.pathname.endsWith('/invoice')||u.pathname===`/professional/invoices/${fixtures.invoicePaid.invoice.invoiceId}`){data=stage==='paid'?fixtures.invoicePaid:fixtures.invoicePartial;status=200;}
   else if(u.pathname.endsWith('/pre-work-deposit')){data=fixtures.depositRead;status=200;}
   else if(u.pathname.endsWith('/evaluations')){data={success:true,evaluations:interactive?(evaluation?[evaluation]:[]):stage==='arrived'?[]:[fixtures.evaluationComplete]};status=200;}
   else if(u.pathname===`/jobs/${fixtures.identity.jobId}/quotes`){data={success:true,quotes:interactive?(quote?[quote.quote]:[]):['quoteRequired'].includes(stage)?[]:[fixtures.quoteIssued.quote]};status=200;}
   else if(u.pathname.endsWith('/delivery')){data=fixtures.quoteDeliveryRead;status=200;}
   await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
  });
  const url=`http://127.0.0.1:${server.httpServer.address().port}/qa#workCenter`;
  await page.goto(url);await page.waitForTimeout(1200);
  await page.screenshot({path:`${output}/${name}-initial.png`,fullPage:true});
  writeFileSync(`${output}/${name}-initial.txt`,await page.locator('body').innerText());
  const cards=page.locator('.work-center-job-card[data-job-source="emergency"],.meetro-current-job-list-card[data-job-source="emergency"]');
  await cards.first().waitFor({timeout:12000});
  assert.match(await cards.first().innerText(),/Emergency leak/);assert.doesNotMatch(await cards.first().innerText(),/Schedule|Not scheduled|Work Plan/);
  await page.getByRole('group',{name:'Job source',exact:true}).getByRole('button',{name:/Job Requests/}).click();assert.equal(await cards.count(),0);await page.getByRole('group',{name:'Job source',exact:true}).getByRole('button',{name:/Emergency/}).click();await cards.first().click();await page.locator('[data-emergency-job]').waitFor();
  for(const state of Object.keys(fixtures.stages)){
   stage=state;await page.getByRole('button',{name:'Refresh status',exact:true}).click();
   await page.locator('.emergency-work-center__current h2').filter({hasText:fixtures.stages[state].liveJob.stage.label}).waitFor();
   await page.waitForTimeout(200);
   const main=page.locator('[data-emergency-job]');
   assert.equal(await main.locator('.emergency-work-center__primary').innerText(),fixtures.stages[state].liveJob.nextAction.label);
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(dimensions.scroll<=dimensions.width+2,`${name}/${state}: overflow ${JSON.stringify(dimensions)}`);
   assert.equal(await page.locator('#canonical-job-schedule,#canonical-job-work-plan').count(),0);
   assert.ok(await page.locator('[data-job-source="emergency"]').count()>0);
   if(['invoicePartial','paid'].includes(state)){await main.locator('[data-canonical-invoice-status]').waitFor();assert.match(await main.innerText(),state==='paid'?/\$0\.00/:/\$50\.00/);}
   if(['arrived','depositDue','invoicePartial','paid'].includes(state)){await main.locator('.emergency-work-center__current').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${name}-${state}.png`,fullPage:true});}
   results.push({viewport:name,stage:state,status:'PASS',...dimensions});
  }
  // Failed live refresh must remove all governed actions and recover safely.
  liveFailure=true;await page.getByRole('button',{name:'Refresh status',exact:true}).click();await page.getByRole('heading',{name:'Current status unavailable',exact:true}).waitFor();assert.equal(await page.locator('.emergency-work-center__primary').count(),0);
  liveFailure=false;stage='assigned';interactive=true;await page.getByRole('button',{name:'Refresh status',exact:true}).click();
  const primary=page.locator('.emergency-work-center__primary');
  await primary.filter({hasText:fixtures.stages.assigned.liveJob.nextAction.label}).waitFor();await primary.click();
  await primary.filter({hasText:fixtures.stages.onTheWay.liveJob.nextAction.label}).waitFor();await primary.click();
  await page.getByLabel('Observations',{exact:true}).fill('Observed leak at supply seal.');await page.getByLabel('Recommendation',{exact:true}).fill('Supply seal needs replacement.');
  await page.getByRole('button',{name:'Complete Evaluation',exact:true}).click();
  await page.getByLabel('Payment terms',{exact:true}).fill('50% deposit');await page.getByRole('region',{name:'Emergency Quote',exact:true}).getByRole('button',{name:'Create Quote',exact:true}).click();
  await page.getByLabel('Scope of work',{exact:true}).fill('Replace supply seal');await page.getByLabel('Price (USD)',{exact:true}).fill('100');await page.getByRole('button',{name:'Add scope item',exact:true}).click();
  await page.getByRole('button',{name:'Issue Quote',exact:true}).click();await primary.filter({hasText:fixtures.stages.awaitingApproval.liveJob.nextAction.label}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Record Customer Approval',exact:true}).count(),0);
  stage='readyToStart';await page.getByRole('button',{name:'Refresh status',exact:true}).click();await primary.filter({hasText:fixtures.stages.readyToStart.liveJob.nextAction.label}).waitFor();await primary.click();await primary.filter({hasText:fixtures.stages.working.liveJob.nextAction.label}).waitFor();await primary.click();await primary.filter({hasText:fixtures.stages.readyToInvoice.liveJob.nextAction.label}).waitFor();
  assert.ok(!calls.some(c=>c.method==='POST'&&/^\/jobs\/[^/]+\/complete$/.test(c.path)));
  results.push({viewport:name,stage:'filters, live failure recovery, dispatch, Evaluation, Quote, Start and Complete interactions',status:'PASS'});
  writeFileSync(`${output}/${name}-calls.json`,JSON.stringify(calls,null,2));await page.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(`${output}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.length,errors,output}));
}finally{await browser.close();await server.close();}
