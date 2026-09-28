import { getAuthenticatedIdentitySnapshot, subscribeAuthenticatedIdentity } from "./session.js";
import { readEmergencyFollowUpRequestRoute, buildEmergencyFollowUpRequestRoute } from "./emergencyFollowUpRequestRoute.js";
import { readExistingCustomerRequestRoute, buildExistingCustomerRequestRoute } from "./existingCustomerRequestRoute.js";

// Recovery metadata only, never included in a request payload or treated as server authority.
export function readRequestHelpContext(hash = globalThis.window?.location?.hash || "", identity = getAuthenticatedIdentitySnapshot()) {
  if (String(hash).replace(/^#/, "").split("?")[0] !== "upload") return null;
  const followUp = readEmergencyFollowUpRequestRoute(hash);
  const existing = readExistingCustomerRequestRoute(hash);
  const origins = new URLSearchParams(String(hash).split("?")[1] || "").getAll("requestOrigin");
  if (identity.status !== "authenticated" || !identity.userId || origins.length > 1 ||
      !followUp.valid || !existing.valid || (followUp.active && existing.active)) return null;
  return {
    actorId: identity.userId,
    mode: followUp.active ? "emergency_follow_up" : existing.active ? "existing_customer_request" : "ordinary",
    sourceId: followUp.active ? String(followUp.emergencyRequestId) : existing.active ? existing.meetroRelationshipId : "",
  };
}

export function sameRequestHelpContext(a, b) {
  return Boolean(a && b && a.actorId === b.actorId && a.mode === b.mode && a.sourceId === b.sourceId);
}

export function hasRequestHelpDraftContent(draft) {
  return Boolean(draft?.submission?.intentKey || draft?.submission?.snapshot || draft?.job?.title || draft?.job?.description ||
    draft?.service?.category || draft?.media?.photos?.length || draft?.location?.serviceAddress || draft?.location?.city ||
    Object.keys(draft?.fieldMeta || {}).length || Object.values(draft?.timing || {}).some(Boolean) ||
    Object.values(draft?.details || {}).some(Boolean) || draft?.location?.accessNotes || draft?.provenance?.assistantDraft);
}

export function canResumeRequestHelpDraft(draft, context) {
  if (!context) return false;
  if (!hasRequestHelpDraftContent(draft)) return true;
  if (draft.requestContext) return sameRequestHelpContext(draft.requestContext, context);
  // A legacy pending command has no trustworthy route/account binding. Never silently rebind it.
  return context.mode === "ordinary" && !draft.submission?.intentKey && !draft.submission?.snapshot;
}

export function requestHelpContextRoute(context) {
  if (context?.mode === "emergency_follow_up") return buildEmergencyFollowUpRequestRoute({ emergencyRequestId: context.sourceId });
  if (context?.mode === "existing_customer_request") return buildExistingCustomerRequestRoute({ meetroRelationshipId: context.sourceId });
  return "upload";
}

export function requestHelpSessionKey() {
  const identity = getAuthenticatedIdentitySnapshot();
  return JSON.stringify([identity.status, identity.userId, identity.sessionGeneration, globalThis.window?.location?.hash || ""]);
}

export function subscribeRequestHelpSession(listener) {
  const unsubscribe = subscribeAuthenticatedIdentity(listener);
  globalThis.window?.addEventListener("hashchange", listener);
  return () => { unsubscribe(); globalThis.window?.removeEventListener("hashchange", listener); };
}
