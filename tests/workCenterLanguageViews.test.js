import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { t } from '../src/utils/language.js';
import { workCenterPresentationLanguage } from '../src/utils/workCenterPresentationLanguage.js';
import { workCenterLabel, workCenterActor } from '../src/utils/workCenterPresentation.js';
import { WORK_CENTER_JOB_LIFECYCLE } from '../src/utils/workCenterLifecyclePresentation.js';
import { prepareWorkCenterPolishFixture } from './helpers/workCenterPolishFixture.js';
const read = file => readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const dashboard = read('src/pages/ContractorDashboard.jsx');
const doc = tree => new JSDOM(renderToStaticMarkup(tree)).window.document;
const stages = ['evaluation','quote','deposit','schedule','workPlan','completeJob','invoice'];

test('new Work Center language has complete EN/ES/FR/PT-BR registry coverage without technical copy',()=>{
 const keys=Object.keys(workCenterPresentationLanguage.en);
 for(const language of ['en','es','fr','pt-BR']) {
  assert.deepEqual(Object.keys(workCenterPresentationLanguage[language]),keys);
  for(const key of keys) {assert.equal(t(key,language,{count:3}),workCenterPresentationLanguage[language][key].replace("{count}","3"));assert.ok(t(key,language));}
 }
 assert.doesNotMatch(Object.values(workCenterPresentationLanguage.en).join(' '),/\b(canonical|lifecycle|authority|provenance|closeout|mutation|aggregate|hydration)\b/i);
});

test('only a professional responsibility code says You; customer and missing actors never become You',()=>{
 for(const language of ['en','es','fr','pt-BR']) {
  assert.equal(workCenterActor({code:'PROFESSIONAL'},'Professional',language),t('wc52you',language));
  assert.equal(workCenterActor({code:'CUSTOMER'},'Customer',language),t('wc52customer',language));
  assert.equal(workCenterActor(null,'Professional',language),'Professional');
  assert.equal(workCenterActor({code:'OTHER'},'Dispatcher',language),'Dispatcher');
 }
});

test('system-label changes preserve unknown labels and do not declare the job complete',()=>{
 assert.equal(workCenterLabel('Schedule approved work','en'),'Schedule this job');
 assert.equal(workCenterLabel('Work approved — ready to schedule','en'),'Approved — ready to schedule');
 assert.equal(workCenterLabel('Ready for completion review','en'),'Work finished — ready to complete the job');
 assert.equal(workCenterLabel('Customer supplied text','fr'),'Customer supplied text');
 assert.deepEqual(WORK_CENTER_JOB_LIFECYCLE.map(x=>x.key),stages);
 assert.deepEqual(WORK_CENTER_JOB_LIFECYCLE.map(x=>x.label),['Evaluation','Quote','Deposit','Schedule','Work Plan','Complete Job','Invoice']);
});

test('rendered Filter & Views separates active Job stages and All from the two navigation destinations',async()=>{
 const { FilterMenu }=await prepareWorkCenterPolishFixture();
 for(const activeLanguage of ['en','es','fr','pt-BR']) {
  const d=doc(React.createElement(FilterMenu,{activeLanguage,workCenterJobFilter:'all'}));
  const groups=[...d.querySelectorAll('optgroup')];assert.equal(groups.length,2);
  assert.deepEqual([...groups[0].children].map(x=>x.value),['all',...stages.filter(stage=>stage!=='invoice')]);
  assert.deepEqual([...groups[1].children].map(x=>x.value),['view:jobHistory','view:revenue']);
  assert.doesNotMatch(d.body.textContent,/canonical|lifecycle|closeout/i);
 }
});

test('selecting a stage only filters; History and Revenue call the existing owner openers',async()=>{
 const {FilterMenu}=await prepareWorkCenterPolishFixture();const calls=[];
 const tree=FilterMenu({workCenterJobFilter:'all',setWorkCenterJobFilter:v=>calls.push(['filter',v]),setWorkCenterFilterOpen:v=>calls.push(['open',v]),openWorkCenterJobsPage:v=>calls.push(['jobs',v]),openWorkTab:v=>calls.push(['tab',v])});
 const select=React.Children.toArray(tree.props.children).find(x=>x.type==='select');
 for(const value of ['all',...stages.filter(stage=>stage!=='invoice')]) select.props.onChange({target:{value}});
 assert.deepEqual(calls.splice(0),['all',...stages.filter(stage=>stage!=='invoice')].map(v=>['filter',v]));
 select.props.onChange({target:{value:'view:jobHistory'}});select.props.onChange({target:{value:'view:revenue'}});
 assert.deepEqual(calls,[['open',false],['jobs','history'],['open',false],['tab','revenue']]);
 assert.match(dashboard,/openWorkTab\(mode === "history" \? "jobHistory" : "currentJobs"\)/);
 assert.match(dashboard,/<ProfessionalJobHistoryWorkspace[\s\S]*sourceState=\{professionalJobHistorySource\}/);
 assert.match(dashboard,/activeTab === "revenue" && !isLegacyCommandSurfaceContained[\s\S]*<ProfessionalInvoiceWorkspace/);
});

test('Business Revenue button has no amount and uses the same existing revenue tab',async()=>{
 const {RevenueEntry}=await prepareWorkCenterPolishFixture();const destinations=[];
 const element=RevenueEntry({language:'en',openWorkCenterSection:v=>destinations.push(v)});
 element.props.onClick();assert.deepEqual(destinations,['revenue']);
 const d=doc(element);assert.equal(d.querySelector('button').textContent,'RevenueView RevenueView revenue and payment activity');
 assert.doesNotMatch(d.body.textContent,/\$|\d/);
 const source=read('src/pages/BusinessDashboard.jsx');assert.match(source,/localStorage.setItem\("meetroWorkCenterTab", section\)/);assert.match(source,/setPage\("contractorDashboard"\)/);
 const entry=source.slice(source.lastIndexOf('<GlanceItem',source.indexOf('icon="revenue"')),source.indexOf('/>',source.indexOf('icon="revenue"')));
 assert.doesNotMatch(entry,/localStorage|reduce|quoteTotal|totalJobRevenue|fetch|amount|Minor/);
});

test('search input and Filter & Views toggle retain their handlers and accessible names',async()=>{
 const {Toolbar}=await prepareWorkCenterPolishFixture();let query='',open=false;
 const tree=Toolbar({workCenterJobQuery:'',workCenterFilterOpen:false,setWorkCenterJobQuery:v=>query=v,setWorkCenterFilterOpen:fn=>open=fn(open)});
 const nodes=[];function walk(n){if(!n?.props)return;nodes.push(n);React.Children.forEach(n.props.children,walk);}walk(tree);
 nodes.find(n=>n.type==='input').props.onChange({target:{value:'Liam'}});
 nodes.find(n=>n.type==='button').props.onClick();assert.equal(query,'Liam');assert.equal(open,true);
 assert.equal(doc(tree).querySelector('button').getAttribute('aria-label'),'Filter and views');
});

test('production search intersects the same stage predicate without admitting view destinations',()=>{
 const start=dashboard.indexOf('const filteredWorkCenterActiveJobs =');
 const body=dashboard.slice(start,dashboard.indexOf('\n  });',start)+6);
 const run=(query,stage)=>vm.runInNewContext(`${body}; filteredWorkCenterActiveJobs.map(x=>x.customer).join(',')`,{workCenterJobQuery:query,workCenterJobFilter:stage,workCenterActiveJobs:[{customer:'Liam',title:'Fan',liveJob:{key:'schedule'}},{customer:'Sarah',title:'Sink',liveJob:{key:'quote'}}],getWorkCenterJobVisual:()=>({location:'Cape Coral'}),resolveWorkCenterLifecyclePresentation:({liveJob})=>({currentStageKey:liveJob.key})});
 assert.equal(run('liam','all'),'Liam');assert.equal(run('','quote'),'Sarah');assert.equal(run('liam','quote'),'');assert.equal(run('','view:revenue'),'');
});

test('visible landing/card/progress copy is plain language in all four languages',async()=>{
 const f=await prepareWorkCenterPolishFixture();
 for(const activeLanguage of ['en','es','fr','pt-BR']) {
  const d=doc(React.createElement('div',null,React.createElement(f.Banner,{activeLanguage,opportunityTileCounts:{new:1,awaiting:1},canonicalScheduleCounts:{today:0,upcoming:1}}),React.createElement(f.Card,{...f.cardProps,activeLanguage}),React.createElement(f.WorkCenterLifecycle,{presentation:f.lifecycle,language:activeLanguage})));
  assert.doesNotMatch(d.body.textContent,/\b(canonical|lifecycle|closeout|authority|provenance)\b/i);
  for(const el of d.querySelectorAll('[aria-label]'))assert.doesNotMatch(el.getAttribute('aria-label'),/canonical|lifecycle/i);
 }
 assert.doesNotMatch(dashboard,/Current lifecycle stage|canonical Job completion|Invoice &amp; Closeout/);
 assert.match(dashboard,/canonicalLiveJob\?\.stage\?\.code === "JOB_COMPLETED"/);
});
