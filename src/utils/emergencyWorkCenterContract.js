// Read contract: metro-server 8d5682384f66fb058bab5d896a25cda26e56de4c.
// Presentation never grants a transition; commands recheck server authority.
export const EMERGENCY_STAGES = new Set(['ASSIGNED','ON_THE_WAY','EVALUATION_NEEDED','EVALUATION_IN_PROGRESS','QUOTE_NEEDED','QUOTE_DRAFT','WAITING_FOR_CUSTOMER_DECISION','QUOTE_DECLINED','QUOTE_APPROVED_DEPOSIT_DUE','WORK_READY','WORK_IN_PROGRESS','JOB_COMPLETED','FINAL_INVOICE','PARTIALLY_PAID','PAID','EMERGENCY_REVIEW_REQUIRED']);
export const EMERGENCY_ACTIONS = new Set(['MARK_EN_ROUTE','MARK_ARRIVED','START_EVALUATION','EDIT_EVALUATION','CREATE_QUOTE','REVIEW_QUOTE','VIEW_DEPOSIT','START_WORK','COMPLETE_WORK','CREATE_FINAL_INVOICE','VIEW_INVOICE','VIEW_JOB_HISTORY','REVIEW_EMERGENCY','MESSAGE_CUSTOMER']);
const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const positive = v => Number.isSafeInteger(v) && v > 0;
const text = v => typeof v === 'string' && v.trim().length > 0;
const definition = v => v && text(v.code) && text(v.label);
/** @typedef {{sourceType:'emergency_request', sourceLabel:'Emergency', jobId:string, requestId:null, relationshipId:number, emergencyRequestId:number, conversationId:number, stage:{code:string,label:string}, nextAction:{code:string,label:string,description:string,available:boolean}, availableActions:Array<{code:string,label:string}>, invoice:null|{invoiceId:string,status:string,currency:string,totalMinor:number,paidMinor:number,balanceMinor:number}}} EmergencyLiveJob */
export function normalizeEmergencyLiveJob(live) {
  if (!live || live.sourceType !== 'emergency_request' || live.sourceLabel !== 'Emergency' ||
      live.contractVersion !== 1 || !uuid(live.jobId) || live.requestId !== null ||
      ![live.relationshipId,live.emergencyRequestId,live.conversationId].every(positive) ||
      !text(live.serviceTitle) || !text(live.customerLabel) ||
      !definition(live.stage) || !EMERGENCY_STAGES.has(live.stage.code) ||
      !definition(live.nextAction) || !EMERGENCY_ACTIONS.has(live.nextAction.code) || typeof live.nextAction.available !== 'boolean' ||
      !definition(live.responsibility) || !['PROFESSIONAL','CUSTOMER','NONE'].includes(live.responsibility.code) ||
      (live.blocker != null && !definition(live.blocker)) ||
      !Array.isArray(live.reasonCodes) || live.reasonCodes.some(v => !text(v)) ||
      !Array.isArray(live.availableActions) || live.availableActions.some(v => !definition(v) || !EMERGENCY_ACTIONS.has(v.code)) ||
      new Set(live.availableActions.map(v => v.code)).size !== live.availableActions.length ||
      !live.freshness || !Number.isFinite(Date.parse(live.freshness.derivedAt)) ||
      !live.dispatch || !['assigned','professional_en_route','professional_arrived','work_in_progress','completed'].includes(live.dispatch.status) ||
      !['REQUIRED','IN_PROGRESS','COMPLETE'].includes(live.evaluation?.state)) return null;
  if (live.nextAction.available && !live.availableActions.some(a => a.code === live.nextAction.code)) return null;
  if (live.deposit != null && (!['NOT_REQUIRED','DUE','PARTIALLY_SATISFIED','SATISFIED','UNVERIFIED'].includes(live.deposit.state) || typeof live.deposit.startWorkLocked !== 'boolean')) return null;
  if (live.approvalSource != null && live.approvalSource !== 'MEETRO_CUSTOMER') return null;
  if (live.invoice != null && (!uuid(live.invoice.invoiceId) || !['DRAFT','SENT','PARTIALLY_PAID','PAID'].includes(live.invoice.status) ||
      !/^[A-Z]{3}$/.test(live.invoice.currency) || !['totalMinor','paidMinor','balanceMinor'].every(k => Number.isSafeInteger(live.invoice[k]) && live.invoice[k] >= 0))) return null;
  return { ...live, authoritySource:'CANONICAL_LIVE_JOB_READ' };
}
export function emergencyIdentityMatches(record, live) {
  return record?.sourceType === 'emergency_request' && live?.sourceType === 'emergency_request' &&
    record.jobId === live.jobId && record.relationshipId === live.relationshipId &&
    record.emergencyRequestId === live.emergencyRequestId && live.requestId === null &&
    (!record.conversationId || record.conversationId === live.conversationId);
}
export function emergencyPrimaryAction(live) {
  return live?.sourceType === 'emergency_request' && live.nextAction?.available === true &&
    live.availableActions?.some(a => a.code === live.nextAction.code) ? live.nextAction : null;
}
