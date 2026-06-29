import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  applyConversationIdentity,
  getBusinessConversationIdentity,
  getConversationParticipantIdentity,
  getPersonConversationIdentity,
} from "../src/utils/conversationIdentity.js";

function createStorage(seed = {}) {
  const data = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("business conversation identity follows business profile fallback order", () => {
  const identity = getBusinessConversationIdentity(
    {
      businessName: "BGone Handyman Services",
      profilePhoto: "https://example.com/profile.jpg",
      logo: "https://example.com/logo.jpg",
      ownerAvatar: "https://example.com/owner.jpg",
      businessServiceSpecialties: ["garage_door_opener_installation"],
      verified: true,
    },
    { storage: createStorage() }
  );

  assert.equal(identity.displayName, "BGone Handyman Services");
  assert.equal(identity.avatar, "https://example.com/profile.jpg");
  assert.equal(identity.logo, "https://example.com/logo.jpg");
  assert.equal(identity.initials, "BH");
  assert.ok(identity.serviceSummary);
});

test("business conversation identity falls back from logo to owner avatar to initials", () => {
  assert.equal(
    getBusinessConversationIdentity(
      { businessName: "Molina Services", logo: "logo.png" },
      { storage: createStorage() }
    ).avatar,
    "logo.png"
  );
  assert.equal(
    getBusinessConversationIdentity(
      { businessName: "Molina Services", ownerAvatar: "owner.png" },
      { storage: createStorage() }
    ).avatar,
    "owner.png"
  );
  assert.equal(
    getBusinessConversationIdentity(
      { businessName: "Molina Services" },
      { storage: createStorage() }
    ).initials,
    "MS"
  );
});

test("customer conversation identity follows person fallback order", () => {
  const identity = getPersonConversationIdentity({
    customerName: "Sarah Dommerich",
    profilePhoto: "https://example.com/sarah.jpg",
    avatar: "https://example.com/avatar.jpg",
  });

  assert.equal(identity.displayName, "Sarah Dommerich");
  assert.equal(identity.avatar, "https://example.com/sarah.jpg");
  assert.equal(identity.initials, "SD");
});

test("emergency and hiring conversations preserve type badge without changing identity", () => {
  const emergency = getConversationParticipantIdentity(
    {
      conversation_type: "emergency",
      customerName: "Sarah Dommerich",
    },
    { viewerRole: "business" }
  );
  const hiring = getConversationParticipantIdentity(
    {
      conversation_type: "hiring",
      applicantName: "Jamie Applicant",
    },
    { viewerRole: "business" }
  );

  assert.equal(emergency.displayName, "Sarah Dommerich");
  assert.equal(emergency.badge, "Emergency");
  assert.equal(hiring.displayName, "Jamie Applicant");
  assert.equal(hiring.badge, "Hiring");
});

test("inbox and thread can share the same projected participant identity", () => {
  const conversation = {
    id: "conv-1",
    conversation_type: "standard",
    customerName: "Sarah Dommerich",
    customerAvatar: "sarah.png",
  };
  const projected = applyConversationIdentity(conversation, {
    viewerRole: "business",
  });
  const threadIdentity = getConversationParticipantIdentity(projected, {
    viewerRole: "business",
  });

  assert.equal(projected.participantName, "Sarah Dommerich");
  assert.equal(projected.participantAvatar, "sarah.png");
  assert.equal(threadIdentity.displayName, projected.participantName);
  assert.equal(threadIdentity.avatar, projected.participantAvatar);
});

test("conversation surfaces consume the shared identity projection", () => {
  const inboxSource = fs.readFileSync(
    new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
    "utf8"
  );
  const threadSource = fs.readFileSync(
    new URL("../src/pages/ConversationThread.jsx", import.meta.url),
    "utf8"
  );
  const companionSource = fs.readFileSync(
    new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
    "utf8"
  );

  assert.match(inboxSource, /getConversationParticipantIdentity/);
  assert.match(inboxSource, /applyConversationIdentity/);
  assert.match(threadSource, /getPersonConversationIdentity/);
  assert.match(threadSource, /getBusinessConversationIdentity/);
  assert.match(companionSource, /getConversationParticipantIdentity/);
});

