import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { prepareWorkCenterPolishFixture } from './helpers/workCenterPolishFixture.js';
const css=readFileSync(new URL('../src/index.css',import.meta.url),'utf8');
const cardCss=css.split('/* R5.4 Active Job cards:')[1];

test('Active Job composition uses the existing content lane, not a device layout',()=>{
 assert.match(css,/\.work-center-content-lane\s*\{\s*container: work-center \/ inline-size/);
 assert.match(cardCss,/@container work-center \(min-width: 560px\)/);
 assert.match(cardCss,/@container work-center \(min-width: 900px\)/);
 assert.doesNotMatch(cardCss,/@media|data-app-layout|pointer:|hover:|user-agent|transform:|overflow[^;]*hidden/);
 assert.doesNotMatch(cardCss,/height:\s*\d+px;[\s\S]{0,10}padding:/);
 assert.match(cardCss,/height: auto/);
 assert.match(cardCss,/width: 100%/);
});

test('wide card lays out a compact summary and one seven-column tracker without replacing stages',()=>{
 const wide=cardCss.split('@container work-center (min-width: 900px)')[1];
 assert.match(wide,/'?"image identity state open"/);
 assert.match(wide,/repeat\(7, minmax\(0, 1fr\)\)/);
 assert.match(wide,/work-center-lifecycle__row \{ display: contents; \}/);
 assert.match(wide,/work-center-job-card__state > :nth-child\(n\) \{ grid-column: auto; grid-row: auto/);
});

test('medium and narrow keep natural wrapping and the existing 4 + 3 stage nodes',async()=>{
 const {Card,cardProps}=await prepareWorkCenterPolishFixture();
 const doc=new JSDOM(renderToStaticMarkup(React.createElement(Card,cardProps))).window.document;
 assert.deepEqual([...doc.querySelectorAll('[data-lifecycle-row]')].map(row=>row.children.length),[4,3]);
 assert.deepEqual([...doc.querySelectorAll('[data-lifecycle-stage]')].map(stage=>stage.dataset.lifecycleStage),['evaluation','quote','deposit','schedule','workPlan','completeJob','invoice']);
 assert.match(cardCss,/"image identity" "state state" "open open" "lifecycle lifecycle"/);
 assert.match(cardCss,/"image identity open" "state state state"/);
 assert.match(cardCss,/overflow-wrap: normal;\s*word-break: normal;\s*hyphens: none/);
});

test('one Job button retains the exact opening handler, Job object and lifecycle truth',async()=>{
 const {Card,cardProps}=await prepareWorkCenterPolishFixture();
 const calls=[];
 const tree=Card({...cardProps,setSelectedJobDetailView:v=>calls.push(['detail',v]),setIsJobHistoryMode:v=>calls.push(['history',v]),
  setSelectedWorkCenterAlertStage:v=>calls.push(['alert',v]),setIsWorkCenterSectionOpen:v=>calls.push(['section',v]),setSelectedWorkCenterJob:v=>calls.push(['job',v])});
 tree.props.onClick();
 assert.deepEqual(calls,[['detail',''],['history',false],['alert',''],['section',false],['job',cardProps.job]]);
 assert.strictEqual(calls.at(-1)[1],cardProps.job);
 const doc=new JSDOM(renderToStaticMarkup(tree)).window.document;
 assert.equal(doc.querySelectorAll('button').length,1);
 assert.equal(doc.querySelectorAll('.work-center-job-card__open').length,1);
 assert.equal(doc.querySelector('button').dataset.currentLifecycleStage,cardProps.lifecycle.currentStageKey);
 assert.match(css,/work-center-job-card:focus-visible/);
 assert.match(cardCss,/min-width: 44px; min-height: 44px/);
});

test('unavailable status and long authored names survive the layout without inferred truth',async()=>{
 const {Card,cardProps}=await prepareWorkCenterPolishFixture();
 const customer='Alexandra Catherine Montgomery de la Cruz';
 const title='Kitchen cabinetry restoration and ceiling ventilation replacement with finishing details';
 const doc=new JSDOM(renderToStaticMarkup(React.createElement(Card,{...cardProps,job:{...cardProps.job,customer,title},
  jobListPresentation:{...cardProps.jobListPresentation,statusLabel:'Current status unavailable'}}))).window.document;
 assert.equal(doc.querySelector('.work-center-job-card__identity strong').textContent,customer);
 assert.equal(doc.querySelector('.work-center-job-card__service').textContent,title);
 assert.equal(doc.querySelector('.work-center-job-card__status').textContent,'Current status unavailable');
 assert.match(doc.body.textContent,/Next step/);assert.match(doc.body.textContent,/Next up/);
});


test('card responsibility uses only governed codes, including customer and unavailable',async()=>{
 const {Card,cardProps}=await prepareWorkCenterPolishFixture();
 for(const [code,expected] of [['PROFESSIONAL','You'],['CUSTOMER','Customer'],[undefined,'Unavailable'],['UNKNOWN','Unavailable']]){
  const props={...cardProps,job:{...cardProps.job,liveJob:{responsibility:{code}}},jobListPresentation:{...cardProps.jobListPresentation,responsibilityLabel:'Professional'}};
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(Card,props))).window.document;
  assert.equal(doc.querySelector('.work-center-job-card__responsibility > :last-child').textContent,expected);
 }
});

test('action-first styling bounds progress and connects existing stages without new action authority',()=>{
 const actionCss=css.split('/* R5.4B action-first cards:')[1];
 assert.match(actionCss,/max-width: 980px/);
 assert.match(actionCss,/state > strong \{ font-size: 17px/);
 assert.match(actionCss,/stage--complete::after \{ background: #0aa35f/);
 assert.match(actionCss,/background: #cbd5e1/);
 assert.match(actionCss,/stage:last-child::after \{ display: none/);
 assert.match(actionCss,/row:first-child .*stage:last-child::after \{ display: block/);
 assert.match(actionCss,/pointer-events: none/);
 assert.doesNotMatch(actionCss,/@media|transform:|overflow[^;]*hidden/);
});
