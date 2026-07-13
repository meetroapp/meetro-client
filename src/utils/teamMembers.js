import { HIRING_TEAM_MEMBERS } from "../data/hiringData.js";

const STORE_PREFIX = "meetroTeamMembers";

export const TEAM_MEMBER_STATUSES = Object.freeze([
  "pending",
  "active",
  "inactive",
  "archived",
]);

export const TEAM_MEMBER_TYPES = Object.freeze([
  "employee",
  "contractor",
  "seasonal",
  "volunteer",
  "other",
]);

function text(value) {
  return String(value ?? "").trim();
}

function keyPart(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "unscoped";
}

function safeStorage(options = {}) {
  if (options.storage) return options.storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readArray(storage, key) {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray(storage, key, records) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function clone(record) {
  if (!record) return null;
  return {
    ...record,
    emergencyContact:
      record.emergencyContact && typeof record.emergencyContact === "object"
        ? { ...record.emergencyContact }
        : record.emergencyContact || "",
  };
}

function normalizeStatus(value) {
  const status = text(value).toLowerCase();
  return TEAM_MEMBER_STATUSES.includes(status) ? status : "pending";
}

function normalizeMemberType(value) {
  const memberType = text(value).toLowerCase();
  return TEAM_MEMBER_TYPES.includes(memberType) ? memberType : "employee";
}

export function getActiveTeamBusinessId(options = {}) {
  const storage = safeStorage(options);
  try {
    return text(
      options.businessId ||
        storage?.getItem?.("businessId") ||
        storage?.getItem?.("contractorId") ||
        "local-business"
    );
  } catch {
    return text(options.businessId || "local-business");
  }
}

export function getTeamMemberStorageKey(options = {}) {
  return `${STORE_PREFIX}:${keyPart(getActiveTeamBusinessId(options))}`;
}

export function normalizeTeamMember(record = {}, options = {}) {
  const now = text(options.now) || new Date().toISOString();
  const positionTitle = text(
    record.positionTitle || record.position_title || record.position || record.jobTitle
  );

  return {
    id: text(record.id || record.memberId || record.employeeId),
    businessId: text(record.businessId || record.business_id || record.contractorId),
    memberType: normalizeMemberType(record.memberType || record.member_type || record.employmentType),
    status: normalizeStatus(record.status || (record.active === false ? "inactive" : "active")),
    displayName: text(record.displayName || record.display_name || record.name || record.employeeName),
    email: text(record.email),
    phone: text(record.phone || record.phoneNumber),
    positionId: text(record.positionId || record.position_id),
    positionTitle,
    hireDate: text(record.hireDate || record.hire_date || record.startDate),
    notes: text(record.notes),
    avatar: text(record.avatar || record.imageUrl || record.image_url),
    role: text(record.role || positionTitle),
    emergencyContact:
      record.emergencyContact && typeof record.emergencyContact === "object"
        ? { ...record.emergencyContact }
        : text(record.emergencyContact),
    employeeNumber: text(record.employeeNumber || record.employee_number),
    sourceApplicantId: text(record.sourceApplicantId || record.applicantId),
    sourceInterviewId: text(record.sourceInterviewId || record.interviewId),
    hiringDecision: text(record.hiringDecision || record.hiring_decision),
    createdAt: text(record.createdAt || record.created_at) || now,
    updatedAt: text(record.updatedAt || record.updated_at) || now,
  };
}

function fixtureMembersForBusiness(businessId) {
  return HIRING_TEAM_MEMBERS
    .map((record) => normalizeTeamMember(record))
    .filter((record) => record.businessId === businessId);
}

export function listTeamMembers(options = {}) {
  const storage = safeStorage(options);
  const businessId = getActiveTeamBusinessId(options);
  if (!businessId || businessId === "unscoped") return [];

  const stored = readArray(storage, getTeamMemberStorageKey({ ...options, businessId }))
    .map((record) => normalizeTeamMember(record))
    .filter((record) => record.id && record.businessId === businessId);
  const byId = new Map(stored.map((record) => [record.id, record]));
  fixtureMembersForBusiness(businessId).forEach((record) => {
    if (record.id && !byId.has(record.id)) byId.set(record.id, record);
  });
  const status = text(options.status).toLowerCase();
  return [...byId.values()]
    .filter((record) => !status || record.status === status)
    .map(clone);
}

export function getTeamMember(memberId, options = {}) {
  const id = text(memberId);
  return listTeamMembers(options).find((record) => record.id === id) || null;
}

export function getActiveTeamMemberCount(options = {}) {
  return listTeamMembers({ ...options, status: "active" }).length;
}

export function validateTeamMemberDraft(draft = {}, options = {}) {
  const storage = safeStorage(options);
  const businessId = getActiveTeamBusinessId(options);
  let storedMode = "";
  try {
    storedMode = text(storage?.getItem?.("activeAccountMode"));
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  const accountMode = text(options.accountMode || storedMode);
  const errors = {};

  if (accountMode !== "business") errors.accountMode = "business_account_required";
  if (!businessId || businessId === "unscoped") errors.businessId = "business_required";
  if (text(draft.businessId) && text(draft.businessId) !== businessId) {
    errors.businessId = "cross_business_member";
  }
  if (!text(draft.displayName || draft.name)) errors.displayName = "required";
  if (!text(draft.positionTitle || draft.position)) errors.positionTitle = "required";
  const requestedStatus = text(draft.status).toLowerCase();
  if (requestedStatus && !TEAM_MEMBER_STATUSES.includes(requestedStatus)) {
    errors.status = "invalid";
  }

  return { valid: Object.keys(errors).length === 0, errors, businessId };
}

function generatedId(options = {}) {
  if (typeof options.idFactory === "function") return text(options.idFactory());
  if (globalThis.crypto?.randomUUID) return `team-member-${globalThis.crypto.randomUUID()}`;
  return `team-member-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function duplicateMember(records, draft) {
  const applicantId = text(draft.sourceApplicantId || draft.applicantId);
  const email = text(draft.email).toLowerCase();
  return records.find((record) =>
    (applicantId && record.sourceApplicantId === applicantId) ||
    (email && record.email.toLowerCase() === email && record.status !== "archived")
  );
}

function persist(records, options = {}) {
  const storage = safeStorage(options);
  const businessId = getActiveTeamBusinessId(options);
  const safeRecords = records
    .map((record) => normalizeTeamMember(record))
    .filter((record) => record.id && record.businessId === businessId);
  writeArray(storage, getTeamMemberStorageKey({ ...options, businessId }), safeRecords);
  return safeRecords.map(clone);
}

export function projectTeamMemberNotification(member, event) {
  const record = normalizeTeamMember(member);
  const eventTypes = {
    created: "team_member_created",
    archived: "team_member_archived",
    reactivated: "team_member_reactivated",
  };
  const type = eventTypes[event];
  if (!type || !record.id || !record.businessId) return null;

  return {
    id: `${type}:${record.id}`,
    type,
    title:
      event === "created"
        ? "New Team Member"
        : event === "archived"
        ? "Member Archived"
        : "Member Reactivated",
    message: record.displayName,
    role: "professional",
    targetRole: "professional",
    dedupeKey: `${type}:${record.businessId}:${record.id}`,
    metadata: {
      memberId: record.id,
      businessId: record.businessId,
    },
  };
}

function notify(member, event, options = {}) {
  if (typeof options.onNotification !== "function") return;
  const notification = projectTeamMemberNotification(member, event);
  if (notification) options.onNotification(notification);
}

export function createTeamMember(draft = {}, options = {}) {
  const validation = validateTeamMemberDraft(draft, options);
  if (!validation.valid) {
    return { ok: false, created: false, errors: validation.errors, member: null };
  }

  const existing = listTeamMembers({ ...options, businessId: validation.businessId });
  const duplicate = duplicateMember(existing, draft);
  if (duplicate) {
    return { ok: true, created: false, errors: {}, member: clone(duplicate) };
  }

  const now = text(options.now) || new Date().toISOString();
  const member = normalizeTeamMember(
    {
      ...draft,
      id: text(draft.id) || generatedId(options),
      businessId: validation.businessId,
      status: draft.status || "active",
      createdAt: now,
      updatedAt: now,
    },
    { now }
  );
  persist([member, ...existing], { ...options, businessId: validation.businessId });
  notify(member, "created", options);
  return { ok: true, created: true, errors: {}, member: clone(member) };
}

export function updateTeamMember(memberId, changes = {}, options = {}) {
  const businessId = getActiveTeamBusinessId(options);
  const existing = listTeamMembers({ ...options, businessId });
  const current = existing.find((record) => record.id === text(memberId));
  if (!current) return { ok: false, errors: { memberId: "not_found" }, member: null };
  if (text(changes.businessId) && text(changes.businessId) !== businessId) {
    return { ok: false, errors: { businessId: "cross_business_member" }, member: null };
  }

  const candidate = {
    ...current,
    ...changes,
    id: current.id,
    businessId: current.businessId,
    createdAt: current.createdAt,
    updatedAt: text(options.now) || new Date().toISOString(),
  };
  const validation = validateTeamMemberDraft(candidate, { ...options, businessId });
  if (!validation.valid) return { ok: false, errors: validation.errors, member: null };
  const member = normalizeTeamMember(candidate);
  persist([member, ...existing.filter((record) => record.id !== member.id)], {
    ...options,
    businessId,
  });
  return { ok: true, errors: {}, member: clone(member) };
}

function transitionTeamMember(memberId, status, event, options = {}) {
  const result = updateTeamMember(memberId, { status }, options);
  if (result.ok && event) notify(result.member, event, options);
  return result;
}

export function deactivateTeamMember(memberId, options = {}) {
  return transitionTeamMember(memberId, "inactive", "", options);
}

export function archiveTeamMember(memberId, options = {}) {
  return transitionTeamMember(memberId, "archived", "archived", options);
}

export function reactivateTeamMember(memberId, options = {}) {
  return transitionTeamMember(memberId, "active", "reactivated", options);
}
