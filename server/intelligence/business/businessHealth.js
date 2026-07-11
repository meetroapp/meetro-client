export function classifyBusinessHealth({ workload, responsibility, workflowHealth, scheduling, evidenceCount = 0 }) {
  if (!evidenceCount) return { classification: "unknown", confidence: "low", reasons: ["insufficient_evidence"] };
  if (workflowHealth.blocked >= 2 || (workflowHealth.blocked > 0 && workflowHealth.blocked >= Math.ceil(workload.totalOpenWorkflows / 2))) return { classification: "blocked", confidence: "high", reasons: ["blocking_dependencies_present"] };
  if (scheduling.capacity === "full" || workload.activeEmergencyJobs > 1 || workload.overdueItems >= 2 || responsibility.waitingOnProfessional >= 4) return { classification: "overloaded", confidence: "high", reasons: ["operational_pressure_high"] };
  if (workload.totalOpenWorkflows === 0 && scheduling.capacity === "available") return { classification: "underutilized", confidence: "medium", reasons: ["limited_active_or_upcoming_work"] };
  if (workload.activeJobs >= 3 || workload.scheduledToday >= 3 || scheduling.capacity === "busy") return { classification: "busy", confidence: "medium", reasons: ["active_workload_substantial"] };
  return { classification: "healthy", confidence: "medium", reasons: ["workload_manageable", "no_severe_blockers"] };
}
