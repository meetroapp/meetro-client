export const HOMEOWNER_REQUEST_MODIFICATION_MODE = Object.freeze({
  EDITABLE: "EDITABLE",
  APPEND_ONLY: "APPEND_ONLY",
  CONTRACT_CHANGE_REQUIRED: "CONTRACT_CHANGE_REQUIRED",
  READ_ONLY: "READ_ONLY",
});

export const HOMEOWNER_REQUEST_MODIFICATION_ENTRY = Object.freeze({
  EDIT_REQUEST: "EDIT_REQUEST",
  APPEND_INFORMATION: "APPEND_INFORMATION",
  CONTRACT_CHANGE_UNAVAILABLE: "CONTRACT_CHANGE_UNAVAILABLE",
  READ_ONLY: "READ_ONLY",
  UNAVAILABLE: "UNAVAILABLE",
});

const MODES = new Set(Object.values(HOMEOWNER_REQUEST_MODIFICATION_MODE));

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function stableIdentifier(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function normalizeHomeownerRequestModificationAuthority(payload = {}) {
  const source = payload?.lifecycle?.modificationAuthority;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  const mode = String(source.mode || "").trim().toUpperCase();
  if (!MODES.has(mode)) return null;

  const actions = source.actions;
  if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
    return null;
  }

  const reliance = source.reliance;
  return {
    authoritySource: "CANONICAL_BACKEND_READ",
    mode,
    requestVersion: positiveInteger(source.requestVersion),
    lifecycleContractVersion: positiveInteger(
      source.lifecycleContractVersion
    ),
    concernId: stableIdentifier(source.concernId),
    jobId: stableIdentifier(source.jobId),
    reliance:
      reliance && typeof reliance === "object" && !Array.isArray(reliance)
        ? {
            professionalResponseExists:
              reliance.professionalResponseExists === true,
            requestRelationshipExists:
              reliance.requestRelationshipExists === true,
            selectionExists: reliance.selectionExists === true,
            jobExists: reliance.jobExists === true,
            activeWorkExists: reliance.activeWorkExists === true,
          }
        : null,
    actions: {
      editRequest: actions.editRequest === true,
      appendUpdate: actions.appendUpdate === true,
      appendPhoto: actions.appendPhoto === true,
      contractChangeGuidance:
        actions.contractChangeGuidance === true,
      readOnly: actions.readOnly === true,
    },
  };
}

export function getHomeownerRequestModificationActions(authority) {
  if (!authority) {
    return {
      editRequest: false,
      addUpdate: false,
      addPhotos: false,
      contractChangeGuidance: false,
      readOnly: true,
    };
  }

  return {
    editRequest:
      authority.actions.editRequest === true &&
      Boolean(authority.requestVersion),
    addUpdate:
      authority.actions.appendUpdate === true &&
      Boolean(authority.concernId),
    addPhotos:
      authority.actions.appendPhoto === true &&
      Boolean(authority.concernId) &&
      Boolean(authority.requestVersion),
    contractChangeGuidance:
      authority.actions.contractChangeGuidance === true,
    readOnly: authority.actions.readOnly === true,
  };
}

export function getHomeownerRequestModificationEntry(authority) {
  if (!authority) {
    return {
      kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.UNAVAILABLE,
      actionable: false,
      route: null,
    };
  }

  const actions = getHomeownerRequestModificationActions(authority);
  if (
    authority.mode === HOMEOWNER_REQUEST_MODIFICATION_MODE.EDITABLE &&
    actions.editRequest
  ) {
    return {
      kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.EDIT_REQUEST,
      actionable: true,
      route: "homeownerRequestDetails",
    };
  }

  if (
    authority.mode === HOMEOWNER_REQUEST_MODIFICATION_MODE.APPEND_ONLY &&
    (actions.addUpdate || actions.addPhotos)
  ) {
    return {
      kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.APPEND_INFORMATION,
      actionable: true,
      route: "homeownerRequestDetails",
    };
  }

  if (
    authority.mode ===
    HOMEOWNER_REQUEST_MODIFICATION_MODE.CONTRACT_CHANGE_REQUIRED
  ) {
    return {
      kind:
        HOMEOWNER_REQUEST_MODIFICATION_ENTRY.CONTRACT_CHANGE_UNAVAILABLE,
      actionable: false,
      route: null,
    };
  }

  return {
    kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.READ_ONLY,
    actionable: false,
    route: null,
  };
}
