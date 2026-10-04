import React from 'react';import {createRoot} from 'react-dom/client';import AuthorizedPunchLocations from '../../src/components/AuthorizedPunchLocations.jsx';
import {fixture,fixturePorts,ASSIGNMENT,MEMBER} from '../fixtures/punchLocations.js';
const data=fixture();
const customer={...data.sites[0],id:'88888888-8888-4888-8888-888888888888',kind:'CUSTOMER_JOB',label:'Customer property',source:data.customerLocation.source,address:data.customerLocation.address};
const revoked={...data.sites[0],id:'99999999-9999-4999-8999-999999999999',label:'Former material pickup',currentAuthorization:false,association:{...data.sites[0].association,version:2,state:'REVOKED'},history:[{version:2,state:'REVOKED',siteVersion:1,label:'Former material pickup',createdAt:'2026-09-30T21:00:00.000Z'},...data.sites[0].history]};
data.sites.push(customer,revoked);window.__punchManagementPorts=fixturePorts(data);
document.body.style.cssText='margin:0;background:#eef2f5;font-family:system-ui,sans-serif;';
createRoot(document.getElementById('root')).render(<React.StrictMode><main style={{maxWidth:1120,margin:'auto',padding:16}}><h1 style={{fontSize:24}}>Team · Job Assignments</h1><AuthorizedPunchLocations businessId={7} assignmentId={ASSIGNMENT} employeeMembershipId={MEMBER} setPage={()=>{}}/></main></React.StrictMode>);
