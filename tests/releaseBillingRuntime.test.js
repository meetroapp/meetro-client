import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createServer } from 'vite';
let dom,vite,createRoot;const original=new Map();
const invoice={contractVersion:1,invoiceId:'11111111-1111-4111-8111-111111111111',jobId:'22222222-2222-4222-8222-222222222222',invoiceNumber:'INV-111111111111',conversationId:340,currentVersion:2,status:'PARTIALLY_PAID',currency:'USD',totalMinor:68000,paidMinor:51000,balanceMinor:17000,business:{displayName:'Test business'},customer:{displayName:'Test customer'},job:{title:'Repair'},due:{mode:'DUE_ON_RECEIPT',date:null},lineItems:[{sequence:1,description:'Repair',quantity:1,unitAmountMinor:68000,lineTotalMinor:68000}],payments:[],actions:{canIssue:false,canRecordPayment:true,canShareExternal:true}};
test.before(async()=>{
 dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/#workCenter',pretendToBeVisual:true});
 for(const key of ['window','document','navigator','localStorage','sessionStorage','HTMLElement','Element','Node','Event','CustomEvent','requestAnimationFrame','cancelAnimationFrame']){
 original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:['requestAnimationFrame','cancelAnimationFrame'].includes(key)?dom.window[key].bind(dom.window):dom.window[key]});}
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 ({createRoot}=await import('react-dom/client'));
 vite=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false},plugins:[{name:'billing-test-ports',enforce:'pre',resolveId(id){if(/\/invoicePaymentApi\.js$/.test(id))return '\0billing-invoice';if(/\/jobCompletionApi\.js$/.test(id))return '\0billing-completion';if(/\/paymentReminderApi\.js$/.test(id))return '\0billing-reminder';},load(id){
 if(id==='\0billing-invoice')return 'export const issueCanonicalInvoiceExternally=async input=>{globalThis.__billing.externalIssues.push(input);globalThis.__billing.invoice={...globalThis.__billing.invoice,status:"PARTIALLY_PAID",currentVersion:2,actions:{canIssue:false,canRecordPayment:true,canShareExternal:true}};return {invoice:globalThis.__billing.invoice};};export const emailCanonicalInvoice=async input=>{globalThis.__billing.emails.push(input);return {delivery:{state:"DELIVERY_REQUESTED",recipientEmail:"external@example.test"}};};export const fetchProfessionalInvoice=async input=>{globalThis.__billing.fetches.push(input);return globalThis.__billing.invoicesById[input.invoiceId]||globalThis.__billing.invoice;}; export const fetchProfessionalInvoiceWorkspace=async()=>({summary:{},invoices:[],readyJobs:[]});export const recordCanonicalPayment=async input=>{globalThis.__billing.payments++;globalThis.__billing.paymentCommands.push(input);if(globalThis.__billing.paymentError)throw globalThis.__billing.paymentError;if(globalThis.__billing.paymentResult)return globalThis.__billing.paymentResult;throw Error("unexpected payment");};export const createInvoiceCommandKey=()=>"test-key";export const issueCanonicalInvoice=async(input)=>{globalThis.__billing.sends.push(input);return {invoice:globalThis.__billing.invoice};}; export const fetchCanonicalInvoicePdf=async()=>{throw Error("PDF endpoint unavailable");};';
 if(id==='\0billing-completion')return 'export const createJobCompletionIdempotencyKey=()=>"completion-key";export const completeCanonicalJob=async input=>{globalThis.__billing.completionCommands.push(input);globalThis.__billing.review={...globalThis.__billing.review,state:"COMPLETED",canComplete:false};return {jobId:input.jobId,status:"COMPLETED"};};export const fetchJobCompletionReview=async()=>{globalThis.__billing.checks++;return globalThis.__billing.review || {state:globalThis.__billing.completion};};';
 if(id==='\0billing-reminder')return 'export const createPaymentReminderKey=()=>"reminder-key";export const sendInvoicePaymentReminder=async()=>{globalThis.__billing.reminders++;};';
 }}]});
});
test.after(async()=>{await vite?.close();dom?.window.close();for(const[k,d]of original){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}delete globalThis.IS_REACT_ACT_ENVIRONMENT;delete globalThis.__billing;});
async function mount(t,overrides={}){
 const initialInvoice={...invoice,...overrides};
 globalThis.__billing={invoice:initialInvoice,invoicesById:{[initialInvoice.invoiceId]:initialInvoice},completion:'ACTIVE',checks:0,sends:[],externalIssues:[],emails:[],reminders:0,payments:0,paymentCommands:[],paymentError:null,paymentResult:null,fetches:[]};
 const {default:Page}=await vite.ssrLoadModule('/src/components/ProfessionalInvoiceWorkspace.jsx');const routes=[];const root=createRoot(document.getElementById('root'));t.after(async()=>{await act(async()=>root.unmount());});
 const render=async(props={})=>{await act(async()=>{root.render(React.createElement(Page,{initialInvoiceId:props.initialInvoiceId||initialInvoice.invoiceId,setPage:props.setPage||((route)=>routes.push(route))}));});};
 await render();return {state:globalThis.__billing,routes,render};
}
const button=(text)=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
const click=async(text)=>{const b=button(text);assert.ok(b,`missing ${text}`);await act(async()=>b.click());};
const paymentForm=()=>document.querySelector('[data-record-payment-form="invoice"]');
async function setControlValue(control,value){
 const prototype=control.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;
 Object.getOwnPropertyDescriptor(prototype,'value').set.call(control,value);
 await act(async()=>control.dispatchEvent(new dom.window.Event(control.tagName==='SELECT'?'change':'input',{bubbles:true})));
}
test('Visible Send via Meetro blocks incomplete Job before review and performs zero sends',async(t)=>{
 const {state}=await mount(t);await click('Send via Meetro');assert.equal(document.querySelector('dialog').open,true);assert.match(document.body.textContent,/Complete the job first/);assert.equal(state.sends.length,0);assert.equal(state.payments,0);assert.equal(state.checks,1);assert.equal(button('Confirm Send'),undefined);
});
test('Delivery checks completion again after opening Review, preserving exact Invoice identity',async(t)=>{
 const {state,routes}=await mount(t);state.completion='COMPLETED';await click('Send via Meetro');const confirm=[...document.querySelectorAll('button')].find(b=>/confirm/i.test(b.textContent));assert.ok(confirm);state.completion='ACTIVE';await act(async()=>confirm.click());assert.equal(state.sends.length,0);assert.equal(state.checks,2);await click('Got it');state.completion='COMPLETED';await click('Send via Meetro');await act(async()=>[...document.querySelectorAll('button')].find(b=>/confirm/i.test(b.textContent)).click());assert.equal(state.sends[0].invoiceId,invoice.invoiceId);assert.match(routes[0],new RegExp(invoice.invoiceId));assert.match(routes[0],/340/);
});
test('External customer retains payment, PDF, copy and reminder capabilities without Meetro sender',async(t)=>{
 const {state}=await mount(t,{conversationId:null});assert.equal(button('Send via Meetro'),undefined);assert.match(document.body.textContent,/Record Payment/);assert.match(document.body.textContent,/Download PDF \+ Open Email Draft/);assert.match(document.body.textContent,/Payments applied before Invoice/);assert.doesNotMatch(document.body.textContent,/No Payments recorded yet/);
 const reminder=[...document.querySelectorAll('button')].find(b=>/reminder/i.test(b.textContent));await act(async()=>reminder.click());assert.ok(button('Copy reminder'));assert.ok(button('Email reminder'));assert.equal(state.reminders,0);assert.equal(state.payments,0);assert.equal(state.sends.length,0);
});
test('Universal Ask entry carries the selected Invoice and performs no delivery',async(t)=>{
 const {state}=await mount(t);let detail;const onOpen=e=>{detail=e.detail;};window.addEventListener('meetro:assistant:open',onOpen);t.after(()=>window.removeEventListener('meetro:assistant:open',onOpen));
 await act(async()=>document.querySelector('.contextual-ask-meetro-trigger').click());assert.equal(detail.context.invoiceId,invoice.invoiceId);assert.equal(detail.context.jobId,invoice.jobId);assert.equal(state.sends.length,0);assert.equal(document.querySelector('.contextual-ask-meetro textarea'),null);
});
test('External reminder copy is informational and preserves both ledgers',async(t)=>{
 const {state}=await mount(t,{conversationId:null});const copies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>copies.push(text)}});
 await act(async()=>[...document.querySelectorAll('button')].find(b=>/reminder/i.test(b.textContent)).click());await click('Copy reminder');assert.match(copies[0],/170\.00/);assert.equal(state.invoice.paidMinor,51000);assert.equal(state.invoice.balanceMinor,17000);assert.equal(state.payments,0);assert.equal(state.reminders,0);assert.equal(state.sends.length,0);
});

test('external canonical Invoice Review/Confirm, Email PDF and Reminder use exact owner without Meetro delivery',async t=>{
 const {state,routes}=await mount(t,{conversationId:null,status:'DRAFT',currentVersion:1,authority:{kind:'BUSINESS_CUSTOMER'},actions:{canIssue:true,canRecordPayment:false,canShareExternal:false}});
 state.completion='COMPLETED';
 assert.equal(button('Send via Meetro'),undefined);
 await click('Review Invoice');assert.equal(state.externalIssues.length,0);
 await click('Confirm Invoice');assert.equal(state.externalIssues.length,1);assert.equal(state.externalIssues[0].invoiceId,invoice.invoiceId);
 assert.equal(routes.length,0);assert.equal(state.sends.length,0);
 await click('Email PDF');assert.equal(state.emails[0].purpose,'INVOICE');assert.equal(state.emails[0].expectedVersion,2);
 await act(async()=>[...document.querySelectorAll('button')].find(b=>/reminder/i.test(b.textContent)).click());
 await click('Email reminder');assert.equal(state.emails[1].purpose,'REMINDER');
 assert.equal(state.payments,0);assert.equal(state.invoice.paidMinor,51000);assert.equal(state.invoice.balanceMinor,17000);
});

test('A. same Invoice refetch keeps the Record Payment form open',async t=>{
 const {state,render}=await mount(t);await click('Record Payment');const form=paymentForm();assert.ok(form);
 const refreshed={...state.invoice,currentVersion:3};state.invoice=refreshed;state.invoicesById[refreshed.invoiceId]=refreshed;
 await render({setPage:()=>{}});
 assert.strictEqual(paymentForm(),form);assert.equal(state.fetches.length,2);assert.equal(state.payments,0);
});

test('B. same Invoice refetch preserves every payment field and keyboard focus',async t=>{
 const {state,render}=await mount(t);await click('Record Payment');const form=paymentForm();
 const amount=form.querySelector('input[inputmode="decimal"]');const method=form.querySelector('select');const receivedDate=form.querySelector('input[type="date"]');const reference=form.querySelector('input[maxlength="500"]');
 await setControlValue(amount,'125.50');await setControlValue(method,'BANK_TRANSFER');await setControlValue(receivedDate,'2026-09-01');await setControlValue(reference,'customer ACH 4481');amount.focus();
 const refreshed={...state.invoice,currentVersion:3};state.invoice=refreshed;state.invoicesById[refreshed.invoiceId]=refreshed;await render({setPage:()=>{}});
 assert.equal(amount.value,'125.50');assert.equal(method.value,'BANK_TRANSFER');assert.equal(receivedDate.value,'2026-09-01');assert.equal(reference.value,'customer ACH 4481');assert.strictEqual(document.activeElement,amount);assert.equal(state.payments,0);
});

test('C. changing to a different Invoice clears the prior payment interaction',async t=>{
 const {state,render}=await mount(t);await click('Record Payment');const form=paymentForm();await setControlValue(form.querySelector('input[inputmode="decimal"]'),'88.25');await setControlValue(form.querySelector('select'),'CASH');await setControlValue(form.querySelector('input[type="date"]'),'2026-09-01');await setControlValue(form.querySelector('input[maxlength="500"]'),'old invoice evidence');
 const other={...state.invoice,invoiceId:'33333333-3333-4333-8333-333333333333',invoiceNumber:'INV-333333333333',currentVersion:1};state.invoicesById[other.invoiceId]=other;
 await render({initialInvoiceId:other.invoiceId,setPage:()=>{}});assert.equal(document.querySelector('[data-canonical-invoice-id]')?.dataset.canonicalInvoiceId,other.invoiceId);assert.equal(paymentForm(),null);
 await click('Record Payment');const next=paymentForm();assert.equal(next.querySelector('input[inputmode="decimal"]').value,'');assert.equal(next.querySelector('select').value,'CHECK');assert.equal(next.querySelector('input[type="date"]').value,new Date().toISOString().slice(0,10));assert.equal(next.querySelector('input[maxlength="500"]').value,'');assert.equal(state.payments,0);
});

test('D. successful Record Payment closes and clears the form',async t=>{
 const {state}=await mount(t);await click('Record Payment');const form=paymentForm();await setControlValue(form.querySelector('input[inputmode="decimal"]'),'40.00');await setControlValue(form.querySelector('select'),'CASH');await setControlValue(form.querySelector('input[type="date"]'),'2026-09-01');await setControlValue(form.querySelector('input[maxlength="500"]'),'cash receipt 9');
 state.paymentResult={invoice:{...state.invoice,currentVersion:3,paidMinor:55000,balanceMinor:13000}};await act(async()=>form.querySelector('button[type="submit"]').click());
 assert.equal(paymentForm(),null);assert.equal(state.payments,1);assert.equal(state.paymentCommands[0].amountMinor,4000);assert.equal(state.paymentCommands[0].method,'CASH');
 await click('Record Payment');assert.equal(paymentForm().querySelector('input[inputmode="decimal"]').value,'');assert.equal(paymentForm().querySelector('select').value,'CHECK');assert.equal(paymentForm().querySelector('input[type="date"]').value,new Date().toISOString().slice(0,10));assert.equal(paymentForm().querySelector('input[maxlength="500"]').value,'');
});

test('E. explicit Cancel closes and clears the Record Payment form',async t=>{
 const {state}=await mount(t);await click('Record Payment');const form=paymentForm();await setControlValue(form.querySelector('input[inputmode="decimal"]'),'17.00');await setControlValue(form.querySelector('input[maxlength="500"]'),'cancel this');
 await act(async()=>[...form.querySelectorAll('button')].find(control=>control.textContent==='Cancel').click());assert.equal(paymentForm(),null);assert.equal(state.payments,0);
 await click('Record Payment');assert.equal(paymentForm().querySelector('input[inputmode="decimal"]').value,'');assert.equal(paymentForm().querySelector('input[maxlength="500"]').value,'');
});

test('F. stale Invoice recovery refreshes truth, preserves draft, and never retries automatically',async t=>{
 const {state}=await mount(t);await click('Record Payment');const form=paymentForm();const amount=form.querySelector('input[inputmode="decimal"]');const method=form.querySelector('select');const receivedDate=form.querySelector('input[type="date"]');const reference=form.querySelector('input[maxlength="500"]');
 await setControlValue(amount,'60.75');await setControlValue(method,'CHECK');await setControlValue(receivedDate,'2026-09-02');await setControlValue(reference,'check 902');const refreshed={...state.invoice,currentVersion:3};state.invoice=refreshed;state.invoicesById[refreshed.invoiceId]=refreshed;state.paymentError=Object.assign(new Error('Invoice truth refreshed. Review and retry.'),{code:'STALE_INVOICE_VERSION'});
 await act(async()=>form.querySelector('button[type="submit"]').click());assert.ok(paymentForm());assert.equal(amount.value,'60.75');assert.equal(method.value,'CHECK');assert.equal(receivedDate.value,'2026-09-02');assert.equal(reference.value,'check 902');assert.equal(state.payments,1);assert.equal(state.paymentCommands.length,1);assert.equal(state.paymentCommands[0].expectedVersion,2);assert.equal(state.fetches.length,2);
});

test('G. UI refresh alone records no payment',async t=>{
 const {state,render}=await mount(t);await render({setPage:()=>{}});await render({setPage:()=>{}});assert.equal(state.fetches.length,3);assert.equal(state.payments,0);assert.deepEqual(state.paymentCommands,[]);
});

test('narrow iPhone Invoice amounts stay in nonshrinking one-line columns',async t=>{
 const previousWidth=window.innerWidth;Object.defineProperty(window,'innerWidth',{configurable:true,value:320});t.after(()=>Object.defineProperty(window,'innerWidth',{configurable:true,value:previousWidth}));
 await mount(t);const line=document.querySelector('[data-invoice-line-item]');const lineMoney=document.querySelector('[data-invoice-money="line-total"]');const prior=document.querySelector('[data-payment-source="prior-applied"]');const priorMoney=document.querySelector('[data-invoice-money="prior-applied"]');
 for(const row of [line,prior]){assert.equal(row.style.display,'grid');assert.equal(row.style.gridTemplateColumns,'minmax(0, 1fr) auto');assert.match(row.firstElementChild.style.minWidth,/^0(?:px)?$/);}
 for(const value of [lineMoney,priorMoney]){assert.equal(value.style.whiteSpace,'nowrap');assert.equal(value.style.flexShrink,'0');assert.equal(value.style.minWidth,'max-content');assert.equal(value.style.textAlign,'right');}
});

for(const external of [false,true]) test(`${external?'External':'Meetro'} completion uses the same Review/Confirm command with no client status or request authority`,async t=>{
 globalThis.__billing={checks:0,completionCommands:[],review:{state:'ACTIVE',currentVersion:0,canComplete:true,
   work:{workItemCount:1,completedWorkItemCount:1},outstanding:{workstreams:0,workItems:0,obligations:0,findings:0},customerUpdates:{count:0,status:'UP_TO_DATE'},
   ...(external?{requestId:null,relationshipId:null,authority:{kind:'BUSINESS_CUSTOMER'}}:{requestId:14,relationshipId:22})}};
 const {default:Review}=await vite.ssrLoadModule('/src/components/ProfessionalCompletionReview.jsx');
 const root=createRoot(document.getElementById('root'));t.after(async()=>{await act(async()=>root.unmount());});
 await act(async()=>root.render(React.createElement(Review,{jobId:invoice.jobId})));
 await click('Complete Job');assert.equal(globalThis.__billing.completionCommands.length,0);
 await click('Yes, Complete Job');
 const command=globalThis.__billing.completionCommands[0];
 assert.deepEqual(Object.keys(command).sort(),['expectedVersion','idempotencyKey','jobId','setPage']);
 assert.equal(command.jobId,invoice.jobId);assert.equal(command.expectedVersion,0);
 assert.match(document.body.textContent,/Ready to Invoice/);
});
