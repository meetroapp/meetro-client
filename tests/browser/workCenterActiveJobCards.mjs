// Production-derived React card mounted once; browser measurements use the
// actual post-sidebar content lane, independent of the app's layout mode.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import { createServer } from 'vite';
import { prepareWorkCenterPolishFixture } from '../helpers/workCenterPolishFixture.js';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const object = (s,n) => vm.runInNewContext(`(${s.split(`const ${n} = `)[1].split('\n};')[0]}\n})`);
const f = await prepareWorkCenterPolishFixture();
const dashboard = read('src/pages/ContractorDashboard.jsx');
const nav = read('src/components/BottomNav.jsx');
const assistant = read('src/components/MeetroAssistant.jsx');
const pageStyle = object(dashboard,'page');
const sidebarStyle = object(nav,'desktopSidebar');
const launcherStyle = {...object(assistant,'assistantButton'),bottom:assistant.match(/bottom: "(calc\(var\(--work-center-dock-bottom[^"\n]+)"/)[1]};
let css = read('src/index.css');
for (const font of ['Regular','SemiBold','Bold']) css=css.replace(`/fonts/poppins/Poppins-${font}.ttf`,`data:font/ttf;base64,${readFileSync(new URL(`../../public/fonts/poppins/Poppins-${font}.ttf`,import.meta.url)).toString('base64')}`);
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import WorkCenterLifecycle from '/src/components/WorkCenterLifecycle.jsx';
import { WorkCenterAttentionBadge } from '/src/components/WorkCenterWorkspaceSystem.jsx';
import { t as translate } from '/src/utils/language.js';
import { workCenterLabel, workCenterActor } from '/src/utils/workCenterPresentation.js';
const Card=${f.Card.toString()};
const Toolbar=${f.Toolbar.toString()};
const FilterMenu=${f.FilterMenu.toString()};
const MeetroIcon=()=>null;
const getCanonicalCurrentJobIdentityKey=job=>job.id;
const props=${JSON.stringify(f.cardProps)};
const job={...props.job,id:'r54-exact-job',liveJob:{responsibility:{code:'PROFESSIONAL'}}};
window.cardJob=job; window.opened=[]; window.routes=[]; window.mounts=0; window.fetches=0;
window.fetch=()=>{window.fetches++;throw Error('Fixture must not request lifecycle');};
function App(){
 const [query,setQuery]=React.useState('repair'); const [filter,setFilter]=React.useState('evaluation');
 const [selected,setSelected]=React.useState(job); const [long,setLong]=React.useState(false); const [lifecycle,setLifecycle]=React.useState(props.lifecycle);
 React.useEffect(()=>{window.mounts++;window.setLong=setLong;window.setPresentation=setLifecycle;window.originalPresentation=props.lifecycle;},[]);
 window.fixtureState={query,filter,selectedId:selected.id,currentStage:lifecycle.currentStageKey};
 const noop=()=>{};
 const cardProps={...props,job,lifecycle, setSelectedJobDetailView:noop,setIsJobHistoryMode:noop,setSelectedWorkCenterAlertStage:noop,setIsWorkCenterSectionOpen:noop,
 setSelectedWorkCenterJob:next=>{window.opened.push(next===job);setSelected(next);}};
 if(long){cardProps.job={...job,customer:'Alexandra Catherine Montgomery de la Cruz',title:'Kitchen cabinetry restoration and ceiling ventilation replacement with finishing details'};
 cardProps.jobListPresentation={...props.jobListPresentation,statusLabel:'Current status unavailable',nextStepLabel:'Refresh the job and review the current work details'};}
 return React.createElement(React.Fragment,null,
 React.createElement('main',{className:'app-page contractor-dashboard meetro-wide-page meetro-visual-page',style:${JSON.stringify(pageStyle)}},
  React.createElement('div',{className:'work-center-content-lane'},React.createElement('section',{className:'work-center-dashboard work-center-overview'},
   React.createElement('h1',null,'Work Center'),
   React.createElement(Toolbar,{workCenterJobQuery:query,setWorkCenterJobQuery:setQuery,workCenterFilterOpen:true,setWorkCenterFilterOpen:noop}),
   React.createElement(FilterMenu,{workCenterJobFilter:filter,setWorkCenterJobFilter:setFilter,setWorkCenterFilterOpen:noop,openWorkCenterJobsPage:v=>window.routes.push(v),openWorkTab:v=>window.routes.push(v)}),
   React.createElement(Card,cardProps))),
  React.createElement('style',null,${JSON.stringify(nav.split('const adaptiveNavigationStyles = `')[1].split('`;')[0])}),
  React.createElement('aside',{className:'desktop-sidebar',style:${JSON.stringify(sidebarStyle)}},'Meetro Business'),
  React.createElement('div',{className:'bottom-nav-content-spacer'}),
  React.createElement('div',{className:'bottom-nav-dock'},React.createElement('nav',{className:'bottom-nav',style:{height:'var(--meetro-bottom-nav-height)'}},'Home Work Center Chat Moments Profile'))),
 React.createElement('button',{className:'meetro-assistant-launcher','data-containment-mode':'compact-work-center-safe-rail',style:${JSON.stringify(launcherStyle)}},'Ask Meetro'));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`;
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root" data-app-layout="desktop"></div><script type="module" src="/r54-fixture.jsx"></script></body></html>`;
const server=await createServer({appType:'custom',logLevel:'silent',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'r54-fixture',enforce:'pre',resolveId(id){if(id==='/r54-fixture.jsx')return '\0r54-fixture.jsx';},load(id){if(id==='\0r54-fixture.jsx')return fixture;},configureServer(s){s.middlewares.use('/r54',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});}}]});
await server.listen();
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine=process.env.BROWSER_ENGINE || 'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const output=process.env.R54_OUTPUT_DIR || '/private/tmp/meetro-r54b-layout';mkdirSync(output,{recursive:true});
const results=[]; const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1500,height:1000}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/r54`);
 await page.waitForSelector('.work-center-job-card');await page.evaluate(()=>document.fonts.ready);
 // The production shell caps its lane around 1328px. Lift only that cap in
 // this component matrix to also exercise the requested 1366–1728px lanes.
 // Existing physical-layout fixtures separately retain the untouched shell.
 await page.locator('main').evaluate(e=>e.style.setProperty('--meetro-page-resolved-max-width','var(--meetro-page-available-width)'));
 const measure=()=>page.evaluate(()=>{
  const q=s=>document.querySelector(s), r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  const card=q('.work-center-job-card'),main=q('main'),lane=q('.work-center-content-lane');
  const stages=[...card.querySelectorAll('[data-lifecycle-stage]')];
  const fragments=[];
  for(const element of card.querySelectorAll('strong,.work-center-lifecycle__label,.work-center-job-card__service')){
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   for(let node;node=walker.nextNode();)for(const word of node.textContent.matchAll(/\S+/g)){
    const range=document.createRange();range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);
    if(new Set([...range.getClientRects()].map(b=>Math.round(b.top))).size>1)fragments.push(word[0]);
   }
  }
  return {lane:r(lane),card:r(card),main:r(main),sidebar:r(q('.desktop-sidebar')),launcher:r(q('.meetro-assistant-launcher')),
   image:r(q('.work-center-job-card__image')),identity:r(q('.work-center-job-card__identity')),state:r(q('.work-center-job-card__state')),action:r(q('.work-center-job-card__open')),
   tracker:r(q('.work-center-lifecycle')),
   nextSize:parseFloat(getComputedStyle(q('.work-center-job-card__state > strong')).fontSize),
   connectors:stages.map(e=>{const p=getComputedStyle(e,'::after'),circle=r(e.querySelector('.work-center-lifecycle__indicator')),box=r(e),label=r(e.querySelector('.work-center-lifecycle__label'));return {display:p.display,color:p.backgroundColor,left:box.left+parseFloat(p.left),right:box.left+parseFloat(p.left)+parseFloat(p.width),top:box.top+parseFloat(p.top),circle,label,state:e.dataset.lifecycleState,key:e.dataset.lifecycleStage,ring:getComputedStyle(e.querySelector('.work-center-lifecycle__indicator')).borderTopColor,labelColor:getComputedStyle(e.querySelector('.work-center-lifecycle__label')).color};}),
   rows:stages.map(e=>Math.round(e.getBoundingClientRect().top)),stages:stages.map(e=>e.dataset.lifecycleStage),
   labels:stages.map(e=>e.textContent),fragmentedWords:fragments,scrollWidth:main.scrollWidth,clientWidth:main.clientWidth,
   documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,text:card.textContent,
   sameNode:!window.savedCard || window.savedCard===card,focus:getComputedStyle(card).outlineStyle,
   fontSize:getComputedStyle(q('.work-center-lifecycle__label')).fontSize,fixtureState:window.fixtureState,mounts:window.mounts,fetches:window.fetches,routes:window.routes};
 });
 async function laneWidth(width){
  for(let i=0;i<4;i++){
   const actual=await page.locator('.work-center-content-lane').evaluate(e=>e.getBoundingClientRect().width);
   if(Math.abs(actual-width)<1)break;
   const viewport=page.viewportSize();await page.setViewportSize({...viewport,width:Math.round(viewport.width+width-actual)});
  }
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 }
 const stageOrder=['evaluation','quote','deposit','schedule','workPlan','completeJob','invoice'];
 function verify(m,width,long){
  assert.ok(Math.abs(m.lane.width-width)<1,`actual lane ${m.lane.width}, wanted ${width}`);
  assert.ok(m.tracker.width<=980);
  assert.ok(m.nextSize>parseFloat(m.fontSize));
  const visible=m.connectors.filter(c=>c.display!=='none');
  assert.equal(visible.length,width>=900?6:5);
  assert.deepEqual([...new Set(m.rows)].map(top=>m.connectors.filter((c,i)=>m.rows[i]===top && c.display!=='none').length),width>=900?[6]:[3,2]);
  const current=m.connectors.filter(c=>c.state==='current');
  assert.equal(current.length,1);assert.equal(current[0].key,m.fixtureState.currentStage);
  assert.equal(current[0].ring,'rgb(45, 127, 240)');assert.equal(current[0].labelColor,'rgb(19, 104, 213)');
  assert.equal(m.connectors[3].display,width>=900?'block':'none');
  for(let i=0;i<m.connectors.length;i++){
   const c=m.connectors[i];if(c.display==='none')continue;
   assert.equal(c.color,c.state==='complete'?'rgb(10, 163, 95)':'rgb(203, 213, 225)');
   assert.ok(c.left>c.circle.right && c.right<m.connectors[i+1].circle.left,JSON.stringify(c));
   assert.ok(c.top>=c.circle.top && c.top<c.circle.bottom && c.top<c.label.top);
  }
  assert.deepEqual(m.stages,stageOrder);assert.deepEqual(m.fragmentedWords,[]);
  const rowCounts=[...new Set(m.rows)].map(top=>m.rows.filter(value=>value===top).length);
  assert.deepEqual(rowCounts,width>=900?[7]:[4,3],`${engine} lane ${width}`);
  assert.ok(m.card.left>=m.main.left && m.card.right<=m.main.right+1);
  assert.ok(m.main.left>=m.sidebar.right);assert.ok(m.action.width>=44 && m.action.height>=44);
  assert.ok(m.action.left>=m.card.left && m.action.right<=m.card.right);
  assert.ok(m.scrollWidth<=m.clientWidth+1);assert.ok(m.documentWidth<=m.viewport);
  assert.ok(m.main.bottom<=m.launcher.top);assert.ok(parseFloat(m.fontSize)>=14);
  assert.ok(m.sameNode);assert.equal(m.mounts,1);assert.equal(m.fetches,0);assert.deepEqual(m.routes,[]);
  assert.equal(m.fixtureState.query,'repair');assert.equal(m.fixtureState.filter,'evaluation');assert.equal(m.fixtureState.selectedId,'r54-exact-job');
  assert.match(m.text,/Next step/);assert.match(m.text,/Next up/);
  if(width>=900){assert.ok(m.state.top<m.identity.bottom);assert.ok(m.action.top<m.state.bottom);if(!long)assert.ok(m.card.height>=130 && m.card.height<=175,`wide height ${m.card.height} ${JSON.stringify({width,identity:m.identity,state:m.state,tracker:m.tracker})}`);}
  else if(width>=560){assert.ok(m.state.top>=m.identity.bottom);assert.ok(m.action.top<m.identity.bottom);}
  else {assert.ok(m.state.top>=m.identity.bottom);assert.ok(m.action.top>=m.state.bottom);}
  if(long)assert.match(m.text,/Current status unavailable/);
 }
 await page.evaluate(()=>{window.savedCard=document.querySelector('.work-center-job-card');window.savedState=JSON.stringify(window.fixtureState);});
 const widths=[375,430,559,560,561,600,650,700,768,820,899,900,901,1024,1100,1180,1280,1366,1440,1512,1728];
 for(const long of [false,true]){
  await page.evaluate(value=>window.setLong(value),long);
  for(const width of widths){await laneWidth(width);const m=await measure();verify(m,width,long);results.push({width,long,...m});
   if([375,700,1100].includes(width))await page.screenshot({path:`${output}/${engine}-${width}${long?'-long':''}.png`});
  }
 }
 await page.evaluate(()=>window.setLong(false));
 // Exercise each governed stage presentation as fixture input, independently of resize.
 for(let index=0;index<7;index++){
  await page.evaluate(index=>{const p=window.originalPresentation;window.setPresentation({...p,currentStageKey:p.stages[index].key,stages:p.stages.map((s,i)=>({...s,state:i<index?'complete':i===index?'current':'locked'}))});},index);
  for(const width of [900,560]){await laneWidth(width);verify(await measure(),width,false);}
 }
 await page.evaluate(()=>window.setPresentation(window.originalPresentation));
 for(const width of [1100,700,375,1100]){await laneWidth(width);const m=await measure();verify(m,width,false);assert.equal(await page.evaluate(()=>JSON.stringify(window.fixtureState)===window.savedState),true);}
 await page.locator('.work-center-job-card').focus();assert.notEqual((await measure()).focus,'none');await page.keyboard.press('Enter');
 assert.deepEqual(await page.evaluate(()=>window.opened),[true]);
 assert.deepEqual(errors,[]);
 // Expose overflow hidden by global shell rules and validate natural containment.
 await page.addStyleTag({content:'html,body,#root{overflow-x:visible!important}'});
 for(const width of [375,700,1100]){await laneWidth(width);verify(await measure(),width,false);}
 await page.close();
} finally {await browser.close();await server.close();writeFileSync(`${output}/${engine}-results.json`,JSON.stringify(results,null,2));}
console.log(`${engine}: ${results.length} width/content checks + 14 current-stage/connector checks + mounted reflow + keyboard action passed`);
