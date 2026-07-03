function firstIdentityValue(...values) {
  return (
    values
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function isConversationLinkedRecord(record = {}, conversationId = "") {
  const linkedIds = [
    record.id,
    record.conversationId,
    record.projectConversationId,
    record.activeConversationId,
    record.requestId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return linkedIds.includes(String(conversationId));
}

export function buildConversationIdentityInput({
  conversationId = "",
  registryEntry,
  meta,
  selectedConversation,
  selectedQuoteRequest,
  selectedHomeownerRequest,
  selectedContractor,
  activeEmergencyRecord,
  activeJob,
  conversationBusinessName = "",
  localFallbacks = {},
} = {}) {
  const registry = safeObject(registryEntry);
  const conversationMeta = safeObject(meta);
  const selectedBusiness = safeObject(selectedContractor);
  const emergencyRecord = safeObject(activeEmergencyRecord);
  const activeJobSnapshot = safeObject(activeJob);
  const fallbacks = safeObject(localFallbacks);

  const linkedSelectedConversation =
    selectedConversation && isConversationLinkedRecord(selectedConversation, conversationId)
      ? selectedConversation
      : null;
  const linkedQuoteRequest =
    selectedQuoteRequest && isConversationLinkedRecord(selectedQuoteRequest, conversationId)
      ? selectedQuoteRequest
      : null;
  const linkedHomeownerRequest =
    selectedHomeownerRequest && isConversationLinkedRecord(selectedHomeownerRequest, conversationId)
      ? selectedHomeownerRequest
      : null;

  const hiringPositionTitle = firstIdentityValue(
    registry.positionTitle,
    registry.position_title,
    registry.project_title,
    conversationMeta.positionTitle,
    conversationMeta.projectTitle
  );

  const hiringParticipantName = firstIdentityValue(
    registry.applicantName,
    registry.participantName,
    registry.homeowner_email,
    conversationMeta.applicantName,
    conversationMeta.participantName,
    fallbacks.activeConversationName
  );

  const hiringBusinessName = firstIdentityValue(
    registry.businessName,
    conversationMeta.businessName,
    fallbacks.conversationBusinessName,
    fallbacks.businessName
  );

  const conversationCustomerIdentity = {
    name: firstIdentityValue(
      registry.customerName,
      registry.homeownerName,
      registry.homeowner_email,
      registry.customer,
      registry.name,
      conversationMeta.customerName,
      conversationMeta.homeownerName,
      conversationMeta.homeowner_email,
      linkedSelectedConversation?.customerName,
      linkedSelectedConversation?.homeownerName,
      linkedSelectedConversation?.homeowner_email,
      linkedSelectedConversation?.customer,
      linkedSelectedConversation?.name
    ),
    avatar: firstIdentityValue(
      registry.participantAvatar,
      registry.participant_avatar,
      registry.profilePhoto,
      registry.profile_photo,
      registry.profilePhotoUrl,
      registry.profile_photo_url,
      registry.contactPhoto,
      registry.contact_photo,
      registry.customerAvatar,
      registry.homeownerAvatar,
      registry.avatar,
      registry.avatarUrl,
      registry.avatar_url,
      conversationMeta.customerAvatar,
      conversationMeta.homeownerAvatar,
      conversationMeta.participantAvatar,
      conversationMeta.profilePhoto,
      conversationMeta.profilePhotoUrl,
      conversationMeta.contactPhoto,
      conversationMeta.avatar,
      conversationMeta.avatarUrl,
      linkedSelectedConversation?.customerAvatar,
      linkedSelectedConversation?.homeownerAvatar,
      linkedSelectedConversation?.participantAvatar,
      linkedSelectedConversation?.avatar,
      linkedSelectedConversation?.avatarUrl,
      linkedSelectedConversation?.profilePhoto,
      linkedSelectedConversation?.profilePhotoUrl,
      linkedSelectedConversation?.contactPhoto
    ),
    location: firstIdentityValue(
      registry.customerLocation,
      registry.location,
      conversationMeta.customerLocation,
      conversationMeta.location,
      linkedSelectedConversation?.customerLocation,
      linkedSelectedConversation?.location
    ),
  };

  const requestCustomerIdentity = {
    name: firstIdentityValue(
      linkedQuoteRequest?.homeownerName,
      linkedQuoteRequest?.homeowner_name,
      linkedQuoteRequest?.customerName,
      linkedQuoteRequest?.homeowner_email,
      linkedHomeownerRequest?.homeownerName,
      linkedHomeownerRequest?.customerName,
      linkedHomeownerRequest?.homeowner_email
    ),
    avatar: firstIdentityValue(
      linkedQuoteRequest?.participantAvatar,
      linkedQuoteRequest?.participant_avatar,
      linkedQuoteRequest?.profilePhoto,
      linkedQuoteRequest?.profile_photo,
      linkedQuoteRequest?.profilePhotoUrl,
      linkedQuoteRequest?.profile_photo_url,
      linkedQuoteRequest?.customerAvatar,
      linkedQuoteRequest?.homeownerAvatar,
      linkedQuoteRequest?.avatar,
      linkedQuoteRequest?.avatarUrl,
      linkedQuoteRequest?.avatar_url,
      linkedHomeownerRequest?.participantAvatar,
      linkedHomeownerRequest?.participant_avatar,
      linkedHomeownerRequest?.profilePhoto,
      linkedHomeownerRequest?.profile_photo,
      linkedHomeownerRequest?.profilePhotoUrl,
      linkedHomeownerRequest?.profile_photo_url,
      linkedHomeownerRequest?.customerAvatar,
      linkedHomeownerRequest?.homeownerAvatar,
      linkedHomeownerRequest?.avatar,
      linkedHomeownerRequest?.avatarUrl,
      linkedHomeownerRequest?.avatar_url
    ),
    location: firstIdentityValue(
      linkedQuoteRequest?.location,
      linkedQuoteRequest?.address,
      linkedHomeownerRequest?.location,
      linkedHomeownerRequest?.address
    ),
  };

  const linkedCustomerIdentity = {
    name: firstIdentityValue(
      activeJobSnapshot.conversationId === conversationId ? activeJobSnapshot.customer : "",
      fallbacks.activeConversationId === conversationId ? fallbacks.activeConversationName : ""
    ),
    avatar: "",
    location: firstIdentityValue(
      fallbacks.activeConversationId === conversationId
        ? fallbacks.activeCustomerLocation
        : "",
      fallbacks.activeConversationId === conversationId
        ? fallbacks.projectLocation
        : ""
    ),
  };

  const resolvedCustomerIdentity = {
    name:
      conversationCustomerIdentity.name ||
      requestCustomerIdentity.name ||
      linkedCustomerIdentity.name ||
      "Customer",
    avatar:
      conversationCustomerIdentity.avatar ||
      requestCustomerIdentity.avatar ||
      linkedCustomerIdentity.avatar ||
      "",
    location:
      conversationCustomerIdentity.location ||
      requestCustomerIdentity.location ||
      linkedCustomerIdentity.location ||
      "",
  };

  const customerProjectionInput = {
    ...registry,
    ...conversationMeta,
    ...safeObject(linkedSelectedConversation),
    ...safeObject(linkedQuoteRequest),
    ...safeObject(linkedHomeownerRequest),
    customerName: resolvedCustomerIdentity.name,
    profilePhoto: resolvedCustomerIdentity.avatar,
    profilePhotoUrl: resolvedCustomerIdentity.avatar,
    customerAvatar: resolvedCustomerIdentity.avatar,
    homeownerAvatar: resolvedCustomerIdentity.avatar,
    participantAvatar: resolvedCustomerIdentity.avatar,
    avatar: resolvedCustomerIdentity.avatar,
    location: resolvedCustomerIdentity.location,
  };

  const businessProjectionInput = {
    ...selectedBusiness,
    businessName: firstIdentityValue(
      emergencyRecord.businessName,
      registry.businessName,
      registry.providerName,
      conversationMeta.businessName,
      linkedSelectedConversation?.businessName,
      conversationBusinessName,
      fallbacks.conversationBusinessName
    ),
    businessProfilePhoto: firstIdentityValue(
      registry.participantAvatar,
      registry.businessProfilePhoto,
      registry.business_profile_photo,
      registry.businessProfilePhotoUrl,
      registry.business_profile_photo_url,
      registry.profilePhoto,
      registry.profile_photo,
      registry.profilePhotoUrl,
      registry.profile_photo_url,
      conversationMeta.participantAvatar,
      conversationMeta.businessProfilePhoto,
      conversationMeta.businessProfilePhotoUrl,
      conversationMeta.profilePhoto,
      conversationMeta.profilePhotoUrl,
      linkedSelectedConversation?.businessProfilePhoto,
      linkedSelectedConversation?.businessProfilePhotoUrl,
      linkedSelectedConversation?.profilePhoto,
      linkedSelectedConversation?.profilePhotoUrl,
      linkedSelectedConversation?.participantAvatar,
      selectedBusiness.businessProfilePhoto,
      selectedBusiness.businessProfilePhotoUrl,
      selectedBusiness.profilePhoto,
      selectedBusiness.profilePhotoUrl
    ),
    profilePhoto: firstIdentityValue(
      registry.participantAvatar,
      registry.businessProfilePhoto,
      registry.business_profile_photo,
      registry.businessProfilePhotoUrl,
      registry.business_profile_photo_url,
      registry.profilePhoto,
      registry.profile_photo,
      registry.profilePhotoUrl,
      registry.profile_photo_url,
      conversationMeta.participantAvatar,
      conversationMeta.businessProfilePhoto,
      conversationMeta.businessProfilePhotoUrl,
      conversationMeta.profilePhoto,
      conversationMeta.profilePhotoUrl,
      linkedSelectedConversation?.businessProfilePhoto,
      linkedSelectedConversation?.businessProfilePhotoUrl,
      linkedSelectedConversation?.profilePhoto,
      linkedSelectedConversation?.profilePhotoUrl,
      linkedSelectedConversation?.participantAvatar,
      selectedBusiness.businessProfilePhoto,
      selectedBusiness.businessProfilePhotoUrl,
      selectedBusiness.profilePhoto,
      selectedBusiness.profilePhotoUrl
    ),
    image_url: firstIdentityValue(
      registry.participantAvatar,
      registry.businessProfilePhoto,
      registry.business_profile_photo,
      registry.businessProfilePhotoUrl,
      registry.business_profile_photo_url,
      registry.profilePhoto,
      registry.profile_photo,
      registry.profilePhotoUrl,
      registry.profile_photo_url,
      registry.businessAvatar,
      registry.businessLogo,
      registry.logo,
      conversationMeta.participantAvatar,
      conversationMeta.businessProfilePhoto,
      conversationMeta.businessProfilePhotoUrl,
      conversationMeta.profilePhoto,
      conversationMeta.profilePhotoUrl,
      conversationMeta.businessAvatar,
      conversationMeta.businessLogo,
      linkedSelectedConversation?.businessAvatar,
      linkedSelectedConversation?.businessLogo,
      linkedSelectedConversation?.businessProfilePhoto,
      linkedSelectedConversation?.businessProfilePhotoUrl,
      linkedSelectedConversation?.profilePhoto,
      linkedSelectedConversation?.profilePhotoUrl,
      linkedSelectedConversation?.participantAvatar,
      selectedBusiness.businessProfilePhoto,
      selectedBusiness.businessProfilePhotoUrl,
      selectedBusiness.profilePhoto,
      selectedBusiness.profilePhotoUrl
    ),
    logo: firstIdentityValue(
      registry.businessLogo,
      registry.logo,
      conversationMeta.businessLogo,
      linkedSelectedConversation?.businessLogo,
      selectedBusiness.logo
    ),
  };

  return {
    linkedSelectedConversation,
    linkedQuoteRequest,
    linkedHomeownerRequest,
    conversationCustomerIdentity,
    requestCustomerIdentity,
    linkedCustomerIdentity,
    resolvedCustomerIdentity,
    customerProjectionInput,
    businessProjectionInput,
    hiring: {
      positionTitle: hiringPositionTitle,
      participantName: hiringParticipantName,
      businessName: hiringBusinessName,
    },
  };
}

export { firstIdentityValue, isConversationLinkedRecord };
