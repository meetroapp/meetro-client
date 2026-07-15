// Phase 1 read selectors only. These functions must not write storage or
// mutate stored records. Future owners are noted at each selector boundary.

import { getProjectIdentity } from "./projectIdentity.js";
import {
  createQuoteProjectionFromRequest,
  createScheduleProjectionFromRequest,
  hasRequestQuoteProjection,
  hasRequestSchedule,
  isRequestConnectedToProfessional,
  isRequestClosedForProfessionalProjection,
  isRequestProfessionalWork,
} from "./professionalLifecycleProjection.js";
import { recoverRequestRelationships } from "./requestRelationshipRecovery.js";
import { canReadLegacyWorkflowStorage } from "./clientWorkflowStoragePolicy.js";

export const WORK_CENTER_READ_CONTRACTS = Object.freeze([
  {
    domain: "scheduling",
    owner: "Scheduling",
    consumer: "Work Center",
    selectorName: "getScheduleItems",
    legacySources: ["meetro_business_schedule"],
  },
  {
    domain: "quotes",
    owner: "Quotes",
    consumer: "Work Center",
    selectorName: "getQuoteItems",
    legacySources: [
      "workCenterQuoteHistory",
      "meetroQuoteHistory",
      "quoteHistory",
    ],
  },
  {
    domain: "work",
    owner: "Work",
    consumer: "Work Center",
    selectorName: "getActiveWorkItems",
    legacySources: [
      "activeWorkKeys",
      "activeJobKeys",
      "selectedActiveProject",
      "homeownerRequests",
      "activeEmergencyRecord",
    ],
  },
  {
    domain: "completion",
    owner: "Completion",
    consumer: "Work Center",
    selectorName: "getCompletedWorkItems",
    legacySources: [
      "meetro_business_schedule",
      "completedProjects",
      "homeownerRequests",
    ],
  },
  {
    domain: "timeline",
    owner: "Timeline",
    consumer: "Work Center",
    selectorName: "getTimelineEvents",
    legacySources: [
      "meetroWorkflowTimeline",
      "projectTimeline",
      "homeownerRequests[].projectTimeline",
      "meetro_job_record_*",
    ],
  },
]);

const ACTIVE_REQUEST_STATUSES = new Set([
  "accepted",
  "scheduled",
  "work_scheduled",
  "scheduled_work",
  "on_the_way",
  "enroute",
  "arrived",
  "active",
  "in_progress",
  "working",
  "started",
  "needs_resolution",
]);
const COMPLETED_STATUSES = new Set(["completed", "closed", "closure_completed", "history"]);
const ACTIVE_EMERGENCY_STATUSES = new Set([
  "accepted",
  "enroute",
  "arrived",
  "started",
]);

function getStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readValue(key) {
  if (!canReadLegacyWorkflowStorage()) return null;
  return getStorage()?.getItem(key) ?? null;
}

function readJson(key, fallback) {
  try {
    const value = readValue(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readArray(key) {
  const value = readJson(key, []);
  return Array.isArray(value) ? value : [];
}

function getRequestKey(request = {}) {
  return String(
    request.requestId ||
      request.id ||
      [request.title, request.createdAt].filter(Boolean).join("::")
  );
}

function readHomeownerRequestsSnapshot() {
  if (!canReadLegacyWorkflowStorage()) return [];
  const primary = readArray("homeownerRequests");
  const backup = readArray("meetroHomeownerRequestsBackup");
  if (backup.length === 0) {
    return recoverRequestRelationships(primary, { storage: getStorage() }).requests;
  }

  const merged = [...primary];
  const seen = new Set(primary.map(getRequestKey).filter(Boolean));

  backup.forEach((request) => {
    const key = getRequestKey(request);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(request);
  });

  return recoverRequestRelationships(merged, { storage: getStorage() }).requests;
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function createWarning(code, message, source) {
  return { code, message, source };
}

function withSelectorMeta(record, source, options = {}) {
  const identityRecord = options.ignoreGenericId
    ? { ...record, id: undefined }
    : record;
  const identity = getProjectIdentity(identityRecord);

  return {
    ...record,
    projectId: identity.projectId,
    normalizedStatus: normalizeStatus(record?.status || record?.quoteStatus),
    selectorMeta: {
      source,
      projectIdSource: identity.identitySource,
      warnings: identity.warnings.map((warning) => ({
        ...warning,
        source,
      })),
    },
  };
}

function collectWarnings(items) {
  return items.flatMap((item) => item?.selectorMeta?.warnings || []);
}

function hasValues(record) {
  return Object.values(record).some(
    (value) => value !== "" && value !== null && value !== undefined
  );
}

// Future owner: Scheduling. Work Center should consume this projection.
export function getScheduleItems() {
  const storedItems = readArray("meetro_business_schedule").map((item) =>
    withSelectorMeta(item, "meetro_business_schedule")
  );
  const storedRequestKeys = new Set(
    storedItems
      .flatMap((item) => [item.requestId, item.id, item.scheduleId])
      .filter(Boolean)
      .map(String)
  );
  const requestItems = readHomeownerRequestsSnapshot()
    .filter((request) => isRequestConnectedToProfessional(request))
    .filter(hasRequestSchedule)
    .filter((request) => {
      const requestId = getRequestKey(request);
      return !requestId || !storedRequestKeys.has(String(requestId));
    })
    .map((request) =>
      withSelectorMeta(
        createScheduleProjectionFromRequest(request),
        "homeownerRequests"
      )
    );

  return [...storedItems, ...requestItems];
}

function getSafeScheduleIdentity(schedule) {
  return getProjectIdentity({
    projectId: schedule?.projectId,
    requestId: schedule?.requestId,
    title: schedule?.title,
    name: schedule?.name,
  });
}

function getScheduleReconciliationItems() {
  return readArray("meetro_business_schedule").map((schedule) => {
    const identity = getSafeScheduleIdentity(schedule);
    const scheduleId =
      schedule?.id === undefined || schedule?.id === null
        ? ""
        : String(schedule.id).trim();
    const warnings = identity.warnings.map((warning) => ({
      ...warning,
      source: "meetro_business_schedule",
      scheduleId,
    }));

    if (!scheduleId) {
      warnings.push(
        createWarning(
          "missing-schedule-id",
          "Schedule record has no stable schedule id.",
          "meetro_business_schedule"
        )
      );
    }

    return {
      ...schedule,
      scheduleId,
      projectId: identity.projectId,
      selectorMeta: {
        source: "meetro_business_schedule",
        projectIdSource: identity.identitySource,
        warnings,
      },
    };
  });
}

export function getScheduleProjectLinks() {
  return readArray("meetroProjectLinks")
    .filter((link) => link?.commandType === "linkScheduleToProject")
    .map((link) => {
      const identity = getProjectIdentity({ projectId: link?.projectId });
      const scheduleId =
        link?.scheduleId === undefined || link?.scheduleId === null
          ? ""
          : String(link.scheduleId).trim();
      const warnings = identity.warnings.map((warning) => ({
        ...warning,
        source: "meetroProjectLinks",
        commandId: link?.commandId || "",
      }));

      if (!scheduleId) {
        warnings.push(
          createWarning(
            "missing-linked-schedule-id",
            "Schedule link has no scheduleId.",
            "meetroProjectLinks"
          )
        );
      }

      return {
        ...link,
        projectId: identity.projectId,
        scheduleId,
        metadata:
          link?.metadata &&
          typeof link.metadata === "object" &&
          !Array.isArray(link.metadata)
            ? { ...link.metadata }
            : {},
        selectorMeta: {
          source: "meetroProjectLinks",
          projectIdSource: identity.identitySource,
          warnings,
        },
      };
    });
}

function getLatestScheduleLinkById() {
  const latestLinks = new Map();

  getScheduleProjectLinks().forEach((link, index) => {
    if (!link.scheduleId) return;

    const previous = latestLinks.get(link.scheduleId);
    const linkTime = new Date(link.createdAt || 0).getTime();
    const previousTime = new Date(previous?.createdAt || 0).getTime();

    if (
      !previous ||
      linkTime > previousTime ||
      (linkTime === previousTime && index > previous.index)
    ) {
      latestLinks.set(link.scheduleId, { ...link, index });
    }
  });

  return new Map(
    [...latestLinks].map(([scheduleId, link]) => {
      const { index: _index, ...normalizedLink } = link;
      return [scheduleId, normalizedLink];
    })
  );
}

export function getScheduleLinkIdentityWarnings() {
  const schedules = getScheduleReconciliationItems();
  const links = getScheduleProjectLinks();
  const latestLinks = getLatestScheduleLinkById();
  const scheduleIds = new Set(
    schedules.map((schedule) => schedule.scheduleId).filter(Boolean)
  );
  const warnings = [
    ...schedules
      .filter(
        (schedule) =>
          !schedule.scheduleId || !latestLinks.has(schedule.scheduleId)
      )
      .flatMap((schedule) => schedule.selectorMeta.warnings),
    ...links.flatMap((link) => link.selectorMeta.warnings),
  ];

  latestLinks.forEach((link, scheduleId) => {
    if (!scheduleIds.has(scheduleId)) {
      warnings.push(
        createWarning(
          "orphan-schedule-link",
          "Schedule link does not match a current schedule record.",
          "meetroProjectLinks"
        )
      );
    }
  });

  const linksBySchedule = links.reduce((groups, link) => {
    if (!link.scheduleId || !link.projectId) return groups;
    if (!groups.has(link.scheduleId)) groups.set(link.scheduleId, new Set());
    groups.get(link.scheduleId).add(link.projectId);
    return groups;
  }, new Map());

  linksBySchedule.forEach((projectIds) => {
    if (projectIds.size > 1) {
      warnings.push(
        createWarning(
          "conflicting-schedule-project-links",
          "Schedule has been linked to more than one projectId.",
          "meetroProjectLinks"
        )
      );
    }
  });

  const reasonCounts = warnings.reduce((counts, warning) => {
    const code = warning.code || "unknown-schedule-link-warning";
    counts[code] = (counts[code] || 0) + 1;
    return counts;
  }, {});

  return {
    warningCount: warnings.length,
    reasonCounts,
    warnings: warnings.map((warning) => ({ ...warning })),
  };
}

export function getScheduleLinkCoverageByProject() {
  const schedules = getScheduleReconciliationItems();
  const latestLinks = getLatestScheduleLinkById();
  const projectIds = new Set();

  schedules.forEach((schedule) => {
    const linkedProjectId = latestLinks.get(schedule.scheduleId)?.projectId;
    const projectId = linkedProjectId || schedule.projectId;
    if (projectId) projectIds.add(projectId);
  });

  return [...projectIds]
    .map((projectId) => {
      const projectSchedules = schedules.filter((schedule) => {
        const linkedProjectId = latestLinks.get(schedule.scheduleId)?.projectId;
        return (linkedProjectId || schedule.projectId) === projectId;
      });
      const linkedScheduleCount = projectSchedules.filter(
        (schedule) =>
          schedule.scheduleId &&
          latestLinks.get(schedule.scheduleId)?.projectId === projectId
      ).length;

      return {
        projectId,
        scheduleCount: projectSchedules.length,
        linkedScheduleCount,
        missingLinkCount: projectSchedules.length - linkedScheduleCount,
        coveragePercentage:
          projectSchedules.length > 0
            ? Math.round(
                (linkedScheduleCount / projectSchedules.length) * 10000
              ) / 100
            : 0,
      };
    })
    .sort((a, b) => a.projectId.localeCompare(b.projectId));
}

export function getScheduleLinkReconciliationReport() {
  const schedules = getScheduleReconciliationItems();
  const links = getScheduleProjectLinks();
  const latestLinks = getLatestScheduleLinkById();
  const linkedSchedules = schedules.filter(
    (schedule) =>
      schedule.scheduleId &&
      latestLinks.get(schedule.scheduleId)?.projectId
  );
  const missingLinkSchedules = schedules.filter(
    (schedule) =>
      !schedule.scheduleId ||
      !latestLinks.get(schedule.scheduleId)?.projectId
  );
  const skippedUnsafeIdentitySchedules = missingLinkSchedules.filter(
    (schedule) => !schedule.projectId
  );
  const safeIdentityMissingLinkSchedules = missingLinkSchedules.filter(
    (schedule) => schedule.projectId
  );
  const scheduleIds = new Set(
    schedules.map((schedule) => schedule.scheduleId).filter(Boolean)
  );
  const orphanLinks = [...latestLinks.values()].filter(
    (link) => link.projectId && !scheduleIds.has(link.scheduleId)
  );
  const uniqueLinkedScheduleCount = [...latestLinks.values()].filter(
    (link) => link.projectId
  ).length;
  const coveragePercentage =
    schedules.length > 0
      ? Math.round((linkedSchedules.length / schedules.length) * 10000) / 100
      : 0;

  return {
    scheduleCount: schedules.length,
    scheduleLinkCommandCount: links.length,
    uniqueLinkedScheduleCount,
    linkedScheduleCount: linkedSchedules.length,
    missingLinkCount: missingLinkSchedules.length,
    skippedUnsafeIdentityCount: skippedUnsafeIdentitySchedules.length,
    safeIdentityMissingLinkCount: safeIdentityMissingLinkSchedules.length,
    orphanLinkCount: orphanLinks.length,
    coveragePercentage,
    fullyReconciled: schedules.length === linkedSchedules.length,
    coverageByProject: getScheduleLinkCoverageByProject(),
    identityWarnings: getScheduleLinkIdentityWarnings(),
    skippedUnsafeIdentitySchedules,
    safeIdentityMissingLinkSchedules,
    orphanLinks,
  };
}

// Future owner: Quotes. Legacy fallback keys remain read-only compatibility
// sources and use the same precedence as current quote readers.
export function getQuoteItems() {
  const primary = readArray("workCenterQuoteHistory");
  const meetroHistory = readArray("meetroQuoteHistory");
  const legacyHistory = readArray("quoteHistory");
  const quotes =
    primary.length > 0
      ? primary
      : meetroHistory.length > 0
      ? meetroHistory
      : legacyHistory;
  const source =
    primary.length > 0
      ? "workCenterQuoteHistory"
      : meetroHistory.length > 0
      ? "meetroQuoteHistory"
      : "quoteHistory";

  const storedItems = quotes.map((quote) => withSelectorMeta(quote, source));
  const storedRequestKeys = new Set(
    storedItems
      .flatMap((item) => [item.requestId, item.id, item.quoteId])
      .filter(Boolean)
      .map(String)
  );
  const requestQuoteItems = readHomeownerRequestsSnapshot()
    .filter((request) => isRequestConnectedToProfessional(request))
    .filter(hasRequestQuoteProjection)
    .filter((request) => {
      const requestId = getRequestKey(request);
      return !requestId || !storedRequestKeys.has(String(requestId));
    })
    .map((request) =>
      withSelectorMeta(
        createQuoteProjectionFromRequest(request),
        "homeownerRequests"
      )
    );

  return [...storedItems, ...requestQuoteItems];
}

function getQuoteReconciliationItems() {
  const primary = readArray("workCenterQuoteHistory");
  const meetroHistory = readArray("meetroQuoteHistory");
  const legacyHistory = readArray("quoteHistory");
  const quotes =
    primary.length > 0
      ? primary
      : meetroHistory.length > 0
      ? meetroHistory
      : legacyHistory;
  const source =
    primary.length > 0
      ? "workCenterQuoteHistory"
      : meetroHistory.length > 0
      ? "meetroQuoteHistory"
      : "quoteHistory";

  return quotes.map((quote) => {
    const identity = getProjectIdentity({
      projectId: quote?.projectId,
      requestId: quote?.requestId,
      title: quote?.projectTitle || quote?.title,
      name: quote?.name,
    });
    const quoteId =
      quote?.quoteId === undefined || quote?.quoteId === null
        ? ""
        : String(quote.quoteId).trim();
    const warnings = identity.warnings.map((warning) => ({
      ...warning,
      source,
      quoteId,
    }));

    if (!quoteId) {
      warnings.push(
        createWarning(
          "missing-quote-id",
          "Quote record has no stable quoteId.",
          source
        )
      );
    }

    return {
      ...quote,
      quoteId,
      projectId: identity.projectId,
      selectorMeta: {
        source,
        projectIdSource: identity.identitySource,
        warnings,
      },
    };
  });
}

export function getQuoteProjectLinks() {
  return readArray("meetroProjectLinks")
    .filter((link) => link?.commandType === "linkQuoteToProject")
    .map((link) => {
      const identity = getProjectIdentity({ projectId: link?.projectId });
      const quoteId =
        link?.quoteId === undefined || link?.quoteId === null
          ? ""
          : String(link.quoteId).trim();
      const quoteRequestId =
        link?.quoteRequestId === undefined || link?.quoteRequestId === null
          ? ""
          : String(link.quoteRequestId).trim();
      const warnings = identity.warnings.map((warning) => ({
        ...warning,
        source: "meetroProjectLinks",
        commandId: link?.commandId || "",
      }));

      if (!quoteId) {
        warnings.push(
          createWarning(
            "missing-linked-quote-id",
            "Quote link has no quoteId.",
            "meetroProjectLinks"
          )
        );
      }

      return {
        ...link,
        projectId: identity.projectId,
        quoteId,
        quoteRequestId,
        metadata:
          link?.metadata &&
          typeof link.metadata === "object" &&
          !Array.isArray(link.metadata)
            ? { ...link.metadata }
            : {},
        selectorMeta: {
          source: "meetroProjectLinks",
          projectIdSource: identity.identitySource,
          warnings,
        },
      };
    });
}

function getLatestQuoteLinkById() {
  const latestLinks = new Map();

  getQuoteProjectLinks().forEach((link, index) => {
    if (!link.quoteId) return;

    const previous = latestLinks.get(link.quoteId);
    const linkTime = new Date(link.createdAt || 0).getTime();
    const previousTime = new Date(previous?.createdAt || 0).getTime();

    if (
      !previous ||
      linkTime > previousTime ||
      (linkTime === previousTime && index > previous.index)
    ) {
      latestLinks.set(link.quoteId, { ...link, index });
    }
  });

  return new Map(
    [...latestLinks].map(([quoteId, link]) => {
      const { index: _index, ...normalizedLink } = link;
      return [quoteId, normalizedLink];
    })
  );
}

export function getQuoteLinkIdentityWarnings() {
  const quotes = getQuoteReconciliationItems();
  const links = getQuoteProjectLinks();
  const latestLinks = getLatestQuoteLinkById();
  const quoteIds = new Set(
    quotes.map((quote) => quote.quoteId).filter(Boolean)
  );
  const warnings = [
    ...quotes
      .filter((quote) => !quote.quoteId || !latestLinks.has(quote.quoteId))
      .flatMap((quote) => quote.selectorMeta.warnings),
    ...links.flatMap((link) => link.selectorMeta.warnings),
  ];

  latestLinks.forEach((link, quoteId) => {
    if (link.projectId && !quoteIds.has(quoteId)) {
      warnings.push(
        createWarning(
          "orphan-quote-link",
          "Quote link does not match a current quote record.",
          "meetroProjectLinks"
        )
      );
    }
  });

  const linksByQuote = links.reduce((groups, link) => {
    if (!link.quoteId || !link.projectId) return groups;
    if (!groups.has(link.quoteId)) groups.set(link.quoteId, new Set());
    groups.get(link.quoteId).add(link.projectId);
    return groups;
  }, new Map());

  linksByQuote.forEach((projectIds) => {
    if (projectIds.size > 1) {
      warnings.push(
        createWarning(
          "conflicting-quote-project-links",
          "Quote has been linked to more than one projectId.",
          "meetroProjectLinks"
        )
      );
    }
  });

  const reasonCounts = warnings.reduce((counts, warning) => {
    const code = warning.code || "unknown-quote-link-warning";
    counts[code] = (counts[code] || 0) + 1;
    return counts;
  }, {});

  return {
    warningCount: warnings.length,
    reasonCounts,
    warnings: warnings.map((warning) => ({ ...warning })),
  };
}

export function getQuoteLinkCoverageByProject() {
  const quotes = getQuoteReconciliationItems();
  const latestLinks = getLatestQuoteLinkById();
  const projectIds = new Set();

  quotes.forEach((quote) => {
    const linkedProjectId = latestLinks.get(quote.quoteId)?.projectId;
    const projectId = linkedProjectId || quote.projectId;
    if (projectId) projectIds.add(projectId);
  });

  return [...projectIds]
    .map((projectId) => {
      const projectQuotes = quotes.filter((quote) => {
        const linkedProjectId = latestLinks.get(quote.quoteId)?.projectId;
        return (linkedProjectId || quote.projectId) === projectId;
      });
      const linkedQuoteCount = projectQuotes.filter(
        (quote) =>
          quote.quoteId &&
          latestLinks.get(quote.quoteId)?.projectId === projectId
      ).length;

      return {
        projectId,
        quoteCount: projectQuotes.length,
        linkedQuoteCount,
        missingLinkCount: projectQuotes.length - linkedQuoteCount,
        coveragePercentage:
          projectQuotes.length > 0
            ? Math.round(
                (linkedQuoteCount / projectQuotes.length) * 10000
              ) / 100
            : 0,
      };
    })
    .sort((a, b) => a.projectId.localeCompare(b.projectId));
}

export function getQuoteLinkReconciliationReport() {
  const quotes = getQuoteReconciliationItems();
  const links = getQuoteProjectLinks();
  const latestLinks = getLatestQuoteLinkById();
  const linkedQuotes = quotes.filter(
    (quote) =>
      quote.quoteId &&
      latestLinks.get(quote.quoteId)?.projectId
  );
  const missingLinkQuotes = quotes.filter(
    (quote) =>
      !quote.quoteId ||
      !latestLinks.get(quote.quoteId)?.projectId
  );
  const skippedUnsafeIdentityQuotes = missingLinkQuotes.filter(
    (quote) => !quote.projectId
  );
  const safeIdentityMissingLinkQuotes = missingLinkQuotes.filter(
    (quote) => quote.projectId
  );
  const quoteIds = new Set(
    quotes.map((quote) => quote.quoteId).filter(Boolean)
  );
  const orphanLinks = [...latestLinks.values()].filter(
    (link) => link.projectId && !quoteIds.has(link.quoteId)
  );
  const uniqueLinkedQuoteCount = [...latestLinks.values()].filter(
    (link) => link.projectId
  ).length;
  const coveragePercentage =
    quotes.length > 0
      ? Math.round((linkedQuotes.length / quotes.length) * 10000) / 100
      : 0;

  return {
    quoteCount: quotes.length,
    quoteLinkCommandCount: links.length,
    uniqueLinkedQuoteCount,
    linkedQuoteCount: linkedQuotes.length,
    missingLinkCount: missingLinkQuotes.length,
    skippedUnsafeIdentityCount: skippedUnsafeIdentityQuotes.length,
    safeIdentityMissingLinkCount: safeIdentityMissingLinkQuotes.length,
    orphanLinkCount: orphanLinks.length,
    coveragePercentage,
    fullyReconciled: quotes.length === linkedQuotes.length,
    coverageByProject: getQuoteLinkCoverageByProject(),
    identityWarnings: getQuoteLinkIdentityWarnings(),
    skippedUnsafeIdentityQuotes,
    safeIdentityMissingLinkQuotes,
    orphanLinks,
  };
}

function getActiveWorkSnapshot() {
  return {
    id:
      readValue("activeWorkRequestId") ||
      readValue("activeWorkQuoteId") ||
      readValue("activeWorkConversationId") ||
      "",
    requestId: readValue("activeWorkRequestId") || "",
    quoteId: readValue("activeWorkQuoteId") || "",
    conversationId: readValue("activeWorkConversationId") || "",
    scheduleId: readValue("activeWorkScheduleId") || "",
    status: readValue("activeWorkStatus") || "",
    stage: readValue("activeWorkStage") || "",
    pauseReason: readValue("activeWorkPauseReason") || "",
    service: readValue("activeWorkService") || "",
    location: readValue("activeWorkLocation") || "",
    type: readValue("activeWorkType") || "",
    source: readValue("activeWorkSource") || "",
  };
}

function getActiveJobSnapshot() {
  const jobId = readValue("activeJobId") || "";

  return {
    id: jobId,
    jobId,
    conversationId: readValue("activeConversationId") || "",
    status: readValue("activeJobStatus") || "",
    service:
      readValue("activeJobService") ||
      readValue("activeWorkService") ||
      "",
    customer: readValue("activeJobCustomer") || "",
    eta: readValue("activeJobEta") || "",
    location:
      readValue("activeJobLocation") ||
      readValue("activeCustomerLocation") ||
      readValue("projectLocation") ||
      "",
  };
}

// Future owner: Work. Sources remain separate so Phase 2 can reconcile them
// without hiding collisions or silently merging records by title.
export function getActiveWorkItems() {
  const items = [];
  const activeWork = getActiveWorkSnapshot();
  const activeJob = getActiveJobSnapshot();
  const selectedProject = readJson("selectedActiveProject", null);
  const emergency = readJson("activeEmergencyRecord", null);

  if (hasValues(activeWork)) {
    items.push(withSelectorMeta(activeWork, "activeWorkKeys"));
  }

  if (hasValues(activeJob)) {
    const normalized = withSelectorMeta(activeJob, "activeJobKeys");

    if (!normalized.projectId) {
      normalized.selectorMeta.warnings.push(
        createWarning(
          "job-id-is-not-project-id",
          "activeJobId was preserved as a job id and was not promoted to projectId.",
          "activeJobKeys"
        )
      );
    }

    items.push(normalized);
  }

  if (selectedProject) {
    const project = selectedProject.project || selectedProject;
    items.push(
      withSelectorMeta(
        {
          ...project,
          selectedProjectStatus:
            selectedProject.status || project.status || "",
        },
        "selectedActiveProject"
      )
    );
  }

  readHomeownerRequestsSnapshot()
    .filter((request) => {
      const status = normalizeStatus(request?.status);
      return (
        isRequestConnectedToProfessional(request) &&
        (ACTIVE_REQUEST_STATUSES.has(status) ||
          isRequestProfessionalWork(request))
      );
    })
    .filter((request) => !isRequestClosedForProfessionalProjection(request))
    .forEach((request) => {
      items.push(
        withSelectorMeta(request, "homeownerRequests")
      );
    });

  if (
    emergency &&
    ACTIVE_EMERGENCY_STATUSES.has(
      normalizeStatus(
        emergency.status || readValue("emergencyDispatchStatus")
      )
    )
  ) {
    items.push(
      withSelectorMeta(
        {
          ...emergency,
          status:
            emergency.status || readValue("emergencyDispatchStatus") || "",
          requestId:
            emergency.requestId ||
            emergency.emergencyRequestId ||
            emergency.id ||
            "",
        },
        "activeEmergencyRecord"
      )
    );
  }

  return items;
}

function getCompletedScheduleItems() {
  return getScheduleItems()
    .filter((item) => normalizeStatus(item.status) === "completed")
    .map((item) =>
      withSelectorMeta(
        {
          ...item,
          title: item.title,
          customer: item.customer || item.location || "Customer",
          revenue: item.revenue || item.amount || 0,
          completedAt: item.completedAt || "",
          source: "schedule",
        },
        "meetro_business_schedule"
      )
    );
}

// Future owner: Completion. Ordering and legacy deduplication intentionally
// mirror the current Work Center completed-history read.
export function getCompletedWorkItems() {
  const scheduleItems = getCompletedScheduleItems();
  const savedItems = readArray("completedProjects").map((item) =>
    withSelectorMeta(item, "completedProjects")
  );
  const savedIds = new Set(
    savedItems
      .map((item) => item.requestId || item.id)
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
  const scheduleIds = new Set(
    scheduleItems
      .flatMap((item) => [item.requestId, item.id, item.scheduleId])
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
  const homeownerItems = readHomeownerRequestsSnapshot()
    .filter((project) =>
      COMPLETED_STATUSES.has(normalizeStatus(project?.status))
    )
    .filter((project) => {
      const id = project.requestId || project.id;
      return (
        id === undefined ||
        id === null ||
        (!savedIds.has(String(id)) && !scheduleIds.has(String(id)))
      );
    })
    .map((project) =>
      withSelectorMeta(
        {
          ...project,
          revenue:
            project.revenue ||
            project.acceptedQuote?.amount ||
            project.quoteAmount ||
            0,
          source: "homeownerProject",
        },
        "homeownerRequests"
      )
    );

  return [...scheduleItems, ...savedItems, ...homeownerItems];
}

function getJobRecordEvents() {
  const storage = getStorage();
  if (!storage) return [];

  return Object.keys(storage)
    .filter((key) => key.startsWith("meetro_job_record_"))
    .flatMap((key) => {
      const conversationId = key.replace("meetro_job_record_", "");

      return readArray(key).map((event) => ({
        ...event,
        conversationId: event.conversationId || conversationId,
        timelineSource: key,
      }));
    });
}

function getRequestTimelineEvents() {
  return readHomeownerRequestsSnapshot().flatMap((request) => {
    const events = Array.isArray(request.projectTimeline)
      ? request.projectTimeline
      : [];
    const identity = getProjectIdentity(request);

    return events.map((event) => ({
      ...event,
      projectId: event.projectId || identity.projectId,
      requestId: event.requestId || request.requestId || request.id || "",
      timelineSource: "homeownerRequests.projectTimeline",
    }));
  });
}

function getTimelineKey(event, index) {
  return (
    event.eventId ||
    event.id ||
    [
      event.timelineSource,
      event.type,
      event.createdAt || event.savedAt || "",
      index,
    ].join(":")
  );
}

function getReconciliationEventKey(event) {
  const explicitKey = event?.eventId || event?.id;
  if (explicitKey) return String(explicitKey);

  const {
    timelineSource: _timelineSource,
    selectorMeta: _selectorMeta,
    reconciliationEventKey: _reconciliationEventKey,
    ...comparableEvent
  } = event || {};

  return `event-fingerprint:${JSON.stringify(comparableEvent)}`;
}

function getLegacyIdentity(event) {
  return getProjectIdentity({
    projectId: event?.projectId,
    requestId: event?.requestId,
    title: event?.title,
    name: event?.name,
  });
}

// Shadow timeline commands are append-only bridge records. The command-level
// projectId is authoritative because the embedded legacy event may not carry it.
export function getShadowTimelineEvents() {
  return readArray("meetroProjectTimelineEvents").map((command) => {
    const event =
      command?.event && typeof command.event === "object"
        ? { ...command.event }
        : {};
    const identity = getProjectIdentity({ projectId: command?.projectId });

    return {
      ...event,
      projectId: identity.projectId,
      shadowCommandId: command?.commandId || "",
      shadowCommandType: command?.commandType || "",
      shadowCreatedAt: command?.createdAt || "",
      timelineSource: "meetroProjectTimelineEvents",
      reconciliationEventKey: getReconciliationEventKey(event),
      selectorMeta: {
        source: "meetroProjectTimelineEvents",
        projectIdSource: identity.identitySource,
        warnings: identity.warnings.map((warning) => ({
          ...warning,
          source: "meetroProjectTimelineEvents",
        })),
      },
    };
  });
}

// The dashboard writes the same legacy event to both keys. This projection
// deduplicates those copies by explicit event identity before reconciliation.
export function getLegacyTimelineEvents() {
  const sources = [
    ...readArray("meetroWorkflowTimeline").map((event) => ({
      ...event,
      timelineSource: "meetroWorkflowTimeline",
    })),
    ...readArray("projectTimeline").map((event) => ({
      ...event,
      timelineSource: "projectTimeline",
    })),
  ];
  const seen = new Set();

  return sources
    .map((event) => {
      const identity = getLegacyIdentity(event);

      return {
        ...event,
        projectId: identity.projectId,
        reconciliationEventKey: getReconciliationEventKey(event),
        selectorMeta: {
          source: event.timelineSource,
          projectIdSource: identity.identitySource,
          warnings: identity.warnings.map((warning) => ({
            ...warning,
            source: event.timelineSource,
          })),
        },
      };
    })
    .filter((event) => {
      if (seen.has(event.reconciliationEventKey)) return false;
      seen.add(event.reconciliationEventKey);
      return true;
    });
}

export function getTimelineIdentityWarnings() {
  const shadowEvents = getShadowTimelineEvents();
  const legacyEvents = getLegacyTimelineEvents();
  const shadowKeys = new Set(
    shadowEvents.map((event) => event.reconciliationEventKey)
  );
  const warnings = [
    ...shadowEvents.flatMap((event) => event.selectorMeta.warnings),
    ...legacyEvents
      .filter((event) => !shadowKeys.has(event.reconciliationEventKey))
      .flatMap((event) => event.selectorMeta.warnings),
  ];
  const reasonCounts = warnings.reduce((counts, warning) => {
    const code = warning.code || "unknown-identity-warning";
    counts[code] = (counts[code] || 0) + 1;
    return counts;
  }, {});

  return {
    warningCount: warnings.length,
    reasonCounts,
    warnings: warnings.map((warning) => ({ ...warning })),
  };
}

export function getTimelineCoverageByProject() {
  const legacyEvents = getLegacyTimelineEvents();
  const shadowEvents = getShadowTimelineEvents();
  const shadowByKey = new Map(
    shadowEvents.map((event) => [event.reconciliationEventKey, event])
  );
  const projectIds = new Set(
    shadowEvents.map((event) => event.projectId).filter(Boolean)
  );

  legacyEvents.forEach((event) => {
    const shadowEvent = shadowByKey.get(event.reconciliationEventKey);
    const projectId = shadowEvent?.projectId || event.projectId;
    if (projectId) projectIds.add(projectId);
  });

  return [...projectIds]
    .map((projectId) => {
      const legacyProjectEvents = legacyEvents.filter((event) => {
        const shadowEvent = shadowByKey.get(event.reconciliationEventKey);
        return (shadowEvent?.projectId || event.projectId) === projectId;
      });
      const shadowProjectEvents = shadowEvents.filter(
        (event) => event.projectId === projectId
      );
      const shadowedLegacyCount = legacyProjectEvents.filter((event) =>
        shadowByKey.has(event.reconciliationEventKey)
      ).length;

      return {
        projectId,
        legacyEventCount: legacyProjectEvents.length,
        shadowEventCount: shadowProjectEvents.length,
        shadowedLegacyCount,
        missingShadowCount:
          legacyProjectEvents.length - shadowedLegacyCount,
        coveragePercentage:
          legacyProjectEvents.length > 0
            ? Math.round(
                (shadowedLegacyCount / legacyProjectEvents.length) * 10000
              ) / 100
            : 0,
      };
    })
    .sort((a, b) => a.projectId.localeCompare(b.projectId));
}

export function getTimelineReconciliationReport() {
  const legacyEvents = getLegacyTimelineEvents();
  const shadowEvents = getShadowTimelineEvents();
  const shadowKeys = new Set(
    shadowEvents.map((event) => event.reconciliationEventKey)
  );
  const shadowedLegacyEvents = legacyEvents.filter((event) =>
    shadowKeys.has(event.reconciliationEventKey)
  );
  const missingShadowEvents = legacyEvents.filter(
    (event) => !shadowKeys.has(event.reconciliationEventKey)
  );
  const skippedUnsafeIdentityEvents = missingShadowEvents.filter(
    (event) => !event.projectId
  );
  const safeIdentityMissingShadowEvents = missingShadowEvents.filter(
    (event) => event.projectId
  );
  const coveragePercentage =
    legacyEvents.length > 0
      ? Math.round(
          (shadowedLegacyEvents.length / legacyEvents.length) * 10000
        ) / 100
      : 0;

  return {
    legacyEventCount: legacyEvents.length,
    shadowEventCount: shadowEvents.length,
    shadowedLegacyCount: shadowedLegacyEvents.length,
    missingShadowCount: missingShadowEvents.length,
    skippedUnsafeIdentityCount: skippedUnsafeIdentityEvents.length,
    safeIdentityMissingShadowCount: safeIdentityMissingShadowEvents.length,
    coveragePercentage,
    fullyReconciled:
      legacyEvents.length === shadowedLegacyEvents.length,
    coverageByProject: getTimelineCoverageByProject(),
    identityWarnings: getTimelineIdentityWarnings(),
    skippedUnsafeIdentityEvents,
    safeIdentityMissingShadowEvents,
  };
}

// Future owner: Timeline. This selector exposes every current timeline source;
// it deduplicates only by explicit event identity and never by title.
export function getTimelineEvents() {
  const sources = [
    ...readArray("meetroWorkflowTimeline").map((event) => ({
      ...event,
      timelineSource: "meetroWorkflowTimeline",
    })),
    ...readArray("projectTimeline").map((event) => ({
      ...event,
      timelineSource: "projectTimeline",
    })),
    ...getRequestTimelineEvents(),
    ...getJobRecordEvents(),
  ];
  const seen = new Set();

  return sources
    .map((event, index) => {
      const normalized = withSelectorMeta(
        event,
        event.timelineSource || "timeline",
        { ignoreGenericId: true }
      );
      return { ...normalized, selectorEventKey: getTimelineKey(event, index) };
    })
    .filter((event) => {
      if (seen.has(event.selectorEventKey)) return false;
      seen.add(event.selectorEventKey);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.savedAt || 0).getTime() -
        new Date(a.createdAt || a.savedAt || 0).getTime()
    );
}

export function getWorkCenterSummary() {
  const scheduleItems = getScheduleItems();
  const quoteItems = getQuoteItems();
  const activeWorkItems = getActiveWorkItems();
  const completedWorkItems = getCompletedWorkItems();
  const timelineEvents = getTimelineEvents();
  const storedCompletedJobsCount = Number(
    readValue("completedJobsCount") || 0
  );
  const storedTotalJobRevenue = Number(readValue("totalJobRevenue") || 0);
  const completedRevenue = completedWorkItems.reduce(
    (sum, item) =>
      sum +
      Number(
        item.revenue ||
          item.amount ||
          item.acceptedQuote?.amount ||
          item.quoteAmount ||
          0
      ),
    0
  );
  const completedJobsCount =
    completedWorkItems.length > 0
      ? completedWorkItems.length
      : storedCompletedJobsCount;
  const totalJobRevenue =
    completedWorkItems.length > 0
      ? completedRevenue
      : storedTotalJobRevenue;
  const warnings = [
    ...collectWarnings(scheduleItems),
    ...collectWarnings(quoteItems),
    ...collectWarnings(activeWorkItems),
    ...collectWarnings(completedWorkItems),
    ...collectWarnings(timelineEvents),
  ];

  return {
    scheduleCount: scheduleItems.length,
    pendingQuoteCount: quoteItems.filter((quote) =>
      ["", "sent", "quoted"].includes(quote.normalizedStatus)
    ).length,
    quoteResponseAlertCount: quoteItems.filter(
      (quote) =>
        !quote.movedToActiveAt &&
        ["accepted", "revision_requested"].includes(quote.normalizedStatus)
    ).length,
    activeWorkCount: activeWorkItems.length,
    completedJobsCount,
    totalJobRevenue,
    averageJobValue:
      completedJobsCount > 0
        ? Math.round(totalJobRevenue / completedJobsCount)
        : 0,
    timelineEventCount: timelineEvents.length,
    warningCount: warnings.length,
    warnings,
  };
}

function matchesProjectId(item, projectId) {
  if (!projectId || !item?.projectId) return false;
  return String(item.projectId) === String(projectId);
}

export function getSelectedProjectContext(projectId) {
  if (projectId === undefined || projectId === null || projectId === "") {
    return {
      projectId: "",
      project: null,
      scheduleItems: [],
      quoteItems: [],
      activeWorkItems: [],
      completedWorkItems: [],
      timelineEvents: [],
      warnings: [
        createWarning(
          "project-id-required",
          "A projectId is required. The selector did not infer one from the selected title or current screen.",
          "getSelectedProjectContext"
        ),
      ],
    };
  }

  const normalizedProjectId = String(projectId);
  const homeownerRequests = readHomeownerRequestsSnapshot().map((request) =>
    withSelectorMeta(request, "homeownerRequests")
  );
  const selected = readJson("selectedActiveProject", null);
  const selectedProject = selected
    ? withSelectorMeta(
        selected.project || selected,
        "selectedActiveProject"
      )
    : null;
  const scheduleItems = getScheduleItems().filter((item) =>
    matchesProjectId(item, normalizedProjectId)
  );
  const quoteItems = getQuoteItems().filter((item) =>
    matchesProjectId(item, normalizedProjectId)
  );
  const activeWorkItems = getActiveWorkItems().filter((item) =>
    matchesProjectId(item, normalizedProjectId)
  );
  const completedWorkItems = getCompletedWorkItems().filter((item) =>
    matchesProjectId(item, normalizedProjectId)
  );
  const timelineEvents = getTimelineEvents().filter((item) =>
    matchesProjectId(item, normalizedProjectId)
  );
  const project =
    homeownerRequests.find((item) =>
      matchesProjectId(item, normalizedProjectId)
    ) ||
    (matchesProjectId(selectedProject, normalizedProjectId)
      ? selectedProject
      : null);
  const warnings = [
    ...collectWarnings(scheduleItems),
    ...collectWarnings(quoteItems),
    ...collectWarnings(activeWorkItems),
    ...collectWarnings(completedWorkItems),
    ...collectWarnings(timelineEvents),
  ];

  if (
    !project &&
    scheduleItems.length === 0 &&
    quoteItems.length === 0 &&
    activeWorkItems.length === 0 &&
    completedWorkItems.length === 0 &&
    timelineEvents.length === 0
  ) {
    warnings.push(
      createWarning(
        "project-not-found",
        "No current Work Center source contains the requested projectId.",
        "getSelectedProjectContext"
      )
    );
  }

  return {
    projectId: normalizedProjectId,
    project,
    scheduleItems,
    quoteItems,
    activeWorkItems,
    completedWorkItems,
    timelineEvents,
    warnings,
  };
}

// Phase 1 ownership/read contract freeze. This report characterizes current
// projections only; it does not make Work Center authoritative or adopt these
// selectors in any UI.
export function getWorkCenterReadContractReport() {
  const selectorResults = {
    getScheduleItems: getScheduleItems(),
    getQuoteItems: getQuoteItems(),
    getActiveWorkItems: getActiveWorkItems(),
    getCompletedWorkItems: getCompletedWorkItems(),
    getTimelineEvents: getTimelineEvents(),
  };
  const contracts = WORK_CENTER_READ_CONTRACTS.map((contract) => {
    const records = selectorResults[contract.selectorName] || [];
    const warnings = collectWarnings(records);

    return {
      ...contract,
      authorityStatus: "projection-only",
      adoptionStatus: "not-adopted",
      recordCount: records.length,
      warningCount: warnings.length,
      warningCodes: [
        ...new Set(warnings.map((warning) => warning.code).filter(Boolean)),
      ].sort(),
    };
  });
  const warningCounts = {};

  contracts.forEach((contract) => {
    contract.warningCodes.forEach((code) => {
      warningCounts[code] = (warningCounts[code] || 0) + 1;
    });
  });

  return {
    shellOwner: "Work Center",
    shellResponsibilities: [
      "active tab",
      "selected project",
      "navigation",
      "loading and error presentation",
      "domain projection composition",
    ],
    prohibitedDomainOwnership: [
      "lead eligibility",
      "appointment lifecycle",
      "quote lifecycle",
      "work activation",
      "completion persistence",
      "timeline persistence",
    ],
    contractCount: contracts.length,
    totalProjectedRecordCount: contracts.reduce(
      (total, contract) => total + contract.recordCount,
      0
    ),
    warningCounts,
    contracts,
  };
}
