import {
  getPersonalProfilePhotoForRecord,
  getScopedProfilePhoto,
} from "./profilePhotoScoping.js";

function firstValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function normalizeIdentityValue(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function firstIdentityName(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find((value) => {
        const normalized = normalizeIdentityValue(value);
        return normalized && !["relationship", "contact", "conversation"].includes(normalized);
      }) || ""
  );
}

export function relationshipInitials(value = "", fallback = "M") {
  const initials = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || fallback;
}

function getRecordAvatar(record = {}) {
  return firstValue(
    record.participantAvatar,
    record.participant_avatar,
    record.businessProfilePhoto,
    record.business_profile_photo,
    record.businessProfilePhotoUrl,
    record.business_profile_photo_url,
    record.profilePhoto,
    record.profile_photo,
    record.profilePhotoUrl,
    record.profile_photo_url,
    record.businessLogo,
    record.business_logo,
    record.logo,
    record.logoUrl,
    record.logo_url,
    record.contactPhoto,
    record.contact_photo,
    record.contactPhotoUrl,
    record.contact_photo_url,
    record.customerAvatar,
    record.customer_avatar,
    record.homeownerAvatar,
    record.homeowner_avatar,
    record.avatar,
    record.avatarUrl,
    record.avatar_url,
    record.profileImage,
    record.profile_image
  );
}

const emptyStorage = {
  getItem: () => "",
  setItem: () => {},
  removeItem: () => {},
};

function getSafeStorage(storage) {
  if (storage && typeof storage.getItem === "function") return storage;

  try {
    if (globalThis.localStorage && typeof globalThis.localStorage.getItem === "function") {
      return globalThis.localStorage;
    }
  } catch {
    return emptyStorage;
  }

  return emptyStorage;
}

export function resolveRelationshipIdentity({
  relationship = {},
  record = {},
  identity = {},
  viewerRole = "",
  isLinked = false,
  typeLabel = "",
  status = "",
  meta = "",
  location = "",
  storage,
} = {}) {
  const resolvedTypeLabel =
    typeLabel ||
    identity.typeLabel ||
    relationship.typeLabel ||
    relationship.relationshipType ||
    record.contactImportLabel ||
    record.relationshipType ||
    "Relationship";
  const businessParticipant =
    String(viewerRole || "").toLowerCase() === "homeowner" ||
    /business|professional|vendor|provider/i.test(resolvedTypeLabel);
  const identityName = firstIdentityName(identity.displayName, identity.name);
  const businessName = firstIdentityName(
    record.businessName,
    record.business_name,
    record.companyName,
    record.company_name,
    record.providerName,
    record.provider_name,
    record.professionalName,
    record.professional_name,
    record.contractorName,
    record.contractor_name
  );
  const personName = firstIdentityName(
    record.participantName,
    record.participant_name,
    record.customerName,
    record.customer_name,
    record.homeownerName,
    record.homeowner_name,
    record.tenantName,
    record.tenant_name,
    record.employeeName,
    record.employee_name,
    record.applicantName,
    record.applicant_name,
    record.vendorName,
    record.vendor_name,
    record.displayName,
    record.display_name,
    record.name
  );
  const relationshipName = firstIdentityName(
    relationship.displayName,
    relationship.name
  );
  const titleFallback = firstIdentityName(
    record.project_title,
    record.projectTitle,
    record.title,
    record.service,
    record.category
  );
  const displayName = businessParticipant
    ? firstValue(identityName, businessName, relationshipName, personName, titleFallback, "Relationship")
    : firstValue(identityName, personName, relationshipName, businessName, titleFallback, "Relationship");
  const safeStorage = getSafeStorage(storage);
  const businessAvatar = businessParticipant
    ? getScopedProfilePhoto("business", record, safeStorage)
    : "";
  const personalAvatar = getPersonalProfilePhotoForRecord(record, safeStorage);
  const viewer = String(viewerRole || "").toLowerCase();
  const allowPersonalFallbackForBusinessRelationship =
    businessParticipant && !["homeowner", "personal", "customer", "user"].includes(viewer);
  const savedAvatar = businessParticipant
    ? businessAvatar || (allowPersonalFallbackForBusinessRelationship ? personalAvatar : "")
    : personalAvatar;
  const avatar = firstValue(
    savedAvatar,
    identity.avatar,
    relationship.avatar,
    getRecordAvatar(record)
  );
  const meetroLinked =
    isLinked ||
    relationship.meetroAccountLinked === true ||
    record.meetroAccountLinked === true;

  return {
    displayName,
    typeLabel: resolvedTypeLabel,
    relationshipType: resolvedTypeLabel,
    avatar,
    initials: relationshipInitials(displayName),
    contactStatus: status,
    status,
    meta,
    location,
    meetroLinked,
    actionSet: meetroLinked ? "meetro-user" : "external-contact",
  };
}
