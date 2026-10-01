import { authFetch } from './authFetch.js';
async function request(path,options,setPage) {
  const {response,data}=await authFetch(path,options,setPage);
  if(!response?.ok||data?.success!==true){const error=new Error(data?.message||'Authorized Punch locations are unavailable.');error.status=response?.status||0;error.code=data?.code;throw error;}
  return data;
}
function path(assignmentId,surface){return `/team/assignments/${encodeURIComponent(assignmentId)}/${surface}`;}
export function fetchPunchLocationManagement({businessId,assignmentId,employeeMembershipId},setPage){
  return request(`${path(assignmentId,'punch-location-management')}?${new URLSearchParams({businessId:String(businessId),employeeMembershipId})}`,{method:'GET'},setPage);
}
export function saveAssignmentPunchSite(assignmentId,payload,setPage){return request(path(assignmentId,'punch-location-management'),{method:'PUT',body:JSON.stringify(payload)},setPage);}
export function changePunchSiteAuthorization(assignmentId,payload,setPage){return request(path(assignmentId,'punch-location-authorizations'),{method:'PUT',body:JSON.stringify(payload)},setPage);}
export function createPunchLocationPolicy(payload,setPage){return request('/team/punch-location-policies',{method:'PUT',body:JSON.stringify(payload)},setPage);}
