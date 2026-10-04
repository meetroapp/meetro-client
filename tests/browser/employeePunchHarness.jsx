import React from 'react';import {createRoot} from 'react-dom/client';import EmployeeShell from '../../src/components/EmployeeShell.jsx';import {TimeEvidencePanel} from '../../src/pages/EmployeeJobs.jsx';import {punchPorts,JOB,ASSIGNMENT} from '../fixtures/employeePunch.js';
import '../../src/styles/employeeShell.css';import '../../src/index.css';
window.__employeePunchPorts=punchPorts();
window.__employeePunchState=()=>({calls:window.__employeePunchPorts.calls,body:document.body.textContent,width:innerWidth,height:innerHeight,visibility:document.visibilityState});
createRoot(document.getElementById('root')).render(<EmployeeShell membership={{businessId:7,role:'FIELD_EMPLOYEE',businessName:'Local certification business'}} currentPage="employeeTime" setPage={()=>{}} title="My Time" description="Kitchen service"><TimeEvidencePanel businessId={7} job={{id:JOB,title:'Kitchen service'}} assignment={{id:ASSIGNMENT,activationVersion:1}} setPage={()=>{}} variant="full"/></EmployeeShell>);
