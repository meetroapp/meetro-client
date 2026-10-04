import assert from 'node:assert/strict';import test from 'node:test';import React,{act} from 'react';import {JSDOM} from 'jsdom';import {createServer} from 'vite';import react from '@vitejs/plugin-react';
import {captureBusinessSitePosition} from '../src/utils/businessSiteCapture.js';import {fixture,fixturePorts,ASSIGNMENT,MEMBER,POLICY,SITE} from './fixtures/punchLocations.js';
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://meetro.test/#employeeJobs'});
const prior=Object.fromEntries(['window','document','navigator','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
const {createRoot}=await import('react-dom/client');
const vite=await createServer({root:process.cwd(),configFile:false,cacheDir:'/private/tmp/meetro-63J4E8-B/vite-tests',optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},plugins:[react(),{name:'business-punch-location-fixture',enforce:'pre',transform(source,id){if(id.endsWith('/EmployeeJobs.jsx'))return source+'\nexport { ManagerWorkspace };';if(id.endsWith('/AuthorizedPunchLocations.jsx'))return source.replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/utils\/punchLocationApi\.js['"];?/,(_,names)=>names.split(',').map(n=>n.trim()).map(n=>`const ${n} = (...args) => globalThis.__punchManagementPorts.${n}(...args);`).join('\n'));}}]});
const {default:Workspace}=await vite.ssrLoadModule('/src/components/AuthorizedPunchLocations.jsx');
async function run(callback,initial=fixture()) {
 const root=createRoot(document.getElementById('root')),ports=globalThis.__punchManagementPorts=fixturePorts(initial);let callbackPosition;
 Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok,error,options){callbackPosition={ok,error,options};}}});
 const render=async(props={})=>{await act(async()=>{root.render(React.createElement(Workspace,{businessId:7,assignmentId:ASSIGNMENT,employeeMembershipId:MEMBER,setPage:()=>{},...props}));await new Promise(r=>setTimeout(r,0));});await act(async()=>{await new Promise(r=>setTimeout(r,10));});};
 const click=async(name)=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===name);assert.ok(button,`Missing ${name}`);await act(async()=>button.click());};
 const fill=async(label,value)=>{const node=[...document.querySelectorAll('label')].find(n=>n.firstChild.textContent===label)?.querySelector('input,select');assert.ok(node,`Missing ${label}`);const proto=node.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);await act(async()=>node.dispatchEvent(new dom.window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true})));};
 try{await render();await callback({ports,click,fill,render,position:()=>callbackPosition,root});}finally{await act(async()=>root.unmount());delete globalThis.__punchManagementPorts;}
}
test('bounded capture rejects null/string/bool/range/accuracy/time; genuine zero is preserved',async()=>{
 const p={coords:{latitude:0,longitude:0,accuracy:8},timestamp:Date.now()};let options;
 const value=await captureBusinessSitePosition({getCurrentPosition(ok,_,o){options=o;ok(p);}});assert.equal(value.latitude,0);assert.equal(value.longitude,0);assert.deepEqual(options,{enableHighAccuracy:true,maximumAge:0,timeout:10000});
 for(const coords of [{latitude:null},{longitude:''},{latitude:false},{latitude:'0'},{latitude:91},{accuracy:0}])await assert.rejects(captureBusinessSitePosition({getCurrentPosition(ok){ok({...p,coords:{...p.coords,...coords}});}}),/invalid/);
 await assert.rejects(captureBusinessSitePosition({getCurrentPosition(ok){ok({...p,timestamp:null});}}),/invalid/);
 for(const [code,message]of [[1,/denied/],[2,/could not/],[3,/timed out/]])await assert.rejects(captureBusinessSitePosition({getCurrentPosition(_,fail){fail({code});}}),message);
});
test('Owner sees exact employee and source, creates explicit policy and authorizes captured structured site',async()=>run(async({ports,click,fill,position})=>{
 assert.match(document.body.textContent,/Alex Employee · Kitchen service · Business Customer Job/);assert.match(document.body.textContent,/Business Warehouse/);assert.doesNotMatch(document.body.textContent,new RegExp(SITE));assert.equal(position(),undefined);
 for(const [label,value]of [['Site name','Supply pickup'],['Street address','123 Shop'],['City','Miami'],['State / region','FL'],['Postal code','33101'],['Country code (two letters)','US'],['Location policy',POLICY]])await fill(label,value);
 await click('Use Current Location');assert.deepEqual(position().options,{enableHighAccuracy:true,maximumAge:0,timeout:10000});await act(async()=>position().ok({coords:{latitude:26.5,longitude:-81.8,accuracy:7},timestamp:Date.now()}));
 const confirm=document.querySelector('.punch-confirm input');await act(async()=>confirm.click());await click('Save and authorize location');
 const call=ports.calls.find(c=>c[0]==='site');assert.ok(call);assert.equal(call[1],ASSIGNMENT);assert.equal(call[2].employeeMembershipId,MEMBER);assert.equal(call[2].expectedAssignmentVersion,1);assert.equal(call[2].assignmentActivationVersion,1);assert.equal(call[2].site.capture.accuracyMeters,7);assert.equal(call[2].site.address.line1,'123 Shop');assert.match(document.body.textContent,/Supply pickup/);
 assert.equal(ports.data.sites.filter(s=>s.currentAuthorization).length,2);
 await fill('Radius (meters)','140');await fill('Maximum accuracy (meters)','25');await fill('Maximum sample age (seconds)','90');await fill('Future sample tolerance (seconds)','5');await click('Create policy');assert.deepEqual(ports.calls.find(c=>c[0]==='policy')[1].policy,{radiusMeters:140,maxAccuracyMeters:25,maxSampleAgeSeconds:90,maxFutureSkewSeconds:5});
}));
test('ordinary, native and Emergency source presentation stays canonical; missing customer authority disables the reference option',async()=>{
 for(const [sourceType,label]of [['ordinary_request_selection','Job Request'],['business_customer','Business Customer Job'],['emergency_request','Emergency Job']])await run(async({fill})=>{
  assert.match(document.querySelector('.punch-locations-heading').textContent,new RegExp(label));await fill('Location source','CUSTOMER_JOB');assert.match([...document.querySelectorAll('form')].at(-1).textContent,/Canonical/);assert.match(document.body.textContent,/123 Customer Property/);
 },fixture({assignment:{...fixture().assignment,sourceType}}));
 await run(async()=>{assert.match(document.body.textContent,/No authorized customer Job location is available/);assert.equal(document.querySelector('option[value="CUSTOMER_JOB"]').disabled,true);},fixture({customerLocation:null}));
});
test('Manager cannot create policy; revoke and activate append displayed version history',async()=>run(async({ports,click})=>{
 assert.doesNotMatch(document.body.textContent,/Create location policy/);await click('Revoke authorization');assert.match(document.body.textContent,/Revoked/);assert.equal(ports.calls.find(c=>c[0]==='authorization')[2].expectedVersion,1);
 await click('Activate authorization');assert.equal(ports.data.sites[0].association.version,3);assert.match(document.body.textContent,/Authorization v3/);
},fixture({canManagePolicy:false})));
test('permission denial clears management surface; inactive assignment has no capture workflow',async()=>{
 await run(async({ports,render})=>{ports.fetchPunchLocationManagement=async()=>{throw Object.assign(new Error('Permission denied'),{status:403});};await render({key:'new'});assert.match(document.body.textContent,/Permission denied/);assert.equal(document.querySelector('form'),null);});
 await run(async()=>{assert.equal([...document.querySelectorAll('button')].some(b=>b.textContent==='Use Current Location'),false);},fixture({assignment:{...fixture().assignment,currentAuthority:false}}));
});
test('late foreground position is ignored after changing source or unmounting assignment',async()=>run(async({click,fill,position,root})=>{
 await click('Use Current Location');const old=position();await fill('Location source','CUSTOMER_JOB');await act(async()=>old.ok({coords:{latitude:26,longitude:-81,accuracy:7},timestamp:Date.now()}));assert.equal(document.querySelector('.punch-site-capture'),null);
 await click('Use Current Location');const late=position();await act(async()=>root.render(null));await act(async()=>late.ok({coords:{latitude:26,longitude:-81,accuracy:7},timestamp:Date.now()}));assert.equal(document.querySelector('.punch-site-capture'),null);
}));
test('conflict refreshes authority; ambiguous failures retry the exact command without generating a new key',async()=>run(async({ports,click})=>{
 const original=ports.changePunchSiteAuthorization;let calls=[];
 ports.changePunchSiteAuthorization=async(id,payload)=>{calls.push(payload);if(calls.length===1)throw new Error('Connection unavailable');return original(id,payload);};
 await click('Revoke authorization');assert.match(document.body.textContent,/Retry the same request/);await click('Retry saved request');assert.deepEqual(calls[0],calls[1]);
 ports.changePunchSiteAuthorization=async()=>{throw Object.assign(new Error('The authorization changed'),{status:409});};await click('Activate authorization');assert.match(document.body.textContent,/Review the refreshed locations/);assert.equal(document.querySelector('.punch-site-capture'),null);
}));
test('existing Manager assignment workspace opens only the selected saved employee assignment',async()=>{
 const {ManagerWorkspace}=await vite.ssrLoadModule('/src/pages/EmployeeJobs.jsx');
 const root=createRoot(document.getElementById('root')),ports=globalThis.__punchManagementPorts=fixturePorts();
 const otherAssignment='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',otherMember='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const job={id:'job',title:'Kitchen service',customer:{displayName:'Customer'},assignments:[{id:ASSIGNMENT,membershipId:MEMBER,memberName:'Alex Employee',memberRole:'FIELD_EMPLOYEE',memberStatus:'ACTIVE',state:'ACTIVE',version:1},{id:otherAssignment,membershipId:otherMember,memberName:'Jordan Employee',memberRole:'FIELD_EMPLOYEE',memberStatus:'ACTIVE',state:'ACTIVE',version:1}]};
 try{
  await act(async()=>root.render(React.createElement(ManagerWorkspace,{jobs:[job],members:[],drafts:{job:[MEMBER,otherMember]},businessId:7,setPage:()=>{},onSave:()=>{},onToggle:()=>{}})));
  const open=async(name)=>{await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(name)).click());await act(async()=>{await new Promise(r=>setTimeout(r,10));});};
  assert.equal(document.querySelector('.authorized-punch-locations'),null);await open('Authorized Punch Locations · Alex Employee');assert.equal(ports.calls.at(-1)[1].employeeMembershipId,MEMBER);
  ports.data={...fixture(),assignment:{...fixture().assignment,id:otherAssignment,membershipId:otherMember,memberName:'Jordan Employee'}};
  await open('Authorized Punch Locations · Jordan Employee');assert.equal(document.querySelectorAll('.authorized-punch-locations').length,1);assert.equal(ports.calls.at(-1)[1].employeeMembershipId,otherMember);assert.equal(ports.calls.at(-1)[1].assignmentId,otherAssignment);assert.match(document.querySelector('.punch-locations-heading').textContent,/Jordan Employee/);
 }finally{await act(async()=>root.unmount());delete globalThis.__punchManagementPorts;}
});
test.after(async()=>{await vite.close();dom.window.close();for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
