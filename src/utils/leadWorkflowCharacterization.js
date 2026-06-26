import {
  evaluateLeadWorkflowCompliance,
  LEAD_WORKFLOW_STAGES,
} from "./leadWorkflowCompliance.js";

const RISK_LEVELS = Object.freeze(["LOW", "MEDIUM", "HIGH"]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
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

function roundPercentage(value) {
  return Math.round(value * 100) / 100;
}

function getDatasetInput(dataset) {
  if (isRecord(dataset?.input)) return dataset.input;
  if (isRecord(dataset?.workflow)) return dataset.workflow;
  return isRecord(dataset) ? dataset : {};
}

function getDatasetId(dataset, input, index) {
  return String(
    firstValue(
      dataset?.id,
      dataset?.datasetId,
      input?.lead?.projectId,
      input?.lead?.requestId,
      input?.lead?.quoteRequestId,
      input?.lead?.emergencyRequestId,
      `dataset-${index}`
    )
  );
}

function getDatasetSource(dataset, input) {
  return String(
    firstValue(
      dataset?.source,
      input?.source,
      input?.lead?.leadSource,
      input?.lead?.source,
      "representative"
    )
  );
}

function getWorkflowKind(input, report) {
  if (!report.appointmentPolicy.applicable) return "emergency";
  const type = String(
    firstValue(
      input.workflowType,
      input.lead?.workflowType,
      input.lead?.requestType,
      input.lead?.type,
      input.lead?.source,
      ""
    )
  ).toLowerCase();
  return type.includes("manual") ? "manual" : "standard";
}

function createEmptyStageCoverage() {
  return Object.fromEntries(
    LEAD_WORKFLOW_STAGES.map((stage) => [
      stage,
      {
        evidencedCount: 0,
        missingCount: 0,
        applicableCount: 0,
        coveragePercentage: 0,
      },
    ])
  );
}

function buildStageCoverage(findings) {
  const coverage = createEmptyStageCoverage();

  findings.forEach((finding) => {
    LEAD_WORKFLOW_STAGES.forEach((stage) => {
      const appointmentNotApplicable =
        stage === "appointment" &&
        !finding.report.appointmentPolicy.applicable;
      if (appointmentNotApplicable) return;

      coverage[stage].applicableCount += 1;
      if (finding.report.evidence[stage]) {
        coverage[stage].evidencedCount += 1;
      } else {
        coverage[stage].missingCount += 1;
      }
    });
  });

  Object.values(coverage).forEach((stage) => {
    stage.coveragePercentage =
      stage.applicableCount === 0
        ? 0
        : roundPercentage(
            (stage.evidencedCount / stage.applicableCount) * 100
          );
  });

  return coverage;
}

function buildWarningFrequency(findings) {
  const counts = {};

  findings.forEach((finding) => {
    finding.report.warnings.forEach((warning) => {
      if (!counts[warning.code]) {
        counts[warning.code] = {
          code: warning.code,
          count: 0,
          riskLevels: {},
          stages: {},
        };
      }
      const entry = counts[warning.code];
      entry.count += 1;
      entry.riskLevels[warning.riskLevel] =
        (entry.riskLevels[warning.riskLevel] || 0) + 1;
      entry.stages[warning.stage] = (entry.stages[warning.stage] || 0) + 1;
    });
  });

  return Object.values(counts).sort(
    (left, right) =>
      right.count - left.count || left.code.localeCompare(right.code)
  );
}

function buildExceptionUsage(findings) {
  const usage = {
    appointmentPolicyApplicableCount: 0,
    appointmentRequiredCount: 0,
    requestedCount: 0,
    approvedCount: 0,
    invalidCount: 0,
    emergencyExcludedCount: 0,
    approvedReasons: {},
  };

  findings.forEach((finding) => {
    const policy = finding.report.appointmentPolicy;
    if (!policy.applicable) {
      usage.emergencyExcludedCount += 1;
      return;
    }

    usage.appointmentPolicyApplicableCount += 1;
    if (policy.required) usage.appointmentRequiredCount += 1;
    if (!policy.exception.requested) return;

    usage.requestedCount += 1;
    if (policy.exception.approved) {
      usage.approvedCount += 1;
      const reason = policy.exception.reason || "unspecified";
      usage.approvedReasons[reason] =
        (usage.approvedReasons[reason] || 0) + 1;
    } else {
      usage.invalidCount += 1;
    }
  });

  return {
    ...usage,
    approvedReasons: Object.fromEntries(
      Object.entries(usage.approvedReasons).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
  };
}

function buildRiskDistribution(findings) {
  const counts = Object.fromEntries(RISK_LEVELS.map((level) => [level, 0]));

  findings.forEach((finding) => {
    const level = RISK_LEVELS.includes(finding.report.riskLevel)
      ? finding.report.riskLevel
      : "HIGH";
    counts[level] += 1;
  });

  const total = findings.length;
  return Object.fromEntries(
    RISK_LEVELS.map((level) => [
      level,
      {
        count: counts[level],
        percentage:
          total === 0 ? 0 : roundPercentage((counts[level] / total) * 100),
      },
    ])
  );
}

function buildWorkflowDistribution(findings) {
  const distribution = {
    standard: { total: 0, compliant: 0 },
    manual: { total: 0, compliant: 0 },
    emergency: { total: 0, compliant: 0 },
  };

  findings.forEach((finding) => {
    distribution[finding.workflowKind].total += 1;
    if (finding.report.compliant) {
      distribution[finding.workflowKind].compliant += 1;
    }
  });

  return Object.fromEntries(
    Object.entries(distribution).map(([kind, entry]) => [
      kind,
      {
        ...entry,
        complianceRate:
          entry.total === 0
            ? 0
            : roundPercentage((entry.compliant / entry.total) * 100),
      },
    ])
  );
}

// Pure aggregate characterization over representative workflow datasets.
// Individual compliance reports are preserved so aggregate rates remain
// explainable and cannot become workflow enforcement.
export function characterizeLeadWorkflows(datasets = []) {
  const safeDatasets = Array.isArray(datasets) ? datasets : [];
  const findings = safeDatasets.map((dataset, index) => {
    const safeDataset = isRecord(dataset) ? dataset : {};
    const input = getDatasetInput(safeDataset);
    const report = evaluateLeadWorkflowCompliance(input);

    return {
      id: getDatasetId(safeDataset, input, index),
      source: getDatasetSource(safeDataset, input),
      workflowKind: getWorkflowKind(input, report),
      compliant: report.compliant,
      workflowStage: report.workflowStage,
      riskLevel: report.riskLevel,
      warningCodes: report.warnings.map((warning) => warning.code),
      missingStages: [...report.missingStages],
      report: cloneValue(report),
    };
  });
  const compliantCount = findings.filter(
    (finding) => finding.compliant
  ).length;

  return {
    complianceRate:
      findings.length === 0
        ? 0
        : roundPercentage((compliantCount / findings.length) * 100),
    riskDistribution: buildRiskDistribution(findings),
    warningFrequency: buildWarningFrequency(findings),
    stageCoverage: buildStageCoverage(findings),
    exceptionUsage: buildExceptionUsage(findings),
    workflowDistribution: buildWorkflowDistribution(findings),
    findings,
    summary: {
      datasetCount: findings.length,
      compliantCount,
      nonCompliantCount: findings.length - compliantCount,
      warningCount: findings.reduce(
        (total, finding) => total + finding.report.warnings.length,
        0
      ),
    },
  };
}
