import { getBusinessIdentityProjection } from "./businessIdentity.js";

function firstValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function initialsFor(value = "", fallback = "M") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return fallback;

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getConversationType(record = {}) {
  const type = String(
    record.conversation_type || record.conversationType || record.type || ""
  ).toLowerCase();

  if (type.includes("emergency")) return "emergency";
  if (type.includes("hiring")) return "hiring";
  return "standard";
}

export function getPersonConversationIdentity(source = {}, options = {}) {
  const displayName = firstValue(
    source.customerName,
    source.customer_name,
    source.homeownerName,
    source.homeowner_name,
    source.participantName,
    source.participant_name,
    source.applicantName,
    source.applicant_name,
    source.customer,
    source.homeowner_email,
    source.name,
    source.displayName,
    options.fallbackName,
    "Customer"
  );
  const avatar = firstValue(
    source.participantAvatar,
    source.participant_avatar,
    source.profilePhoto,
    source.profile_photo,
    source.profilePhotoUrl,
    source.profile_photo_url,
    source.contactPhoto,
    source.contact_photo,
    source.contactPhotoUrl,
    source.contact_photo_url,
    source.customerAvatar,
    source.customer_avatar,
    source.homeownerAvatar,
    source.homeowner_avatar,
    source.avatar,
    source.avatarUrl,
    source.avatar_url,
    source.profileImage,
    source.profile_image
  );

  return {
    type: "person",
    displayName,
    name: displayName,
    avatar,
    imageUrl: avatar,
    initials: initialsFor(displayName, "C"),
    relationshipLabel: options.relationshipLabel || "Customer",
    location: firstValue(
      source.customerLocation,
      source.customer_location,
      source.location,
      source.address,
      source.fullAddress,
      source.full_address
    ),
    source,
  };
}

export function getBusinessConversationIdentity(source = {}, options = {}) {
  const identity = getBusinessIdentityProjection(
    {
      ...source,
      businessName: firstValue(
        source.businessName,
        source.business_name,
        source.companyName,
        source.company_name,
        source.providerName,
        source.provider_name,
        source.professionalName,
        source.professional_name,
        source.contractorName,
        source.contractor_name,
        source.name,
        source.displayName,
        options.fallbackName
      ),
      profilePhoto: firstValue(
        source.participantAvatar,
        source.participant_avatar,
        source.businessProfilePhoto,
        source.business_profile_photo,
        source.businessProfilePhotoUrl,
        source.business_profile_photo_url,
        source.profilePhoto,
        source.profile_photo,
        source.profilePhotoUrl,
        source.profile_photo_url,
        source.businessAvatar,
        source.business_avatar,
        source.profileImage,
        source.profile_image
      ),
      logo: firstValue(
        source.businessLogo,
        source.business_logo,
        source.logo,
        source.logoUrl,
        source.logo_url
      ),
      ownerAvatar: firstValue(
        source.ownerAvatar,
        source.owner_avatar,
        source.avatar,
        source.avatarUrl,
        source.avatar_url,
        source.profileImage,
        source.profile_image
      ),
    },
    {
      ...options,
      useStorageFallback: options.useStorageFallback ?? false,
    }
  );

  return {
    type: "business",
    displayName: identity.displayName,
    name: identity.businessName,
    avatar: identity.imageUrl,
    imageUrl: identity.imageUrl,
    profilePhoto: identity.profilePhoto,
    logo: identity.logo,
    ownerAvatar: identity.ownerAvatar,
    initials: identity.initials,
    verificationBadge: identity.verification.compactBadgeText,
    verified: identity.verified,
    serviceSummary: identity.servicesSummary,
    businessIdentity: identity,
    source,
  };
}

export function getConversationParticipantIdentity(record = {}, options = {}) {
  const viewerRole = String(options.viewerRole || "").toLowerCase();
  const type = getConversationType(record);
  const participantKind =
    options.participantKind ||
    (viewerRole === "homeowner" || viewerRole === "personal"
      ? "business"
      : "person");

  const identity =
    participantKind === "business"
      ? getBusinessConversationIdentity(record, options)
      : getPersonConversationIdentity(record, options);

  return {
    ...identity,
    conversationType: type,
    badge:
      type === "emergency"
        ? "Emergency"
        : type === "hiring"
        ? "Hiring"
        : "",
  };
}

export function applyConversationIdentity(record = {}, options = {}) {
  const identity = getConversationParticipantIdentity(record, options);

  return {
    ...record,
    participantIdentity: identity,
    participantName: identity.displayName,
    participantAvatar: identity.avatar,
    participantInitials: identity.initials,
  };
}
