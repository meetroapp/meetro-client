export const categoryRoutes = {
  handyman: [
    "plumbing",
    "electrical",
    "roofing",
    "drywall",
    "carpentry",
    "door",
    "locksmith",
    "storm",
    "general",
    "repair",
  ],

  plumbing: ["plumbing"],
  electrical: ["electrical"],
  roofing: ["roofing"],
  cleaning: ["cleaning"],

  healthcare: [
    "home_health",
    "senior_care",
    "medical_transport",
    "caregiver",
  ],

  landscaping: [
    "lawn",
    "trees",
    "irrigation",
    "landscaping",
  ],

  moving: [
    "moving",
    "packing",
    "junk_removal",
  ],

  emergency: [
    "plumbing",
    "electrical",
    "roofing",
    "drywall",
    "carpentry",
    "door",
    "locksmith",
    "storm",
    "general",
    "repair",
  ],
};

export function normalizeCategory(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function inferEmergencyCategory(service = "") {
  const value = String(service).toLowerCase();

  if (value.includes("plumbing")) return "plumbing";
  if (value.includes("electrical")) return "electrical";
  if (value.includes("roof")) return "roofing";
  if (value.includes("drywall")) return "drywall";
  if (value.includes("door")) return "door";
  if (value.includes("locksmith")) return "locksmith";
  if (value.includes("storm")) return "storm";
  if (value.includes("clean")) return "cleaning";
  if (value.includes("health")) return "home_health";
  if (value.includes("moving")) return "moving";

  return "general";
}

export function canBusinessSeeCategory(businessCategory, targetCategory) {
  const business = normalizeCategory(businessCategory);
  const target = normalizeCategory(targetCategory);

  if (!target) return true;
  if (business === target) return true;

  return categoryRoutes[business]?.includes(target) || false;
}
