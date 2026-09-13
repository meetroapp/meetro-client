import { t } from "../../src/utils/language.js";
// Run with PLAYWRIGHT_MODULE pointing to an installed playwright ESM entry.
// Optional BROWSER_ENGINE=webkit; BROWSER_EXECUTABLE for a system Chromium.
// R51_BASELINE_DIR selects the pre-fix CSS for reproducible defect evidence.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prepareWorkCenterPolishFixture } from '../helpers/workCenterPolishFixture.js';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const before = process.env.R51_BASELINE_DIR;
const activeLanguage = process.env.R52_LANGUAGE || 'en';
const source = (file) => before ? readFileSync(`${before}/${file.split('/').pop()}`, 'utf8') : read(file);
const object = (s, name) => vm.runInNewContext(`(${s.split(`const ${name} = `)[1].split('\n};')[0]}\n})`);
const el = React.createElement, html = (component, props) => renderToStaticMarkup(el(component, props));
const dashboard = source('src/pages/ContractorDashboard.jsx');
const nav = read('src/components/BottomNav.jsx');
const assistant = source('src/components/MeetroAssistant.jsx');
const shellCss = nav.split('const adaptiveNavigationStyles = `')[1].split('`;')[0];
const laneClass = dashboard.includes('ref={workCenterPanelRef} className="work-center-content-lane"') ? 'work-center-content-lane' : '';
let css = source('src/index.css');
for (const font of ['Regular', 'SemiBold', 'Bold']) {
  const data = readFileSync(new URL(`../../public/fonts/poppins/Poppins-${font}.ttf`, import.meta.url)).toString('base64');
  css = css.replace(`/fonts/poppins/Poppins-${font}.ttf`, `data:font/ttf;base64,${data}`);
}
const f = await prepareWorkCenterPolishFixture();
const banner = html(f.Banner, {activeLanguage,opportunityTileCounts:{new:3,awaiting:1}, canonicalScheduleCounts:{today:1,upcoming:1},setPage(){},openWorkTab(){}});
const cards = Array.from({length:5}, (_,i) => html(f.Card, {...f.cardProps, activeLanguage, job:{...f.cardProps.job,id:`job-${i}`}})).join('');
const detailProgress = el(React.Fragment,null,el(f.WorkCenterLifecycleHeading,{presentation:f.lifecycle,language:activeLanguage}),el(f.WorkCenterLifecycle,{presentation:f.lifecycle,language:activeLanguage}));
const detail = html(f.CompactCurrentJobHeader,{...f.headerProps,language:activeLanguage,progress:detailProgress}) + html(f.Metrics,f.metricsProps);
const toolbar = html(f.Toolbar,{activeLanguage,workCenterJobQuery:'',workCenterFilterOpen:true,setWorkCenterJobQuery(){},setWorkCenterFilterOpen(){}});
const filter = html(f.FilterMenu,{activeLanguage,workCenterJobFilter:'all',setWorkCenterJobFilter(){},setWorkCenterFilterOpen(){},openWorkCenterJobsPage(){},openWorkTab(){}});
const revenueEntry = html(f.RevenueEntry,{language:activeLanguage,openWorkCenterSection(){}});
const pageStyle = object(dashboard,'page'), sidebarStyle = object(nav,'desktopSidebar');
const launcherStyle = {...object(assistant,'assistantButton'), bottom:assistant.match(/bottom: "(calc\(var\(--work-center-dock-bottom[^"\n]+)"/)[1]};
const attrs = style => renderToStaticMarkup(el('div',{style})).match(/style="([^"]*)/)[1];
const {chromium,webkit} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.BROWSER_ENGINE || 'chromium';
const browser = await ({chromium,webkit}[engine]).launch({headless:true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
const output = process.env.R51_OUTPUT_DIR || '/tmp/meetro-r51-layout'; mkdirSync(output,{recursive:true});
const results=[];
try {
for (const [width,height] of [[375,812],[393,852],[430,932],[768,1024],[820,1180],[834,1194],[1024,768],[1180,820]]) {
 const mode=width<768?'mobile':'tablet';
 const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 // BottomNav stays INSIDE the page exactly as production. No synthetic sidebar
 // offsets/widths. Its late stylesheet owns the post-sidebar contract.
 const body=`<div id="root" data-app-layout="${mode}"><main class="app-page contractor-dashboard meetro-wide-page meetro-visual-page" style="${attrs(pageStyle)}"><div class="${laneClass}"><section class="work-center-dashboard work-center-overview"><header class="work-center-overview__header"><h1>${t("workCenter", activeLanguage)}</h1><p>${t("wc52subtitle", activeLanguage)}</p></header>${banner}${toolbar}${filter}${cards}${detail}${revenueEntry}</section></div><style>${shellCss}</style><aside class="desktop-sidebar" style="${attrs(sidebarStyle)}">Meetro Business<br>Work Center</aside><div class="bottom-nav-content-spacer"></div><div class="bottom-nav-dock"><nav class="bottom-nav" style="height:var(--meetro-bottom-nav-height)">Home　Work Center　Chat　Moments　Profile</nav></div></main><button class="meetro-assistant-launcher" data-containment-mode="compact-work-center-safe-rail" style="${attrs(launcherStyle)}">M　Ask Meetro　●</button></div>`;
 await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style>${body}`);
 await page.evaluate(()=>document.fonts.ready);
 // Safe-area emulation changes env inputs only, never layout rules/offsets.
 await page.addStyleTag({content:`${css.replaceAll(/env\(safe-area-inset-top(?:,\s*0px)?\)/g,'44px').replaceAll(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g,'34px')}`});
 const measure=()=>page.evaluate(()=>{
  const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  const q=s=>document.querySelector(s), main=q('main'), card=q('.work-center-job-card'), style=getComputedStyle(card);
  const fragments=[];
  for(const e of document.querySelectorAll('.work-center-opportunities-banner__view,.work-center-lifecycle__label,.work-center-active-jobs__filter-button')) {
   const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
   for(let t; t=walker.nextNode();) for(const m of t.textContent.matchAll(/\S+/g)) {
    const range=document.createRange();range.setStart(t,m.index);range.setEnd(t,m.index+m[0].length);
    if(range.getClientRects().length>1)fragments.push(m[0]);
   }
  }
  const filterButton=q(".work-center-active-jobs__filter-button"), filterSelect=q(".work-center-active-jobs__filter select");
  const mainRect=r(main), stageRects=[...document.querySelectorAll('.work-center-lifecycle__label')].map(r);
  return {filterButton:r(filterButton),filterSelect:r(filterSelect),main:mainRect,sidebar:r(q('.desktop-sidebar')),banner:r(q('.work-center-opportunities-banner')),cta:r(q('.work-center-opportunities-banner__view')),title:r(q('h1')),launcher:r(q('.meetro-assistant-launcher')),nav:r(q('.bottom-nav')),card:r(card),scrollTop:main.scrollTop,scrollWidth:main.scrollWidth,clientWidth:main.clientWidth,documentWidth:document.documentElement.scrollWidth,fragments,clippedStages:stageRects.filter(b=>b.left<mainRect.left || b.right>mainRect.right),rowSizes:[...card.querySelectorAll('[data-lifecycle-row]')].map(e=>e.children.length),visual:{transform:style.transform,translate:style.translate,scale:style.scale,transition:style.transitionDuration,animation:style.animationName,shadow:style.boxShadow,border:style.borderWidth,filter:style.filter,backdrop:style.backdropFilter},nestedTop:getComputedStyle(q('.work-center-overview')).paddingTop,spacer:getComputedStyle(q('.bottom-nav-content-spacer')).display};
 });
 const initial=await measure();
 await page.screenshot({path:`${output}/${engine}-${width}.png`});
 // Verify actual shell painting first, then expose any globally masked overflow.
 const unmask=await page.addStyleTag({content:'html,body,#root { overflow-x: visible !important; }'});
 const exposed=await measure();
 await unmask.evaluate(e=>e.remove());
 // Touch hover/active uses actual browser input without executing the Job action.
 const card=page.locator('.work-center-job-card').first();
 await card.scrollIntoViewIfNeeded(); const box=await card.boundingBox();
 await page.mouse.move(box.x+30, Math.max(70,box.y+30)); await page.mouse.down();
 const pressed=await measure(); await page.mouse.move(1,1); await page.mouse.up();
 // Actual touch input can leave :hover latched even after a pointer scroll.
 const touchBox=await card.boundingBox(); await page.touchscreen.tap(touchBox.x+30,Math.max(70,touchBox.y+30));
 const touched=await measure();
 const frames=[];
 for(const top of [100,240,420,680,940]) {
  await page.locator('main').evaluate((e,top)=>e.scrollTop=top,top);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  frames.push(await measure());
 }
 const evidence={width,height,mode,initial,exposed,pressed,touched,frames}; results.push(evidence);
 if(!before){
  if(mode==='tablet'){assert.equal(initial.sidebar.left,0); assert.ok(initial.main.left>=initial.sidebar.right); assert.ok(initial.main.width<=width-initial.sidebar.width+1);}
  assert.ok(initial.banner.left>=initial.main.left && initial.banner.right<=initial.main.right);
  assert.ok(initial.filterButton.height>=44);assert.ok(initial.filterSelect.left>=initial.main.left && initial.filterSelect.right<=initial.main.right);
  assert.ok(initial.cta.height>=44);assert.deepEqual(initial.fragments,[]);assert.deepEqual(initial.clippedStages,[]);
  assert.deepEqual(initial.rowSizes,[4,3]);assert.equal(initial.nestedTop,'0px');assert.ok(initial.title.top>=44 && initial.title.top<=60);
  assert.equal(initial.spacer,'none');assert.ok(initial.main.bottom<=initial.launcher.top);assert.ok(initial.launcher.top-initial.main.bottom<=7);
  assert.equal(initial.launcher.height,50);if(mode==='mobile')assert.ok(initial.launcher.bottom<=initial.nav.top);
  assert.ok(initial.scrollWidth<=initial.clientWidth+1); assert.ok(initial.documentWidth<=width);
  assert.ok(exposed.documentWidth<=width);assert.equal(exposed.main.left,initial.main.left);assert.equal(exposed.main.width,initial.main.width);
  for(const current of [pressed,touched,...frames]){
   assert.equal(current.card.left,initial.card.left);assert.equal(current.card.width,initial.card.width);assert.equal(current.card.height,initial.card.height);
   assert.deepEqual(current.visual,initial.visual);assert.ok(Math.abs((current.card.top+current.scrollTop)-(initial.card.top+initial.scrollTop))<1);
  }
  assert.equal(initial.visual.transform,'none');assert.equal(initial.visual.animation,'none');assert.equal(initial.visual.transition,'0s');
 }
 await page.close();
}
} finally {await browser.close();writeFileSync(`${output}/${engine}-results.json`,JSON.stringify(results,null,2));}
console.log(`${engine}: ${results.length} viewport fixtures ${before?'baseline captured':'passed'} (${output})`);
