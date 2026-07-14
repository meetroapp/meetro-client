export const BUSINESS_PROFILE_SUCCESS_CODES = Object.freeze([
  "BUSINESS_PROFILE_CREATED",
  "BUSINESS_PROFILE_UPDATED",
]);

const clean = (value) => String(value ?? "").trim();

export function buildBusinessProfilePayload(fields = {}) {
  const fullAddress = [
    fields.streetAddress,
    fields.addressLine2,
    fields.businessCity,
    fields.businessState,
    fields.businessPostalCode,
    fields.country,
  ]
    .map(clean)
    .filter(Boolean)
    .join(", ");
  const serviceArea = clean(fields.serviceArea);

  return {
    business_name: clean(fields.businessName),
    category: clean(fields.category),
    phone: clean(fields.phone),
    location: fields.showBusinessAddressPublic ? fullAddress || serviceArea : serviceArea,
    bio: clean(fields.bio),
    image_url: clean(fields.imageUrl),
    street_address: clean(fields.streetAddress),
    address_line_2: clean(fields.addressLine2),
    city: clean(fields.businessCity),
    state_province: clean(fields.businessState),
    postal_code: clean(fields.businessPostalCode),
    country: clean(fields.country),
    service_area: serviceArea,
    show_business_address_public: fields.showBusinessAddressPublic === true,
    business_hours: clean(fields.businessHours),
    license_number: clean(fields.licenseNumber),
    license_state: clean(fields.licenseState),
    license_type: clean(fields.licenseType),
    license_expiration: clean(fields.licenseExpiration),
    service_specialties: Array.isArray(fields.serviceSpecialties)
      ? [...new Set(fields.serviceSpecialties.map(clean).filter(Boolean))]
      : [],
    available_now: fields.availableNow === true,
    dispatch_ready: fields.dispatchReady === true,
  };
}

export function getConfirmedBusinessProfile(result) {
  if (
    !result?.response?.ok ||
    result.data?.success !== true ||
    !BUSINESS_PROFILE_SUCCESS_CODES.includes(result.data?.code) ||
    !result.data?.profile?.id
  ) {
    return null;
  }

  return result.data.profile;
}

export function buildBusinessProfilePayloadFromCanonical(profile = {}, overrides = {}) {
  return {
    business_name: clean(profile.business_name),
    category: clean(profile.category),
    phone: clean(profile.phone),
    location: clean(profile.location),
    bio: clean(profile.bio),
    image_url: clean(profile.image_url),
    street_address: clean(profile.street_address),
    address_line_2: clean(profile.address_line_2),
    city: clean(profile.city),
    state_province: clean(profile.state_province),
    postal_code: clean(profile.postal_code),
    country: clean(profile.country),
    service_area: clean(profile.service_area || profile.location),
    show_business_address_public: profile.show_business_address_public === true,
    business_hours: clean(profile.business_hours),
    license_number: clean(profile.license_number),
    license_state: clean(profile.license_state),
    license_type: clean(profile.license_type),
    license_expiration: clean(profile.license_expiration),
    service_specialties: Array.isArray(profile.service_specialties)
      ? [...profile.service_specialties]
      : [],
    available_now: profile.available_now === true,
    dispatch_ready: profile.dispatch_ready === true,
    ...overrides,
  };
}
