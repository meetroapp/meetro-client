const EARTH_RADIUS_MILES = 3958.7613;

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeZip(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function listFromValue(value, { splitSpaces = false } = {}) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  if (!hasValue(value)) return [];

  const splitter = splitSpaces ? /[,\s;|]+/ : /[,;|]+/;

  return String(value)
    .split(splitter)
    .map(normalizeText)
    .filter(Boolean);
}

function zipListFromValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeZip).filter(Boolean);
  }

  if (!hasValue(value)) return [];

  return String(value)
    .split(/[,;\s|]+/)
    .map(normalizeZip)
    .filter(Boolean);
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number.parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getCoordinate(record = {}) {
  const latitude = toNumber(record.latitude ?? record.lat);
  const longitude = toNumber(record.longitude ?? record.lng ?? record.lon);

  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

function getRadiusMiles(professional = {}, request = {}) {
  return toNumber(
    professional.serviceRadiusMiles ??
      professional.service_radius_miles ??
      professional.serviceRadius ??
      professional.service_radius ??
      request.serviceRadiusMiles ??
      request.service_radius_miles ??
      request.serviceRadius ??
      request.service_radius
  );
}

function getProfessionalZips(professional = {}) {
  return [
    ...zipListFromValue(professional.serviceZipCodes),
    ...zipListFromValue(professional.service_zip_codes),
    ...zipListFromValue(professional.zipCodes),
    ...zipListFromValue(professional.zip_codes),
    ...zipListFromValue(professional.zip),
    ...zipListFromValue(professional.postalCode),
    ...zipListFromValue(professional.postal_code),
  ];
}

function getRequestZips(request = {}) {
  return [
    ...zipListFromValue(request.zip),
    ...zipListFromValue(request.zipCode),
    ...zipListFromValue(request.zip_code),
    ...zipListFromValue(request.postalCode),
    ...zipListFromValue(request.postal_code),
  ];
}

function getProfessionalCities(professional = {}) {
  return [
    ...listFromValue(professional.serviceCities),
    ...listFromValue(professional.service_cities),
    ...listFromValue(professional.city),
    ...listFromValue(professional.primaryCity),
    ...listFromValue(professional.primary_city),
    ...listFromValue(professional.serviceArea),
    ...listFromValue(professional.service_area),
  ];
}

function getRequestCities(request = {}) {
  return [
    ...listFromValue(request.city),
    ...listFromValue(request.primaryCity),
    ...listFromValue(request.primary_city),
    ...listFromValue(request.serviceArea),
    ...listFromValue(request.service_area),
  ];
}

function isExplicitlyDemoSafe(professional = {}, request = {}, options = {}) {
  return Boolean(
    options.allowLocalDemoSafe ||
      professional.localDemoSafe ||
      professional.demoSafe ||
      professional.isDemo ||
      request.localDemoSafe ||
      request.demoSafe ||
      request.isDemo
  );
}

export function calculateDistanceMiles(firstCoordinate, secondCoordinate) {
  if (!firstCoordinate || !secondCoordinate) return null;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(
    secondCoordinate.latitude - firstCoordinate.latitude
  );
  const longitudeDifference = toRadians(
    secondCoordinate.longitude - firstCoordinate.longitude
  );
  const firstLatitude = toRadians(firstCoordinate.latitude);
  const secondLatitude = toRadians(secondCoordinate.latitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_MILES * centralAngle;
}

export function getServiceAreaMatchSummary(professional = {}, request = {}, options = {}) {
  const professionalCoordinate = getCoordinate(professional);
  const requestCoordinate = getCoordinate(request);
  const radiusMiles = getRadiusMiles(professional, request);

  if (professionalCoordinate && requestCoordinate && radiusMiles !== null) {
    const distanceMiles = calculateDistanceMiles(
      professionalCoordinate,
      requestCoordinate
    );
    const matched = distanceMiles !== null && distanceMiles <= radiusMiles;

    return {
      matched,
      reason: matched ? "coordinate_radius_match" : "coordinate_radius_miss",
      method: "coordinates",
      distanceMiles,
      radiusMiles,
    };
  }

  const professionalZips = [...new Set(getProfessionalZips(professional))];
  const requestZips = [...new Set(getRequestZips(request))];
  const zipMatched =
    professionalZips.length > 0 &&
    requestZips.length > 0 &&
    requestZips.some((zip) => professionalZips.includes(zip));

  if (zipMatched) {
    return {
      matched: true,
      reason: "zip_match",
      method: "zip",
      professionalZips,
      requestZips,
    };
  }

  const professionalCities = [...new Set(getProfessionalCities(professional))];
  const requestCities = [...new Set(getRequestCities(request))];
  const cityMatched =
    professionalCities.length > 0 &&
    requestCities.length > 0 &&
    requestCities.some((city) => professionalCities.includes(city));

  if (cityMatched) {
    return {
      matched: true,
      reason: "city_match",
      method: "city",
      professionalCities,
      requestCities,
    };
  }

  const hasProfessionalLocation =
    Boolean(professionalCoordinate) ||
    professionalZips.length > 0 ||
    professionalCities.length > 0;
  const hasRequestLocation =
    Boolean(requestCoordinate) ||
    requestZips.length > 0 ||
    requestCities.length > 0;

  if (!hasProfessionalLocation || !hasRequestLocation) {
    const demoSafe = isExplicitlyDemoSafe(professional, request, options);

    return {
      matched: demoSafe,
      reason: demoSafe ? "local_demo_safe" : "missing_location",
      method: "none",
      professionalHasLocation: hasProfessionalLocation,
      requestHasLocation: hasRequestLocation,
    };
  }

  return {
    matched: false,
    reason: "location_mismatch",
    method: "fallback",
    professionalZips,
    requestZips,
    professionalCities,
    requestCities,
  };
}

export function matchesServiceArea(professional = {}, request = {}, options = {}) {
  return getServiceAreaMatchSummary(professional, request, options).matched;
}

export function canProfessionalServeArea(
  professional = {},
  request = {},
  options = {}
) {
  return matchesServiceArea(professional, request, options);
}
