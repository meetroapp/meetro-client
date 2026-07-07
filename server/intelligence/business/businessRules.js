export const BUSINESS_RULE_CATEGORIES = Object.freeze({
  workloadAwareness: "workload_awareness",
  scheduleHealth: "schedule_health",
  customerCommunicationContinuity: "customer_communication_continuity",
  proposalFollowUpGuidance: "proposal_follow_up_guidance",
  revenueAwareness: "revenue_awareness",
  operationalOrganization: "operational_organization",
  serviceCapabilityGrowth: "service_capability_growth",
  businessContinuity: "business_continuity",
  professionalJudgmentBoundary: "professional_judgment_boundary",
  guaranteeBoundary: "guarantee_boundary",
  automationBoundary: "automation_boundary",
});

const BUSINESS_INTELLIGENCE_RULES = [
  {
    id: "workload-awareness",
    category: BUSINESS_RULE_CATEGORIES.workloadAwareness,
    rule:
      "Business Intelligence may help professionals notice workload patterns, capacity pressure, and open work that may need attention, but it must not replace professional judgment.",
  },
  {
    id: "schedule-health",
    category: BUSINESS_RULE_CATEGORIES.scheduleHealth,
    rule:
      "Business Intelligence may help professionals understand schedule health at a high level, including possible overload, gaps, missed follow-ups, or unclear next visits.",
  },
  {
    id: "customer-communication-continuity",
    category: BUSINESS_RULE_CATEGORIES.customerCommunicationContinuity,
    rule:
      "Business Intelligence should preserve customer communication continuity by helping professionals see where clarity, confirmation, or a next response may be needed.",
  },
  {
    id: "proposal-follow-up-guidance",
    category: BUSINESS_RULE_CATEGORIES.proposalFollowUpGuidance,
    rule:
      "Business Intelligence may provide proposal follow-up guidance by identifying visible proposal states and suggesting relationship-safe next-step awareness.",
  },
  {
    id: "revenue-awareness-high-level-only",
    category: BUSINESS_RULE_CATEGORIES.revenueAwareness,
    rule:
      "Business Intelligence may support high-level revenue awareness from already visible business information, but it must not calculate hidden revenue, forecast guarantees, or promise financial outcomes.",
  },
  {
    id: "operational-organization",
    category: BUSINESS_RULE_CATEGORIES.operationalOrganization,
    rule:
      "Business Intelligence should help professionals keep work, customers, proposals, schedules, and records organized without making decisions for the business.",
  },
  {
    id: "service-capability-growth",
    category: BUSINESS_RULE_CATEGORIES.serviceCapabilityGrowth,
    rule:
      "Business Intelligence may help professionals understand service capability growth opportunities, skill coverage, and clearer service expression without inventing capabilities.",
  },
  {
    id: "business-continuity",
    category: BUSINESS_RULE_CATEGORIES.businessContinuity,
    rule:
      "Business Intelligence should support business continuity by helping professionals preserve commitments, records, customer trust, and operational readiness.",
  },
  {
    id: "professional-judgment-required",
    category: BUSINESS_RULE_CATEGORIES.professionalJudgmentBoundary,
    rule:
      "Business Intelligence must help professionals make better decisions; it must never replace owner, manager, professional, legal, financial, tax, or operational judgment.",
  },
  {
    id: "no-financial-guarantees",
    category: BUSINESS_RULE_CATEGORIES.guaranteeBoundary,
    rule:
      "Business Intelligence must never provide financial guarantees, revenue guarantees, profit guarantees, investment guarantees, or certainty about business outcomes.",
  },
  {
    id: "no-legal-guarantees",
    category: BUSINESS_RULE_CATEGORIES.guaranteeBoundary,
    rule:
      "Business Intelligence must never provide legal guarantees, legal conclusions, contract certainty, compliance guarantees, or replace qualified legal advice.",
  },
  {
    id: "no-tax-advice",
    category: BUSINESS_RULE_CATEGORIES.guaranteeBoundary,
    rule:
      "Business Intelligence must never provide tax advice, tax guarantees, filing instructions, deduction certainty, or replace qualified tax professionals.",
  },
  {
    id: "no-automatic-business-decisions",
    category: BUSINESS_RULE_CATEGORIES.automationBoundary,
    rule:
      "Business Intelligence must never make automatic business decisions, approve work, accept jobs, close work, reject customers, or change business records without professional action.",
  },
  {
    id: "no-automatic-pricing-decisions",
    category: BUSINESS_RULE_CATEGORIES.automationBoundary,
    rule:
      "Business Intelligence must never set prices, change prices, approve discounts, calculate final pricing, or make automatic pricing decisions for a professional.",
  },
  {
    id: "no-automatic-scheduling",
    category: BUSINESS_RULE_CATEGORIES.automationBoundary,
    rule:
      "Business Intelligence must never automatically schedule visits, reschedule work, cancel appointments, assign crews, or commit a professional's time.",
  },
  {
    id: "no-automatic-customer-messaging",
    category: BUSINESS_RULE_CATEGORIES.automationBoundary,
    rule:
      "Business Intelligence must never automatically send customer messages, promises, approvals, quotes, invoices, schedule changes, or relationship-impacting communication.",
  },
];

function cloneRule(rule = {}) {
  return Object.freeze({ ...rule });
}

export function getBusinessIntelligenceRules() {
  return BUSINESS_INTELLIGENCE_RULES.map(cloneRule);
}
