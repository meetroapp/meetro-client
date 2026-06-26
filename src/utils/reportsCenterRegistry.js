function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function normalizeRegistryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toRegistryMap(definitions) {
  return deepFreeze(
    Object.fromEntries(definitions.map((definition) => [definition.id, definition]))
  );
}

export const REPORT_STATUS = Object.freeze({
  AVAILABLE_FROM_JOB_HISTORY: "Available from Job History",
  PLANNED: "Planned",
});

export const REPORTS_CENTER_REGISTRY = toRegistryMap([
  {
    id: "job_report",
    name: "Job Report",
    purpose: "Provides a complete record of one closed job.",
    includes: [
      "Customer",
      "Evaluation",
      "Findings",
      "Recommended Services",
      "Proposal",
      "Payment",
      "Completion",
      "Closure",
      "Timeline",
    ],
    status: REPORT_STATUS.AVAILABLE_FROM_JOB_HISTORY,
  },
  {
    id: "evaluation_report",
    name: "Evaluation Report",
    purpose: "Summarizes what was inspected, documented, and discovered during Evaluation.",
    includes: [
      "Service Type",
      "Context",
      "Template Requirements",
      "Evaluation Notes",
      "Measurements",
      "Materials Needed",
      "Findings",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "completion_report",
    name: "Completion Report",
    purpose: "Summarizes final work performed and closeout documentation.",
    includes: [
      "Completed Work",
      "Completion Notes",
      "Photos",
      "Materials Used",
      "Customer Signoff",
      "Timeline",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "customer_history_report",
    name: "Customer History Report",
    purpose: "Provides a read-only summary of past work for one customer.",
    includes: [
      "Customer",
      "Closed Jobs",
      "Evaluations",
      "Proposals",
      "Invoices",
      "Receipts",
      "Timeline",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "quote_proposal_report",
    name: "Quote / Proposal Report",
    purpose: "Summarizes an existing quote or proposal record.",
    includes: [
      "Customer",
      "Scope",
      "Line Items",
      "Terms",
      "Total",
      "Approval Status",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "invoice_receipt_report",
    name: "Invoice / Receipt Report",
    purpose: "Summarizes billing, payment, and receipt details.",
    includes: [
      "Customer",
      "Invoice",
      "Payment Summary",
      "Receipt",
      "Balance",
      "Sent Date",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "permit_compliance_report",
    name: "Permit / Compliance Report",
    purpose: "Organizes future permit, compliance, and closeout evidence.",
    includes: [
      "Permit Status",
      "Compliance Requirements",
      "Evidence",
      "Approvals",
      "Inspection Notes",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "asset_history_report",
    name: "Asset History Report",
    purpose: "Summarizes service history tied to a real-world asset.",
    includes: [
      "Asset",
      "Source Job",
      "Services Completed",
      "Installed Date",
      "Warranty Notes",
      "Maintenance History",
    ],
    status: REPORT_STATUS.PLANNED,
  },
  {
    id: "business_summary_report",
    name: "Business Summary Report",
    purpose: "Summarizes high-level business activity and performance.",
    includes: [
      "Jobs",
      "Quotes",
      "Invoices",
      "Revenue Signals",
      "Customer Activity",
      "Open Follow-ups",
    ],
    status: REPORT_STATUS.PLANNED,
  },
]);

export function getReportTypes(filters = {}) {
  const id = normalizeRegistryKey(filters.id);
  const status = filters.status || "";

  return Object.values(REPORTS_CENTER_REGISTRY)
    .filter((report) => !id || report.id === id)
    .filter((report) => !status || report.status === status)
    .map(cloneValue);
}

export function getReportType(reportId) {
  const definition = REPORTS_CENTER_REGISTRY[normalizeRegistryKey(reportId)];

  return definition ? cloneValue(definition) : null;
}

export function getReportsCenterReport() {
  const reports = Object.values(REPORTS_CENTER_REGISTRY);

  return {
    readOnly: true,
    reportCount: reports.length,
    reports: reports.map((report) => report.id),
    availableCount: reports.filter(
      (report) => report.status === REPORT_STATUS.AVAILABLE_FROM_JOB_HISTORY
    ).length,
    plannedCount: reports.filter((report) => report.status === REPORT_STATUS.PLANNED)
      .length,
    includeCount: reports.reduce(
      (total, report) => total + report.includes.length,
      0
    ),
  };
}
