import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  applyConversationIdentity,
  getBusinessConversationIdentity,
  getConversationParticipantIdentity,
  getPersonConversationIdentity,
} from "../src/utils/conversationIdentity.js";
import { buildConversationIdentityInput } from "../src/utils/conversationIdentityInput.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("ConversationThread business identity uses adapter input and preserves fallback behavior", () => {
  const input = buildConversationIdentityInput({
    conversationId: "conv-1",
    registryEntry: {
      id: "conv-1",
      businessName: "BGone Handyman Services",
      businessLogo: "registry-logo.png",
    },
    selectedContractor: {
      businessName: "Stored Contractor",
      profilePhoto: "contractor-profile.png",
      logo: "contractor-logo.png",
    },
    localFallbacks: {
      conversationBusinessName: "Local Business",
      businessName: "Session Business",
    },
  });

  const businessIdentity = getBusinessConversationIdentity(
    input.businessProjectionInput
  );

  assert.equal(businessIdentity.displayName, "BGone Handyman Services");
  assert.equal(businessIdentity.avatar, "contractor-profile.png");
  assert.equal(businessIdentity.logo, "registry-logo.png");
});

test("ConversationThread customer identity uses registry before request and active fallbacks", () => {
  const input = buildConversationIdentityInput({
    conversationId: "conv-1",
    registryEntry: {
      id: "conv-1",
      customerName: "Sarah Registry",
      customerAvatar: "registry-avatar.png",
      customerLocation: "Registry Location",
    },
    selectedQuoteRequest: {
      id: "conv-1",
      customerName: "Sarah Request",
      customerAvatar: "request-avatar.png",
      location: "Request Location",
    },
    activeJob: {
      conversationId: "conv-1",
      customer: "Sarah Active",
    },
    localFallbacks: {
      activeConversationId: "conv-1",
      activeConversationName: "Sarah Local",
      activeCustomerLocation: "Local Location",
    },
  });

  const customerIdentity = getPersonConversationIdentity(
    input.customerProjectionInput
  );

  assert.equal(input.resolvedCustomerIdentity.name, "Sarah Registry");
  assert.equal(input.resolvedCustomerIdentity.avatar, "registry-avatar.png");
  assert.equal(input.resolvedCustomerIdentity.location, "Registry Location");
  assert.equal(customerIdentity.displayName, "Sarah Registry");
  assert.equal(customerIdentity.avatar, "registry-avatar.png");
});

test("ConversationThread customer identity falls back to request then active context", () => {
  const requestInput = buildConversationIdentityInput({
    conversationId: "conv-2",
    selectedHomeownerRequest: {
      requestId: "conv-2",
      customerName: "William Request",
      location: "Request Address",
    },
    localFallbacks: {
      activeConversationId: "conv-2",
      activeConversationName: "William Local",
      activeCustomerLocation: "Local Address",
    },
  });
  const activeInput = buildConversationIdentityInput({
    conversationId: "conv-3",
    activeJob: {
      conversationId: "conv-3",
      customer: "Jack Active",
    },
    localFallbacks: {
      activeConversationId: "conv-3",
      activeConversationName: "Jack Local",
      activeCustomerLocation: "Active Address",
    },
  });

  assert.equal(requestInput.resolvedCustomerIdentity.name, "William Request");
  assert.equal(requestInput.resolvedCustomerIdentity.location, "Request Address");
  assert.equal(activeInput.resolvedCustomerIdentity.name, "Jack Active");
  assert.equal(activeInput.resolvedCustomerIdentity.location, "Active Address");
});

test("missing avatar still falls back to projected initials", () => {
  const input = buildConversationIdentityInput({
    conversationId: "conv-1",
    registryEntry: {
      id: "conv-1",
      customerName: "Sarah Dommerich",
    },
  });

  const customerIdentity = getPersonConversationIdentity(
    input.customerProjectionInput
  );

  assert.equal(customerIdentity.avatar, "");
  assert.equal(customerIdentity.initials, "SD");
});

test("business profile photo, logo, owner avatar, and initials fallback order remains in projection", () => {
  assert.equal(
    getBusinessConversationIdentity({
      businessName: "Molina Services",
      profilePhoto: "profile.png",
      logo: "logo.png",
      ownerAvatar: "owner.png",
    }).avatar,
    "profile.png"
  );
  assert.equal(
    getBusinessConversationIdentity({
      businessName: "Molina Services",
      logo: "logo.png",
      ownerAvatar: "owner.png",
    }).avatar,
    "logo.png"
  );
  assert.equal(
    getBusinessConversationIdentity({
      businessName: "Molina Services",
      ownerAvatar: "owner.png",
    }).avatar,
    "owner.png"
  );
  assert.equal(
    getBusinessConversationIdentity({
      businessName: "Molina Services",
    }).initials,
    "MS"
  );
});

test("emergency conversation keeps type context while participant identity is projected", () => {
  const input = buildConversationIdentityInput({
    conversationId: "emergency-1",
    registryEntry: {
      id: "emergency-1",
      conversation_type: "emergency",
      customerName: "Sarah Emergency",
    },
    activeEmergencyRecord: {
      businessName: "Emergency Plumbing",
      status: "arrived",
    },
  });

  const participant = getConversationParticipantIdentity(
    {
      ...input.customerProjectionInput,
      conversation_type: "emergency",
    },
    { viewerRole: "business" }
  );

  assert.equal(participant.displayName, "Sarah Emergency");
  assert.equal(participant.badge, "Emergency");
  assert.equal(input.businessProjectionInput.businessName, "Emergency Plumbing");
});

test("hiring conversation keeps badge and position context separate from participant identity", () => {
  const input = buildConversationIdentityInput({
    conversationId: "hiring-1",
    registryEntry: {
      id: "hiring-1",
      conversation_type: "hiring",
      applicantName: "Jamie Applicant",
      project_title: "Lead Carpenter",
      businessName: "Molina Builds",
    },
  });

  const participant = getConversationParticipantIdentity(
    {
      applicantName: input.hiring.participantName,
      conversation_type: "hiring",
    },
    { viewerRole: "business" }
  );

  assert.equal(input.hiring.positionTitle, "Lead Carpenter");
  assert.equal(input.hiring.participantName, "Jamie Applicant");
  assert.equal(input.hiring.businessName, "Molina Builds");
  assert.equal(participant.displayName, "Jamie Applicant");
  assert.equal(participant.badge, "Hiring");
});

test("Inbox and Thread produce matching participant identity for the same conversation context", () => {
  const conversation = {
    id: "conv-1",
    conversation_type: "standard",
    customerName: "Sarah Dommerich",
    customerAvatar: "sarah.png",
  };
  const inboxProjected = applyConversationIdentity(conversation, {
    viewerRole: "business",
  });
  const threadInput = buildConversationIdentityInput({
    conversationId: "conv-1",
    registryEntry: conversation,
  });
  const threadIdentity = getPersonConversationIdentity(
    threadInput.customerProjectionInput
  );

  assert.equal(threadIdentity.displayName, inboxProjected.participantName);
  assert.equal(threadIdentity.avatar, inboxProjected.participantAvatar);
  assert.equal(threadIdentity.initials, inboxProjected.participantInitials);
});

test("ConversationThread honors projected participant avatars over stale request aliases", () => {
  const projected = applyConversationIdentity(
    {
      id: "conv-maggie",
      conversation_type: "standard",
      customerName: "Maggie Customer",
      profilePhoto: "maggie-profile.jpg",
    },
    { viewerRole: "business" }
  );
  const threadInput = buildConversationIdentityInput({
    conversationId: "conv-maggie",
    registryEntry: projected,
    selectedQuoteRequest: {
      id: "conv-maggie",
      customerName: "Maggie Customer",
      customerAvatar: "old-request-avatar.jpg",
    },
  });
  const threadIdentity = getPersonConversationIdentity(
    threadInput.customerProjectionInput
  );

  assert.equal(projected.participantAvatar, "maggie-profile.jpg");
  assert.equal(threadIdentity.avatar, projected.participantAvatar);
});

test("conversation identity input helper is pure deterministic and storage-free", () => {
  const source = {
    registryEntry: {
      id: "conv-1",
      customerName: "Sarah Dommerich",
      businessName: "BGone Handyman Services",
    },
    selectedContractor: {
      profilePhoto: "profile.png",
    },
    localFallbacks: {
      activeConversationId: "conv-1",
      activeConversationName: "Fallback Name",
    },
  };
  const before = clone(source);
  const first = buildConversationIdentityInput({
    conversationId: "conv-1",
    ...source,
  });
  const second = buildConversationIdentityInput({
    conversationId: "conv-1",
    ...source,
  });

  assert.deepEqual(source, before);
  assert.deepEqual(first, second);

  const helperSource = fs.readFileSync(
    new URL("../src/utils/conversationIdentityInput.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(helperSource, /localStorage|sessionStorage|window\.|document\./);
  assert.doesNotMatch(helperSource, /setItem|removeItem|location\.href|fetch\(/);
});

test("ConversationThread delegates display identity normalization to the shared adapter", () => {
  const threadSource = fs.readFileSync(
    new URL("../src/pages/ConversationThread.jsx", import.meta.url),
    "utf8"
  );

  assert.match(threadSource, /buildConversationIdentityInput/);
  assert.match(threadSource, /customerProjectionInput/);
  assert.match(threadSource, /businessProjectionInput/);
  assert.match(threadSource, /getScopedProfilePhoto/);
  assert.match(threadSource, /scopedBusinessProfilePhoto/);
  assert.match(threadSource, /scopedConversationBusinessPhoto/);
  assert.match(threadSource, /getPersonalProfilePhotoForRecord/);
  assert.match(threadSource, /scopedPersonalProfilePhoto/);
  assert.doesNotMatch(threadSource, /localStorage\.getItem\("meetroBusinessProfilePhoto"\)/);
  assert.doesNotMatch(threadSource, /localStorage\.getItem\("meetroPersonalProfilePhoto"\)/);
  assert.match(threadSource, /function textActiveContact\(\)/);
  assert.match(threadSource, /Edit \/ More/);
});
