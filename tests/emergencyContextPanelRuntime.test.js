import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createServer } from 'vite';
import { getAppLayoutSnapshot } from '../src/utils/appLayout.js';
import { getCommunicationLayout } from '../src/utils/communicationLayout.js';

const JOB = '4fb789c7-6bd4-4560-a71c-c8523536582f';
let dom, vite, createRoot, Inbox, Thread, Panel;
const saved = new Map();
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
function detail(role = 'professional', type = 'emergency', jobId = JOB) {
  return { success: true, conversation: { id: 354, type, status: 'active' },
    participants: { viewer: { id: role === 'professional' ? 15 : 10, role }, homeowner: { id: 10, displayName: 'Test Customer' }, business: { userId: 15, name: 'Test Professional' } },
    relationship: { id: 358, emergencyRequestId: 25, requestId: 99, jobId, title: 'Synthetic Emergency', source: { type, id: 25, title: 'Synthetic Emergency', serviceSpecialty: 'plumbing' } },
    workflow: { status: 'professional_arrived', allowedActions: [], arrivedAt: '2026-09-20T12:00:00Z' },
    permissions: { canRead: true, canSendMessages: true, canManageWorkflow: false, canMarkEnRoute: false, canMarkArrived: false, canStartWork: false, canCompleteWork: false },
    location: { locationText: 'Synthetic location', accessNotes: 'No service visit' } };
}
function message(id, text, isViewer = false) {
  return { id, conversationId: 354, createdAt: '2026-09-20T12:00:00Z', sender: { id: isViewer ? 15 : 10, isViewer }, content: { type: 'text', text } };
}
function snapshot(width, height) {
  return getAppLayoutSnapshot({ windowObject: { innerWidth: width, innerHeight: height }, documentObject: { documentElement: { clientWidth: width, clientHeight: height } }, capacitor: { isNativePlatform: () => false } });
}
test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#conversationThread?conversationId=354&returnPage=messagesInbox&shell=communicationCenter', pretendToBeVisual: true });
  for (const key of ['window','document','navigator','localStorage','sessionStorage','HTMLElement','Element','Node','Event','CustomEvent','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable:true, writable:true, value: ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
  }
  saved.set('fetch', Object.getOwnPropertyDescriptor(globalThis, 'fetch'));
  globalThis.fetch = async () => { throw new Error('Live network forbidden in UI regression tests'); };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
  window.HTMLElement.prototype.scrollIntoView = () => { throw new Error('Must not scroll application ancestors'); };
  ({ createRoot } = await import('react-dom/client'));
  vite = await createServer({ appType:'custom', logLevel:'silent', server:{ middlewareMode:true, hmr:false }, plugins:[{
    name:'emergency-context-test-ports', enforce:'pre',
    resolveId(id) {
      if (/\/authFetch(?:\.js)?$/.test(id)) return '\0context-http';
      if (/\/useAppLayoutMetrics(?:\.js)?$/.test(id)) return '\0context-layout';
    },
    load(id) {
      if (id === '\0context-http') return 'export const authFetch=(...args)=>globalThis.__contextHttp(...args); export const clearMeetroSession=()=>{}; export const announceAccountConnectionIssue=()=>{}; export const handleAuthExpired=()=>{};';
      if (id === '\0context-layout') return 'export default function useAppLayoutMetrics(){return globalThis.__contextLayout;}';
    }
  }] });
  ({ default: Inbox } = await vite.ssrLoadModule('/src/pages/MessagesInbox.jsx'));
  ({ default: Thread } = await vite.ssrLoadModule('/src/pages/ConversationThread.jsx'));
  ({ EmergencyConversationContextPanel: Panel } = await vite.ssrLoadModule('/src/components/EmergencyRelationshipDetail.jsx'));
});
test.after(async () => {
  await vite?.close(); dom?.window.close();
  for (const [key, value] of saved) { if (value) Object.defineProperty(globalThis,key,value); else delete globalThis[key]; }
  for (const key of ['IS_REACT_ACT_ENVIRONMENT','__contextHttp','__contextLayout']) delete globalThis[key];
});
async function mount(t, { width=1440, height=1000, role='professional', type='emergency' } = {}) {
  globalThis.__contextLayout = snapshot(width,height);
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('token','local-fixture-only'); localStorage.setItem('language','en'); localStorage.setItem('activeAccountMode',role === 'professional' ? 'business' : 'personal');
  localStorage.setItem('user',JSON.stringify({ id:role === 'professional' ? 15 : 10, account_type:role }));
  const calls=[], routes=[];
  const payload=detail(role,type);
  const messages=[message(1,'Received message remains accessible'), message(2,'Earlier sent message',true)];
  globalThis.__contextHttp = async (path, options={}) => {
    calls.push({path,method:options.method || 'GET'});
    let data={success:true};
    if (path.startsWith('/conversations?')) data={success:true,conversations:[{id:354,conversation_id:354,request_id:99,emergency_request_id:type === 'emergency' ? 25 : null,conversation_available:true,source:{type,id:type === 'emergency' ? 25 : 99,title:'Synthetic Emergency'},display:{name:role === 'professional' ? 'Test Customer' : 'Test Professional'},status:{code:'active'},permissions:payload.permissions,workflow:payload.workflow}]};
    else if (path === '/conversations/354') data=payload;
    else if (path === '/conversations/354/messages') {
      if(options.method === 'POST') { const body=JSON.parse(options.body);const sent=message(3,body.message_text,true);messages.push(sent);data={success:true,code:'CONVERSATION_MESSAGE_CREATED',conversationId:354,message:sent}; }
      else data={success:true,conversationId:354,messages,pagination:{hasMore:false}};
    }
    else return {response:{ok:false,status:503},data:{success:false}};
    return {response:{ok:true,status:options.method === 'POST' ? 201 : 200},data};
  };
  const errors=[];
  const root=createRoot(document.getElementById('root'),{onUncaughtError:error=>errors.push(error)});
  t.after(async()=>{ await act(async()=>root.unmount()); });
  const desktop=getCommunicationLayout(globalThis.__contextLayout).mode === 'desktop';
  await act(async()=>{root.render(React.createElement(desktop ? Inbox : Thread,{setPage:r=>routes.push(r),currentPage:window.location.hash.slice(1)}));await pause();});
  await act(pause);
  assert.deepEqual(errors,[]);
  return {calls,routes,root};
}
const forbidden = /^(Start Driving|Mark Arrived|Open Evaluation|Start Work|Complete Work|Create Quote|Record Payment|Schedule)$/i;
function assertNoAuthority(container) {
  for(const node of container.querySelectorAll('button,a')) assert.doesNotMatch(node.textContent.trim(),forbidden);
}
for(const [name,width,height] of [['desktop',1440,1000],['iPad landscape',1180,820],['iPad Pro landscape',1366,1024]]) {
  for(const role of ['professional','homeowner']) test(`${role} ${name}: context only in right pane; exact role-gated Work Center route`,async t=>{
    await mount(t,{width,height,role});
    assert.equal(document.querySelector('[data-communication-columns]')?.dataset.communicationColumns,'three');
    const panel=document.querySelector('aside[data-emergency-context-panel="canonical"]');
    assert.ok(panel,'canonical right context');
    assert.equal(document.querySelector('[data-emergency-thread-context]'),null,'no duplicate summary in center');
    const history=document.querySelector('.chat-messages');
    assert.ok(history);assert.equal(history.contains(panel),false);
    assert.equal(history.style.overflowY,'auto');assert.equal(history.style.minHeight,'0px');assert.equal(history.style.overscrollBehavior,'contain');
    const composer=document.querySelector('.chat-bottom-stack');assert.ok(composer);assert.equal(history.contains(composer),false);assert.equal(composer.style.flex,'0 0 auto');
    assert.match(history.textContent,/Received message remains accessible/);
    const link=panel.querySelector('a');
    if(role==='professional') assert.equal(link?.getAttribute('href'),`#workCenter?jobId=${JOB}&returnPage=messagesInbox`); else assert.equal(link,null);
    assert.match(panel.textContent,/Professional arrived/i); assert.match(panel.textContent,/Synthetic location/);
    assert.equal(panel.querySelector('strong').style.color,'rgb(153, 27, 27)');
    assertNoAuthority(document);
  });
}
for(const [name,width,height] of [['iPad portrait',820,1180],['iPhone',390,844]]) test(`${name}: single-column collapsible context leaves messages and composer available`,async t=>{
  await mount(t,{width,height});
  assert.equal(document.querySelector('[data-communication-columns]'),null);
  assert.equal(document.querySelector('aside[data-emergency-context-panel]'),null);
  const context=document.querySelector('[data-emergency-thread-context="stacked"]');assert.ok(context);
  const toggle=[...context.querySelectorAll('button')].find(b=>/Review Details/i.test(b.textContent));assert.ok(toggle);
  await act(async()=>toggle.click());assert.equal(context.style.maxHeight,'40%');assert.equal(context.style.overflowY,'auto');
  assert.match(document.querySelector('.chat-messages').textContent,/Received message/);assert.ok(document.querySelector('.chat-composer textarea'));
  assertNoAuthority(document);
});
test('small iPad landscape reuses right context beside standalone messages without forcing a narrow list column',async t=>{
  await mount(t,{width:1024,height:768});
  assert.equal(document.querySelector('[data-communication-columns]'),null);
  const panel=document.querySelector('aside[data-emergency-context-panel="canonical"]');
  assert.ok(panel);assert.equal(document.querySelector('[data-emergency-thread-context]'),null);
  assert.equal(document.querySelector('.conversation-thread-page').style.flexDirection,'row');
  assert.equal(panel.style.flex,'0 0 240px');assert.equal(panel.style.overflowY,'auto');
  assert.equal(document.querySelector('.chat-messages').contains(panel),false);
  assert.ok(document.querySelector('.chat-composer'));assertNoAuthority(document);
});
test('canonical sent message appears immediately; only history is scrolled; search still filters',async t=>{
  const {calls}=await mount(t);
  const viewport=document.querySelector('.chat-messages');Object.defineProperty(viewport,'scrollHeight',{configurable:true,value:1200});viewport.scrollTop=0;
  const input=document.querySelector('.chat-composer textarea');
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(input,'New local test message');input.dispatchEvent(new Event('input',{bubbles:true}));});
  const send=document.querySelector('.chat-send-button');assert.ok(send);assert.equal(send.disabled,false);
  await act(async()=>{send.click();await pause();});await act(pause);
  assert.match(viewport.textContent,/New local test message/);assert.equal(viewport.scrollTop,1200);assert.equal(document.documentElement.scrollTop,0);
  assert.ok(calls.some(c=>c.path==='/conversations/354/messages'&&c.method==='POST'));
  const search=viewport.querySelector('input');
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(search,'Received message');search.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.match(viewport.textContent,/Received message/);assert.doesNotMatch(viewport.textContent,/New local test message/);
});
test('ordinary request keeps existing layout, message history and composer without Emergency treatment',async t=>{
  await mount(t,{type:'request',width:1180,height:820});
  assert.equal(document.querySelector('[data-communication-columns]')?.dataset.communicationColumns,'two');
  assert.equal(document.querySelector('[data-emergency-conversation-context]'),null);
  assert.equal(document.querySelector('[data-emergency-thread-context]'),null);
  assert.match(document.querySelector('.chat-messages').textContent,/Received message/);
  assert.ok(document.querySelector('.chat-composer'));
});
test('right context fails closed for missing/malformed canonical Job ID and homeowner role',async t=>{
  const root=createRoot(document.getElementById('root'));t.after(async()=>{await act(async()=>root.unmount());});
  for(const [role,jobId] of [['professional',null],['professional','25'],['homeowner',JOB]]) {
    const payload=detail(role,'emergency',jobId);const normalized={...payload,type:'emergency'};
    await act(async()=>root.render(React.createElement(Panel,{detail:normalized})));
    assert.equal(document.querySelector('a'),null);assertNoAuthority(document);
  }
});
test('Emergency compact landscape breakpoint does not change ordinary layout or force phone/portrait columns',()=>{
  for(const width of [839,840,896,1040]) {
    assert.equal(getCommunicationLayout({layoutMode:'desktop',contentWidth:width},{emergency:true}).columns,width>=840?3:2);
    assert.equal(getCommunicationLayout({layoutMode:'desktop',contentWidth:width}).columns,width>=1040?3:2);
  }
  for(const [width,height] of [[390,844],[820,1180],[1024,1366]]) assert.equal(getCommunicationLayout(snapshot(width,height),{emergency:true}).columns,1);
});
