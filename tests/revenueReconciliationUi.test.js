import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {workspaceFixture,canonicalInvoiceIds} from './fixtures/revenueReconciliationCases.js';
import {validateInvoiceWorkspace} from '../src/utils/invoicePaymentApi.js';
const response=workspace=>new Response(JSON.stringify({success:true,workspace}),{headers:{'Content-Type':'application/json'}});
const settle=async()=>act(async()=>{await new Promise(r=>setTimeout(r,0));});

test('period UI renders canonical mixed-source summaries, updates Invoice population, preserves Draft access and rejects stale responses',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
 const keys=['window','document','navigator','HTMLElement','Node','CustomEvent','localStorage','fetch','IS_REACT_ACT_ENVIRONMENT'];
 const saved=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const [k,v] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,CustomEvent:dom.window.CustomEvent,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true})) Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});localStorage.setItem('token','fixture-token');
 const requests=[];let pendingFirst=null,holdFirst=false;
 globalThis.fetch=async(url,options={})=>{
  assert.equal(options.method||'GET','GET','No financial command may run');
  if(String(url).includes('/professional/invoices/workspace')){
   const period=new URL(String(url),'http://localhost').searchParams.get('period');requests.push(period);
   if(holdFirst){holdFirst=false;return new Promise(resolve=>{pendingFirst=resolve;});}
   return response(workspaceFixture(period,{workflow:true}));
  }
  return new Response(JSON.stringify({success:false,message:'Fixture read unavailable'}),{status:404});
 };
 const vite=await createServer({root:process.cwd(),server:{middlewareMode:true,hmr:false,ws:false},logLevel:'silent'});
 const root=createRoot(document.getElementById('root'));const setPage=()=>{};
 const props={language:'en',setPage};
 const amounts=()=>[...document.querySelectorAll('.work-center-metric-card__value')].map(x=>x.textContent);
 const ids=()=>[...document.querySelectorAll('section[aria-label="Invoice"] [data-invoice-id]')].map(x=>x.dataset.invoiceId);
 const click=async name=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===name);assert.ok(b&&!b.disabled);await act(async()=>b.click());await settle();};
 try{
  for(const period of ['THIS_MONTH','LAST_30_DAYS','LAST_90_DAYS','THIS_YEAR'])assert.ok(validateInvoiceWorkspace(workspaceFixture(period,{workflow:true})));
  const Component=(await vite.ssrLoadModule('/src/components/ProfessionalInvoiceWorkspace.jsx')).default;
  await act(async()=>root.render(React.createElement(Component,props)));await settle();
  assert.deepEqual(amounts(),['$660.00','$1,170.00','$0.00','3']);assert.deepEqual(ids(),canonicalInvoiceIds);
  assert.ok(document.querySelector('section[aria-label="Drafts"] [data-invoice-id="11111111-1111-4111-8111-111111111111"]'));
  await click('30 Days');assert.deepEqual(amounts(),['$660.00','$1,170.00','$0.00','3']);assert.deepEqual(ids(),canonicalInvoiceIds);
  await click('90 Days');assert.deepEqual(amounts(),['$1,170.00','$1,170.00','$0.00','3']);
  await click('This Year');assert.deepEqual(amounts(),['$1,270.00','$1,270.00','$0.00','4']);assert.equal(ids().length,4);
  await click('This Month');assert.deepEqual(amounts(),['$660.00','$1,170.00','$0.00','3']);assert.deepEqual(ids(),canonicalInvoiceIds);
  assert.deepEqual(requests.slice(0,5),['THIS_MONTH','LAST_30_DAYS','LAST_90_DAYS','THIS_YEAR','THIS_MONTH']);
  // A route transition invalidates an outstanding workspace request.
  await act(async()=>root.render(React.createElement(Component,{...props,initialInvoiceId:canonicalInvoiceIds[0]})));await settle();
  holdFirst=true;
  await act(async()=>root.render(React.createElement(Component,props)));await settle();assert.ok(pendingFirst);
  await act(async()=>root.render(React.createElement(Component,{...props,initialInvoiceId:canonicalInvoiceIds[0]})));await settle();
  await act(async()=>root.render(React.createElement(Component,props)));await settle();
  assert.deepEqual(amounts(),['$660.00','$1,170.00','$0.00','3']);
  const obsolete=workspaceFixture('THIS_MONTH');obsolete.revenue.cashReceivedMinor=17000;obsolete.revenue.invoicedMinor=68000;obsolete.revenue.paidInvoices=1;
  await act(async()=>pendingFirst(response(obsolete)));await settle();
  assert.deepEqual(amounts(),['$660.00','$1,170.00','$0.00','3']);assert.deepEqual(ids(),canonicalInvoiceIds);
 }finally{
  await act(async()=>root.unmount());await vite.close();dom.window.close();
  for(const [k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];
 }
});
