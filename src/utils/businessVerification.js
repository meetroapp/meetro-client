function firstValue(...values) {
  return (
    values.find(
      (value) => value !== undefined && value !== null && String(value).trim() !== ""
    ) || ""
  );
}

function defaultTranslate(key) {
  return (
    {
      verifiedBusiness: "Verified Business",
      verified: "Verified",
      notVerified: "Not verified",
      businessVerifiedTrustSummary: "Business verification is active.",
      businessVerificationPendingSummary:
        "Business verification is not completed yet.",
      credentialsProvided: "Credentials provided",
      credentialsPending: "Credentials pending",
      businessInformation: "Business Information",
      businessVerification: "Business Verification",
      credentials: "Credentials",
      reviews: "Reviews",
    }[key] || key
  );
}

function toBoolean(value) {
  if (value === true) return true;
  if (typeof value === "string") {
    return ["true", "verified", "active", "yes", "ready"].includes(
      value.trim().toLowerCase()
    );
  }
  return false;
}

function readStorageValue(storage, key) {
  try {
    return storage?.getItem?.(key) || "";
  } catch {
    return "";
  }
}

export function getBusinessVerificationProjection(source = {}, options = {}) {
  const translate = options.translate || defaultTranslate;
  const storage = options.storage || null;
  const businessName = firstValue(
    source.businessName,
    source.business_name,
    source.displayName,
    source.name
  );
  const hasIdentity = Boolean(businessName);
  const businessVerified = Boolean(
    toBoolean(source.verified) ||
      toBoolean(source.is_verified) ||
      toBoolean(source.isVerified) ||
      toBoolean(source.business_verified) ||
      toBoolean(source.businessVerified) ||
      toBoolean(source.verificationStatus) ||
      toBoolean(readStorageValue(storage, "businessVerified"))
  );
  const credentialsProvided = Boolean(
    source.licensedInsured ||
      source.licensed_insured ||
      source.license ||
      source.licenseNumber ||
      source.license_number ||
      source.insurance ||
      source.insured
  );
  const reviewCount = Number(
    source.reviewCount ||
      source.totalReviews ||
      source.total_reviews ||
      source.reviewsCount ||
      source.reviews_count ||
      0
  );
  const hasReputation = reviewCount > 0 || Number(source.rating || source.averageRating || 0) > 0;
  const status = businessVerified ? "verified" : "not_verified";
  const verificationLabel = businessVerified
    ? translate("verifiedBusiness")
    : translate("notVerified");
  const compactBadgeText = businessVerified
    ? translate("verified")
    : translate("notVerified");
  const publicTrustSummary = businessVerified
    ? translate("businessVerifiedTrustSummary")
    : translate("businessVerificationPendingSummary");
  const credentialsLabel = credentialsProvided
    ? translate("credentialsProvided")
    : translate("credentialsPending");

  return {
    status,
    verified: businessVerified,
    verificationLabel,
    badgeText: verificationLabel,
    compactBadgeText,
    publicTrustSummary,
    missingSetupLabel: businessVerified ? "" : translate("businessVerificationPendingSummary"),
    credentialsProvided,
    credentialsLabel,
    reviewCount,
    hasReputation,
    layers: {
      identity: {
        complete: hasIdentity,
        label: translate("businessInformation"),
      },
      business: {
        complete: businessVerified,
        label: translate("businessVerification"),
      },
      credentials: {
        complete: credentialsProvided,
        label: translate("credentials"),
      },
      reputation: {
        complete: hasReputation,
        label: translate("reviews"),
      },
    },
  };
}
