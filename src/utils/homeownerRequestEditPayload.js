function clean(value) {
  return String(value || "").trim();
}

export function createHomeownerRequestEditDraft(request = {}) {
  return {
    title: String(request.title || ""),
    description: String(request.description || ""),
    location: String(request.location || ""),
    locationIntakeMode: String(request.locationIntakeMode || ""),
    locationNormalizationStatus: String(
      request.locationNormalizationStatus || "legacy_unclassified"
    ),
    serviceAddressLine1: String(request.serviceAddressLine1 || ""),
    serviceCity: String(request.serviceCity || ""),
    serviceRegion: String(request.serviceRegion || ""),
    servicePostalCode: String(request.servicePostalCode || ""),
    serviceCountryCode: String(request.serviceCountryCode || ""),
    unitNumber: String(request.unitNumber || ""),
    accessNotes: String(request.accessNotes || ""),
  };
}

export function buildHomeownerRequestEditPayload({
  request = {},
  draft = {},
  requestPhotos,
} = {}) {
  const body = {};
  const title = clean(draft.title);
  const description = clean(draft.description);

  if (title !== clean(request.title)) body.title = title;
  if (description !== clean(request.description)) {
    body.description = description;
  }

  if (draft.locationNormalizationStatus === "normalized") {
    const normalizedLocation = {
      location_intake_mode: clean(draft.locationIntakeMode),
      service_city: clean(draft.serviceCity),
      service_region: clean(draft.serviceRegion),
      service_postal_code: clean(draft.servicePostalCode),
      service_country_code: clean(draft.serviceCountryCode),
      access_notes: clean(draft.accessNotes),
    };
    if (draft.locationIntakeMode === "exact_on_file") {
      normalizedLocation.service_address_line1 = clean(
        draft.serviceAddressLine1
      );
      normalizedLocation.unit_number = clean(draft.unitNumber);
    }

    const locationChanged = Object.entries(normalizedLocation).some(
      ([key, value]) => {
        const requestKey = {
          location_intake_mode: "locationIntakeMode",
          service_city: "serviceCity",
          service_region: "serviceRegion",
          service_postal_code: "servicePostalCode",
          service_country_code: "serviceCountryCode",
          access_notes: "accessNotes",
          service_address_line1: "serviceAddressLine1",
          unit_number: "unitNumber",
        }[key];
        return value !== clean(request[requestKey]);
      }
    );
    if (locationChanged) Object.assign(body, normalizedLocation);
  } else {
    const location = clean(draft.location);
    if (location !== clean(request.location)) body.location = location;
  }

  if (requestPhotos !== undefined) {
    body.request_photos = requestPhotos;
  }

  return Object.keys(body).length > 0 ? body : null;
}
