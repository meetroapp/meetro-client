const TRADE_CATEGORIES = new Set([
  "handyman",
  "contractor",
  "carpentry",
  "drywall",
  "electrical",
  "flooring",
  "painting",
  "plumbing",
  "roofing",
  "tile",
  "fencing",
  "pressurewashing",
  "paversealing",
  "concrete",
  "landscaping",
  "lawncare",
  "poolservice",
  "pestcontrol",
  "demolition",
  "junkremoval",
  "cleaning",
  "appliancerepair",
  "hvac",
  "doorswindows",
  "moving",
  "treeservice",
]);

const GUIDANCE_GROUPS = {
  homehealthcare: "requestGuidanceCare",
  propertymanagement: "requestGuidancePropertyManagement",
  privatetransportation: "requestGuidanceTransportation",
  automotiveservices: "requestGuidanceAutomotive",
  mechanic: "requestGuidanceAutomotive",
  cardetailing: "requestGuidanceCarDetailing",
  realestate: "requestGuidanceRealEstate",
};

function normalizeCategory(categoryKey) {
  return String(categoryKey || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

export function getRequestHelpGuidance(categoryKey, translate) {
  const normalizedCategory = normalizeCategory(categoryKey);
  const groupKey = TRADE_CATEGORIES.has(normalizedCategory)
    ? "requestGuidanceTrade"
    : GUIDANCE_GROUPS[normalizedCategory] || "requestGuidanceDefault";

  return {
    title: translate(`${groupKey}Title`),
    description: translate(`${groupKey}Description`),
    examples: [1, 2, 3].map((index) =>
      translate(`${groupKey}Example${index}`)
    ),
    nextStep: translate(`${groupKey}NextStep`),
  };
}

