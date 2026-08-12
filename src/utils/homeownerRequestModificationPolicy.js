export const HOMEOWNER_REQUEST_MODIFICATION_MODE = Object.freeze({
  EDITABLE: "EDITABLE",
  APPEND_ONLY: "APPEND_ONLY",
  CONTRACT_CHANGE_REQUIRED: "CONTRACT_CHANGE_REQUIRED",
  READ_ONLY: "READ_ONLY",
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
