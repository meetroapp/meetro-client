import { authFetch } from './authFetch.js';
import { fetchCanonicalLiveJobProjection } from './canonicalLiveJobProjection.js';
import { emergencyIdentityMatches, emergencyPrimaryAction } from './emergencyWorkCenterContract.js';
import { transitionEmergencyDispatch, EMERGENCY_DISPATCH_ACTIONS } from './emergencyApi.js';
export async function runEmergencyWorkCenterTransition({record, action, setPage, authFetchImpl=authFetch}) {
  const current=await fetchCanonicalLiveJobProjection({jobId:record.jobId,setPage,authFetchImpl});
  if (current.status !== 'ready' || !emergencyIdentityMatches(record,current.projection) || emergencyPrimaryAction(current.projection)?.code !== action || !EMERGENCY_DISPATCH_ACTIONS[action]) {
    throw new Error('This action is no longer available. Refresh the Emergency status.');
  }
  const result=await transitionEmergencyDispatch(record.emergencyRequestId,EMERGENCY_DISPATCH_ACTIONS[action],{setPage,authFetchImpl});
  if (!result.ok || result.emergencyRequest?.id !== record.emergencyRequestId || result.conversation?.id !== current.projection.conversationId) throw new Error(result.message || 'The Emergency action could not be confirmed. Refresh its status.');
  return result;
}
