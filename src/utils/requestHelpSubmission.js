export const REQUEST_HELP_ERROR = Object.freeze({
  TITLE_REQUIRED: "TITLE_REQUIRED",
  MATCH_REQUIRED: "MATCH_REQUIRED",
  LOCATION_REQUIRED: "LOCATION_REQUIRED",
});

const REQUEST_HELP_SERVICE_DOMAINS = new Set([
  "healthcare",
  "home_services",
  "property_management",
  "transportation",
]);

export function isSupportedRequestHelpService(service = {}) {
  return (
    REQUEST_HELP_SERVICE_DOMAINS.has(
      String(service.domain || service.service_domain || service.serviceDomain || "").trim()
    ) &&
    Boolean(String(service.serviceId || service.service_specialty || service.serviceSpecialty || "").trim())
  );
}

export function getSupportedRequestHelpServices(services = []) {
  const seen = new Set();

  return services.filter((service) => {
    const serviceId = String(service?.serviceId || "").trim();
    if (!isSupportedRequestHelpService(service) || seen.has(serviceId)) return false;
    seen.add(serviceId);
    return true;
  });
}

export function validateRequestHelpSubmission({
  title = "",
  category = "",
  serviceLocation = {},
  matchingFields = {},
} = {}) {
  const errors = {};

  if (!String(title).trim()) {
    errors.title = REQUEST_HELP_ERROR.TITLE_REQUIRED;
  }

  if (
    !String(category).trim() ||
    !REQUEST_HELP_SERVICE_DOMAINS.has(
      String(matchingFields.service_domain || matchingFields.serviceDomain || "").trim()
    ) ||
    !String(matchingFields.service_specialty || matchingFields.serviceSpecialty || "").trim()
  ) {
    errors.category = REQUEST_HELP_ERROR.MATCH_REQUIRED;
  }

  const intakeMode = String(serviceLocation.intakeMode || "").trim();
  const hasLocality = [
    serviceLocation.city,
    serviceLocation.region,
    serviceLocation.postalCode,
    serviceLocation.countryCode,
  ].every((value) => Boolean(String(value || "").trim()));
  const exactLocationComplete =
    intakeMode === "exact_on_file" &&
    Boolean(String(serviceLocation.addressLine1 || "").trim()) &&
    hasLocality;
  const addressLaterComplete =
    intakeMode === "address_after_selection" &&
    hasLocality &&
    !String(serviceLocation.addressLine1 || "").trim() &&
    !String(serviceLocation.unitNumber || "").trim();

  if (!exactLocationComplete && !addressLaterComplete) {
    errors.location = REQUEST_HELP_ERROR.LOCATION_REQUIRED;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function getCanonicalCreatedRequest(result) {
  if (!result?.response?.ok || !result?.data?.post) return null;

  const id = result.data.post.id;
  if (id === undefined || id === null || String(id).trim() === "") return null;

  return result.data.post;
}
