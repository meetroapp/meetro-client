import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createServer, transformWithOxc } from 'vite';

const jobId = '11111111-1111-4111-8111-111111111111';
let dom, vite, createRoot, EvaluationSection;
const originals = new Map();
const noop = () => {};

test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#contractorDashboard', pretendToBeVisual: true });
  for (const key of ['window','document','navigator','localStorage','sessionStorage','HTMLElement','Element','Node','Event','CustomEvent']) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  ({ createRoot } = await import('react-dom/client'));
  vite = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false }, plugins: [{
    name: 'evaluation-physical-http', enforce: 'pre',
    resolveId(id) { if (id.endsWith('/authFetch.js')) return '\0evaluation-http'; },
    load(id) { if (id === '\0evaluation-http') return 'export const authFetch = (...args) => globalThis.__evaluationHttp(...args);'; }
  }] });
  const { default: CanonicalJobEvaluation } = await vite.ssrLoadModule('/src/components/CanonicalJobEvaluation.jsx');
  const { default: CanonicalJobVisits } = await vite.ssrLoadModule('/src/components/CanonicalJobVisits.jsx');
  const { WorkCenterAccordion } = await vite.ssrLoadModule('/src/components/WorkCenterWorkspaceSystem.jsx');
  const source = readFileSync(new URL('../src/pages/ContractorDashboard.jsx', import.meta.url), 'utf8');
  const start = source.lastIndexOf('<WorkCenterAccordion', source.indexOf('id="canonical-job-evaluation"'));
  const jsx = source.slice(start, source.indexOf('</WorkCenterAccordion>', start) + '</WorkCenterAccordion>'.length);
  assert.ok(jsx.includes('<CanonicalJobEvaluation') && jsx.includes('<CanonicalJobVisits'));
  const props = {
    selectedWorkCenterJob: { source: 'CANONICAL_BACKEND_READ', readOnly: true, jobId, requestId: 14, postId: 14, relationshipId: 22 },
    workCenterLifecycleProjection: { status: 'ready', postId: 14, projection: { job: { id: jobId }, requestId: 14 } },
    canonicalLiveJob: { availableActions: [{ code: 'START_EVALUATION' }] },
    activeLanguage: 'en', setPage: noop, setWorkCenterLifecycleRefreshKey: noop,
    getCanonicalAccordionPresentation: () => ({}), evaluationAlertCount: 0,
    workCenterWorkspaceCopy: { evaluation: 'Evaluation', evaluationSummary: 'Onsite assessment', findings: 'Findings', findingsSummary: '' },
    evaluationLifecycle: { state: 'current', currentAction: 'Schedule Evaluation Visit' },
    workCenterLabel: value => value, selectedWorkCenterAlertStage: 'evaluation', canonicalEvaluationHandoffIsCurrent: false,
    selectedWorkCenterVisitId: '', canonicalNextActionSection: 'evaluation', canonicalEvaluationAutoOpenToken: jobId, canonicalAutoOpenToken: jobId,
  };
  const { code } = await transformWithOxc(`function EvaluationSection() { return (${jsx}); }`, 'physical-path.jsx', { jsx: { runtime: 'classic' } });
  EvaluationSection = vm.runInNewContext(`${code}; EvaluationSection`, { React, ...props, CanonicalJobEvaluation, CanonicalJobVisits, WorkCenterAccordion });
});

test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
  delete globalThis.IS_REACT_ACT_ENVIRONMENT; delete globalThis.__evaluationHttp;
});

async function mount(t, { status = 200, actions = { canPropose: true }, code = 'VISIT_AUTHORITY_REQUIRED' } = {}) {
  const calls = [];
  localStorage.setItem('activeAccountMode', 'business');
  localStorage.setItem('accountType', 'professional');
  globalThis.__evaluationHttp = async (endpoint, options = {}) => {
    calls.push({ endpoint, method: options.method || 'GET' });
    assert.equal(options.method || 'GET', 'GET', 'Rendering or opening the form must not mutate Visit state');
    assert.ok(endpoint.startsWith(`/jobs/${jobId}/`), endpoint);
    if (endpoint.endsWith('/evaluations')) return { response: { ok: true, status: 200 }, data: { success: true, evaluations: [] } };
    if (endpoint.endsWith('/quotes')) return { response: { ok: true, status: 200 }, data: { success: true, quotes: [] } };
    assert.equal(endpoint, `/jobs/${jobId}/visits`);
    return { response: { ok: status === 200, status }, data: status === 200
      ? { success: true, code: 'VISITS_FOUND', visits: [], actions }
      : { success: false, code, message: 'Visit authority is required.' } };
  };
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => root.render(React.createElement(EvaluationSection)));
  return calls;
}
const propose = () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Propose Visit');

test('physical business path: current Evaluation, no Evaluation, authenticated Job actions expose governed proposal', async t => {
  const calls = await mount(t);
  assert.match(document.body.textContent, /No evaluation yet/i);
  assert.equal(document.querySelector('[data-work-center-accordion="canonical-job-evaluation"]').getAttribute('aria-current'), 'step');
  assert.ok(propose());
  assert.doesNotMatch(document.body.textContent, /not available for this professional account|deposit remaining/i);
  await act(async () => propose().click());
  assert.ok(document.querySelector('input[type="datetime-local"]'));
  assert.ok(calls.some(call => call.endpoint.endsWith('/visits')));
  assert.ok(calls.every(call => call.method === 'GET'));
  assert.doesNotMatch(document.body.textContent, /Fill manually/);
});

for (const [name, status] of [['unauthorized professional', 401], ['wrong business or denied Job grant', 403], ['wrong Job', 404]]) {
  test(`physical path fails closed for ${name}`, async t => {
    await mount(t, { status });
    assert.equal(propose(), undefined);
    assert.match(document.body.textContent, /Unavailable/);
    assert.doesNotMatch(document.body.textContent, /not available for this professional account/);
    if (status !== 401) assert.match(document.body.textContent, /Scheduling isn’t available for this job right now/);
  });
}
for (const actions of [{ canPropose: false }, {}, { canPropose: 'true' }]) {
  test(`empty Visit list cannot supply permission: ${JSON.stringify(actions)}`, async t => {
    await mount(t, { actions });
    assert.equal(propose(), undefined);
  });
}
