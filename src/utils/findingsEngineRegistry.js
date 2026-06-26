export const FINDING_CATEGORIES = Object.freeze({
  DAMAGE: "damage",
  MOLD: "mold",
  ELECTRICAL_ISSUE: "electrical_issue",
  PLUMBING_ISSUE: "plumbing_issue",
  STRUCTURAL_ISSUE: "structural_issue",
  COSMETIC_ISSUE: "cosmetic_issue",
  SAFETY_ISSUE: "safety_issue",
  ACCESS_ISSUE: "access_issue",
  MEASUREMENT: "measurement",
  RECOMMENDATION: "recommendation",
});

export const FINDING_SEVERITIES = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
  UNKNOWN: "unknown",
});

export const SERVICE_RECOMMENDATION_IDS = Object.freeze({
  CABINET_REPLACEMENT: "cabinet_replacement",
  MOLD_REMEDIATION: "mold_remediation",
  ELECTRICAL_REPAIR: "electrical_repair",
  TILE_INSTALLATION: "tile_installation",
  PLUMBING_REPAIR: "plumbing_repair",
  STRUCTURAL_REVIEW: "structural_review",
  COSMETIC_REPAIR: "cosmetic_repair",
  SAFETY_REPAIR: "safety_repair",
  ACCESS_COORDINATION: "access_coordination",
  MEASUREMENT_CAPTURE: "measurement_capture",
  GENERAL_RECOMMENDATION: "general_recommendation",
});

export const FINDING_IDS = Object.freeze({
  WATER_DAMAGED_SINK_CABINET: "finding_water_damaged_sink_cabinet",
  MOLD_PRESENT: "finding_mold_present",
  OUTLET_NOT_FUNCTIONING: "finding_outlet_not_functioning",
  BACKSPLASH_REPLACEMENT_NEEDED: "finding_backsplash_replacement_needed",
  PLUMBING_LEAK: "finding_plumbing_leak",
  STRUCTURAL_MOVEMENT: "finding_structural_movement",
  COSMETIC_WALL_DAMAGE: "finding_cosmetic_wall_damage",
  SAFETY_HAZARD: "finding_safety_hazard",
  ACCESS_RESTRICTION: "finding_access_restriction",
  MEASUREMENT_REQUIRED: "finding_measurement_required",
  RECOMMENDED_NEXT_STEP: "finding_recommended_next_step",
});

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function normalizeRegistryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function toRegistryMap(definitions) {
  return deepFreeze(
    Object.fromEntries(definitions.map((definition) => [definition.id, definition]))
  );
}

function createIssue(code, message, field = "") {
  return { code, message, field };
}

export const SERVICE_RECOMMENDATION_REGISTRY = toRegistryMap([
  {
    id: SERVICE_RECOMMENDATION_IDS.CABINET_REPLACEMENT,
    title: "Cabinet Replacement",
    serviceType: "cabinet_repair",
    category: "carpentry",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.MOLD_REMEDIATION,
    title: "Mold Remediation",
    serviceType: "general_maintenance",
    category: "environmental",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.ELECTRICAL_REPAIR,
    title: "Electrical Repair",
    serviceType: "general_maintenance",
    category: "electrical",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.TILE_INSTALLATION,
    title: "Tile Installation",
    serviceType: "tile_repair",
    category: "tile",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.PLUMBING_REPAIR,
    title: "Plumbing Repair",
    serviceType: "general_maintenance",
    category: "plumbing",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.STRUCTURAL_REVIEW,
    title: "Structural Review",
    serviceType: "general_handyman",
    category: "structural",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.COSMETIC_REPAIR,
    title: "Cosmetic Repair",
    serviceType: "painting",
    category: "cosmetic",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.SAFETY_REPAIR,
    title: "Safety Repair",
    serviceType: "general_maintenance",
    category: "safety",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.ACCESS_COORDINATION,
    title: "Access Coordination",
    serviceType: "general_maintenance",
    category: "access",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.MEASUREMENT_CAPTURE,
    title: "Measurement Capture",
    serviceType: "general_handyman",
    category: "evaluation",
  },
  {
    id: SERVICE_RECOMMENDATION_IDS.GENERAL_RECOMMENDATION,
    title: "General Recommendation",
    serviceType: "general_handyman",
    category: "evaluation",
  },
]);

export const FINDING_REGISTRY = toRegistryMap([
  {
    id: FINDING_IDS.WATER_DAMAGED_SINK_CABINET,
    category: FINDING_CATEGORIES.DAMAGE,
    title: "Water Damaged Sink Cabinet",
    description: "Cabinet base shows water damage.",
    severity: FINDING_SEVERITIES.MEDIUM,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.CABINET_REPLACEMENT],
  },
  {
    id: FINDING_IDS.MOLD_PRESENT,
    category: FINDING_CATEGORIES.MOLD,
    title: "Mold Present",
    description: "Visible mold or suspected microbial growth was discovered.",
    severity: FINDING_SEVERITIES.HIGH,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.MOLD_REMEDIATION],
  },
  {
    id: FINDING_IDS.OUTLET_NOT_FUNCTIONING,
    category: FINDING_CATEGORIES.ELECTRICAL_ISSUE,
    title: "Outlet Not Functioning",
    description: "Electrical outlet failed during evaluation.",
    severity: FINDING_SEVERITIES.MEDIUM,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.ELECTRICAL_REPAIR],
  },
  {
    id: FINDING_IDS.BACKSPLASH_REPLACEMENT_NEEDED,
    category: FINDING_CATEGORIES.COSMETIC_ISSUE,
    title: "Backsplash Replacement Needed",
    description: "Backsplash needs replacement or tile installation.",
    severity: FINDING_SEVERITIES.LOW,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.TILE_INSTALLATION],
  },
  {
    id: FINDING_IDS.PLUMBING_LEAK,
    category: FINDING_CATEGORIES.PLUMBING_ISSUE,
    title: "Plumbing Leak",
    description: "Leak evidence was found during evaluation.",
    severity: FINDING_SEVERITIES.HIGH,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.PLUMBING_REPAIR],
  },
  {
    id: FINDING_IDS.STRUCTURAL_MOVEMENT,
    category: FINDING_CATEGORIES.STRUCTURAL_ISSUE,
    title: "Structural Movement",
    description: "Movement, sagging, or structural concern requires review.",
    severity: FINDING_SEVERITIES.HIGH,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.STRUCTURAL_REVIEW],
  },
  {
    id: FINDING_IDS.COSMETIC_WALL_DAMAGE,
    category: FINDING_CATEGORIES.COSMETIC_ISSUE,
    title: "Cosmetic Wall Damage",
    description: "Cosmetic wall damage was observed.",
    severity: FINDING_SEVERITIES.LOW,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.COSMETIC_REPAIR],
  },
  {
    id: FINDING_IDS.SAFETY_HAZARD,
    category: FINDING_CATEGORIES.SAFETY_ISSUE,
    title: "Safety Hazard",
    description: "Safety risk should be corrected before normal work proceeds.",
    severity: FINDING_SEVERITIES.CRITICAL,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.SAFETY_REPAIR],
  },
  {
    id: FINDING_IDS.ACCESS_RESTRICTION,
    category: FINDING_CATEGORIES.ACCESS_ISSUE,
    title: "Access Restriction",
    description: "Access limits affect evaluation or execution.",
    severity: FINDING_SEVERITIES.MEDIUM,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.ACCESS_COORDINATION],
  },
  {
    id: FINDING_IDS.MEASUREMENT_REQUIRED,
    category: FINDING_CATEGORIES.MEASUREMENT,
    title: "Measurement Required",
    description: "Measurements are required before recommendation or proposal.",
    severity: FINDING_SEVERITIES.LOW,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.MEASUREMENT_CAPTURE],
  },
  {
    id: FINDING_IDS.RECOMMENDED_NEXT_STEP,
    category: FINDING_CATEGORIES.RECOMMENDATION,
    title: "Recommended Next Step",
    description: "Professional recommendation captured during evaluation.",
    severity: FINDING_SEVERITIES.UNKNOWN,
    recommendedServices: [SERVICE_RECOMMENDATION_IDS.GENERAL_RECOMMENDATION],
  },
]);

export function getFindingDefinition(findingId) {
  const definition = FINDING_REGISTRY[normalizeRegistryKey(findingId)];
  return definition ? cloneValue(definition) : null;
}

export function getServiceRecommendationDefinition(serviceId) {
  const definition =
    SERVICE_RECOMMENDATION_REGISTRY[normalizeRegistryKey(serviceId)];
  return definition ? cloneValue(definition) : null;
}

export function getFindings(filters = {}) {
  const category = normalizeRegistryKey(filters.category);

  return Object.values(FINDING_REGISTRY)
    .filter((finding) => !category || finding.category === category)
    .map(cloneValue);
}

export function getServiceRecommendations(filters = {}) {
  const category = normalizeRegistryKey(filters.category);

  return Object.values(SERVICE_RECOMMENDATION_REGISTRY)
    .filter((service) => !category || service.category === category)
    .map(cloneValue);
}

export function createFinding(input = {}) {
  const source = isRecord(input) ? input : {};
  const findingId = normalizeRegistryKey(
    source.findingId || source.findingType || source.registryId || source.id
  );
  const definition = getFindingDefinition(findingId);

  if (!definition) {
    return {
      ok: false,
      finding: null,
      errors: [
        createIssue(
          "unknown-finding",
          "Finding is not registered in the Findings Engine registry.",
          "findingId"
        ),
      ],
    };
  }

  const recommendedServices = Array.isArray(source.recommendedServices)
    ? source.recommendedServices.map(normalizeRegistryKey).filter(Boolean)
    : definition.recommendedServices;

  const missingServices = recommendedServices.filter(
    (serviceId) => !SERVICE_RECOMMENDATION_REGISTRY[serviceId]
  );

  if (missingServices.length > 0) {
    return {
      ok: false,
      finding: null,
      errors: missingServices.map((serviceId) =>
        createIssue(
          "unknown-recommended-service",
          "Recommended service is not registered.",
          `recommendedServices.${serviceId}`
        )
      ),
    };
  }

  return {
    ok: true,
    finding: {
      ...definition,
      id: source.id || definition.id,
      findingType: definition.id,
      customerId: source.customerId || "",
      evaluationId: source.evaluationId || "",
      requestId: source.requestId || "",
      description: source.description || definition.description,
      severity: normalizeRegistryKey(source.severity) || definition.severity,
      recommendedServices,
      evidenceRefs: Array.isArray(source.evidenceRefs)
        ? source.evidenceRefs.map(cloneValue)
        : [],
      metadata: isRecord(source.metadata) ? cloneValue(source.metadata) : {},
    },
    errors: [],
  };
}

export function createEvaluationFindingsRecord(input = {}) {
  const source = isRecord(input) ? input : {};
  const evaluationId = source.evaluationId || source.id || "";
  const customerId = source.customerId || "";
  const findingsInput = Array.isArray(source.findings) ? source.findings : [];
  const createdFindings = findingsInput.map((finding) =>
    createFinding({
      ...finding,
      customerId: finding.customerId || customerId,
      evaluationId: finding.evaluationId || evaluationId,
      requestId: finding.requestId || source.requestId || "",
    })
  );
  const errors = createdFindings.flatMap((result) => result.errors);
  const findings = createdFindings
    .filter((result) => result.ok)
    .map((result) => result.finding);
  const serviceRecommendations = [
    ...new Set(findings.flatMap((finding) => finding.recommendedServices)),
  ].map((serviceId) => getServiceRecommendationDefinition(serviceId));

  return {
    ok: errors.length === 0,
    evaluationId,
    customerId,
    requestId: source.requestId || "",
    findings,
    serviceRecommendations,
    errors,
  };
}

export function normalizeEvaluationFindingsPayload(input = {}) {
  const source = isRecord(input) ? input : {};
  const findingsRecord = createEvaluationFindingsRecord({
    evaluationId: source.evaluationId || source.id || "",
    customerId: source.customerId || "",
    requestId: source.requestId || "",
    findings: Array.isArray(source.findings) ? source.findings : [],
  });

  return {
    findings: findingsRecord.findings,
    serviceRecommendations: findingsRecord.serviceRecommendations,
    errors: findingsRecord.errors,
    ok: findingsRecord.ok,
  };
}

export function validateEvaluationFindingsScope(evaluations = []) {
  const records = Array.isArray(evaluations) ? evaluations : [];
  const errors = [];

  records.forEach((evaluation, evaluationIndex) => {
    const evaluationCustomerId = evaluation.customerId || "";
    const findings = Array.isArray(evaluation.findings)
      ? evaluation.findings
      : [];

    findings.forEach((finding, findingIndex) => {
      if (!hasValue(finding.customerId)) {
        errors.push(
          createIssue(
            "missing-finding-customer",
            "Finding must retain customer scope.",
            `evaluations.${evaluationIndex}.findings.${findingIndex}.customerId`
          )
        );
        return;
      }

      if (
        hasValue(evaluationCustomerId) &&
        finding.customerId !== evaluationCustomerId
      ) {
        errors.push(
          createIssue(
            "finding-customer-scope-mismatch",
            "Finding customer scope does not match the evaluation customer.",
            `evaluations.${evaluationIndex}.findings.${findingIndex}.customerId`
          )
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getFindingsEngineReport() {
  return {
    model: [
      "relationship",
      "request",
      "evaluation",
      "finding",
      "service",
      "proposal",
      "execution",
      "completion",
      "history",
    ],
    findingCategories: Object.values(FINDING_CATEGORIES),
    findingCount: Object.keys(FINDING_REGISTRY).length,
    serviceRecommendationCount: Object.keys(SERVICE_RECOMMENDATION_REGISTRY)
      .length,
  };
}
