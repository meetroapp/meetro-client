import {
  buildCommitmentInsightContextFromStorage,
  getCommitmentInsights,
} from "./commitmentInsights.js";
import {
  buildRelationshipInsightContextFromStorage,
  getRelationshipInsights,
} from "./relationshipInsights.js";

const PRIORITY_WEIGHT = {
  critical: 500,
  high: 400,
  medium: 300,
  low: 200,
  passive: 0,
};

const PAGE_RELEVANCE = {
  schedule: {
    schedule: 80,
    "context:schedule": 55,
    "intent:schedule": 55,
    "commitment:upcoming": 70,
    commitment: 35,
  },
  conversation: {
    conversation: 80,
    "context:conversation": 55,
    "intent:communicate": 55,
    "commitment:awaiting": 70,
    customerPreference: 60,
    relationship: 20,
  },
  reviewProject: {
    reviewProject: 80,
    "context:reviewProject": 55,
    "intent:review": 45,
    "intent:close": 55,
    "commitment:next": 75,
    commitment: 35,
  },
  quoteBuilder: {
    quote: 70,
    "context:quote": 55,
    "context:quoteBuilder": 55,
    "intent:quote": 65,
    "commitment:next-step:proposal": 80,
    customerPreference: 45,
    commitment: 30,
  },
  invoiceBuilder: {
    invoice: 70,
    "context:invoice": 55,
    "context:invoiceBuilder": 55,
    "intent:invoice": 65,
    "commitment:next-step:payment": 80,
    commitment: 30,
  },
  home: {
    "context:home": 45,
    commitment: 30,
    relationship: 10,
  },
  history: {
    "context:history": 60,
    "intent:history": 60,
    relationship: 20,
  },
  profile: {
    critical: 20,
  },
  settings: {
    critical: 20,
  },
};

function normalizePage(value) {
  return String(value || "").trim();
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function inferPage(context = {}) {
  const rawPage = normalizeToken(
    context.page ||
      context.currentPage ||
      context.route ||
      context.routeName ||
      context.pathname ||
      context.location
  );

  if (!rawPage) return "unknown";
  if (/conversation|thread|messages/.test(rawPage)) return "conversation";
  if (/schedule|visit|appointment/.test(rawPage)) return "schedule";
  if (/reviewproject|review-project|completedjobdetails|completed-job|closure|closeout|projectdetails/.test(rawPage)) {
    return "reviewProject";
  }
  if (/quotebuilder|quote-builder|proposal|quote/.test(rawPage)) return "quoteBuilder";
  if (/invoicebuilder|invoice-builder|invoice|receipt/.test(rawPage)) return "invoiceBuilder";
  if (/history|completed/.test(rawPage)) return "history";
  if (/home|dashboard/.test(rawPage)) return "home";
  if (/profile|settings/.test(rawPage)) return rawPage.includes("settings") ? "settings" : "profile";
  return "unknown";
}

function inferIntent(page, context = {}) {
  const rawIntent = normalizeToken(context.intent);
  const allowed = new Set([
    "communicate",
    "schedule",
    "review",
    "quote",
    "invoice",
    "complete",
    "close",
    "history",
    "settings",
    "unknown",
  ]);
  if (allowed.has(rawIntent)) return rawIntent;

  if (page === "conversation") return "communicate";
  if (page === "schedule") return "schedule";
  if (page === "quoteBuilder") return "quote";
  if (page === "invoiceBuilder") return "invoice";
  if (page === "history") return "history";
  if (page === "profile" || page === "settings") return "settings";

  const rawPage = normalizeToken(context.page || context.currentPage || context.route || context.pathname);
  if (page === "reviewProject" && /closure|closeout/.test(rawPage)) return "close";
  if (page === "reviewProject" && /completion|complete/.test(rawPage)) return "complete";
  if (page === "reviewProject") return "review";
  return "unknown";
}

function normalizeRole(context = {}) {
  const rawRole = normalizeToken(context.role || context.activeAccountMode || context.accountMode || context.viewerRole);
  if (/business|professional|pro|contractor/.test(rawRole)) return "professional";
  if (/personal|homeowner|user|customer/.test(rawRole)) return "homeowner";
  return "unknown";
}

export function normalizeInsightContext(context = {}) {
  const page = inferPage(context);
  const intent = inferIntent(page, context);
  const role = normalizeRole(context);
  const isSettingsContext = page === "profile" || page === "settings" || intent === "settings";
  const isCustomerContext = [
    "conversation",
    "schedule",
    "reviewProject",
    "quoteBuilder",
    "invoiceBuilder",
    "history",
  ].includes(page);

  return {
    ...context,
    page,
    currentPage: page,
    intent,
    role,
    isWorkingContext: !isSettingsContext && page !== "unknown",
    isSettingsContext,
    isCustomerContext,
  };
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getNow(context = {}) {
  return parseDate(context.now) || new Date();
}

function normalizePriority(priority) {
  return PRIORITY_WEIGHT[priority] === undefined ? "low" : priority;
}

function getPriorityScore(insight = {}) {
  return PRIORITY_WEIGHT[normalizePriority(insight.priority)];
}

function timingAllowsDisplay(insight = {}, now = new Date()) {
  const expiresAt = parseDate(insight.expiresAt);
  const displayAfter = parseDate(insight.displayAfter);
  const displayUntil = parseDate(insight.displayUntil);

  if (expiresAt && now > expiresAt) return false;
  if (displayAfter && now < displayAfter) return false;
  if (displayUntil && now > displayUntil) return false;
  return true;
}

function pageMatches(page, candidate) {
  if (!page || !candidate) return false;
  const normalizedPage = page.toLowerCase();
  const normalizedCandidate = String(candidate).toLowerCase();
  return normalizedPage === normalizedCandidate || normalizedPage.includes(normalizedCandidate);
}

function tagMatches(tags = [], value = "") {
  if (!Array.isArray(tags) || !value) return false;
  const normalizedValue = normalizeToken(value);
  return tags.some((tag) => normalizeToken(tag) === normalizedValue);
}

function getRelevanceScore(insight = {}, context = {}) {
  const normalizedContext = normalizeInsightContext(context);
  const page = normalizedContext.page;
  let score = 0;

  if (Array.isArray(insight.relevancePages) && insight.relevancePages.some((item) => pageMatches(page, item))) {
    score += 90;
  }

  if (tagMatches(insight.contextTags, page)) score += 70;
  if (tagMatches(insight.intentTags, normalizedContext.intent)) score += 60;

  const pageRules = PAGE_RELEVANCE[page] || {};
  Object.entries(pageRules).forEach(([key, value]) => {
    const contextKey = key.startsWith("context:") ? key.replace("context:", "") : "";
    const intentKey = key.startsWith("intent:") ? key.replace("intent:", "") : "";
    if (
      (contextKey && tagMatches(insight.contextTags, contextKey)) ||
      (intentKey && tagMatches(insight.intentTags, intentKey)) ||
      key === insight.actionType ||
      key === insight.type ||
      key === insight.category ||
      key === normalizePriority(insight.priority) ||
      String(insight.id || "").startsWith(key) ||
      String(insight.titleKey || "").includes(key) ||
      String(insight.messageKey || "").includes(key)
    ) {
      score += value;
    }
  });

  if (insight.type === "commitment") score += 12;
  return score;
}

function getCreatedTime(insight = {}) {
  return parseDate(insight.createdAt)?.getTime() || 0;
}

function insightSortKey(insight = {}, context = {}, index = 0) {
  return {
    priority: getPriorityScore(insight),
    relevance: getRelevanceScore(insight, context),
    commitment: insight.type === "commitment" ? 1 : 0,
    createdAt: getCreatedTime(insight),
    index,
  };
}

export function collectInsights(context = {}) {
  return [
    ...getCommitmentInsights(context),
    ...getRelationshipInsights(context),
  ];
}

export function filterDisplayableInsights(insights = [], context = {}) {
  const now = getNow(context);
  const normalizedContext = normalizeInsightContext(context);
  return insights.filter((insight) => {
    if (!insight || !insight.id) return false;
    if (
      normalizedContext.isSettingsContext &&
      normalizePriority(insight.priority) !== "critical" &&
      !context.allowSettingsInsights
    ) {
      return false;
    }
    if (normalizePriority(insight.priority) === "passive" && !context.allowPassiveInsights) {
      return false;
    }
    return timingAllowsDisplay(insight, now);
  });
}

export function prioritizeInsights(insights = [], context = {}) {
  return filterDisplayableInsights(insights, context)
    .map((insight, index) => ({ insight, sortKey: insightSortKey(insight, context, index) }))
    .sort((a, b) => {
      if (a.sortKey.priority !== b.sortKey.priority) return b.sortKey.priority - a.sortKey.priority;
      if (a.sortKey.relevance !== b.sortKey.relevance) return b.sortKey.relevance - a.sortKey.relevance;
      if (a.sortKey.commitment !== b.sortKey.commitment) return b.sortKey.commitment - a.sortKey.commitment;
      if (a.sortKey.createdAt !== b.sortKey.createdAt) return b.sortKey.createdAt - a.sortKey.createdAt;
      return a.sortKey.index - b.sortKey.index;
    })
    .map(({ insight }) => insight);
}

export function sortInsightsByPriority(insights = [], context = {}) {
  return prioritizeInsights(insights, context);
}

export function getGlobalInsights(context = {}) {
  return prioritizeInsights(collectInsights(context), context);
}

export function getTopInsight(context = {}) {
  return getGlobalInsights(context)[0] || null;
}

export function buildGlobalInsightContextFromStorage({
  storage = globalThis?.localStorage,
  currentPage = "",
} = {}) {
  return normalizeInsightContext({
    ...buildRelationshipInsightContextFromStorage({ storage, currentPage }),
    ...buildCommitmentInsightContextFromStorage({ storage, currentPage }),
    currentPage,
  });
}
