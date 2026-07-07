export const COMPANION_CAPABILITY_LIBRARY = [
  {
    id: "door-replacement",
    labels: ["door replacement", "door repair", "replace a door", "install a door", "broken door"],
    primaryCapabilities: ["carpentry", "finish carpentry", "door installation"],
    supportingCapabilities: ["trim repair", "drywall patch", "painting", "hardware adjustment"],
    capabilityFamilies: ["home repair", "carpentry"],
    summary:
      "Door replacement usually needs carpentry and door installation, with finish work around trim, paint, drywall, and hardware.",
  },
  {
    id: "water-damage",
    labels: ["water damage", "leak damage", "flood damage", "mold", "wet drywall", "ceiling leak"],
    primaryCapabilities: ["moisture assessment", "mold remediation", "drywall replacement"],
    supportingCapabilities: ["cabinet repair", "flooring evaluation", "painting"],
    capabilityFamilies: ["restoration", "home repair"],
    summary:
      "Water damage often starts with moisture assessment and may require remediation, drywall work, flooring review, cabinetry, and paint.",
  },
  {
    id: "bathroom-remodel",
    labels: ["bathroom remodel", "bath remodel", "renovate bathroom", "shower remodel", "new bathroom"],
    primaryCapabilities: ["demolition", "plumbing", "tile", "waterproofing"],
    supportingCapabilities: ["drywall", "painting", "finish carpentry", "fixture installation"],
    capabilityFamilies: ["remodeling", "plumbing", "tile"],
    summary:
      "Bathroom remodels combine demolition, plumbing, tile, waterproofing, fixture installation, drywall, paint, and finish carpentry.",
  },
  {
    id: "restaurant-marketing",
    labels: ["market my restaurant", "more restaurant customers", "restaurant advertising", "local restaurant marketing"],
    primaryCapabilities: ["marketing strategy", "local SEO", "social media marketing"],
    supportingCapabilities: ["content marketing", "photography", "copywriting", "analytics"],
    capabilityFamilies: ["marketing", "local business growth"],
    summary:
      "A restaurant growth problem may need strategy, local search visibility, social media, content, photography, copy, and analytics.",
  },
  {
    id: "tax-help",
    labels: ["help with taxes", "tax preparation", "tax filing", "bookkeeping", "business taxes"],
    primaryCapabilities: ["tax preparation", "bookkeeping", "financial documentation"],
    supportingCapabilities: ["business advisory", "compliance review"],
    capabilityFamilies: ["financial", "business services"],
    summary:
      "Tax-related questions usually involve tax preparation, bookkeeping, documentation, compliance review, and business advisory support.",
  },
  {
    id: "logo-brand-identity",
    labels: ["need a logo", "logo design", "brand identity", "rebrand", "visual identity"],
    primaryCapabilities: ["brand identity", "graphic design", "creative direction"],
    supportingCapabilities: ["copywriting", "website design", "marketing strategy"],
    capabilityFamilies: ["creative", "marketing"],
    summary:
      "Logo and identity work usually requires brand identity, graphic design, creative direction, and may connect to copy, web, and strategy.",
  },
];

