import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { prepareWorkCenterPolishFixture } from './helpers/workCenterPolishFixture.js';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const dashboard = read('src/pages/ContractorDashboard.jsx');
const header = read('src/components/CompactCurrentJobHeader.jsx');
const css = read('src/index.css');
const r54c = css.split('/* R5.4C unified Job Overview:')[1];

test('opened canonical Job moves the existing lifecycle into one overview card', () => {
  assert.match(header, /progress = null/);
  assert.match(header, /compact-current-job-header__progress[\s\S]*\{progress\}/);
  assert.match(dashboard, /progress=\{isCanonicalReadOnlyJob[\s\S]*<WorkCenterLifecycleHeading[\s\S]*<WorkCenterLifecycle/);
  assert.equal((dashboard.match(/<WorkCenterLifecycleHeading/g) || []).length, 1);
  assert.equal((dashboard.match(/<WorkCenterLifecycle language=\{activeLanguage\} presentation=\{canonicalLifecyclePresentation\}/g) || []).length, 1);
  assert.doesNotMatch(dashboard, /<section className="work-center-job-lifecycle-overview"/);
});

test('unified overview renders one truthful progress heading and one exact seven-stage tracker', async () => {
  const f = await prepareWorkCenterPolishFixture();
  const progress = React.createElement(React.Fragment, null,
    React.createElement(f.WorkCenterLifecycleHeading, { presentation: f.lifecycle, language: 'en' }),
    React.createElement(f.WorkCenterLifecycle, { presentation: f.lifecycle, language: 'en', compact: true }));
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(f.CompactCurrentJobHeader, {...f.headerProps, progress}))).window.document;
  assert.equal(doc.querySelectorAll('.compact-current-job-header').length, 1);
  assert.equal(doc.querySelectorAll('.compact-current-job-header__progress').length, 1);
  assert.equal(doc.querySelectorAll('.work-center-lifecycle').length, 1);
  assert.equal(doc.querySelector('.work-center-lifecycle-heading span').textContent, `${f.lifecycle.completedCount} of 7 completed`);
  assert.deepEqual([...doc.querySelectorAll('[data-lifecycle-stage]')].map(node => node.dataset.lifecycleStage), ['evaluation','quote','deposit','schedule','workPlan','completeJob','invoice']);
  assert.match(doc.body.textContent, /Customer concern/);
  assert.match(doc.body.textContent, /Job record/);
});

test('status, governed next action, responsibility and Message route remain the existing inputs', () => {
  assert.match(dashboard, /status=\{workCenterLabel\(jobDisplayStatus, activeLanguage\)\}/);
  assert.match(dashboard, /nextStep=\{workCenterLabel\(jobDisplayNextStep, activeLanguage\)\}/);
  assert.match(dashboard, /responsibility=\{workCenterActor\(canonicalLiveJob\?\.responsibility, jobDisplayResponsibility, activeLanguage\)\}/);
  assert.match(dashboard, /onClick=\{\(\) => openCanonicalWorkCenterConversation\(\{ conversationId: scopedJob\.conversationId \}, "currentJobs"\)\}/);
  assert.match(r54c, /state-item--next strong[\s\S]*font-size: 17px[\s\S]*font-weight: 800/);
});

test('opened Job progress follows the same content lane, bounded connected 7 or 4+3 layout', () => {
  assert.match(r54c, /@container work-center \(min-width: 900px\)/);
  assert.match(r54c, /width: min\(100%, 980px\)/);
  assert.match(r54c, /repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(r54c, /work-center-lifecycle__row \{ display: contents/);
  assert.match(r54c, /stage--complete::after \{ background: #0aa35f/);
  assert.match(r54c, /background: #cbd5e1/);
  assert.match(r54c, /stage:last-child::after \{ display: none/);
  assert.match(r54c, /row:first-child .*stage:last-child::after \{ display: block/);
  assert.doesNotMatch(r54c, /@media|data-app-layout|transform:|overflow[^;]*hidden/);
  assert.doesNotMatch(r54c, /compact-current-job-header \{[^}]*height:\s*\d+px/);
});

test('detailed workflow accordions remain after the unified overview in canonical order', () => {
  const overview = dashboard.indexOf('progress={isCanonicalReadOnlyJob');
  const ids = ['canonical-job-evaluation','canonical-job-quotes','canonical-job-deposit','canonical-job-schedule','canonical-job-work-plan','canonical-job-complete','canonical-job-invoice'];
  let cursor = overview;
  for (const id of ids) {
    const next = dashboard.indexOf(`id="${id}"`, cursor);
    assert.ok(next > cursor, `${id} follows the overview`);
    cursor = next;
  }
  assert.match(dashboard, /attentionCount=\{evaluationAlertCount\}/);
  assert.match(dashboard, /attentionCount=\{invoiceAlertCount\}/);
  assert.match(dashboard, /getCanonicalAccordionPresentation/);
});
