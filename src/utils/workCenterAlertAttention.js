const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WORK_CENTER_ALERT_STAGES = Object.freeze([
  "evaluation",
  "quote",
  "deposit",
  "schedule",
  "work",
  "invoice",
  "completion",
  "review",
]);

const WORK_CENTER_ALERT_STAGE_SET =
  new Set(WORK_CENTER_ALERT_STAGES);

export function normalizeWorkCenterAlertStage(value) {
  return typeof value === "string" &&
    WORK_CENTER_ALERT_STAGE_SET.has(value)
    ? value
    : null;
}

function normalizeJobId(value) {
  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";
  return UUID_PATTERN.test(normalized)
    ? normalized
    : null;
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function getWorkCenterAttention(
  snapshot,
  expectedIdentity = ""
) {
  if (
    !snapshot ||
    (expectedIdentity &&
      snapshot.identity !== expectedIdentity)
  ) {
    return null;
  }

  const attention =
    snapshot.response?.counts?.workCenter;

  if (!attention) return null;

  const unread = safeCount(attention.unread);
  if (unread === null || !Array.isArray(attention.byJob)) {
    return null;
  }

  return attention;
}

export function getWorkCenterTotalUnread(
  snapshot,
  expectedIdentity = ""
) {
  const attention =
    getWorkCenterAttention(snapshot, expectedIdentity);

  return attention
    ? attention.unread
    : null;
}

export function getWorkCenterJobAttention(
  snapshot,
  expectedIdentity,
  jobId
) {
  const canonicalJobId = normalizeJobId(jobId);
  if (!canonicalJobId) return null;

  const attention =
    getWorkCenterAttention(snapshot, expectedIdentity);

  if (!attention) return null;

  return (
    attention.byJob.find(
      (item) => item.jobId === canonicalJobId
    ) || null
  );
}

export function getWorkCenterStageUnread(
  jobAttention,
  stage
) {
  const canonicalStage =
    normalizeWorkCenterAlertStage(stage);

  if (
    !canonicalStage ||
    !jobAttention ||
    !Array.isArray(jobAttention.stages)
  ) {
    return 0;
  }

  const record = jobAttention.stages.find(
    (item) => item.stage === canonicalStage
  );

  return safeCount(record?.unread) ?? 0;
}

export function getAlertWorkCenterStage(alert) {
  return normalizeWorkCenterAlertStage(
    alert?.payload?.workCenterStage
  );
}

export function getBusinessWorkCenterPanelId(stage) {
  switch (normalizeWorkCenterAlertStage(stage)) {
    case "evaluation":
      return "canonical-job-evaluation";
    case "quote":
      return "canonical-job-quotes";
    case "deposit":
    case "schedule":
      return "canonical-job-deposit-scheduling";
    case "work":
      return "canonical-job-work-plan";
    case "invoice":
    case "completion":
    case "review":
      return "canonical-job-completion-invoice";
    default:
      return null;
  }
}

export function getHomeownerWorkCenterSection(stage) {
  switch (normalizeWorkCenterAlertStage(stage)) {
    case "evaluation":
      return "evaluation";
    case "quote":
      return "quote";
    case "deposit":
      return "payment";
    case "schedule":
      return "schedule";
    case "work":
      return "work";
    case "invoice":
    case "completion":
    case "review":
      return "completion";
    default:
      return null;
  }
}


export function getAlertWorkCenterRequestId(
  snapshot,
  expectedIdentity,
  alert
) {
  const jobId =
    alert?.destination?.jobId || null;

  const jobAttention =
    getWorkCenterJobAttention(
      snapshot,
      expectedIdentity,
      jobId
    );

  return Number.isSafeInteger(
    jobAttention?.requestId
  ) && jobAttention.requestId > 0
    ? jobAttention.requestId
    : null;
}


export function getWorkCenterGroupedStageUnread(
  jobAttention,
  stages = []
) {
  if (
    !jobAttention ||
    !Array.isArray(stages)
  ) {
    return 0;
  }

  return stages.reduce(
    (total, stage) =>
      total +
      getWorkCenterStageUnread(
        jobAttention,
        stage
      ),
    0
  );
}


export function getWorkCenterRequestAttention(
  snapshot,
  expectedIdentity,
  requestId
) {
  const canonicalRequestId = Number(requestId);

  if (
    !Number.isSafeInteger(canonicalRequestId) ||
    canonicalRequestId < 1
  ) {
    return null;
  }

  const attention =
    getWorkCenterAttention(
      snapshot,
      expectedIdentity
    );

  if (!attention) return null;

  return (
    attention.byJob.find(
      (item) =>
        item.requestId === canonicalRequestId
    ) || null
  );
}
