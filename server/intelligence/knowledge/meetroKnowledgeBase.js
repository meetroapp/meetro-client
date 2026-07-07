export const MEETRO_KNOWLEDGE_BASE = Object.freeze([
  Object.freeze({
    id: "community-purpose",
    category: "principles",
    text: "Meetro Community is not a marketplace; it is a relationship and capability platform built around trust, meaningful work, and lasting community relationships.",
    tags: Object.freeze(["community", "trust", "relationship", "marketplace", "purpose"]),
  }),
  Object.freeze({
    id: "relationship-first-communication",
    category: "principles",
    text: "Communication should strengthen relationships, reduce uncertainty, and help people understand what happens next.",
    tags: Object.freeze(["communication", "relationship", "uncertainty", "next step"]),
  }),
  Object.freeze({
    id: "capability-aware-recommendations",
    category: "principles",
    text: "Professional discovery and recommendations should be capability-aware, not category-only.",
    tags: Object.freeze(["capability", "professional", "recommendation", "discovery", "matching"]),
  }),
  Object.freeze({
    id: "universal-workflow-lifecycle",
    category: "workflowRules",
    text: "The universal Meetro lifecycle is Relationship -> Communication -> Schedule -> Evaluation -> Quote -> Approval -> Work -> Completion -> Closure -> History.",
    tags: Object.freeze(["workflow", "lifecycle", "schedule", "quote", "approval", "completion", "closure", "history"]),
  }),
  Object.freeze({
    id: "completion-vs-closure",
    category: "workflowRules",
    text: "Completion means work is done or reported complete; Closure is the relationship-safe wrap-up where confirmation, records, unresolved items, and history are settled.",
    tags: Object.freeze(["completion", "closure", "history", "workflow"]),
  }),
  Object.freeze({
    id: "quote-approval-boundary",
    category: "workflowRules",
    text: "A quote or proposal should be understood and approved before work proceeds when the workflow requires approval.",
    tags: Object.freeze(["quote", "proposal", "approval", "work"]),
  }),
  Object.freeze({
    id: "next-safe-action",
    category: "responseGuidance",
    text: "Ask Meetro should guide users toward the next safe action based on visible, verified context.",
    tags: Object.freeze(["next step", "safe action", "workflow", "guidance"]),
  }),
  Object.freeze({
    id: "professional-judgment-boundary",
    category: "responseGuidance",
    text: "AI should support decisions and explanation; it should not replace professional judgment, customer approval, or verified workflow records.",
    tags: Object.freeze(["ai", "judgment", "professional", "approval", "decision"]),
  }),
  Object.freeze({
    id: "provider-blind-product-rule",
    category: "productRules",
    text: "The frontend and user experience must remain provider-blind. Users experience Ask Meetro, not the underlying AI provider.",
    tags: Object.freeze(["provider", "openai", "model", "frontend", "ai", "provider-blind"]),
  }),
  Object.freeze({
    id: "trusted-context-boundary",
    category: "productRules",
    text: "Trusted context, memory, and platform knowledge must be selected by backend systems, not injected by the frontend.",
    tags: Object.freeze(["context", "memory", "knowledge", "frontend", "security"]),
  }),
  Object.freeze({
    id: "emergency-safety-boundary",
    category: "safetyRules",
    text: "Emergency help must respect emergency disclaimers, avoid unsafe guarantees, and direct users toward immediate emergency services when there is danger.",
    tags: Object.freeze(["emergency", "safety", "disclaimer", "danger", "guarantee"]),
  }),
  Object.freeze({
    id: "no-hidden-facts",
    category: "safetyRules",
    text: "Ask Meetro may explain visible or verified information, but it must not invent hidden facts, prices, dates, approvals, completion status, or messages.",
    tags: Object.freeze(["safety", "verified", "hidden facts", "price", "date", "approval", "status"]),
  }),
]);

export const MEETRO_KNOWLEDGE_CATEGORIES = Object.freeze([
  "principles",
  "workflowRules",
  "safetyRules",
  "productRules",
  "responseGuidance",
]);
