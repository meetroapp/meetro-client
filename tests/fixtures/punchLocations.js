export const ASSIGNMENT='11111111-1111-4111-8111-111111111111',MEMBER='22222222-2222-4222-8222-222222222222',POLICY='33333333-3333-4333-8333-333333333333';
export const SITE='44444444-4444-4444-8444-444444444444',JOB='55555555-5555-4555-8555-555555555555';
export function fixture(overrides={}) {
 const address={line1:'456 Warehouse Lane',city:'Cape Coral',region:'FL',postalCode:'33990',countryCode:'US'};
 const policy={id:POLICY,version:1,state:'ACTIVE',radiusMeters:135,maxAccuracyMeters:35,maxSampleAgeSeconds:120,maxFutureSkewSeconds:10};
 const source={type:'business_customer',id:'canonical-source',version:2,revision:'a'.repeat(64)};
 const site={id:SITE,version:1,state:'ACTIVE',kind:'MANUAL_BUSINESS',label:'Business Warehouse',jobId:null,source:null,address,geometry:{latitude:26.64,longitude:-81.98,resolutionMethod:'BUSINESS_CONFIRMED'},geometryCapture:{source:'FOREGROUND_DEVICE',latitude:26.64,longitude:-81.98,accuracyMeters:8,sampledAt:'2026-09-30T20:00:00.000Z'},policyId:POLICY,policyVersion:1,currentAuthority:true,currentAuthorization:true,
 association:{version:1,state:'ACTIVE',siteVersion:1,assignmentActivationVersion:1},history:[{version:1,state:'ACTIVE',siteVersion:1,label:'Business Warehouse',createdAt:'2026-09-30T20:00:00.000Z'}]};
 return {success:true,assignment:{id:ASSIGNMENT,membershipId:MEMBER,memberName:'Alex Employee',jobId:JOB,jobTitle:'Kitchen service',sourceType:'business_customer',state:'ACTIVE',version:1,activationVersion:1,currentAuthority:true},canManage:true,canManagePolicy:true,
 customerLocation:{address:{...address,line1:'123 Customer Property'},source},sites:[site],policies:[policy],proximityEnforced:false,...overrides};
}
export function fixturePorts(initial=fixture()) {
 let data=structuredClone(initial);const calls=[];
 return {calls,get data(){return data;},set data(value){data=value;},
  async fetchPunchLocationManagement(input){calls.push(['read',input]);return structuredClone(data);},
  async saveAssignmentPunchSite(assignmentId,payload){calls.push(['site',assignmentId,payload]);const id=payload.site.id||'66666666-6666-4666-8666-666666666666';const previous=data.sites.find(s=>s.id===id);const version=payload.site.expectedVersion+1;const association={version:payload.expectedVersion+1,state:'ACTIVE',siteVersion:version,assignmentActivationVersion:payload.assignmentActivationVersion};
   const site={id,version,state:'ACTIVE',kind:payload.site.kind,label:payload.site.label,address:payload.site.address||data.customerLocation.address,source:payload.site.kind==='CUSTOMER_JOB'?data.customerLocation.source:null,policyId:payload.site.policyId,policyVersion:payload.site.policyVersion,currentAuthority:true,currentAuthorization:true,association,history:[{...association,label:payload.site.label,createdAt:new Date().toISOString()},...(previous?.history||[])],geometryCapture:{source:'FOREGROUND_DEVICE',...payload.site.capture}};
   data.sites=[...data.sites.filter(s=>s.id!==id),site];return {success:true,site,association};},
  async changePunchSiteAuthorization(assignmentId,payload){calls.push(['authorization',assignmentId,payload]);const site=data.sites.find(s=>s.id===payload.siteId);site.association={version:payload.expectedVersion+1,state:payload.state,siteVersion:payload.siteVersion,assignmentActivationVersion:payload.assignmentActivationVersion};site.currentAuthorization=payload.state==='ACTIVE';site.history.unshift({...site.association,label:site.label,createdAt:new Date().toISOString()});return {success:true,association:site.association};},
  async createPunchLocationPolicy(payload){calls.push(['policy',payload]);data.policies.push({id:'77777777-7777-4777-8777-777777777777',version:1,...payload.policy,state:'ACTIVE'});return {success:true};},
 };
}
