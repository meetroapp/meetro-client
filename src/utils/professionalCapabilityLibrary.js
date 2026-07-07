function toCapabilityKey(prefix, id = "") {
  return prefix + String(id || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function getProfessionalCapabilityCategoryLabelKey(id = "") {
  return toCapabilityKey("professionalCapabilityCategory", id);
}

export function getProfessionalCapabilitySpecialtyLabelKey(id = "") {
  return toCapabilityKey("professionalCapabilitySpecialty", id);
}

export function getProfessionalCapabilitySectionLabelKey(section = "") {
  return toCapabilityKey(
    "professionalCapabilitySection",
    String(section || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
  );
}

export const PROFESSIONAL_CAPABILITY_LIBRARY = Object.freeze([
  {
    id: "handyman",
    industry: "home_services",
    label: "Handyman",
    aliases: ["handyman", "maintenance", "small repairs", "home repair"],
    specialties: Object.freeze([
      { id: "door_repair_replacement", label: "Door Repair / Replacement", aliases: ["door repair", "door replacement"] },
      { id: "drywall_repair", label: "Drywall Repair", aliases: ["sheetrock", "wall repair"] },
      { id: "interior_painting", label: "Interior Painting", aliases: ["inside painting", "paint"] },
      { id: "exterior_painting", label: "Exterior Painting", aliases: ["outside painting", "paint"] },
      { id: "tile_repair_installation", label: "Tile Repair / Installation", aliases: ["tile repair", "tile installation"] },
      { id: "cabinet_repair_replacement", label: "Cabinet Repair / Replacement", aliases: ["cabinet repair", "cabinet replacement"] },
      { id: "trim_baseboards", label: "Trim / Baseboards", aliases: ["baseboard", "molding"] },
      { id: "mounting_hanging", label: "Mounting / Hanging", aliases: ["tv mounting", "hang pictures", "install shelves"] },
      { id: "minor_plumbing", label: "Minor Plumbing", aliases: ["faucet", "small plumbing"] },
      { id: "minor_electrical", label: "Minor Electrical", aliases: ["outlet", "switch", "small electrical"] },
      { id: "fence_repair", label: "Fence Repair", aliases: ["fencing"] },
      { id: "pressure_washing", labelKey: "professionalOnboardingSpecialtyPressureWashing", label: "Pressure Washing", aliases: ["power washing"] },
      { id: "general_maintenance", labelKey: "professionalOnboardingSpecialtyGeneralMaintenance", label: "General Maintenance", aliases: ["maintenance"] },
      { id: "furniture_assembly", label: "Furniture Assembly", aliases: ["assemble furniture"] },
      { id: "shelving_installation", label: "Shelving Installation", aliases: ["shelves"] },
      { id: "weatherstripping", label: "Weatherstripping", aliases: ["weather stripping", "draft sealing"] },
      { id: "caulking", label: "Caulking", aliases: ["sealant"] },
      { id: "small_repairs", label: "Small Repairs", aliases: ["odd jobs", "repair"] },
      { id: "handyman", labelKey: "professionalOnboardingSpecialtyHandyman", label: "General Handyman", aliases: ["general handyman"] },
      { id: "garage_door_opener_installation", labelKey: "professionalOnboardingSpecialtyGarageDoorOpenerInstallation", label: "Garage Door Opener Installation", aliases: ["garage opener"] },
      { id: "door_replacement", labelKey: "professionalOnboardingSpecialtyDoorReplacement", label: "Door Replacement", aliases: ["replace door"] },
      { id: "painting", labelKey: "professionalOnboardingSpecialtyPainting", label: "Painting", aliases: ["paint"] },
      { id: "drywall", labelKey: "professionalOnboardingSpecialtyDrywall", label: "Drywall", aliases: ["sheetrock"] },
      { id: "plumbing_repairs", labelKey: "professionalOnboardingSpecialtyPlumbingRepairs", label: "Plumbing Repairs", aliases: ["faucet repair"] },
      { id: "ceiling_fan_installation", labelKey: "professionalOnboardingSpecialtyCeilingFanInstallation", label: "Ceiling Fan Installation", aliases: ["fan install"] },
      { id: "tile", labelKey: "professionalOnboardingSpecialtyTile", label: "Tile", aliases: ["tile"] },
      { id: "cabinetry", labelKey: "professionalOnboardingSpecialtyCabinetry", label: "Cabinetry", aliases: ["cabinet"] },
      { id: "flooring", labelKey: "professionalOnboardingSpecialtyFlooring", label: "Flooring", aliases: ["floor"] },
      { id: "appliance_installation", labelKey: "professionalOnboardingSpecialtyApplianceInstallation", label: "Appliance Installation", aliases: ["install appliance"] },
    ]),
  },
  {
    id: "cleaning_services",
    industry: "home_services",
    label: "Cleaning Services",
    aliases: ["cleaning", "maid", "cleaner", "janitorial", "office cleaning", "commercial cleaning"],
    specialties: Object.freeze([
      { id: "housekeeping", label: "Housekeeping", aliases: ["maid", "home cleaning"] },
      { id: "office_cleaning_services", label: "Office Cleaning Services", aliases: ["office cleaning", "commercial cleaning"] },
      { id: "carpet_cleaning", label: "Carpet Cleaning", aliases: ["rugs"] },
      { id: "industrial_cleaning", label: "Industrial Cleaning", aliases: ["warehouse cleaning"] },
      { id: "window_cleaning", label: "Window Cleaning", aliases: ["windows"] },
      { id: "medical_facility_cleaning", label: "Medical Facility Cleaning", aliases: ["clinic cleaning", "healthcare cleaning"] },
      { id: "restaurant_kitchen_cleaning", label: "Restaurant and Kitchen Cleaning", aliases: ["restaurant cleaning", "kitchen cleaning"] },
      { id: "event_venue_cleaning", label: "Event Venue Cleaning", aliases: ["venue cleaning"] },
      { id: "school_cleaning", label: "School Cleaning", aliases: ["education cleaning"] },
      { id: "retail_cleaning", label: "Retail Cleaning", aliases: ["store cleaning"] },
      { id: "hotel_hospitality_cleaning", label: "Hotel and Hospitality Cleaning", aliases: ["hotel cleaning", "hospitality"] },
      { id: "green_cleaning_services", label: "Green Cleaning Services", aliases: ["eco cleaning"] },
      { id: "pet_cleaning_services", label: "Pet Cleaning Services", aliases: ["pet odor", "pet mess"] },
      { id: "graffiti_removal_services", label: "Graffiti Removal Services", aliases: ["graffiti"] },
      { id: "biohazard_cleaning", label: "Biohazard Cleaning", aliases: ["hazmat", "hazard"] },
      { id: "move_in_move_out_cleaning", label: "Move-In / Move-Out Cleaning", aliases: ["move out cleaning", "move in cleaning"] },
      { id: "post_construction_cleaning", label: "Post-Construction Cleaning", aliases: ["construction cleanup"] },
      { id: "deep_cleaning", label: "Deep Cleaning", aliases: ["deep clean"] },
      { id: "janitorial_services", label: "Janitorial Services", aliases: ["janitor"] },
      { id: "cleaning", labelKey: "professionalOnboardingServiceCleaning", label: "Cleaning", aliases: ["cleaning services"] },
    ]),
  },
  {
    id: "pool_services",
    industry: "home_services",
    label: "Pool Services",
    aliases: ["pool", "pool service", "pool builder"],
    specialties: Object.freeze([
      { id: "pool_maintenance", label: "Pool Maintenance", aliases: ["pool upkeep"] },
      { id: "pool_cleaning", label: "Pool Cleaning", aliases: ["clean pool"] },
      { id: "pool_repair", label: "Pool Repair", aliases: ["fix pool"] },
      { id: "pool_equipment_installation", label: "Pool Equipment Installation", aliases: ["pool equipment"] },
      { id: "pool_pump_repair", label: "Pool Pump Repair", aliases: ["pump repair"] },
      { id: "pool_filter_cleaning", label: "Pool Filter Cleaning", aliases: ["filter cleaning"] },
      { id: "pool_leak_detection", label: "Pool Leak Detection", aliases: ["pool leak"] },
      { id: "pool_resurfacing", label: "Pool Resurfacing", aliases: ["resurface pool"] },
      { id: "pool_builders", label: "Pool Builders", aliases: ["pool builder"] },
      { id: "new_pool_construction", label: "New Pool Construction", aliases: ["build pool", "pool builder"] },
      { id: "spa_hot_tub_service", label: "Spa / Hot Tub Service", aliases: ["hot tub", "spa"] },
      { id: "pool_automation", label: "Pool Automation", aliases: ["automation"] },
      { id: "pool_lighting", label: "Pool Lighting", aliases: ["pool lights"] },
      { id: "saltwater_pool_systems", label: "Saltwater Pool Systems", aliases: ["saltwater"] },
      { id: "pool_service", labelKey: "poolService", label: "Pool Service", aliases: ["pool services"] },
    ]),
  },
  {
    id: "general_contractor",
    industry: "home_services",
    label: "General Contractor",
    aliases: ["contractor", "remodel", "renovation", "builder"],
    specialties: Object.freeze([
      { id: "architect_coordination", label: "Architect Coordination", section: "Planning & Design", aliases: ["architect"] },
      { id: "architectural_designer", label: "Architectural Designer", section: "Planning & Design", aliases: ["blueprint", "design"] },
      { id: "building_designer", label: "Building Designer", section: "Planning & Design", aliases: ["designer"] },
      { id: "draftsperson_drafting_services", label: "Draftsperson / Drafting Services", section: "Planning & Design", aliases: ["drafting", "blueprint"] },
      { id: "permit_plan_preparation", label: "Permit Plan Preparation", section: "Planning & Design", aliases: ["permit plans"] },
      { id: "construction_documents", label: "Construction Documents", section: "Planning & Design", aliases: ["blueprint", "construction docs"] },
      { id: "home_inspections", label: "Home Inspections", section: "Pre-Construction", aliases: ["inspection"] },
      { id: "pre_purchase_inspections", label: "Pre-Purchase Inspections", section: "Pre-Construction", aliases: ["inspection"] },
      { id: "renovation_feasibility", label: "Renovation Feasibility", section: "Pre-Construction", aliases: ["feasibility"] },
      { id: "site_evaluation", label: "Site Evaluation", section: "Pre-Construction", aliases: ["site visit"] },
      { id: "cost_estimation", label: "Cost Estimation", section: "Pre-Construction", aliases: ["estimate"] },
      { id: "project_planning", label: "Project Planning", section: "Pre-Construction", aliases: ["planning"] },
      { id: "permit_coordination", label: "Permit Coordination", section: "Pre-Construction", aliases: ["permits"] },
      { id: "new_home_construction", label: "New Home Construction", section: "Construction", aliases: ["new build"] },
      { id: "home_additions", label: "Home Additions", section: "Construction", aliases: ["addition"] },
      { id: "major_renovations", label: "Major Renovations", section: "Construction", aliases: ["renovation"] },
      { id: "kitchen_remodeling", label: "Kitchen Remodeling", section: "Construction", aliases: ["kitchen remodel"] },
      { id: "bathroom_remodeling", label: "Bathroom Remodeling", section: "Construction", aliases: ["bath remodel"] },
      { id: "whole_home_renovation", label: "Whole Home Renovation", section: "Construction", aliases: ["whole home"] },
      { id: "commercial_build_outs", label: "Commercial Build-Outs", section: "Construction", aliases: ["commercial buildout"] },
      { id: "structural_repairs", label: "Structural Repairs", section: "Construction", aliases: ["structure"] },
      { id: "general_contracting", label: "General Contracting", section: "Project Management", aliases: ["general contractor"] },
      { id: "subcontractor_coordination", label: "Subcontractor Coordination", section: "Project Management", aliases: ["subs"] },
      { id: "construction_scheduling", label: "Construction Scheduling", section: "Project Management", aliases: ["schedule"] },
      { id: "budget_management", label: "Budget Management", section: "Project Management", aliases: ["budget"] },
      { id: "quality_control", label: "Quality Control", section: "Project Management", aliases: ["quality"] },
      { id: "final_walkthrough", label: "Final Walkthrough", section: "Project Management", aliases: ["walkthrough"] },
    ]),
  },
  {
    id: "roofing",
    industry: "home_services",
    label: "Roofing",
    aliases: ["roof", "roofer"],
    specialties: Object.freeze([
      { id: "roof_repair", label: "Roof Repair", aliases: ["roof fix"] },
      { id: "roof_replacement", label: "Roof Replacement", aliases: ["new roof"] },
      { id: "roof_inspection", label: "Roof Inspection", aliases: ["inspect roof"] },
      { id: "roof_leak_repair", label: "Roof Leak Repair", aliases: ["roof leak"] },
      { id: "shingle_roofing", label: "Shingle Roofing", aliases: ["shingles"] },
      { id: "tile_roofing", label: "Tile Roofing", aliases: ["tile roof"] },
      { id: "metal_roofing", label: "Metal Roofing", aliases: ["metal roof"] },
      { id: "flat_roofing", label: "Flat Roofing", aliases: ["flat roof"] },
      { id: "commercial_roofing", label: "Commercial Roofing", aliases: ["business roof"] },
      { id: "residential_roofing", label: "Residential Roofing", aliases: ["home roof"] },
      { id: "roof_maintenance", label: "Roof Maintenance", aliases: ["roof upkeep"] },
      { id: "storm_damage_roofing", label: "Storm Damage Roofing", aliases: ["storm damage"] },
      { id: "skylight_repair_installation", label: "Skylight Repair / Installation", aliases: ["skylight"] },
      { id: "gutter_installation_repair", label: "Gutter Installation / Repair", aliases: ["gutters"] },
    ]),
  },
  {
    id: "plumbing",
    industry: "home_services",
    label: "Plumbing",
    aliases: ["plumber", "pipe", "drain"],
    specialties: Object.freeze([
      { id: "plumbing_repair", label: "Plumbing Repair", aliases: ["repair plumbing"] },
      { id: "drain_cleaning", label: "Drain Cleaning", aliases: ["clog", "drain"] },
      { id: "water_heater_repair", label: "Water Heater Repair", aliases: ["water heater"] },
      { id: "water_heater_installation", label: "Water Heater Installation", aliases: ["install water heater"] },
      { id: "tankless_water_heaters", label: "Tankless Water Heaters", aliases: ["tankless"] },
      { id: "leak_detection", label: "Leak Detection", aliases: ["leak"] },
      { id: "pipe_repair", label: "Pipe Repair", aliases: ["pipe"] },
      { id: "pipe_replacement", label: "Pipe Replacement", aliases: ["repiping"] },
      { id: "sewer_line_repair", label: "Sewer Line Repair", aliases: ["sewer"] },
      { id: "toilet_repair_installation", label: "Toilet Repair / Installation", aliases: ["toilet"] },
      { id: "faucet_repair_installation", label: "Faucet Repair / Installation", aliases: ["faucet"] },
      { id: "garbage_disposal_installation", label: "Garbage Disposal Installation", aliases: ["disposal"] },
      { id: "shower_tub_plumbing", label: "Shower / Tub Plumbing", aliases: ["shower", "tub"] },
      { id: "emergency_plumbing", label: "Emergency Plumbing", aliases: ["emergency plumber"] },
      { id: "plumbing", labelKey: "professionalOnboardingSpecialtyPlumbing", label: "Plumbing", aliases: ["plumber"] },
      { id: "plumbing_repairs", labelKey: "professionalOnboardingSpecialtyPlumbingRepairs", label: "Plumbing Repairs", aliases: ["plumbing repair"] },
    ]),
  },
  {
    id: "electrical",
    industry: "home_services",
    label: "Electrical",
    aliases: ["electrician", "electric", "wiring"],
    specialties: Object.freeze([
      { id: "electrical_repair", label: "Electrical Repair", aliases: ["electric repair"] },
      { id: "outlet_switch_installation", label: "Outlet / Switch Installation", aliases: ["outlet", "switch"] },
      { id: "lighting_installation", label: "Lighting Installation", aliases: ["lights"] },
      { id: "ceiling_fan_installation", labelKey: "professionalOnboardingSpecialtyCeilingFanInstallation", label: "Ceiling Fan Installation", aliases: ["fan"] },
      { id: "panel_upgrades", label: "Panel Upgrades", aliases: ["electrical panel"] },
      { id: "breaker_replacement", label: "Breaker Replacement", aliases: ["breaker"] },
      { id: "ev_charger_installation", label: "EV Charger Installation", aliases: ["ev charger"] },
      { id: "generator_installation", label: "Generator Installation", aliases: ["generator"] },
      { id: "smart_home_wiring", label: "Smart Home Wiring", aliases: ["smart home"] },
      { id: "security_camera_wiring", label: "Security Camera Wiring", aliases: ["camera wiring"] },
      { id: "smoke_co_detector_installation", label: "Smoke / CO Detector Installation", aliases: ["smoke detector", "co detector"] },
      { id: "electrical_troubleshooting", label: "Electrical Troubleshooting", aliases: ["troubleshoot"] },
      { id: "emergency_electrical_service", label: "Emergency Electrical Service", aliases: ["emergency electrician"] },
      { id: "electrical", labelKey: "professionalOnboardingSpecialtyElectrical", label: "Electrical", aliases: ["electrician"] },
    ]),
  },
  {
    id: "hvac",
    industry: "home_services",
    label: "HVAC",
    aliases: ["ac", "air conditioning", "heating"],
    specialties: Object.freeze([
      { id: "ac_repair", label: "AC Repair", aliases: ["air conditioner repair"] },
      { id: "ac_installation", label: "AC Installation", aliases: ["install ac"] },
      { id: "ac_maintenance", label: "AC Maintenance", aliases: ["ac tuneup"] },
      { id: "heating_repair", label: "Heating Repair", aliases: ["heat repair"] },
      { id: "heating_installation", label: "Heating Installation", aliases: ["install heat"] },
      { id: "ductwork", label: "Ductwork", aliases: ["ducts"] },
      { id: "thermostat_installation", label: "Thermostat Installation", aliases: ["thermostat"] },
      { id: "indoor_air_quality", label: "Indoor Air Quality", aliases: ["air quality"] },
      { id: "mini_split_systems", label: "Mini-Split Systems", aliases: ["mini split"] },
      { id: "refrigeration", label: "Refrigeration", aliases: ["fridge", "commercial refrigeration"] },
      { id: "emergency_hvac_service", label: "Emergency HVAC Service", aliases: ["emergency ac"] },
    ]),
  },
  {
    id: "pest_control",
    industry: "home_services",
    label: "Pest Control",
    aliases: ["bug", "bugs", "pest", "exterminator"],
    specialties: Object.freeze([
      { id: "general_pest_control", label: "General Pest Control", aliases: ["bugs"] },
      { id: "termite_treatment", label: "Termite Treatment", aliases: ["termites"] },
      { id: "rodent_control", label: "Rodent Control", aliases: ["mice", "rats"] },
      { id: "ant_control", label: "Ant Control", aliases: ["ants"] },
      { id: "roach_control", label: "Roach Control", aliases: ["roaches"] },
      { id: "mosquito_control", label: "Mosquito Control", aliases: ["mosquitoes"] },
      { id: "bed_bug_treatment", label: "Bed Bug Treatment", aliases: ["bed bugs"] },
      { id: "wildlife_removal", label: "Wildlife Removal", aliases: ["wildlife"] },
      { id: "bee_wasp_removal", label: "Bee / Wasp Removal", aliases: ["bees", "wasps"] },
      { id: "lawn_pest_treatment", label: "Lawn Pest Treatment", aliases: ["lawn bugs"] },
      { id: "preventive_pest_service", label: "Preventive Pest Service", aliases: ["prevention"] },
    ]),
  },
  {
    id: "healthcare",
    industry: "healthcare",
    label: "Health & Wellness",
    aliases: ["healthcare", "health", "care"],
    specialties: Object.freeze([
      { id: "home_health", labelKey: "professionalOnboardingSpecialtyHomeHealth", label: "Home Health", aliases: ["home health"] },
      { id: "senior_care", labelKey: "professionalOnboardingSpecialtySeniorCare", label: "Senior Care", aliases: ["senior care"] },
      { id: "nursing", labelKey: "professionalOnboardingSpecialtyNursing", label: "Nursing", aliases: ["nurse"] },
      { id: "caregiver", labelKey: "professionalOnboardingSpecialtyCaregiver", label: "Caregiver", aliases: ["caregiver"] },
      { id: "medical_transport", labelKey: "professionalOnboardingSpecialtyMedicalTransport", label: "Medical Transport", aliases: ["medical transport"] },
    ]),
  },
  {
    id: "transportation",
    industry: "transportation",
    label: "Automotive Services",
    aliases: ["transportation", "automotive", "mechanic"],
    specialties: Object.freeze([
      { id: "mechanic", labelKey: "professionalOnboardingSpecialtyMechanic", label: "Mechanic", aliases: ["mechanic"] },
      { id: "mobile_services", labelKey: "professionalOnboardingSpecialtyMobileServices", label: "Mobile Services", aliases: ["mobile mechanic"] },
      { id: "private_transportation", labelKey: "professionalOnboardingSpecialtyPrivateTransportation", label: "Private Transportation", aliases: ["ride", "driver"] },
    ]),
  },
  {
    id: "marketing_services",
    industry: "marketing",
    label: "Marketing Services",
    aliases: [
      "marketing",
      "seo",
      "advertising",
      "brand strategy",
      "website",
      "social media",
      "content",
    ],
    specialties: Object.freeze([
      { id: "marketing_strategy", label: "Marketing Strategy", aliases: ["strategy", "go to market"] },
      { id: "digital_marketing", label: "Digital Marketing", aliases: ["online marketing"] },
      { id: "seo", label: "SEO", aliases: ["search engine optimization"] },
      { id: "local_seo", label: "Local SEO", aliases: ["google business profile", "map ranking"] },
      { id: "ppc_advertising", label: "PPC Advertising", aliases: ["paid search", "google ads", "paid ads"] },
      { id: "social_media_marketing", label: "Social Media Marketing", aliases: ["social media"] },
      { id: "content_marketing", label: "Content Marketing", aliases: ["content strategy"] },
      { id: "email_marketing", label: "Email Marketing", aliases: ["newsletter"] },
      { id: "brand_strategy", label: "Brand Strategy", aliases: ["positioning", "brand planning"] },
      { id: "brand_identity", label: "Brand Identity", aliases: ["visual identity", "logo"] },
      { id: "graphic_design", label: "Graphic Design", aliases: ["design", "graphics"] },
      { id: "website_design", label: "Website Design", aliases: ["web design"] },
      { id: "website_development", label: "Website Development", aliases: ["web development", "website build"] },
      { id: "copywriting", label: "Copywriting", aliases: ["copy", "writing"] },
      { id: "photography", label: "Photography", aliases: ["photos"] },
      { id: "videography", label: "Videography", aliases: ["video"] },
      { id: "marketing_analytics", label: "Analytics", aliases: ["analytics", "reporting"] },
      { id: "public_relations", label: "Public Relations", aliases: ["pr", "media relations"] },
      { id: "marketing_consulting", label: "Marketing Consulting", aliases: ["marketing advice", "consulting"] },
    ]),
  },
  ...[
    ["landscaping", "Landscaping", ["Lawn Care", "Mulching", "Planting", "Irrigation Repair"]],
    ["tree_services", "Tree Services", ["Tree Trimming", "Tree Removal", "Stump Grinding", "Emergency Tree Service"]],
    ["flooring", "Flooring", ["Floor Installation", "Floor Repair", "Hardwood Flooring", "Vinyl Flooring"]],
    ["painting", "Painting", ["Interior Painting", "Exterior Painting", "Cabinet Painting", "Touch-Up Painting"]],
    ["drywall", "Drywall", ["Drywall Repair", "Drywall Installation", "Texture Matching", "Patch Repair"]],
    ["windows_doors", "Windows & Doors", ["Window Repair", "Window Replacement", "Door Installation", "Door Repair"]],
    ["garage_doors", "Garage Doors", ["Garage Door Repair", "Garage Door Installation", "Garage Door Opener Installation"]],
    ["appliance_repair", "Appliance Repair", ["Refrigerator Repair", "Washer / Dryer Repair", "Oven Repair", "Dishwasher Repair"]],
    ["junk_removal", "Junk Removal", ["Furniture Removal", "Appliance Haul-Away", "Construction Debris", "Estate Cleanout"]],
    ["moving_services", "Moving Services", ["Local Moving", "Packing Help", "Furniture Moving", "Labor-Only Moving"]],
    ["locksmith", "Locksmith", ["Lock Repair", "Lock Replacement", "Rekeying", "Emergency Lockout"]],
    ["solar", "Solar", ["Solar Panel Installation", "Solar Repair", "Solar Maintenance"]],
    ["security_systems", "Security Systems", ["Alarm Installation", "Camera Installation", "Access Control"]],
    ["property_management", "Property Management", ["Tenant Ticket", "Rental Maintenance", "Inspection", "Unit Turnover", "Vendor Dispatch"]],
    ["real_estate", "Real Estate", ["Listing Preparation", "Buyer Support", "Rental Leasing"]],
    ["home_inspection", "Home Inspection", ["Home Inspection", "Pre-Purchase Inspection", "Four-Point Inspection"]],
    ["interior_design", "Interior Design", ["Space Planning", "Material Selection", "Color Consultation"]],
    ["architecture", "Architecture", ["Architectural Design", "Drafting Services", "Permit Plans"]],
    ["commercial_cleaning", "Commercial Cleaning", ["Office Cleaning Services", "Janitorial Services", "Facility Cleaning"]],
    ["facility_maintenance", "Facility Maintenance", ["Preventive Maintenance", "Work Orders", "Vendor Coordination"]],
    ["automotive_services", "Automotive Services", ["Mechanic", "Mobile Services", "Car Detailing"]],
    ["pet_services", "Pet Services", ["Pet Sitting", "Pet Grooming", "Pet Cleaning Services"]],
    ["food_hospitality", "Food & Hospitality", ["Catering Support", "Restaurant Cleaning", "Kitchen Maintenance"]],
    ["events", "Events", ["Event Setup", "Event Venue Cleaning", "Breakdown Help"]],
    ["personal_care", "Personal Care", ["Personal Care Support", "Companion Care", "Errand Help"]],
    ["health_wellness", "Health & Wellness", ["Home Health", "Senior Care", "Caregiver"]],
    ["education", "Education", ["Tutoring", "Training", "Classroom Support"]],
    ["professional_services", "Professional Services", ["Consulting", "Bookkeeping", "Administrative Support"]],
  ].map(([id, label, labels]) => ({
    id,
    industry: ["automotive_services"].includes(id) ? "transportation" : id === "property_management" ? "property_management" : id === "health_wellness" ? "healthcare" : "home_services",
    label,
    aliases: [label],
    specialties: Object.freeze(
      labels.map((specialtyLabel) => ({
        id: specialtyLabel
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, ""),
        label: specialtyLabel,
        aliases: [specialtyLabel],
      }))
    ),
  })),
]);

export function getProfessionalCapabilityCategories() {
  return PROFESSIONAL_CAPABILITY_LIBRARY.map((category) => ({
    ...category,
    labelKey: getProfessionalCapabilityCategoryLabelKey(category.id),
  }));
}

export function getProfessionalCapabilityCategory(categoryId = "") {
  const category = PROFESSIONAL_CAPABILITY_LIBRARY.find(
    (item) => item.id === categoryId
  );
  return category
    ? { ...category, labelKey: getProfessionalCapabilityCategoryLabelKey(category.id) }
    : null;
}

export function getProfessionalCapabilitySpecialties(categoryId = "") {
  const category = getProfessionalCapabilityCategory(categoryId);
  return (category?.specialties || []).map((specialty) => ({
    ...specialty,
    labelKey:
      specialty.labelKey ||
      getProfessionalCapabilitySpecialtyLabelKey(specialty.id),
    sectionLabelKey: specialty.section
      ? getProfessionalCapabilitySectionLabelKey(specialty.section)
      : "",
  }));
}

export function flattenProfessionalCapabilities() {
  return PROFESSIONAL_CAPABILITY_LIBRARY.flatMap((category) =>
    category.specialties.map((specialty) => ({
      ...specialty,
      value: specialty.id,
      labelKey:
        specialty.labelKey ||
        getProfessionalCapabilitySpecialtyLabelKey(specialty.id),
      sectionLabelKey: specialty.section
        ? getProfessionalCapabilitySectionLabelKey(specialty.section)
        : "",
      categoryId: category.id,
      categoryLabel: category.label,
      categoryLabelKey: getProfessionalCapabilityCategoryLabelKey(category.id),
      domain: category.industry,
      groupLabel: specialty.section
        ? `${category.label} - ${specialty.section}`
        : category.label,
      groupLabelKey: specialty.section
        ? getProfessionalCapabilitySectionLabelKey(specialty.section)
        : getProfessionalCapabilityCategoryLabelKey(category.id),
    }))
  );
}

export function buildProfessionalCapabilityGroups() {
  return PROFESSIONAL_CAPABILITY_LIBRARY.map((category) => ({
    domain: category.industry,
    categoryId: category.id,
    label: category.label,
    labelKey: getProfessionalCapabilityCategoryLabelKey(category.id),
    aliases: category.aliases || [],
    options: Object.freeze(
      category.specialties.map((specialty) => ({
        value: specialty.id,
        label: specialty.label,
        labelKey:
          specialty.labelKey ||
          getProfessionalCapabilitySpecialtyLabelKey(specialty.id),
        aliases: specialty.aliases || [],
        section: specialty.section || "",
        sectionLabelKey: specialty.section
          ? getProfessionalCapabilitySectionLabelKey(specialty.section)
          : "",
        categoryId: category.id,
        categoryLabel: category.label,
        categoryLabelKey: getProfessionalCapabilityCategoryLabelKey(category.id),
      }))
    ),
  }));
}

export function normalizeCapabilitySearchText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

export function searchProfessionalCapabilityCategories(query = "") {
  const normalizedQuery = normalizeCapabilitySearchText(query);
  const categories = getProfessionalCapabilityCategories();
  if (!normalizedQuery) return categories;

  return categories.filter((category) =>
    normalizeCapabilitySearchText([
      category.label,
      category.id,
      ...(category.aliases || []),
    ].join(" ")).includes(normalizedQuery)
  );
}

export function searchProfessionalCapabilitySpecialties(categoryId = "", query = "") {
  const category = getProfessionalCapabilityCategory(categoryId);
  if (!category) return [];
  const specialties = getProfessionalCapabilitySpecialties(categoryId);
  const normalizedQuery = normalizeCapabilitySearchText(query);
  if (!normalizedQuery) return specialties;

  return specialties.filter((specialty) =>
    normalizeCapabilitySearchText([
      specialty.label,
      specialty.id,
      specialty.section,
      category.label,
      ...(specialty.aliases || []),
    ].join(" ")).includes(normalizedQuery)
  );
}
