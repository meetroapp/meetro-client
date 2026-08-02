const HOME_SERVICES_DOMAIN = "home_services";

export const EMERGENCY_SERVICE_OPTIONS = Object.freeze([
  Object.freeze({
    value: "emergency_plumbing",
    domain: HOME_SERVICES_DOMAIN,
    icon: "plumbing",
    label: Object.freeze({
      en: "Emergency Plumbing",
      es: "Plomería de Emergencia",
    }),
    description: Object.freeze({
      en: "Leaks, clogs, broken pipes",
      es: "Fugas, drenajes tapados, tuberías rotas",
    }),
  }),
  Object.freeze({
    value: "emergency_electrical_service",
    domain: HOME_SERVICES_DOMAIN,
    icon: "electrical",
    label: Object.freeze({
      en: "Emergency Electrical",
      es: "Electricidad de Emergencia",
    }),
    description: Object.freeze({
      en: "Power issues, outlets, breakers",
      es: "Problemas eléctricos, enchufes y breakers",
    }),
  }),
  Object.freeze({
    value: "roof_leak_repair",
    domain: HOME_SERVICES_DOMAIN,
    icon: "home",
    label: Object.freeze({
      en: "Roof Leak Repair",
      es: "Reparación de Techo",
    }),
    description: Object.freeze({
      en: "Storm leaks and roof damage",
      es: "Goteras y daños en el techo",
    }),
  }),
  Object.freeze({
    value: "emergency_lockout",
    domain: HOME_SERVICES_DOMAIN,
    icon: "lock",
    label: Object.freeze({
      en: "Emergency Lockout",
      es: "Servicio de Cerrajería de Emergencia",
    }),
    description: Object.freeze({
      en: "Home lockouts and urgent lock access",
      es: "Bloqueos del hogar y acceso urgente",
    }),
  }),
  Object.freeze({
    value: "handyman",
    domain: HOME_SERVICES_DOMAIN,
    icon: "emergency",
    label: Object.freeze({
      en: "Other Urgent Property Issue",
      es: "Otro Problema Urgente",
    }),
    description: Object.freeze({
      en: "Describe another urgent service need",
      es: "Describe otra necesidad urgente de servicio",
    }),
  }),
]);

const CANONICAL_SPECIALTIES = new Set(
  EMERGENCY_SERVICE_OPTIONS.map((option) => option.value)
);

export function normalizeCanonicalEmergencySpecialty(value) {
  const specialty = String(value ?? "").trim();

  return CANONICAL_SPECIALTIES.has(specialty) ? specialty : "";
}

const LEGACY_DISPLAY_ALIASES = Object.freeze({
  plumbing_repairs: "emergency_plumbing",
  electrical: "emergency_electrical_service",
  roofing: "roof_leak_repair",
  locksmith: "emergency_lockout",
});

export function normalizeEmergencySpecialtyForDisplay(value) {
  const specialty = String(value ?? "").trim();

  const canonicalSpecialty =
    normalizeCanonicalEmergencySpecialty(specialty);
  if (canonicalSpecialty) return canonicalSpecialty;

  return LEGACY_DISPLAY_ALIASES[specialty] || "";
}

export function isUnsupportedLegacyEmergencySpecialty(value) {
  return String(value ?? "").trim() === "storm_preparation";
}
