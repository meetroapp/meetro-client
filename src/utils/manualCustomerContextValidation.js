import {
  MANUAL_CUSTOMER_ACCOUNT_LINK_STATUSES,
  MANUAL_CUSTOMER_CONSENT_STATUSES,
  MANUAL_CUSTOMER_CONTACT_TYPES,
  MANUAL_CUSTOMER_REQUIRED_FIELDS,
  MANUAL_CUSTOMER_TYPES,
  MANUAL_PROJECT_REQUIRED_FIELDS,
  createManualCustomerContext,
  createManualProjectContext,
} from "./manualCustomerContextContract.js";

export const MANUAL_CUSTOMER_CONTEXT_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

export const MANUAL_CUSTOMER_PROVENANCE_QUALITY = Object.freeze({
  HIGH: "HIGH",
  PARTIAL: "PARTIAL",
  LOW: "LOW",
});

const CUSTOMER_TYPES = new Set(MANUAL_CUSTOMER_TYPES);
const ACCOUNT_LINK_STATUSES = new Set(
  MANUAL_CUSTOMER_ACCOUNT_LINK_STATUSES
);
const CONSENT_STATUSES = new Set(MANUAL_CUSTOMER_CONSENT_STATUSES);
const CONTACT_TYPES = new Set(MANUAL_CUSTOMER_CONTACT_TYPES);

const CUSTOMER_PROVENANCE_AUTHORITIES = Object.freeze({
  manualCustomerId: new Set(["customer-onboarding"]),
  owningBusinessId: new Set([
    "business-membership",
    "customer-onboarding",
  ]),
  createdByUserId: new Set(["authentication-context"]),
  source: new Set(["customer-onboarding"]),
  createdAt: new Set(["customer-persistence"]),
});

const PROJECT_PROVENANCE_AUTHORITIES = Object.freeze({
  projectId: new Set(["project-aggregate"]),
  manualCustomerId: new Set([
    "customer-onboarding",
    "project-membership",
  ]),
  professionalUserId: new Set(["authentication-context"]),
  createdAt: new Set(["project-persistence"]),
});

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function stringValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function normalizeToken(value) {
  return stringValue(value).toLowerCase().replaceAll("-", "_");
}

function normalizeEmail(value) {
  return stringValue(value).toLowerCase();
}

function normalizePhone(value) {
  return stringValue(value).replace(/\D/g, "");
}

function isTimestamp(value) {
  if (!hasValue(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function createFinding(code, field, message) {
  return { code, field, message };
}

function addMissingFields(record, fields, missingFields, blockers, prefix) {
  fields.forEach((field) => {
    if (hasValue(record[field])) return;
    const path = prefix ? `${prefix}.${field}` : field;
    missingFields.push(path);
    blockers.push(
      createFinding(
        `missing-${field}`,
        path,
        `${path} is required.`
      )
    );
  });
}

function readProvenance(context, field) {
  const metadata = isRecord(context.metadata) ? context.metadata : {};
  const provenance = isRecord(metadata.provenance)
    ? metadata.provenance[field]
    : undefined;

  if (typeof provenance === "string") {
    return { authority: provenance };
  }
  return isRecord(provenance) ? provenance : {};
}

function validateProvenance(context, authorities) {
  const fields = Object.keys(authorities);
  const fieldTrust = {};

  fields.forEach((field) => {
    const provenance = readProvenance(context, field);
    const authority = stringValue(provenance.authority).toLowerCase();

    if (!hasValue(context[field])) {
      fieldTrust[field] = {
        trust: "MISSING",
        authority: "",
      };
      return;
    }

    if (!authority) {
      fieldTrust[field] = {
        trust: "UNVERIFIED",
        authority: "",
      };
      return;
    }

    fieldTrust[field] = {
      trust: authorities[field].has(authority)
        ? "AUTHORITATIVE"
        : "UNVERIFIED",
      authority,
    };
  });

  const trusts = Object.values(fieldTrust).map((entry) => entry.trust);
  const authoritativeCount = trusts.filter(
    (trust) => trust === "AUTHORITATIVE"
  ).length;
  const quality =
    authoritativeCount === trusts.length
      ? MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH
      : authoritativeCount > 0
        ? MANUAL_CUSTOMER_PROVENANCE_QUALITY.PARTIAL
        : MANUAL_CUSTOMER_PROVENANCE_QUALITY.LOW;

  return { quality, fieldTrust };
}

function getRiskLevel(blockers, warnings, provenance) {
  if (blockers.length > 0) return MANUAL_CUSTOMER_CONTEXT_RISK.HIGH;
  if (
    warnings.length > 0 ||
    provenance.quality !== MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH
  ) {
    return MANUAL_CUSTOMER_CONTEXT_RISK.MEDIUM;
  }
  return MANUAL_CUSTOMER_CONTEXT_RISK.LOW;
}

function collectContactMatches(customer, candidate) {
  const matches = [];
  const customerMethods = customer.contactMethods.filter(isRecord);
  const candidateMethods = Array.isArray(candidate.contactMethods)
    ? candidate.contactMethods.filter(isRecord)
    : [];

  customerMethods.forEach((method) => {
    const type = normalizeToken(method.type);
    if (!["email", "phone", "sms"].includes(type)) return;

    const normalized =
      type === "email"
        ? normalizeEmail(method.value)
        : normalizePhone(method.value);
    if (!normalized) return;

    const matched = candidateMethods.some((candidateMethod) => {
      const candidateType = normalizeToken(candidateMethod.type);
      if (candidateType !== type) return false;
      const candidateValue =
        type === "email"
          ? normalizeEmail(candidateMethod.value)
          : normalizePhone(candidateMethod.value);
      return candidateValue === normalized;
    });

    if (matched) matches.push(type);
  });

  return [...new Set(matches)].sort();
}

function findDuplicateSignals(customer, candidates) {
  if (!Array.isArray(candidates)) return [];

  return candidates
    .filter(isRecord)
    .map((candidate) => {
      const matches = collectContactMatches(customer, candidate);
      const sameDisplayName =
        normalizeToken(customer.displayName) !== "" &&
        normalizeToken(customer.displayName) ===
          normalizeToken(candidate.displayName);

      if (matches.length === 0 && !sameDisplayName) return null;

      return {
        candidateManualCustomerId: stringValue(
          candidate.manualCustomerId
        ),
        matches: [
          ...matches.map((type) => `${type}-match`),
          ...(sameDisplayName ? ["display-name-match"] : []),
        ],
        autoMerge: false,
        reviewRequired: matches.length > 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const left = `${a.candidateManualCustomerId}|${a.matches.join(",")}`;
      const right = `${b.candidateManualCustomerId}|${b.matches.join(",")}`;
      return left.localeCompare(right);
    });
}

function validateContactAndConsent(customer, missingFields, blockers, warnings) {
  const actionableMethods = [];

  customer.contactMethods.forEach((method, index) => {
    const path = `customer.contactMethods[${index}]`;

    if (!isRecord(method)) {
      blockers.push(
        createFinding(
          "invalid-contact-method",
          path,
          "Contact methods must be records."
        )
      );
      return;
    }

    const type = normalizeToken(method.type);
    if (!CONTACT_TYPES.has(type)) {
      blockers.push(
        createFinding(
          "unsupported-contact-type",
          `${path}.type`,
          "Contact method type is unsupported."
        )
      );
    }

    if (!hasValue(method.value)) {
      blockers.push(
        createFinding(
          "missing-contact-value",
          `${path}.value`,
          "Contact method value is required."
        )
      );
    }

    if (method.actionable !== false && hasValue(method.value)) {
      actionableMethods.push(method);
    }
  });

  if (actionableMethods.length === 0) return;

  const consent = isRecord(customer.consent) ? customer.consent : {};
  ["status", "recordedAt", "source"].forEach((field) => {
    if (hasValue(consent[field])) return;
    const path = `customer.consent.${field}`;
    missingFields.push(path);
    blockers.push(
      createFinding(
        `missing-consent-${field}`,
        path,
        `Consent ${field} is required for actionable contact.`
      )
    );
  });

  const consentStatus = normalizeToken(consent.status);
  if (consentStatus && !CONSENT_STATUSES.has(consentStatus)) {
    blockers.push(
      createFinding(
        "unsupported-consent-status",
        "customer.consent.status",
        "Consent status is unsupported."
      )
    );
  } else if (consentStatus && consentStatus !== "granted") {
    blockers.push(
      createFinding(
        "actionable-contact-not-consented",
        "customer.consent.status",
        "Actionable contact requires granted consent evidence."
      )
    );
  }

  if (hasValue(consent.recordedAt) && !isTimestamp(consent.recordedAt)) {
    blockers.push(
      createFinding(
        "invalid-consent-recorded-at",
        "customer.consent.recordedAt",
        "Consent recordedAt must be a valid timestamp."
      )
    );
  }

  if (
    actionableMethods.length > 0 &&
    actionableMethods.every(
      (method) => normalizeToken(method.type) === "in_person"
    )
  ) {
    warnings.push(
      createFinding(
        "in-person-consent-policy-review",
        "customer.consent",
        "The product policy for actionable in-person contact still requires review."
      )
    );
  }
}

function validateAccountLink(customer, blockers) {
  const status = normalizeToken(customer.accountLinkStatus);

  if (status && !ACCOUNT_LINK_STATUSES.has(status)) {
    blockers.push(
      createFinding(
        "unsupported-account-link-status",
        "customer.accountLinkStatus",
        "Account link status is unsupported."
      )
    );
  }

  if (status === "linked" && !hasValue(customer.linkedUserId)) {
    blockers.push(
      createFinding(
        "linked-user-id-required",
        "customer.linkedUserId",
        "A linked account requires an explicit linkedUserId."
      )
    );
  }

  if (status !== "linked" && hasValue(customer.linkedUserId)) {
    blockers.push(
      createFinding(
        "linked-user-status-conflict",
        "customer.accountLinkStatus",
        "linkedUserId may only be present when accountLinkStatus is linked."
      )
    );
  }

  if (
    hasValue(customer.linkedUserId) &&
    customer.linkedUserId === customer.manualCustomerId
  ) {
    blockers.push(
      createFinding(
        "linked-user-customer-identity-conflict",
        "customer.linkedUserId",
        "Registered user identity must remain distinct from Manual Customer identity."
      )
    );
  }
}

export function validateManualCustomerContext(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const rawCustomer = Object.prototype.hasOwnProperty.call(
    safeInput,
    "customer"
  )
    ? safeInput.customer
    : safeInput;
  const customer = createManualCustomerContext(rawCustomer);
  const missingFields = [];
  const blockers = [];
  const warnings = [];

  addMissingFields(
    customer,
    MANUAL_CUSTOMER_REQUIRED_FIELDS,
    missingFields,
    blockers,
    "customer"
  );

  if (
    hasValue(customer.customerType) &&
    !CUSTOMER_TYPES.has(normalizeToken(customer.customerType))
  ) {
    blockers.push(
      createFinding(
        "unsupported-customer-type",
        "customer.customerType",
        "customerType must identify a manual or external customer."
      )
    );
  }

  if (hasValue(customer.createdAt) && !isTimestamp(customer.createdAt)) {
    blockers.push(
      createFinding(
        "invalid-customer-created-at",
        "customer.createdAt",
        "Customer createdAt must be a valid timestamp."
      )
    );
  }

  validateContactAndConsent(customer, missingFields, blockers, warnings);
  validateAccountLink(customer, blockers);

  const provenance = validateProvenance(
    customer,
    CUSTOMER_PROVENANCE_AUTHORITIES
  );
  if (provenance.quality !== MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH) {
    warnings.push(
      createFinding(
        "customer-provenance-incomplete",
        "customer.metadata.provenance",
        "Customer identity provenance is not fully authoritative."
      )
    );
  }

  const duplicateSignals = findDuplicateSignals(
    customer,
    safeInput.candidateCustomers
  );

  return {
    valid: blockers.length === 0,
    riskLevel: getRiskLevel(blockers, warnings, provenance),
    missingFields,
    warnings,
    blockers,
    provenance,
    duplicateSignals,
  };
}

export function validateManualProjectContext(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const rawProject = Object.prototype.hasOwnProperty.call(
    safeInput,
    "project"
  )
    ? safeInput.project
    : safeInput;
  const project = createManualProjectContext(rawProject);
  const missingFields = [];
  const blockers = [];
  const warnings = [];

  addMissingFields(
    project,
    MANUAL_PROJECT_REQUIRED_FIELDS,
    missingFields,
    blockers,
    "project"
  );

  if (
    hasValue(project.projectId) &&
    project.projectId === project.manualCustomerId
  ) {
    blockers.push(
      createFinding(
        "customer-project-identity-conflict",
        "project.projectId",
        "projectId must remain distinct from manualCustomerId."
      )
    );
  }

  if (
    hasValue(project.professionalUserId) &&
    project.professionalUserId === project.projectId
  ) {
    blockers.push(
      createFinding(
        "professional-project-identity-conflict",
        "project.professionalUserId",
        "Professional user identity must remain distinct from project identity."
      )
    );
  }

  if (hasValue(project.createdAt) && !isTimestamp(project.createdAt)) {
    blockers.push(
      createFinding(
        "invalid-project-created-at",
        "project.createdAt",
        "Project createdAt must be a valid timestamp."
      )
    );
  }

  const provenance = validateProvenance(
    project,
    PROJECT_PROVENANCE_AUTHORITIES
  );
  if (provenance.quality !== MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH) {
    warnings.push(
      createFinding(
        "project-provenance-incomplete",
        "project.metadata.provenance",
        "Project identity provenance is not fully authoritative."
      )
    );
  }

  return {
    valid: blockers.length === 0,
    riskLevel: getRiskLevel(blockers, warnings, provenance),
    missingFields,
    warnings,
    blockers,
    provenance,
    duplicateSignals: [],
  };
}

export function validateManualCustomerProjectContext(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const customerResult = validateManualCustomerContext({
    customer: safeInput.customer,
    candidateCustomers: safeInput.candidateCustomers,
  });
  const projectResult = validateManualProjectContext({
    project: safeInput.project,
  });
  const customer = createManualCustomerContext(safeInput.customer);
  const project = createManualProjectContext(safeInput.project);
  const blockers = [
    ...customerResult.blockers,
    ...projectResult.blockers,
  ];
  const warnings = [
    ...customerResult.warnings,
    ...projectResult.warnings,
  ];

  if (
    hasValue(customer.manualCustomerId) &&
    hasValue(project.manualCustomerId) &&
    customer.manualCustomerId !== project.manualCustomerId
  ) {
    blockers.push(
      createFinding(
        "project-customer-membership-conflict",
        "project.manualCustomerId",
        "Project participation must reference the supplied Manual Customer."
      )
    );
  }

  const provenance = {
    quality:
      customerResult.provenance.quality ===
        MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH &&
      projectResult.provenance.quality ===
        MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH
        ? MANUAL_CUSTOMER_PROVENANCE_QUALITY.HIGH
        : customerResult.provenance.quality ===
              MANUAL_CUSTOMER_PROVENANCE_QUALITY.LOW ||
            projectResult.provenance.quality ===
              MANUAL_CUSTOMER_PROVENANCE_QUALITY.LOW
          ? MANUAL_CUSTOMER_PROVENANCE_QUALITY.LOW
          : MANUAL_CUSTOMER_PROVENANCE_QUALITY.PARTIAL,
    customer: customerResult.provenance,
    project: projectResult.provenance,
  };

  return {
    valid: blockers.length === 0,
    riskLevel: getRiskLevel(blockers, warnings, provenance),
    missingFields: [
      ...new Set([
        ...customerResult.missingFields,
        ...projectResult.missingFields,
      ]),
    ],
    warnings,
    blockers,
    provenance,
    duplicateSignals: customerResult.duplicateSignals,
  };
}
