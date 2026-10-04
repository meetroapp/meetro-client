export const DONE = "4790b6f0-a802-4eb0-b238-802d39a4e69b";
export const ACTIVE_B = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_C = "22222222-2222-4222-8222-222222222222";
export const UNKNOWN = "99999999-9999-4999-8999-999999999999";
export const at = "2026-09-28T12:00:00.000Z";
export const activeEntries = [ACTIVE_B, ACTIVE_C].map((jobId, i) => ({
  source: "CANONICAL_BACKEND_READ", readOnly: true, lifecycleContractVersion: 2,
  jobId, postId: i + 12, requestId: i + 12, relationshipId: i + 22,
  conversationId: i + 40, customer: "Liam Molina", title: "Kitchen sink repair",
  liveJobStatus: "ready", liveJob: {jobId, requestId:i+12, relationshipId:i+22,
    stage:{code:"WORK_IN_PROGRESS",label:"Active work"}, nextAction:{code:"REVIEW_ACTIVE_WORK",label:"Review active work"},
    responsibility:{code:"PROFESSIONAL",label:"You"}, availableActions:[], freshness:{derivedAt:at}},
}));
export function history(jobId = DONE) {
  return {contractVersion:1,jobId,requestId:null,relationshipId:22,sourceType:"emergency_request",sourceLabel:"Emergency",
    conversationId:340,customerName:"Liam Molina",professionalName:"All Handyman Services",serviceTitle:"Kitchen sink repair",
    status:"COMPLETED",completedAt:at,approvedQuote:{currency:"USD",totalMinor:24000},
    completionSummary:{workstreamCount:0,workItemCount:0,customerUpdateCount:0},nextAction:{code:"READY_TO_INVOICE",label:"Ready to Invoice"},
    audience:"professional",originalRequest:null,preservedRecords:{evaluation:true,findings:true,recommendations:true,approvedQuotes:true,visits:false,workPlan:false},actions:{canViewJob:true}};
}
export function invoice(jobId = DONE) {
  return {contractVersion:1,invoiceId:"33333333-3333-4333-8333-333333333333",invoiceNumber:"INV-KITCHEN",
    jobId,requestId:null,relationshipId:22,sourceType:"emergency_request",sourceLabel:"Emergency",conversationId:340,
    business:{displayName:"All Handyman Services"},customer:{displayName:"Liam Molina"},job:{title:"Kitchen sink repair",service:"Plumbing"},
    status:"PAID",currency:"USD",invoiceDate:"2026-09-28",due:{mode:"DUE_ON_RECEIPT",date:null},
    lineItems:[{sequence:1,type:"approvedWork",description:"Kitchen sink repair",quantity:1,unitAmountMinor:24000,lineTotalMinor:24000,
      lineItemId:"44444444-4444-4444-8444-444444444444",sourceQuoteId:"55555555-5555-4555-8555-555555555555",
      sourceQuoteVersion:1,sourceScopeItemId:"66666666-6666-4666-8666-666666666666",lineageLabel:"ORIGINAL"}],
    subtotalMinor:24000,totalMinor:24000,paidMinor:24000,balanceMinor:0,customerNotes:null,terms:null,issuedAt:at,
    payments:[],actions:{canIssue:false,canRecordPayment:false,canShareExternal:true},currentVersion:2,customerParty:null};
}
