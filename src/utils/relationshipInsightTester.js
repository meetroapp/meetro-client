export const RELATIONSHIP_INSIGHT_TEST_EVENT = "meetro:relationship-insight:test";
export const INSIGHT_TEST_EVENT = "meetro:insight:test";
export const RELATIONSHIP_INSIGHT_CLEAR_DISMISSALS_EVENT =
  "meetro:relationship-insight:clear-dismissals";
export const INSIGHT_CLEAR_DISMISSALS_EVENT = "meetro:insight:clear-dismissals";
export const RELATIONSHIP_INSIGHT_DISMISSAL_KEY = "meetro.relationshipInsights.dismissed";
export const INSIGHT_DISMISSAL_KEYS = [RELATIONSHIP_INSIGHT_DISMISSAL_KEY];

export function isInsightTesterEnabled(env = import.meta.env) {
  return Boolean(env?.DEV);
}

export function isRelationshipInsightTesterEnabled(env = import.meta.env) {
  return isInsightTesterEnabled(env);
}

export function shouldRenderInsightTester(env = import.meta.env) {
  return isInsightTesterEnabled(env);
}

export function shouldRenderRelationshipInsightTester(env = import.meta.env) {
  return shouldRenderInsightTester(env);
}

export function getInsightTesterButtonGroups() {
  return [
    {
      key: "relationship",
      title: "Relationship",
      buttons: [
        ["firstProject", "First Project"],
        ["repeatCustomer", "Repeat Customer"],
        ["warrantyReminder", "Warranty Reminder"],
        ["customerPreference", "Customer Preference"],
      ],
    },
    {
      key: "commitment",
      title: "Commitment",
      buttons: [
        ["commitmentUpcomingVisit", "Upcoming Visit"],
        ["commitmentAwaitingConfirmation", "Awaiting Confirmation"],
        ["commitmentNextProposal", "Next Step: Proposal"],
        ["commitmentNextPayment", "Next Step: Payment"],
        ["commitmentNextClosure", "Next Step: Closure"],
      ],
    },
  ];
}

export function buildRelationshipInsightTestInsight(type = "firstProject") {
  const base = {
    id: `dev-relationship-insight:${type}`,
    type: "relationship",
    priority: "medium",
    icon: "customerRelationships",
    titleKey: "relationshipInsightTitle",
    actionLabelKey: "hide",
    actionType: "dismiss",
    relatedId: "dev-relationship-insight",
    record: {
      id: "dev-relationship-insight-project",
      projectId: "dev-relationship-insight-project",
      customerName: "Sarah Dommerich",
      title: "Kitchen Remodel",
    },
  };

  if (type === "repeatCustomer") {
    return {
      ...base,
      titleKey: "relationshipInsightRepeatCustomer",
      messageKey: "relationshipInsightRepeatCustomerMessage",
      message: "This is your fourth project together.",
      actionLabelKey: "viewHistory",
      actionType: "history",
    };
  }

  if (type === "warrantyReminder") {
    return {
      ...base,
      priority: "high",
      icon: "shield",
      titleKey: "relationshipInsightWarrantyReminder",
      messageKey: "relationshipInsightWarrantySoonMessage",
      message: "Warranty expires soon.",
      actionLabelKey: "reviewProject",
      actionType: "reviewProject",
    };
  }

  if (type === "longTimeGap") {
    return {
      ...base,
      messageKey: "relationshipInsightLongTimeMessage",
      message: "It has been over a year since your last completed project.",
      actionLabelKey: "viewHistory",
      actionType: "history",
    };
  }

  if (type === "customerPreference") {
    return {
      ...base,
      icon: "people",
      titleKey: "relationshipInsightCustomerPreference",
      messageKey: "relationshipInsightCustomerPreferenceMessage",
      message: "Customer prefers text before arrival.",
      actionLabelKey: "message",
      actionType: "conversation",
      relatedId: "dev-relationship-insight-conversation",
    };
  }

  return {
    ...base,
    titleKey: "relationshipInsightFirstProjectTogether",
    messageKey: "relationshipInsightFirstProjectMessage",
    message: "This is your first completed project together.",
    actionLabelKey: "viewHistory",
    actionType: "history",
  };
}

export function buildInsightTestInsight(type = "firstProject") {
  if (type === "commitmentUpcomingVisit") {
    return {
      id: "dev-commitment-insight:upcoming-visit",
      type: "commitment",
      priority: "high",
      icon: "commitment",
      titleKey: "commitmentInsightTitle",
      messageKey: "commitmentInsightVisitBeginsSoonMinutes",
      message: "Your visit begins in 30 minutes.",
      actionLabelKey: "openSchedule",
      actionType: "schedule",
      relatedId: "dev-commitment-project",
      record: {
        projectId: "dev-commitment-project",
        title: "Kitchen Remodel",
        scheduledStartAt: "2026-06-27T12:30:00.000Z",
        status: "scheduled",
      },
    };
  }

  if (type === "commitmentAwaitingConfirmation") {
    return {
      id: "dev-commitment-insight:awaiting-confirmation",
      type: "commitment",
      priority: "high",
      icon: "commitment",
      titleKey: "commitmentInsightTitle",
      messageKey: "commitmentInsightAwaitingVisitConfirmation",
      message: "Customer is waiting for visit confirmation.",
      actionLabelKey: "openConversation",
      actionType: "conversation",
      relatedId: "dev-commitment-conversation",
      record: {
        projectId: "dev-commitment-project",
        conversationId: "dev-commitment-conversation",
        status: "awaiting confirmation",
      },
    };
  }

  if (type === "commitmentNextProposal") {
    return {
      id: "dev-commitment-insight:next-proposal",
      type: "commitment",
      priority: "medium",
      icon: "commitment",
      titleKey: "commitmentInsightTitle",
      messageKey: "commitmentInsightEvaluationProposalNext",
      message: "Evaluation is saved. Proposal is the next step.",
      actionLabelKey: "reviewProject",
      actionType: "reviewProject",
      relatedId: "dev-commitment-project",
      record: {
        projectId: "dev-commitment-project",
        evaluationSaved: true,
      },
    };
  }

  if (type === "commitmentNextPayment") {
    return {
      id: "dev-commitment-insight:next-payment",
      type: "commitment",
      priority: "medium",
      icon: "commitment",
      titleKey: "commitmentInsightTitle",
      messageKey: "commitmentInsightProposalPaymentNext",
      message: "Proposal is approved. Payment is the next step.",
      actionLabelKey: "reviewProject",
      actionType: "reviewProject",
      relatedId: "dev-commitment-project",
      record: {
        projectId: "dev-commitment-project",
        proposalApproved: true,
      },
    };
  }

  if (type === "commitmentNextClosure") {
    return {
      id: "dev-commitment-insight:next-closure",
      type: "commitment",
      priority: "medium",
      icon: "commitment",
      titleKey: "commitmentInsightTitle",
      messageKey: "commitmentInsightWorkClosureNext",
      message: "Work is completed. Closure is the next step.",
      actionLabelKey: "reviewProject",
      actionType: "reviewProject",
      relatedId: "dev-commitment-project",
      record: {
        projectId: "dev-commitment-project",
        workCompleted: true,
      },
    };
  }

  return buildRelationshipInsightTestInsight(type);
}

export function dispatchInsightTest(type, {
  win = typeof window !== "undefined" ? window : null,
} = {}) {
  if (!win?.dispatchEvent || typeof CustomEvent === "undefined") return false;
  win.dispatchEvent(
    new CustomEvent(INSIGHT_TEST_EVENT, {
      detail: { type },
    })
  );
  return true;
}

export function dispatchRelationshipInsightTest(type, options = {}) {
  return dispatchInsightTest(type, options);
}

export function clearInsightTestDismissals({
  storage = globalThis?.localStorage,
  win = typeof window !== "undefined" ? window : null,
} = {}) {
  INSIGHT_DISMISSAL_KEYS.forEach((key) => storage?.removeItem?.(key));
  if (win?.dispatchEvent && typeof CustomEvent !== "undefined") {
    win.dispatchEvent(new CustomEvent(INSIGHT_CLEAR_DISMISSALS_EVENT));
  }
  return [...INSIGHT_DISMISSAL_KEYS];
}

export function clearRelationshipInsightTestDismissals(options = {}) {
  clearInsightTestDismissals(options);
  return RELATIONSHIP_INSIGHT_DISMISSAL_KEY;
}
