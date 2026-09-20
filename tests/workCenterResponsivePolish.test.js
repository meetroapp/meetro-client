import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { normalizeRequestConversations } from '../src/utils/requestCommunication.js';
import { matchesOpportunityFilter, parseOpportunityFilter, opportunityFilterRoute, getOpportunityTileCounts } from '../src/utils/opportunityPresentationFilters.js';
import { prepareWorkCenterPolishFixture } from './helpers/workCenterPolishFixture.js';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const raw = { request_id: 10, title: 'Repair', status: 'open', has_responded: false, professional_response_id: null, response_status: null, relationship_status: null, response_submission_available: true };
function normalize(row) { return normalizeRequestConversations({ opportunities: [row] }, 'business')[0]; }
const fresh = normalize(raw);
const waiting = normalize({ ...raw, has_responded: true, professional_response_id: 41, response_status: 'submitted', relationship_status: 'pending', response_submission_available: false });

test('New uses certified submission availability and no submitted response', () => {
  assert.equal(matchesOpportunityFilter(fresh, 'new'), true);
  assert.equal(matchesOpportunityFilter(waiting, 'new'), false);
  for (const change of [{ response_submission_available: false }, { has_responded: true }, { professional_response_id: 90 }]) {
    assert.equal(matchesOpportunityFilter(normalize({ ...raw, ...change }), 'new'), false);
  }
});
test('Awaiting Response requires open canonical submitted response and pending relationship', () => {
  assert.equal(matchesOpportunityFilter(waiting, 'awaiting-response'), true);
  assert.equal(matchesOpportunityFilter(fresh, 'awaiting-response'), false);
  for (const change of [{ status: 'closed' }, { responseStatus: 'selected' }, { relationshipStatus: 'active' }, { hasResponded: false }, { responseSubmissionAvailable: true }]) {
    assert.equal(matchesOpportunityFilter({ ...waiting, ...change }, 'awaiting-response'), false);
  }
  const malformed = normalize({ ...raw, has_responded: true, response_status: 'submitted', relationship_status: 'pending', response_submission_available: false });
  assert.equal(matchesOpportunityFilter(malformed, 'awaiting-response'), false, 'missing canonical response identity fails closed');
});
test('unconfirmed counts stay unavailable; confirmed empty and refresh retain truthful counts', () => {
  assert.equal(getOpportunityTileCounts({ updatedAt: 0, records: [fresh] }), null);
  assert.deepEqual(getOpportunityTileCounts({ updatedAt: 1, records: [] }), { new: 0, awaiting: 0 });
  const records = Object.freeze([Object.freeze(fresh), Object.freeze(waiting)]);
  assert.deepEqual(getOpportunityTileCounts({ updatedAt: 1, phase: 'refresh_error', records }), { new: 1, awaiting: 1 });
});
test('bounded query filters survive deep links and invalid values fall back to all', () => {
  for (const filter of ['new', 'awaiting-response']) assert.equal(parseOpportunityFilter(`#${opportunityFilterRoute(filter)}`), filter);
  for (const route of ['businessLeads', 'businessLeads?opportunityFilter=closed', 'businessLeads?opportunityFilter=new&opportunityFilter=awaiting-response', 'other?opportunityFilter=new']) assert.equal(parseOpportunityFilter(route), 'all');
});
test('count and destination code never reads browser workflow collections or mutates responses', () => {
  const helper = read('src/utils/opportunityPresentationFilters.js');
  assert.doesNotMatch(helper, /localStorage|pendingProjectRequests|fetch\(|authFetch|submitProfessionalResponse/);
  const dashboard = read('src/pages/ContractorDashboard.jsx');
  const banner = dashboard.slice(dashboard.indexOf('<section className="work-center-opportunities-banner'), dashboard.indexOf('{workCenterLandingAlert &&'));
  assert.doesNotMatch(banner, /pendingProjectRequests|opportunitiesCount|homeownerRequests|new opportunities/);
  assert.match(banner, /canonicalScheduleCounts.today \+ canonicalScheduleCounts.upcoming/);
  assert.match(dashboard, /subscribeProfessionalOpportunities\(setOpportunitySnapshot\)/);
  assert.match(read('src/pages/BusinessLeads.jsx'), /visibleOpportunities = opportunities.filter/);
});
test('rendered tiles are full buttons and route to New, Awaiting Response, and Schedule', async () => {
  const { Banner } = await prepareWorkCenterPolishFixture();
  const routes = [];
  const tree = Banner({ opportunityTileCounts: { new: 3, awaiting: 1 }, canonicalScheduleCounts: { today: 1, upcoming: 1 }, setPage: (route) => routes.push(route), openWorkTab: (tab) => routes.push(tab) });
  const buttons = [];
  function walk(node) { if (!node || typeof node !== 'object') return; if (node.type === 'button') buttons.push(node); React.Children.forEach(node.props?.children, walk); }
  walk(tree); buttons.forEach((button) => button.props.onClick());
  assert.deepEqual(routes, ['businessLeads', 'businessLeads?opportunityFilter=new', 'businessLeads?opportunityFilter=awaiting-response', 'schedule']);
  const html = renderToStaticMarkup(tree);
  assert.doesNotMatch(html, /new opportunities/);
  assert.equal(new JSDOM(html).window.document.querySelectorAll('button[type="button"]').length, 4);
});
test('production tracker renders four stages then three with canonical current and locked states', async () => {
  const { WorkCenterLifecycle, lifecycle } = await prepareWorkCenterPolishFixture();
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(WorkCenterLifecycle, { presentation: lifecycle }))).window.document;
  const labels = [...doc.querySelectorAll('[data-lifecycle-row]')].map((row) => [...row.querySelectorAll('.work-center-lifecycle__label')].map((el) => el.textContent));
  assert.deepEqual(labels, [['Evaluation','Quote','Deposit','Schedule'], ['Work Plan','Complete Job','Invoice']]);
  assert.equal(doc.querySelector('[aria-current="step"]').dataset.lifecycleStage, 'completeJob');
  assert.equal(doc.querySelector('[data-lifecycle-stage="invoice"]').dataset.lifecycleState, 'locked');
});
test('Emergency progress uses the red lifecycle palette without changing Job Request progress', async () => {
  const { WorkCenterLifecycle, lifecycle } = await prepareWorkCenterPolishFixture();
  const emergency = new JSDOM(renderToStaticMarkup(React.createElement(WorkCenterLifecycle, {
    presentation: { ...lifecycle, sourceType: 'emergency_request' },
  }))).window.document;
  const jobRequest = new JSDOM(renderToStaticMarkup(React.createElement(WorkCenterLifecycle, {
    presentation: lifecycle,
  }))).window.document;
  assert.equal(emergency.querySelector('.work-center-lifecycle').dataset.lifecycleSource, 'emergency_request');
  assert.equal(jobRequest.querySelector('.work-center-lifecycle').dataset.lifecycleSource, 'job_request');
  const css = read('src/index.css');
  assert.match(css, /data-lifecycle-source="emergency_request"[\s\S]*--work-center-lifecycle-complete-color: #ef4444/);
  assert.match(css, /--work-center-lifecycle-complete-color: #0aa35f/);
});
test('chevron and alert remain inside the working Job button after the tracker', async () => {
  const { Card, cardProps } = await prepareWorkCenterPolishFixture();
  const selected = [];
  const tree = Card({ ...cardProps, setSelectedWorkCenterJob: (job) => selected.push(job.id) });
  tree.props.onClick(); assert.deepEqual(selected, ['job-1']);
  const doc = new JSDOM(renderToStaticMarkup(tree)).window.document;
  assert.ok(doc.querySelector('button .work-center-attention-badge'));
  assert.ok(doc.querySelector('button .work-center-job-card__open'));
  assert.equal(doc.querySelector('button').lastElementChild.className, 'work-center-job-card__actions');
});
test('responsive contract sizes by content lane, preserves words, and gives metrics no empty cells', () => {
  const css = read('src/index.css').split('/* R5 responsive polish:')[1];
  assert.match(css, /@container work-center \(max-width: 760px\)/);
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /word-break: normal; hyphens: none/);
  assert.doesNotMatch(css, /overflow-x:\s*hidden|overflow-wrap:\s*anywhere/);
  assert.match(css, /completion-review-metrics \{ grid-template-columns: minmax\(0, 1fr\)/);
});
test('Work Center reserves a viewport-aware dock and keeps the universal launcher', () => {
  const css = read('src/index.css');
  assert.match(css, /height: calc\(100dvh - var\(--work-center-dock-bottom\) - var\(--work-center-launcher-height\) - 2 \* var\(--work-center-dock-gap\)\)/);
  assert.match(css, /--meetro-visual-viewport-bottom-gap/);
  const assistant = read('src/components/MeetroAssistant.jsx');
  assert.match(assistant, /bottom: "calc\(var\(--work-center-dock-bottom, 74px\) \+ var\(--work-center-dock-gap, 6px\)\)"/);
  assert.match(assistant, /onPointerDown=\{compactWorkCenterSafeDock \? undefined : handleLauncherPointerDown\}/);
  assert.match(read('src/pages/ContractorDashboard.jsx'), /placeholder=\{translate\("wc52searchPlaceholder", activeLanguage\)\}/);
  assert.match(read('src/pages/ContractorDashboard.jsx'), /setWorkCenterFilterOpen/);
});

 test('Completion Review renders exactly three meaningful metric cells', async () => {
  const { Metrics, metricsProps } = await prepareWorkCenterPolishFixture();
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(Metrics, metricsProps))).window.document;
  const cells = [...doc.querySelector('.completion-review-metrics').children];
  assert.equal(cells.length, 3);
  assert.deepEqual(cells.map((cell) => cell.textContent), ['1/1Work · Completed', 'NoneOutstanding items', 'Up to dateCustomer updates']);
});
