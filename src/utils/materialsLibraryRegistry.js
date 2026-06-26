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

export const MATERIALS_LIBRARY_REGISTRY = toRegistryMap([
  {
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    serviceLabel: "Door Replacement",
    notes:
      "Confirm slab or prehung sizing, swing direction, hardware finish, and trim needs before quoting.",
    materials: [
      "Door slab / prehung door",
      "Hinges",
      "Door knob / lockset",
      "Trim / casing",
      "Shims",
      "Screws",
      "Caulk",
      "Paint / touch-up",
    ],
  },
  {
    serviceType: SERVICE_TYPE_IDS.DRYWALL_REPAIR,
    serviceLabel: "Drywall Repair",
    notes:
      "Match thickness, texture, primer, and paint finish to the existing wall condition.",
    materials: [
      "Drywall sheet / patch",
      "Joint compound",
      "Tape",
      "Sandpaper",
      "Texture",
      "Primer",
      "Paint",
    ],
  },
  {
    serviceType: "cabinet_replacement",
    serviceLabel: "Cabinet Replacement",
    notes:
      "Verify cabinet dimensions, wall attachment, filler strips, and visible hardware style.",
    materials: [
      "Cabinet box",
      "Fasteners",
      "Shims",
      "Trim",
      "Caulk",
      "Pulls / knobs",
    ],
  },
  {
    serviceType: SERVICE_TYPE_IDS.TILE_REPAIR,
    serviceLabel: "Tile Repair",
    notes:
      "Check tile match, substrate condition, grout color, waterproofing, and sealer needs.",
    materials: [
      "Tile",
      "Thinset",
      "Grout",
      "Spacers",
      "Backer board if needed",
      "Sealer",
    ],
  },
  {
    serviceType: SERVICE_TYPE_IDS.DOOR_REPAIR,
    serviceLabel: "Door Repair",
    notes:
      "Confirm whether the issue is alignment, frame damage, hinge wear, latch fit, or finish repair.",
    materials: [
      "Hinges",
      "Strike plate",
      "Screws",
      "Wood filler",
      "Shims",
      "Lubricant",
      "Touch-up paint",
    ],
  },
  {
    serviceType: SERVICE_TYPE_IDS.WINDOW_REPAIR,
    serviceLabel: "Window Repair",
    notes:
      "Measure glass, sash, screen, and seal conditions before selecting replacement parts.",
    materials: [
      "Weatherstripping",
      "Caulk",
      "Glazing compound",
      "Screen mesh",
      "Spline",
      "Fasteners",
      "Touch-up paint",
    ],
  },
  {
    serviceType: SERVICE_TYPE_IDS.FENCE_REPAIR,
    serviceLabel: "Fence Repair",
    notes:
      "Confirm post condition, board dimensions, gate hardware, and finish compatibility.",
    materials: [
      "Fence boards / pickets",
      "Posts if needed",
      "Rails",
      "Exterior screws",
      "Concrete mix",
      "Gate hardware",
      "Stain / sealant",
    ],
  },
  {
    serviceType: SERVICE_TYPE_IDS.APPLIANCE_INSTALLATION,
    serviceLabel: "Appliance Installation",
    notes:
      "Confirm appliance type, hookup requirements, clearance, shutoff access, and mounting needs.",
    materials: [
      "Mounting hardware",
      "Supply line",
      "Connector kit",
      "Hose / drain kit",
      "Fasteners",
      "Sealant if needed",
      "Leveling feet / pads",
    ],
  },
]);

export function getMaterialsLibrary(filters = {}) {
  const serviceType = normalizeRegistryKey(filters.serviceType);

  return Object.values(MATERIALS_LIBRARY_REGISTRY)
    .filter((entry) => !serviceType || entry.serviceType === serviceType)
    .map(cloneValue);
}

export function getMaterialsForService(serviceType) {
  const definition =
    MATERIALS_LIBRARY_REGISTRY[normalizeRegistryKey(serviceType)];

  return definition ? cloneValue(definition) : null;
}

export function getMaterialsLibraryReport() {
  const entries = Object.values(MATERIALS_LIBRARY_REGISTRY);

  return {
    readOnly: true,
    serviceTypeCount: entries.length,
    serviceTypes: entries.map((entry) => entry.serviceType),
    materialCount: entries.reduce(
      (total, entry) => total + entry.materials.length,
      0
    ),
  };
}
