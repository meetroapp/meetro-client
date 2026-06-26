import { SERVICE_TYPE_IDS } from "./evaluationTemplateRegistry.js";

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;

  Object.freeze(value);
  Object.values(value).forEach((nestedValue) => {
    if (
      (isRecord(nestedValue) || Array.isArray(nestedValue)) &&
      !Object.isFrozen(nestedValue)
    ) {
      deepFreeze(nestedValue);
    }
  });

  return value;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function normalizeRegistryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function toRegistryMap(definitions) {
  return deepFreeze(
    Object.fromEntries(definitions.map((definition) => [definition.serviceType, definition]))
  );
}

export const PRICING_GUIDANCE_DISCLAIMER =
  "Pricing is guidance only and should be adjusted by the professional for local labor, materials, site conditions, and customer-specific scope.";

export const PRICING_LIBRARY_REGISTRY = toRegistryMap([
  {
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    serviceLabel: "Door Replacement",
    pricingModel: "Fixed labor range plus materials",
    laborAssumption:
      "Typical labor range assumes removal of one existing residential door and installation of one replacement door.",
    materialNote:
      "Material cost varies by slab vs. prehung door, lockset, hinges, trim, shims, caulk, and paint touch-up.",
    estimateNote:
      "Confirm measurements, swing direction, frame condition, and hardware before finalizing the quote.",
    guidance: [
      "Labor range",
      "Common material cost notes",
      "Estimated time range",
      "Pricing note",
    ],
    disclaimer: PRICING_GUIDANCE_DISCLAIMER,
  },
  {
    serviceType: SERVICE_TYPE_IDS.DRYWALL_REPAIR,
    serviceLabel: "Drywall Repair",
    pricingModel: "Tiered by repair size and finish requirements",
    laborAssumption:
      "Small patches are usually single-area repairs; medium and large repairs may require multiple visits for compound, sanding, texture, and paint.",
    materialNote:
      "Material cost depends on drywall size, compound, tape, texture, primer, and paint match.",
    estimateNote:
      "Texture matching, moisture source repair, and paint blending should be priced separately when needed.",
    guidance: [
      "Small patch",
      "Medium repair",
      "Large repair",
      "Texture/paint note",
    ],
    disclaimer: PRICING_GUIDANCE_DISCLAIMER,
  },
  {
    serviceType: "cabinet_replacement",
    serviceLabel: "Cabinet Replacement",
    pricingModel: "Install labor plus cabinet, trim, and hardware",
    laborAssumption:
      "Cabinet install labor assumes removal or placement of a standard cabinet box with normal wall attachment.",
    materialNote:
      "Hardware, trim, fillers, shims, fasteners, and caulk can change the material allowance.",
    estimateNote:
      "Sink cabinets may require plumbing coordination, countertop handling, or water-damage cleanup.",
    guidance: [
      "Cabinet install labor",
      "Hardware/trim notes",
      "Sink cabinet note",
    ],
    disclaimer: PRICING_GUIDANCE_DISCLAIMER,
  },
  {
    serviceType: SERVICE_TYPE_IDS.TILE_REPAIR,
    serviceLabel: "Tile Repair",
    pricingModel: "Minimum charge or per-square-foot labor guidance",
    laborAssumption:
      "Labor depends on demo effort, substrate condition, tile layout, setting time, grout, and cleanup.",
    materialNote:
      "Tile match, thinset, grout, spacers, backer board, waterproofing, and sealer should be reviewed before quoting.",
    estimateNote:
      "Small repairs often need a minimum charge because setup and cure time can exceed the visible repair size.",
    guidance: [
      "Per-square-foot labor note",
      "Grout/thinset note",
      "Minimum charge note",
    ],
    disclaimer: PRICING_GUIDANCE_DISCLAIMER,
  },
  {
    serviceType: SERVICE_TYPE_IDS.PAINTING,
    serviceLabel: "Painting",
    pricingModel: "Room, wall, or area-based estimate guidance",
    laborAssumption:
      "Labor assumes basic prep, masking, cutting in, rolling, and cleanup for a defined room or area.",
    materialNote:
      "Primer, patching, caulk, paint grade, number of coats, and color changes affect material assumptions.",
    estimateNote:
      "Measure the area, note ceiling height, repairs, trim, doors, and whether customer supplies paint.",
    guidance: [
      "Room/area estimate note",
      "Prep/primer note",
      "Paint/material note",
    ],
    disclaimer: PRICING_GUIDANCE_DISCLAIMER,
  },
]);

export function getPricingLibrary(filters = {}) {
  const serviceType = normalizeRegistryKey(filters.serviceType);

  return Object.values(PRICING_LIBRARY_REGISTRY)
    .filter((entry) => !serviceType || entry.serviceType === serviceType)
    .map(cloneValue);
}

export function getPricingForService(serviceType) {
  const definition =
    PRICING_LIBRARY_REGISTRY[normalizeRegistryKey(serviceType)];

  return definition ? cloneValue(definition) : null;
}

export function getPricingLibraryReport() {
  const entries = Object.values(PRICING_LIBRARY_REGISTRY);

  return {
    readOnly: true,
    serviceTypeCount: entries.length,
    serviceTypes: entries.map((entry) => entry.serviceType),
    guidanceCount: entries.reduce(
      (total, entry) => total + entry.guidance.length,
      0
    ),
    disclaimer: PRICING_GUIDANCE_DISCLAIMER,
  };
}
