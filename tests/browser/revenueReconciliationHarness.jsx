import React from 'react';
import {createRoot} from 'react-dom/client';
import ProfessionalInvoiceWorkspace from '../../src/components/ProfessionalInvoiceWorkspace.jsx';
import {workspaceFixture} from '../fixtures/revenueReconciliationCases.js';
import {applyAppLayoutDiagnostics,getDesktopContentMetrics,startAppLayoutCoordinator} from '../../src/utils/appLayout.js';
import '../../src/index.css';
localStorage.setItem('token','fixture-token');
window.__revenueReads=[];
window.fetch=async(url,options={})=>{
 if((options.method||'GET')!=='GET')throw Error('Financial mutation forbidden in fixture');
 if(String(url).includes('/professional/invoices/workspace')){
  const period=new URL(String(url),location.origin).searchParams.get('period');window.__revenueReads.push(period);
  return new Response(JSON.stringify({success:true,workspace:workspaceFixture(period)}),{headers:{'Content-Type':'application/json'}});
 }
 return new Response(JSON.stringify({success:false,message:'Fixture read unavailable'}),{status:404});
};
const root=document.getElementById('root');
applyAppLayoutDiagnostics(root,getDesktopContentMetrics());
const stopLayoutCoordinator=startAppLayoutCoordinator({root});
window.addEventListener('pagehide',stopLayoutCoordinator,{once:true});
createRoot(root).render(<div data-revenue-fixture-content style={{width:'var(--meetro-available-content-width)',maxWidth:'100%',padding:16,margin:'0 auto'}}><ProfessionalInvoiceWorkspace language="en" setPage={()=>{}} onBack={()=>{}} /></div>);
