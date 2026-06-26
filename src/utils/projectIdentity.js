// Compatibility layer for legacy client records. The backend should
// eventually provide one canonical projectId across every workflow source.

const IDENTITY_FIELDS = [
  { field: "projectId", aliases: ["project_id"] },
  { field: "requestId", aliases: ["request_id"] },
  { field: "jobId", aliases: [] },
  { field: "quoteRequestId", aliases: [] },
  { field: "conversationId", aliases: [] },
  { field: "emergencyId", aliases: ["emergencyRequestId"] },
  { field: "postId", aliases: [] },
  { field: "id", aliases: [] },
];

function hasIdentityValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function readIdentityValue(record, fields) {
  if (!record || typeof record !== "object") return undefined;

  for (const field of fields) {
    if (hasIdentityValue(record[field])) {
      return { value: record[field], source: field };
    }
  }

  if (record.project && typeof record.project === "object") {
    for (const field of fields) {
      if (hasIdentityValue(record.project[field])) {
        return { value: record.project[field], source: field };
      }
    }
  }

  return undefined;
}

function createWarning(code, message, identitySource = "") {
  return { code, message, identitySource };
}

export function getProjectIdentity(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      projectId: "",
      identitySource: "",
      warnings: [
        createWarning(
          "invalid-project-record",
          "Project identity requires a record object."
        ),
      ],
    };
  }

  for (const identityField of IDENTITY_FIELDS) {
    const match = readIdentityValue(record, [
      identityField.field,
      ...identityField.aliases,
    ]);

    if (!match) continue;

    const warnings =
      identityField.field === "id"
        ? [
            createWarning(
              "generic-id-fallback",
              "Project identity uses generic id because no more specific workflow identifier exists.",
              match.source
            ),
          ]
        : [];

    return {
      projectId: String(match.value),
      identitySource: match.source,
      warnings,
    };
  }

  const hasTitleOrName =
    hasIdentityValue(record.title) ||
    hasIdentityValue(record.name) ||
    hasIdentityValue(record.project?.title) ||
    hasIdentityValue(record.project?.name);

  return {
    projectId: "",
    identitySource: "",
    warnings: [
      createWarning(
        hasTitleOrName ? "title-only-project-identity" : "missing-project-id",
        hasTitleOrName
          ? "Only title or name is available; no project identity was inferred."
          : "No supported project identity field is available."
      ),
    ],
  };
}

export function getCanonicalProjectId(record) {
  return getProjectIdentity(record).projectId;
}

export function getIdentityWarnings(record) {
  return getProjectIdentity(record).warnings;
}

export function attachProjectIdentity(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }

  const identity = getProjectIdentity(record);

  return {
    ...record,
    projectId: identity.projectId,
    projectIdentity: {
      identitySource: identity.identitySource,
      warnings: identity.warnings.map((warning) => ({ ...warning })),
    },
  };
}

export function normalizeProjectCollection(records) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => attachProjectIdentity(record));
}

export function isSameProject(a, b) {
  const firstId = getCanonicalProjectId(a);
  const secondId = getCanonicalProjectId(b);

  return Boolean(firstId && secondId && firstId === secondId);
}
