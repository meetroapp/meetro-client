import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { prepareWorkCenterPolishFixture } from '../helpers/workCenterPolishFixture.js';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
let css = read('src/index.css');
for (const weight of ['Regular','SemiBold','Bold']) {
  css = css.replace(`/fonts/poppins/Poppins-${weight}.ttf`, `data:font/ttf;base64,${readFileSync(new URL(`../../public/fonts/poppins/Poppins-${weight}.ttf`, import.meta.url)).toString('base64')}`);
}
const f = await prepareWorkCenterPolishFixture();
const lifecyclePresentation = f.lifecycle;
const lifecycle = JSON.stringify(lifecyclePresentation);
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import CompactCurrentJobHeader from '/src/components/CompactCurrentJobHeader.jsx';
import WorkCenterLifecycle, { WorkCenterLifecycleHeading } from '/src/components/WorkCenterLifecycle.jsx';
const initial=${lifecycle};
window.mounts=0;window.fetches=0;window.messages=0;
window.fetch=()=>{window.fetches++;throw Error('Resize must not fetch');};
function App(){
 const [selected]=React.useState({id:'r54c-job'});
 React.useEffect(()=>{window.mounts++;window.selectedNode=document.querySelector('.compact-current-job-header');},[]);
 window.fixtureState={selectedId:selected.id,currentStage:initial.currentStageKey};
 const progress=React.createElement(React.Fragment,null,
  React.createElement(WorkCenterLifecycleHeading,{presentation:initial,language:'en'}),
  React.createElement(WorkCenterLifecycle,{presentation:initial,language:'en',compact:true}));
 return React.createElement(React.Fragment,null,
  React.createElement('aside',{className:'r54c-sidebar'},'Meetro Business'),
  React.createElement('main',{className:'contractor-dashboard'},
   React.createElement('div',{className:'work-center-content-lane'},
    React.createElement('div',{className:'work-center-workspace'},
     React.createElement(CompactCurrentJobHeader,{customer:'Alexandra Catherine Montgomery de la Cruz',service:'Kitchen cabinetry restoration and ceiling ventilation replacement with finishing details',address:'Cape Coral, FL',scheduledAt:'2026-09-20',jobId:'JG-00482',status:'Approved — ready to schedule',nextStep:'Schedule this job',responsibility:'You',concern:'Replace the damaged cabinet trim while preserving the existing finish.',connected:true,progress,action:React.createElement('button',{type:'button',onClick:()=>window.messages++},'Message')}),
     React.createElement('div',{className:'work-center-content-grid'},...['Evaluation','Quote','Deposit','Schedule','Work Plan','Complete Job','Invoice'].map((name,index)=>React.createElement('section',{className:'work-center-accordion',key:name,'data-detail-index':index},name)))))),
  React.createElement('button',{className:'r54c-ask'},'Ask Meetro'));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`;
const harnessCss=`
*{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;overflow-x:visible!important}.r54c-sidebar{position:fixed;inset:0 auto 0 0;width:220px;padding:20px;background:#f8faf8}.contractor-dashboard{margin-left:220px;width:calc(100vw - 220px);height:calc(100vh - 62px);padding:16px;overflow:auto!important}.work-center-content-lane{width:375px;container:work-center / inline-size}.work-center-workspace{display:grid;gap:12px}.work-center-content-grid{display:grid;gap:10px}.work-center-accordion{min-height:52px;padding:14px;border:1px solid #dce5df;border-radius:12px;background:white}.r54c-ask{position:fixed;right:16px;bottom:6px;min-height:50px}.compact-current-job-header__action button{min-height:44px}
`;
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\n${harnessCss}</style></head><body><div id="root" data-app-layout="desktop"></div><script type="module" src="/r54c-fixture.jsx"></script></body></html>`;
const server = await createServer({appType:'custom',logLevel:'silent',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'r54c',enforce:'pre',resolveId(id){if(id==='/r54c-fixture.jsx')return '\0r54c-fixture.jsx';},load(id){if(id==='\0r54c-fixture.jsx')return fixture;},configureServer(s){s.middlewares.use('/r54c',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});}}]});
await server.listen();
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine=process.env.BROWSER_ENGINE || 'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const output=process.env.R54C_OUTPUT_DIR || '/private/tmp/meetro-r54c-layout';mkdirSync(output,{recursive:true});
const results=[];const errors=[];
try {
 const page=await browser.newPage({viewport:{width:2000,height:1000}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/r54c`);
 await page.waitForSelector('.compact-current-job-header');await page.evaluate(()=>document.fonts.ready);
 const setWidth=async width=>{await page.locator('.work-center-content-lane').evaluate((node,width)=>node.style.width=`${width}px`,width);await page.setViewportSize({width:width+260,height:1000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
 const measure=()=>page.evaluate(()=>{
  const q=(selector,root=document)=>root.querySelector(selector),qa=(selector,root=document)=>[...root.querySelectorAll(selector)],rect=node=>{const b=node.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  const lane=q('.work-center-content-lane'),overview=q('.compact-current-job-header'),tracker=q('.compact-current-job-header__progress .work-center-lifecycle'),stages=qa('[data-lifecycle-stage]',tracker),primary=q('.compact-current-job-header__primary');
  const words=[];for(const element of qa('h2,p,strong,.work-center-lifecycle__label',overview)){const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);for(let node;node=walker.nextNode();)for(const match of node.textContent.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);if(new Set([...range.getClientRects()].map(box=>Math.round(box.top))).size>1)words.push(match[0]);}}
  const stageRects=stages.map(rect),rows=stageRects.map(box=>Math.round(box.top));
  const connectors=stages.map((stage,index)=>{const p=getComputedStyle(stage,'::after'),box=stageRects[index],circle=rect(q('.work-center-lifecycle__indicator',stage));return {display:p.display,color:p.backgroundColor,left:box.left+parseFloat(p.left),right:box.left+parseFloat(p.left)+parseFloat(p.width),circle,state:stage.dataset.lifecycleState};});
  const details=qa('.work-center-accordion');
  return {lane:rect(lane),main:rect(q('main')),overview:rect(overview),primaryColumns:getComputedStyle(primary).gridTemplateColumns,tracker:rect(tracker),trackerCount:qa('.work-center-lifecycle').length,headingCount:qa('.work-center-lifecycle-heading').length,standaloneCount:qa('.work-center-job-lifecycle-overview').length,stages:stages.map(s=>s.dataset.lifecycleStage),rows,connectors,fragmentedWords:words,nextSize:parseFloat(getComputedStyle(q('.compact-current-job-header__state-item--next strong')).fontSize),progressSize:parseFloat(getComputedStyle(q('.work-center-lifecycle__label')).fontSize),count:q('.work-center-lifecycle-heading span').textContent,customerConcern:overview.textContent.includes('Customer concern'),jobRecord:overview.textContent.includes('Job record'),message:rect(q('.compact-current-job-header__action button')),details:details.map(n=>n.textContent),detailsTop:details[0].getBoundingClientRect().top,overviewBottom:overview.getBoundingClientRect().bottom,sameNode:window.selectedNode===overview,state:window.fixtureState,mounts:window.mounts,fetches:window.fetches,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,ask:rect(q('.r54c-ask'))};
 });
 const order=['evaluation','quote','deposit','schedule','workPlan','completeJob','invoice'];
 const verify=(m,width)=>{
  assert.equal(m.lane.width,width);assert.equal(m.trackerCount,1);assert.equal(m.headingCount,1);assert.equal(m.standaloneCount,0);
  assert.deepEqual(m.stages,order);assert.deepEqual(m.fragmentedWords,[]);assert.equal(m.count,`${lifecyclePresentation.completedCount} of 7 completed`);
  assert.ok(m.nextSize>m.progressSize);assert.ok(m.tracker.width<=980);assert.ok(m.message.width>=44&&m.message.height>=44);
  assert.equal(m.customerConcern,true);assert.equal(m.jobRecord,true);assert.deepEqual(m.details,['Evaluation','Quote','Deposit','Schedule','Work Plan','Complete Job','Invoice']);assert.ok(m.detailsTop>=m.overviewBottom);
  const rowCounts=[...new Set(m.rows)].map(top=>m.rows.filter(value=>value===top).length);assert.deepEqual(rowCounts,width>=900?[7]:[4,3]);
  const visible=m.connectors.filter(c=>c.display!=='none');assert.equal(visible.length,width>=900?6:5);assert.equal(m.connectors[3].display,width>=900?'block':'none');
  for(let i=0;i<m.connectors.length;i++){const c=m.connectors[i];if(c.display==='none')continue;assert.equal(c.color,c.state==='complete'?'rgb(10, 163, 95)':'rgb(203, 213, 225)');assert.ok(c.left>c.circle.right&&c.right<m.connectors[i+1].circle.left);}
  assert.equal(m.primaryColumns.trim().split(/\s+/).length,width>=900?2:1);assert.equal(m.sameNode,true);assert.equal(m.state.selectedId,'r54c-job');assert.equal(m.state.currentStage,lifecyclePresentation.currentStageKey);assert.equal(m.mounts,1);assert.equal(m.fetches,0);assert.ok(m.documentWidth<=m.viewport,`overflow ${JSON.stringify({width,documentWidth:m.documentWidth,viewport:m.viewport,lane:m.lane,overview:m.overview})}`);assert.ok(m.main.bottom<=m.ask.top);
 };
 await page.evaluate(()=>{window.savedState=JSON.stringify(window.fixtureState);});
 const widths=[375,430,559,560,600,768,820,899,900,1024,1180,1280,1366,1440,1512,1728];
 for(const width of widths){await setWidth(width);const m=await measure();verify(m,width);results.push({width,...m});if([375,820,1180].includes(width))await page.screenshot({path:`${output}/${engine}-${width}.png`,fullPage:true});}
 for(const width of [1180,768,375,1180]){await setWidth(width);const m=await measure();verify(m,width);assert.equal(await page.evaluate(()=>JSON.stringify(window.fixtureState)===window.savedState),true);}
 await page.locator('.compact-current-job-header__action button').click();assert.equal(await page.evaluate(()=>window.messages),1);assert.deepEqual(errors,[]);
 await page.close();
} finally {await browser.close();await server.close();writeFileSync(`${output}/${engine}-results.json`,JSON.stringify(results,null,2));}
console.log(`${engine}: ${results.length} unified Job Overview widths + mounted reflow + Message action passed`);
