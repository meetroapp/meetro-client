import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {createServer} from "vite";
import {getJobCompletionCopy} from "../../src/utils/jobCompletionLanguage.js";
import {t} from "../../src/utils/language.js";
import {JOB_IDS} from "./homeownerHistoryFixtureData.js";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const output=process.env.HOMEOWNER_HISTORY_QA_OUTPUT||"/private/tmp/meetro-63J4E4/layout";mkdirSync(output,{recursive:true});const results=[];
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const vite=await createServer({root:process.cwd(),logLevel:"silent",plugins:[{name:"homeowner-history-fixture-ports",enforce:"pre",transform(source,id){
 if(id.endsWith("/clientWorkflowStoragePolicy.js"))return source.replace("return !isProductionClientRuntime(options);","return false;");
 if(id.endsWith("/Home.jsx"))return source.replace('import { fetchCustomerJobHistoryList } from "../utils/jobCompletionApi.js";','const fetchCustomerJobHistoryList = (...args) => window.__homeownerHistoryPorts.fetchCustomerJobHistoryList(...args);');
 if(id.endsWith("/CustomerCompletionHistory.jsx"))return source.replace(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/utils\/(?:jobCompletionApi|customerJobQuotesApi|invoicePaymentApi|workPlanApi|customerEfrApi|customerJobHistoryReport)\.js["'];/g,(_,names)=>names.split(",").map(s=>s.trim()).filter(Boolean).map(name=>`const ${name} = (...args) => window.__homeownerHistoryPorts.${name}(...args);`).join("\n"));
}},],server:{host:"127.0.0.1",port:0}});await vite.listen();const base=`http://127.0.0.1:${vite.httpServer.address().port}`;
try{
 for(const[width,height]of [[390,844],[820,1180],[1180,820],[1366,900]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<768});const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1"?route.continue():route.abort());
  await page.goto(`${base}/tests/browser/homeownerHistoryFixture.html`);await page.locator('.home-my-projects-tabs button').filter({hasText:"History"}).click();
  const cards=page.locator('[data-homeowner-history-card]');await cards.first().waitFor();assert.equal(await cards.count(),4);
  assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.homeownerHistoryCard)),JOB_IDS);assert.doesNotMatch(await cards.allTextContents().then(a=>a.join(" ")),/Homeowner Private Name/);
  assert.match(await cards.nth(0).textContent(),/\$350\.00/);assert.match(await cards.nth(1).textContent(),/\$240\.00/);
  const cardMeasure=await cards.evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom,actionHeight:n.querySelector('button').getBoundingClientRect().height,actionWidth:n.querySelector('button').getBoundingClientRect().width,cardWidth:n.getBoundingClientRect().width,amountWhiteSpace:n.querySelector('.homeowner-history-money')?getComputedStyle(n.querySelector('.homeowner-history-money')).whiteSpace:null})));
  for(let i=0;i<cardMeasure.length;i++){const m=cardMeasure[i];assert.ok(m.actionWidth<m.cardWidth*.75);assert.ok(m.actionHeight>= (width<768?44:38)&&m.actionHeight<=(width<768?48:42));if(i)assert.ok(m.top>cardMeasure[i-1].bottom);if(m.amountWhiteSpace)assert.equal(m.amountWhiteSpace,"nowrap");}
  const listLayout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,amountsFit:[...document.querySelectorAll('.homeowner-history-card .homeowner-history-money')].every(n=>{const a=n.getBoundingClientRect(),c=n.closest('.homeowner-history-card').getBoundingClientRect();return a.left>=c.left&&a.right<=c.right&&n.scrollWidth<=n.clientWidth+1;})}));
  assert.ok(listLayout.scrollWidth<=listLayout.clientWidth+1);assert.equal(listLayout.amountsFit,true);
  await page.screenshot({path:`${output}/list-${width}.png`,fullPage:true});
  await cards.nth(1).getByRole('button',{name:'View History'}).click();await page.locator('[data-customer-full-job-history]').waitFor();assert.equal(await page.locator('[data-customer-full-job-history]').getAttribute('data-customer-full-job-history'),JOB_IDS[1]);assert.match(await page.locator('[data-customer-full-job-history]').textContent(),/\$240\.00/);
  await page.getByRole('button',{name:'Back to History',exact:true}).click();await cards.first().waitFor();await cards.nth(0).getByRole('button',{name:'View History'}).click();const workspace=page.locator('[data-customer-full-job-history]');await workspace.waitFor();assert.equal(await page.locator('[aria-modal="true"]').count(),0);
  const backHeight=await page.getByRole('button',{name:'Back to History',exact:true}).evaluate(n=>n.getBoundingClientRect().height);assert.ok(backHeight>=(width<768?44:38)&&backHeight<=(width<768?48:42),`Back height ${backHeight} at ${width}px`);
  const reads=await page.evaluate(()=>window.__homeownerHistoryReads.length);
  for(const tab of ['Overview','Job','Quotes','Invoice','Documents / Photos']){
   await workspace.locator('nav').getByRole('button',{name:tab,exact:true}).click();assert.equal(await workspace.getAttribute('data-customer-full-job-history'),JOB_IDS[0]);
   if(tab==='Quotes')for(const lineage of ['Original','Revised','Additional'])assert.match(await workspace.textContent(),new RegExp(lineage));
   if(tab==='Invoice')assert.match(await workspace.textContent(),/No finalized invoice/);
   for(const action of ['Print','Share','Email'])await workspace.getByRole('button',{name:action,exact:true}).click();
   const measure=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,tabHeights:[...document.querySelectorAll('.homeowner-job-history nav button')].map(n=>n.getBoundingClientRect().height),utilityHeights:[...document.querySelectorAll('.homeowner-job-history header button')].map(n=>n.getBoundingClientRect().height),sidebar:getComputedStyle(document.querySelector('.desktop-sidebar')).display,bottomNav:getComputedStyle(document.querySelector('.bottom-nav-dock')).display}));
   assert.ok(measure.scrollWidth<=measure.clientWidth+1);assert.ok(measure.utilityHeights.every(h=>h>=(width<768?44:38)&&h<=(width<768?48:42)));assert.ok(measure.tabHeights.every(h=>h>=(width<768?44:34)&&h<=(width<768?48:38)));if(width<768){assert.notEqual(measure.bottomNav,'none');assert.equal(measure.sidebar,'none');}else{assert.equal(measure.sidebar,'flex');assert.equal(measure.bottomNav,'none');}
   results.push({width,height,tab,listLayout,backHeight,cardMeasure,...measure});
  }
  assert.equal(await page.evaluate(()=>window.__homeownerHistoryExports.length),15);assert.equal(await page.evaluate(()=>window.__homeownerHistoryReads.length),reads);assert.equal(await page.evaluate(()=>window.__homeownerHistoryExports.every(x=>x.jobId==='11111111-1111-4111-8111-111111111111' && x.amountMinor===35000)),true);
  await workspace.locator('nav').getByRole('button',{name:'Overview',exact:true}).click();await page.screenshot({path:`${output}/detail-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Back to History',exact:true}).click();assert.equal(await cards.count(),4);assert.equal(await page.locator(':focus').getAttribute('data-history-open-job'),JOB_IDS[0]);assert.deepEqual(errors,[]);await page.close();
 }
 for(const language of ['es','fr','pt-BR']){const page=await browser.newPage({viewport:{width:390,height:844}});await page.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1"?route.continue():route.abort());await page.goto(`${base}/tests/browser/homeownerHistoryFixture.html?language=${language}`);await page.locator('.home-my-projects-tabs button').filter({hasText:t('homeMyProjectsHistory',language)}).click();await page.locator('[data-homeowner-history-card]').first().getByRole('button',{name:getJobCompletionCopy(language).viewHistory}).click();const workspace=page.locator('[data-customer-full-job-history]');await workspace.waitFor();assert.ok((await workspace.locator('nav').allTextContents()).join('').includes(getJobCompletionCopy(language).homeownerJob));await page.getByRole('button',{name:getJobCompletionCopy(language).homeownerBackToHistory,exact:true}).click();await page.close();}
}finally{await browser.close();await vite.close();writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(`${results.length} homeowner History viewport/tab checks passed; four Job cards, exact IDs, utility actions, return navigation, four locales and persistent nav verified.`);
