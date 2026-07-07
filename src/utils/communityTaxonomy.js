import {
  PROFESSIONAL_CAPABILITY_LIBRARY,
  normalizeCapabilitySearchText,
} from "./professionalCapabilityLibrary.js";

const capabilityGroupIds = new Set(
  PROFESSIONAL_CAPABILITY_LIBRARY.map((group) => group.id)
);

function child({
  id,
  capabilityGroupId,
  label,
  labelKey = "",
  aliases = [],
  legacySignupValue = "",
}) {
  return Object.freeze({
    id,
    capabilityGroupId,
    label,
    labelKey,
    aliases: Object.freeze(aliases),
    legacySignupValue: legacySignupValue || id,
  });
}

function ecosystem({
  id,
  label,
  description,
  aliases = [],
  discoveryLabelKey = "",
  discoverySection = "businesses",
  icon = "placeholder",
  children = [],
}) {
  return Object.freeze({
    id,
    label,
    description,
    aliases: Object.freeze(aliases),
    discoveryLabelKey,
    discoverySection,
    icon,
    children: Object.freeze(children),
  });
}

export const COMMUNITY_TAXONOMY_ECOSYSTEMS = Object.freeze([
  ecosystem({
    id: "home_services",
    label: "Home Services",
    description:
      "Capabilities that help people repair, improve, clean, maintain, and care for homes.",
    aliases: [
      "home services",
      "home repair",
      "repair",
      "maintenance",
      "contractor",
      "cabinet",
      "pool",
    ],
    discoveryLabelKey: "communityInterestHomeServices",
    children: [
      child({ id: "general_contractor", capabilityGroupId: "general_contractor", label: "General Contractor", labelKey: "signupCategoryGeneralContractor", aliases: ["contractor", "builder", "remodel"], legacySignupValue: "contractor" }),
      child({ id: "carpentry", capabilityGroupId: "handyman", label: "Carpentry", labelKey: "carpentry", aliases: ["carpentry", "woodwork", "trim"], legacySignupValue: "carpentry" }),
      child({ id: "concrete", capabilityGroupId: "general_contractor", label: "Concrete", labelKey: "concrete", aliases: ["concrete", "slab", "masonry"], legacySignupValue: "concrete" }),
      child({ id: "demolition", capabilityGroupId: "general_contractor", label: "Demolition", labelKey: "demolition", aliases: ["demolition", "demo", "tear out"], legacySignupValue: "demolition" }),
      child({ id: "fencing", capabilityGroupId: "handyman", label: "Fencing", labelKey: "fencing", aliases: ["fence", "fencing", "gate"], legacySignupValue: "fencing" }),
      child({ id: "handyman", capabilityGroupId: "handyman", label: "Handyman", labelKey: "handyman", aliases: ["handyman", "small repairs"], legacySignupValue: "handyman" }),
      child({ id: "cleaning_services", capabilityGroupId: "cleaning_services", label: "Cleaning Services", labelKey: "signupCategoryCleaningServices", aliases: ["cleaning", "maid", "office cleaning"], legacySignupValue: "cleaning" }),
      child({ id: "pool_services", capabilityGroupId: "pool_services", label: "Pool Services", labelKey: "poolService", aliases: ["pool", "pool builder"], legacySignupValue: "poolService" }),
      child({ id: "pressure_washing", capabilityGroupId: "handyman", label: "Pressure Washing", labelKey: "pressureWashing", aliases: ["pressure washing", "power washing"], legacySignupValue: "pressureWashing" }),
      child({ id: "roofing", capabilityGroupId: "roofing", label: "Roofing", labelKey: "roofing", aliases: ["roof", "roofer"], legacySignupValue: "roofing" }),
      child({ id: "plumbing", capabilityGroupId: "plumbing", label: "Plumbing", labelKey: "plumbing", aliases: ["plumber", "pipe", "drain"], legacySignupValue: "plumbing" }),
      child({ id: "electrical", capabilityGroupId: "electrical", label: "Electrical", labelKey: "electrical", aliases: ["electrician", "wiring"], legacySignupValue: "electrical" }),
      child({ id: "hvac", capabilityGroupId: "hvac", label: "HVAC", labelKey: "hvac", aliases: ["ac", "heating"], legacySignupValue: "hvac" }),
      child({ id: "pest_control", capabilityGroupId: "pest_control", label: "Pest Control", labelKey: "pestControl", aliases: ["bug", "exterminator"], legacySignupValue: "pestControl" }),
      child({ id: "landscaping", capabilityGroupId: "landscaping", label: "Landscaping", labelKey: "landscaping", aliases: ["landscaping", "yard"], legacySignupValue: "landscaping" }),
      child({ id: "lawn_care", capabilityGroupId: "landscaping", label: "Lawn Care", labelKey: "lawnCare", aliases: ["lawn care", "mowing", "yard maintenance"], legacySignupValue: "lawnCare" }),
      child({ id: "paver_sealing", capabilityGroupId: "general_contractor", label: "Paver Sealing", labelKey: "paverSealing", aliases: ["paver sealing", "pavers", "sealing"], legacySignupValue: "paverSealing" }),
      child({ id: "tree_services", capabilityGroupId: "tree_services", label: "Tree Services", labelKey: "treeService", aliases: ["tree service", "tree removal"], legacySignupValue: "treeService" }),
      child({ id: "flooring", capabilityGroupId: "flooring", label: "Flooring", labelKey: "flooring", aliases: ["flooring", "floor"], legacySignupValue: "flooring" }),
      child({ id: "tile", capabilityGroupId: "flooring", label: "Tile", labelKey: "signupCategoryTileInstallation", aliases: ["tile", "tile installation", "tile repair"], legacySignupValue: "tile" }),
      child({ id: "painting", capabilityGroupId: "painting", label: "Painting", labelKey: "painting", aliases: ["painting", "paint"], legacySignupValue: "painting" }),
      child({ id: "drywall", capabilityGroupId: "drywall", label: "Drywall", labelKey: "signupCategoryDrywallRepair", aliases: ["drywall", "sheetrock"], legacySignupValue: "drywall" }),
      child({ id: "windows_doors", capabilityGroupId: "windows_doors", label: "Windows & Doors", labelKey: "doorsWindows", aliases: ["windows", "doors"], legacySignupValue: "doorsWindows" }),
      child({ id: "garage_doors", capabilityGroupId: "garage_doors", label: "Garage Doors", labelKey: "doorsWindows", aliases: ["garage door", "garage opener"], legacySignupValue: "doorsWindows" }),
      child({ id: "appliance_repair", capabilityGroupId: "appliance_repair", label: "Appliance Repair", labelKey: "applianceRepair", aliases: ["appliance repair"], legacySignupValue: "applianceRepair" }),
      child({ id: "junk_removal", capabilityGroupId: "junk_removal", label: "Junk Removal", labelKey: "junkRemoval", aliases: ["junk", "haul away"], legacySignupValue: "junkRemoval" }),
      child({ id: "moving_services", capabilityGroupId: "moving_services", label: "Moving Services", labelKey: "signupCategoryMovingServices", aliases: ["moving"], legacySignupValue: "moving" }),
    ],
  }),
  ecosystem({
    id: "property_management",
    label: "Property",
    description:
      "Capabilities for rentals, facilities, tenant needs, inspections, and property operations.",
    aliases: ["property", "property management", "rental", "tenant", "facility"],
    discoveryLabelKey: "communityInterestPropertyManagement",
    children: [
      child({ id: "property_management", capabilityGroupId: "property_management", label: "Property Management", labelKey: "propertyManagement", aliases: ["property management", "tenant", "rental"], legacySignupValue: "propertyManagement" }),
      child({ id: "facility_maintenance", capabilityGroupId: "facility_maintenance", label: "Facility Maintenance", aliases: ["facility maintenance", "work orders"], legacySignupValue: "professional" }),
      child({ id: "commercial_cleaning", capabilityGroupId: "commercial_cleaning", label: "Commercial Cleaning", labelKey: "signupCategoryCleaningServices", aliases: ["commercial cleaning", "janitorial"], legacySignupValue: "cleaning" }),
    ],
  }),
  ecosystem({
    id: "real_estate",
    label: "Real Estate",
    description:
      "Capabilities that support buying, selling, leasing, inspecting, and preparing property.",
    aliases: ["real estate", "realtor", "listing", "leasing", "home inspection"],
    discoveryLabelKey: "communityInterestRealEstate",
    children: [
      child({ id: "real_estate", capabilityGroupId: "real_estate", label: "Real Estate", labelKey: "realEstate", aliases: ["real estate", "realtor"], legacySignupValue: "realEstate" }),
      child({ id: "home_inspection", capabilityGroupId: "home_inspection", label: "Home Inspection", aliases: ["inspection", "pre purchase inspection"], legacySignupValue: "professional" }),
    ],
  }),
  ecosystem({
    id: "business_services",
    label: "Business Services",
    description:
      "Capabilities that help organizations operate, support customers, hire, and stay organized.",
    aliases: ["business services", "admin", "operations", "bookkeeping", "consulting"],
    discoveryLabelKey: "communityInterestBusinessServices",
    discoverySection: "hiring",
    children: [
      child({ id: "professional_services", capabilityGroupId: "professional_services", label: "Professional Services", labelKey: "signupCategoryProfessionalServices", aliases: ["consulting", "administrative support"], legacySignupValue: "professional" }),
    ],
  }),
  ecosystem({
    id: "marketing",
    label: "Marketing",
    description:
      "Capabilities that help businesses get discovered, earn attention, and reach the right customers.",
    aliases: ["marketing", "seo", "ads", "customers", "more customers", "restaurant marketing"],
    discoveryLabelKey: "communityInterestMarketing",
    children: [],
  }),
  ecosystem({
    id: "creative",
    label: "Creative",
    description:
      "Capabilities for design, visual identity, content, spaces, and creative expression.",
    aliases: ["creative", "logo", "design", "brand", "photography", "interior design"],
    discoveryLabelKey: "communityInterestCreative",
    discoverySection: "spotlight",
    children: [
      child({ id: "interior_design", capabilityGroupId: "interior_design", label: "Interior Design", aliases: ["interior design", "space planning"], legacySignupValue: "professional" }),
      child({ id: "architecture", capabilityGroupId: "architecture", label: "Architecture", aliases: ["architecture", "drafting", "permit plans"], legacySignupValue: "contractor" }),
    ],
  }),
  ecosystem({
    id: "financial",
    label: "Financial",
    description:
      "Capabilities for taxes, bookkeeping, payments, financial organization, and planning.",
    aliases: ["financial", "finance", "taxes", "tax", "bookkeeping", "accounting"],
    discoveryLabelKey: "communityInterestFinancial",
    children: [],
  }),
  ecosystem({
    id: "legal",
    label: "Legal",
    description:
      "Capabilities for legal guidance, contracts, disputes, compliance, and documentation.",
    aliases: ["legal", "law", "lawyer", "attorney", "contract", "compliance"],
    discoveryLabelKey: "communityInterestLegal",
    children: [],
  }),
  ecosystem({
    id: "healthcare",
    label: "Healthcare",
    description:
      "Capabilities that support care, wellness, mobility, and health-related relationships.",
    aliases: ["healthcare", "health", "caregiver", "nursing", "medical", "senior care"],
    discoveryLabelKey: "communityInterestHealthcare",
    children: [
      child({ id: "healthcare", capabilityGroupId: "healthcare", label: "Health & Wellness", labelKey: "homeHealthCare", aliases: ["healthcare", "home health"], legacySignupValue: "homeHealthCare" }),
      child({ id: "health_wellness", capabilityGroupId: "health_wellness", label: "Health & Wellness", labelKey: "homeHealthCare", aliases: ["senior care", "caregiver"], legacySignupValue: "homeHealthCare" }),
      child({ id: "personal_care", capabilityGroupId: "personal_care", label: "Personal Care", aliases: ["personal care", "errands"], legacySignupValue: "homeHealthCare" }),
    ],
  }),
  ecosystem({
    id: "transportation",
    label: "Transportation",
    description:
      "Capabilities for mobility, vehicles, private rides, delivery, and automotive support.",
    aliases: ["transportation", "driver", "ride", "delivery", "mechanic", "automotive"],
    discoveryLabelKey: "communityInterestTransportation",
    children: [
      child({ id: "transportation", capabilityGroupId: "transportation", label: "Transportation", labelKey: "privateTransportation", aliases: ["transportation", "driver"], legacySignupValue: "privateTransportation" }),
      child({ id: "automotive_services", capabilityGroupId: "automotive_services", label: "Automotive Services", labelKey: "automotiveServices", aliases: ["automotive", "mechanic"], legacySignupValue: "automotiveServices" }),
      child({ id: "car_detailing", capabilityGroupId: "automotive_services", label: "Car Detailing", labelKey: "carDetailing", aliases: ["car detailing", "auto detailing"], legacySignupValue: "carDetailing" }),
      child({ id: "mechanic", capabilityGroupId: "automotive_services", label: "Mechanic", labelKey: "mechanic", aliases: ["mechanic", "auto repair"], legacySignupValue: "mechanic" }),
      child({ id: "mobile_services", capabilityGroupId: "transportation", label: "Mobile Services", labelKey: "mobileServices", aliases: ["mobile services", "on site service"], legacySignupValue: "mobileServices" }),
    ],
  }),
  ecosystem({
    id: "education",
    label: "Education",
    description:
      "Capabilities for teaching, tutoring, training, guidance, and learning support.",
    aliases: ["education", "tutor", "training", "teacher", "learning"],
    discoveryLabelKey: "communityInterestEducation",
    discoverySection: "hiring",
    children: [
      child({ id: "education", capabilityGroupId: "education", label: "Education", aliases: ["education", "tutoring"], legacySignupValue: "professional" }),
    ],
  }),
  ecosystem({
    id: "other",
    label: "Other",
    description:
      "Capabilities that do not yet fit a mature ecosystem but still belong in Community.",
    aliases: ["other", "miscellaneous", "not listed"],
    discoveryLabelKey: "communityInterestOther",
    children: [
      child({ id: "other", capabilityGroupId: "", label: "Other Services", labelKey: "signupCategoryOtherServices", aliases: ["other"], legacySignupValue: "other" }),
    ],
  }),
]);

export function getCommunityTaxonomyEcosystems() {
  return COMMUNITY_TAXONOMY_ECOSYSTEMS.map((ecosystem) => ({
    ...ecosystem,
    aliases: [...ecosystem.aliases],
    children: ecosystem.children.map((item) => ({
      ...item,
      aliases: [...item.aliases],
    })),
  }));
}

export function getCommunityTaxonomyEcosystem(ecosystemId = "") {
  return (
    getCommunityTaxonomyEcosystems().find(
      (ecosystem) => ecosystem.id === ecosystemId
    ) || null
  );
}

export function getCommunityDiscoveryInterestsFromTaxonomy({
  translate = (key, fallback) => fallback || key,
} = {}) {
  return getCommunityTaxonomyEcosystems()
    .filter((ecosystem) => ecosystem.id !== "other")
    .map((ecosystem) => ({
      id: ecosystem.id,
      label: translate(ecosystem.discoveryLabelKey, ecosystem.label),
      section: ecosystem.discoverySection,
      keywords: [
        ecosystem.label,
        ecosystem.id,
        ...ecosystem.aliases,
        ...ecosystem.children.flatMap((item) => [
          item.label,
          item.id,
          item.capabilityGroupId,
          ...item.aliases,
        ]),
      ],
      icon: ecosystem.icon,
    }));
}

export function getProfessionalSignupCategoriesFromTaxonomy({
  translate = (key, fallback) => fallback || key,
} = {}) {
  const seenValues = new Set();
  const categories = [];

  getCommunityTaxonomyEcosystems().forEach((ecosystem) => {
    ecosystem.children.forEach((item) => {
      const value = item.legacySignupValue || item.id;
      if (!value || seenValues.has(value)) return;
      seenValues.add(value);
      categories.push({
        value,
        labelKey: item.labelKey,
        label: item.labelKey ? translate(item.labelKey, item.label) : item.label,
        taxonomyEcosystemId: ecosystem.id,
        capabilityGroupId: item.capabilityGroupId,
        aliases: [
          ecosystem.label,
          ...ecosystem.aliases,
          item.label,
          item.id,
          item.capabilityGroupId,
          ...item.aliases,
        ],
      });
    });
  });

  return categories;
}

export function searchCommunityTaxonomyAliases(query = "") {
  const normalizedQuery = normalizeCapabilitySearchText(query);
  if (!normalizedQuery) return [];

  return getCommunityTaxonomyEcosystems().filter((ecosystem) => {
    const searchableTerms = [
      ecosystem.id,
      ecosystem.label,
      ecosystem.description,
      ...ecosystem.aliases,
      ...ecosystem.children.flatMap((item) => [
        item.id,
        item.label,
        item.capabilityGroupId,
        ...item.aliases,
      ]),
    ];

    return searchableTerms.some((term) => {
      const normalizedTerm = normalizeCapabilitySearchText(term);
      if (!normalizedTerm) return false;
      return (
        normalizedTerm.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedTerm)
      );
    });
  });
}

export function getCommunityTaxonomyEcosystemForCapabilityGroup(
  capabilityGroupId = ""
) {
  const normalizedId = String(capabilityGroupId || "");
  if (!normalizedId) return null;

  return (
    getCommunityTaxonomyEcosystems().find((ecosystem) =>
      ecosystem.children.some((item) => item.capabilityGroupId === normalizedId)
    ) || null
  );
}

export function validateCommunityTaxonomyReferences() {
  return getCommunityTaxonomyEcosystems().flatMap((ecosystem) =>
    ecosystem.children
      .filter(
        (item) =>
          item.capabilityGroupId && !capabilityGroupIds.has(item.capabilityGroupId)
      )
      .map((item) => ({
        ecosystemId: ecosystem.id,
        childId: item.id,
        capabilityGroupId: item.capabilityGroupId,
      }))
  );
}
