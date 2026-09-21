const EXISTING_CUSTOMER_REQUEST_ORIGIN =
  "existing_customer_request";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function normalizeUuid(value) {
  const normalized =
    text(value).toLowerCase();

  return UUID_PATTERN.test(normalized)
    ? normalized
    : null;
}

function routeParams(hash = "") {
  const value = String(hash || "");
  const queryIndex = value.indexOf("?");

  if (queryIndex < 0) {
    return new URLSearchParams();
  }

  return new URLSearchParams(
    value.slice(queryIndex + 1)
  );
}

export function buildExistingCustomerRequestRoute({
  meetroRelationshipId,
  businessName = "",
} = {}) {
  const relationshipId =
    normalizeUuid(meetroRelationshipId);

  if (!relationshipId) {
    throw new Error(
      "A valid prior Meetro relationship is required."
    );
  }

  const params = new URLSearchParams({
    requestOrigin:
      EXISTING_CUSTOMER_REQUEST_ORIGIN,
    sourceMeetroRelationshipId:
      relationshipId,
  });

  const displayName =
    text(businessName);

  if (displayName) {
    params.set(
      "professionalName",
      displayName.slice(0, 160)
    );
  }

  return `upload?${params.toString()}`;
}

export function readExistingCustomerRequestRoute(
  hash =
    globalThis.location?.hash ||
    ""
) {
  const params =
    routeParams(hash);

  const requestOrigin =
    text(
      params.get("requestOrigin")
    ).toLowerCase();

  if (
    requestOrigin !==
    EXISTING_CUSTOMER_REQUEST_ORIGIN
  ) {
    return Object.freeze({
      active: false,
      valid: true,
      requestOrigin: "",
      meetroRelationshipId: null,
      professionalName: "",
    });
  }

  const meetroRelationshipId =
    normalizeUuid(
      params.get(
        "sourceMeetroRelationshipId"
      )
    );

  return Object.freeze({
    active: true,
    valid: Boolean(
      meetroRelationshipId
    ),
    requestOrigin:
      EXISTING_CUSTOMER_REQUEST_ORIGIN,
    meetroRelationshipId,
    professionalName:
      text(
        params.get("professionalName")
      ).slice(0, 160),
  });
}

export function applyExistingCustomerRequestAuthority(
  payload = {},
  routeState = {}
) {
  const body = {
    ...(payload || {}),
  };

  // Never allow retired direct-request or client-selected
  // target identities to become authority.
  delete body.direct_request;
  delete body.direct_request_source;
  delete body.direct_professional_name;
  delete body.direct_conversation_id;
  delete body.target_contractor_profile_id;
  delete body.target_professional_user_id;

  // Authority is always recalculated from the current route,
  // never trusted from a persisted draft snapshot.
  delete body.request_origin;
  delete body.source_meetro_relationship_id;

  if (!routeState?.active) {
    return body;
  }

  const relationshipId =
    normalizeUuid(
      routeState.meetroRelationshipId
    );

  if (
    routeState.valid !== true ||
    !relationshipId
  ) {
    throw new Error(
      "The existing customer relationship could not be verified."
    );
  }

  body.request_origin =
    EXISTING_CUSTOMER_REQUEST_ORIGIN;

  body.source_meetro_relationship_id =
    relationshipId;

  return body;
}
