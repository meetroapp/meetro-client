function firstProfileValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function safeParseStorageJson(storage, key, fallback = {}) {
  try {
    return JSON.parse(storage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

export function normalizeProfileScopeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getProfileScopeMode(activeAccountMode = "") {
  const normalized = normalizeProfileScopeKey(activeAccountMode || "personal");

  return /business|professional|contractor|workcenter|work_center/.test(normalized)
    ? "business"
    : "personal";
}

export function getRecordContactScope(record = {}) {
  const scope = normalizeProfileScopeKey(
    firstProfileValue(
      record.accountMode,
      record.account_mode,
      record.relationshipScope,
      record.relationship_scope,
      record.ownerMode,
      record.owner_mode,
      record.visibilityScope,
      record.visibility_scope,
      record.messageScope,
      record.message_scope
    )
  );

  if (/business|professional|contractor|workcenter|work_center/.test(scope)) {
    return "business";
  }
  if (/personal|homeowner|user|tenantpersonal|tenant_personal/.test(scope)) {
    return "personal";
  }

  return "";
}

export function getRecordProfileScopeKey(record = {}) {
  return normalizeProfileScopeKey(
    firstProfileValue(
      record.contactProfileScopeKey,
      record.contact_profile_scope_key,
      record.ownerProfileScopeKey,
      record.owner_profile_scope_key,
      record.profileScopeKey,
      record.profile_scope_key,
      record.ownerProfileKey,
      record.owner_profile_key
    )
  );
}

export function getActiveProfileScopeDescriptor(options = {}) {
  const storage =
    options.storage ||
    (typeof localStorage !== "undefined" ? localStorage : undefined);
  const scope = getProfileScopeMode(options.activeAccountMode);

  if (!storage) {
    const profileId = firstProfileValue(options.profileId, options.ownerProfileId);
    return {
      scope,
      profileId,
      profileScopeKey: `${scope}:${normalizeProfileScopeKey(profileId) || "default"}`,
    };
  }

  const storedUser = safeParseStorageJson(storage, "user", {});
  const storedBusiness = safeParseStorageJson(storage, "contractorProfile", {});
  const businessProfile = options.businessProfile || {};
  const userProfile = options.userProfile || {};
  const profileId =
    scope === "business"
      ? firstProfileValue(
          options.profileId,
          options.ownerProfileId,
          businessProfile.id,
          businessProfile.businessId,
          businessProfile.business_id,
          businessProfile.contractorId,
          businessProfile.contractor_id,
          storedBusiness.id,
          storedBusiness.businessId,
          storedBusiness.business_id,
          storedBusiness.contractorId,
          storedBusiness.contractor_id,
          storage.getItem("businessId"),
          storage.getItem("contractorId"),
          storage.getItem("businessName"),
          storage.getItem("companyName")
        )
      : firstProfileValue(
          options.profileId,
          options.ownerProfileId,
          userProfile.id,
          userProfile.userId,
          userProfile.user_id,
          userProfile.email,
          storedUser.id,
          storedUser.userId,
          storedUser.user_id,
          storedUser.email,
          storage.getItem("userId"),
          storage.getItem("currentUserId"),
          storage.getItem("userEmail"),
          storage.getItem("email"),
          storage.getItem("userName")
        );

  return {
    scope,
    profileId,
    profileScopeKey: `${scope}:${normalizeProfileScopeKey(profileId) || "default"}`,
  };
}

export function getProfileContactStoreKey(profileScopeKey = "") {
  const normalized = normalizeProfileScopeKey(profileScopeKey || "personal:default");

  return `meetro_contacts_${normalized || "personaldefault"}`;
}

function safeReadContactList(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeAvatarValue(value = "") {
  const avatar = String(value || "").trim();

  if (!avatar) return "";
  if (/^data:image\//i.test(avatar)) return "";
  if (avatar.length > 2048) return "";

  return avatar;
}

export function compactScopedContactRecord(record = {}) {
  const safeAvatar = safeAvatarValue(
    firstProfileValue(
      record.participantAvatar,
      record.profilePhoto,
      record.profilePhotoUrl,
      record.businessProfilePhoto,
      record.businessLogo,
      record.contactPhoto
    )
  );
  const isBusinessContact = ["business", "professional", "vendor"].includes(
    String(record.relationshipType || record.contactImportType || "").trim()
  );

  return {
    id: record.id,
    relationshipId: record.relationshipId,
    relationshipType: record.relationshipType,
    relationshipScope: record.relationshipScope,
    relationship_scope: record.relationship_scope,
    accountMode: record.accountMode,
    account_mode: record.account_mode,
    ownerProfileType: record.ownerProfileType,
    owner_profile_type: record.owner_profile_type,
    ownerProfileId: record.ownerProfileId,
    owner_profile_id: record.owner_profile_id,
    ownerProfileScopeKey: record.ownerProfileScopeKey,
    owner_profile_scope_key: record.owner_profile_scope_key,
    contactProfileScopeKey: record.contactProfileScopeKey,
    contact_profile_scope_key: record.contact_profile_scope_key,
    profileScopeKey: record.profileScopeKey,
    profile_scope_key: record.profile_scope_key,
    businessId: record.businessId,
    business_id: record.business_id,
    professionalId: record.professionalId,
    professional_id: record.professional_id,
    providerId: record.providerId,
    provider_id: record.provider_id,
    customerId: record.customerId,
    customer_id: record.customer_id,
    homeownerId: record.homeownerId,
    homeowner_id: record.homeowner_id,
    userId: record.userId,
    user_id: record.user_id,
    linkedMeetroAccountId: record.linkedMeetroAccountId,
    businessName: record.businessName,
    professionalName: record.professionalName,
    providerName: record.providerName,
    customerName: record.customerName,
    homeownerName: record.homeownerName,
    employeeName: record.employeeName,
    tenantName: record.tenantName,
    propertyManagerName: record.propertyManagerName,
    vendorName: record.vendorName,
    participantName: record.participantName,
    displayName: record.displayName,
    project_title: record.project_title,
    project_description: record.project_description,
    homeowner_email: record.homeowner_email,
    phone: record.phone,
    businessPhone: record.businessPhone,
    providerPhone: record.providerPhone,
    customerPhone: record.customerPhone,
    homeownerPhone: record.homeownerPhone,
    email: record.email,
    businessEmail: record.businessEmail,
    providerEmail: record.providerEmail,
    customerEmail: record.customerEmail,
    homeownerEmail: record.homeownerEmail,
    address: record.address,
    location: record.location,
    serviceArea: record.serviceArea,
    status: record.status,
    currentWorkStatus: record.currentWorkStatus,
    contactImportType: record.contactImportType,
    contactImportLabel: record.contactImportLabel,
    contactImported: record.contactImported,
    savedToContacts: record.savedToContacts,
    meetroAccountLinked: record.meetroAccountLinked,
    sourceConversationId: record.sourceConversationId,
    conversation_type: record.conversation_type,
    participantAvatar: safeAvatar,
    profilePhoto: safeAvatar,
    profilePhotoUrl: safeAvatar,
    businessProfilePhoto: isBusinessContact ? safeAvatar : "",
    businessLogo: isBusinessContact ? safeAvatar : "",
    contactPhoto: isBusinessContact ? "" : safeAvatar,
    savedAt: record.savedAt,
    updatedAt: record.updatedAt,
    unread: record.unread ?? false,
  };
}

export function readProfileScopedContacts(options = {}) {
  const storage =
    options.storage ||
    (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!storage) return [];

  const profileScopeKey =
    options.profileScopeKey ||
    getActiveProfileScopeDescriptor({
      activeAccountMode: options.activeAccountMode,
      storage,
    }).profileScopeKey;

  return safeReadContactList(storage, getProfileContactStoreKey(profileScopeKey));
}

export function upsertProfileScopedContact(record = {}, options = {}) {
  const storage =
    options.storage ||
    (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!storage || !record?.id) return [];

  const profileScopeKey =
    options.profileScopeKey ||
    record.contactProfileScopeKey ||
    record.ownerProfileScopeKey ||
    record.profileScopeKey ||
    getActiveProfileScopeDescriptor({
      activeAccountMode: options.activeAccountMode,
      storage,
    }).profileScopeKey;
  const storeKey = getProfileContactStoreKey(profileScopeKey);
  const compactRecord = compactScopedContactRecord({
    ...record,
    contactProfileScopeKey: record.contactProfileScopeKey || profileScopeKey,
    contact_profile_scope_key: record.contact_profile_scope_key || profileScopeKey,
    ownerProfileScopeKey: record.ownerProfileScopeKey || profileScopeKey,
    owner_profile_scope_key: record.owner_profile_scope_key || profileScopeKey,
    profileScopeKey: record.profileScopeKey || profileScopeKey,
    profile_scope_key: record.profile_scope_key || profileScopeKey,
  });
  const existing = safeReadContactList(storage, storeKey);
  const updated = [
    compactRecord,
    ...existing.filter((item) => String(item.id) !== String(compactRecord.id)),
  ];

  storage.setItem(storeKey, JSON.stringify(updated));

  return updated;
}
