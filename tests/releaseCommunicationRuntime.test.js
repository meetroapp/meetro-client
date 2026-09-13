import { parseCanonicalConversationRoute } from "../src/utils/canonicalConversationMessaging.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createServer } from 'vite';
let dom, vite, createRoot;
const descriptors = new Map();
test.before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#messagesInbox', pretendToBeVisual: true });
  for (const key of ['window','document','navigator','localStorage','sessionStorage','HTMLElement','Element','Node','Event','CustomEvent','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value: typeof dom.window[key] === 'function' && ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key]});
  }
  descriptors.set('fetch',Object.getOwnPropertyDescriptor(globalThis,'fetch'));
  globalThis.fetch = async () => ({ok:false,status:503,json:async()=>({success:false})});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
  window.HTMLElement.prototype.scrollIntoView = () => {};
  ({createRoot} = await import('react-dom/client'));
  vite = await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{
    name:'customer-invoice-route-port',enforce:'pre',
    resolveId(id,importer){if(id.endsWith('/invoicePaymentApi.js') && importer?.endsWith('/CustomerInvoiceReviewRoute.jsx')) return '\0customer-invoice-route-port';},
    load(id){if(id==='\0customer-invoice-route-port') return 'export const fetchCustomerInvoice=async({invoiceId})=>{globalThis.__invoiceRouteReads.push(invoiceId);return globalThis.__routeInvoice;};';}
  }]});
});
test.after(async()=>{await vite?.close();dom?.window.close();for(const [key,d] of descriptors){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}delete globalThis.IS_REACT_ACT_ENVIRONMENT;delete globalThis.__routeInvoice;delete globalThis.__invoiceRouteReads;});
for (const route of ['messagesInbox','conversationThread?conversationId=340&returnPage=workCenter&shell=communicationCenter&invoiceId=11111111-1111-4111-8111-111111111111']) {
  test(`Communication Center renders safely: ${route}`,async()=>{
    if(route.startsWith('conversationThread')) assert.equal(parseCanonicalConversationRoute(route).valid,true);
    localStorage.clear();localStorage.setItem('language','en');localStorage.setItem('activeAccountMode','business');window.location.hash=route;
    const {default: Page}=await vite.ssrLoadModule('/src/pages/MessagesInbox.jsx');
    const errors=[];const root=createRoot(document.getElementById('root'),{onUncaughtError:e=>errors.push(e)});
    try { await act(async()=>{root.render(React.createElement(Page,{setPage:()=>{},currentPage:route}));await new Promise(r=>setTimeout(r,30));}); assert.deepEqual(errors.map(e=>e.stack),[]);assert.ok(document.body.textContent.length>0); }
    finally {await act(async()=>root.unmount());}
  });
}

for (const scenario of ['valid','missing','malformed','wrong-conversation']) {
  test(`Customer canonical Invoice route fails safely: ${scenario}`,async()=>{
    const invoiceId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
    const route=scenario==='missing'?'customerInvoiceReview':`customerInvoiceReview?invoiceId=${scenario==='malformed'?'bad':invoiceId}&jobId=${jobId}&conversationId=340`;
    window.location.hash=route;globalThis.__invoiceRouteReads=[];
    globalThis.__routeInvoice={invoiceId,jobId,invoiceNumber:'INV-111111111111',conversationId:scenario==='wrong-conversation'?999:340,status:'PARTIALLY_PAID',currency:'USD',totalMinor:68000,paidMinor:51000,balanceMinor:17000,business:{displayName:'Business'},customer:{displayName:'Customer'},job:{title:'Repair'},due:{mode:'DUE_ON_RECEIPT',date:null},lineItems:[{sequence:1,description:'Repair',quantity:1,unitAmountMinor:68000,lineTotalMinor:68000}],payments:[],actions:{canReview:true,canPayOnline:false}};
    const {default:Page}=await vite.ssrLoadModule('/src/pages/CustomerInvoiceReviewRoute.jsx');
    const errors=[],routes=[];const root=createRoot(document.getElementById('root'),{onUncaughtError:e=>errors.push(e)});
    try{
      await act(async()=>root.render(React.createElement(Page,{setPage:r=>routes.push(r)})));
      assert.deepEqual(errors,[]);
      const state=document.querySelector('[data-customer-invoice-route-status]').dataset.customerInvoiceRouteStatus;
      assert.equal(state,scenario==='valid'?'ready':'error');
      if(scenario==='valid'){
        assert.equal(document.querySelector('[data-canonical-invoice-id]').dataset.canonicalInvoiceId,invoiceId);
        for(const amount of ['680.00','510.00','170.00'])assert.ok(document.body.textContent.includes(amount));
        assert.match(document.body.textContent,/Download PDF/);
        await act(async()=>document.querySelector('button').click());assert.match(routes[0],/340/);
      }else assert.equal(document.querySelector('[data-canonical-invoice-id]'),null);
      assert.deepEqual(globalThis.__invoiceRouteReads,['missing','malformed'].includes(scenario)?[]:[invoiceId]);
    } finally {await act(async()=>root.unmount());}
  });
}
